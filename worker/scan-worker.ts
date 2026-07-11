// ──────────────────────────────────────────────────────────
// PwnOps — Scan Worker
// Standalone Node.js process that polls the database for
// queued scans and executes them using real security tools.
//
// Run with: npx tsx worker/scan-worker.ts
//
// This process runs OUTSIDE of Next.js/Vercel on a machine
// where nmap, testssl.sh, etc. are installed.
// ──────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { executeScan, getAvailableTools, validateTarget, validateToolName } from '../lib/scan-engine';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { CronExpressionParser } from 'cron-parser';

// ── Configuration ────────────────────────────────────────
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL) || 3000;
const MAX_CONCURRENT_SCANS = Number(process.env.WORKER_MAX_CONCURRENT) || 3;
const WORKER_ID = `worker-${process.pid}-${Date.now().toString(36)}`;
const WEBHOOK_URL = process.env.WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;

// ── Database Connection ──────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── State ────────────────────────────────────────────────
let activeScanCount = 0;
let isShuttingDown = false;
let totalProcessed = 0;

let wss: WebSocketServer | null = null;

// Track org membership per WebSocket connection for scoped broadcasts
const wsOrgMap = new WeakMap<WebSocket, string>();

function broadcastScanUpdate(scanId: string, status: string, progress: number, results: unknown, organizationId?: string) {
  if (!wss) return;
  const msg = JSON.stringify({ type: 'SCAN_UPDATE', scanId, status, progress, results });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      // If we know the org, only send to clients in the same org (or unscoped clients)
      const clientOrg = wsOrgMap.get(client);
      if (organizationId && clientOrg && clientOrg !== organizationId) return;
      client.send(msg);
    }
  });
}

async function processScheduledScans() {
  if (isShuttingDown) return;
  try {
    const dueSchedules = await prisma.scheduledScan.findMany({
      where: { nextRunAt: { lte: new Date() } }
    });

    for (const schedule of dueSchedules) {
      await prisma.scan.create({
        data: {
          toolName: schedule.toolName,
          target: schedule.target,
          status: 'queued',
          triggeredById: schedule.createdBy,
          organizationId: schedule.organizationId
        }
      });

      let nextRun: Date;
      try {
        const interval = CronExpressionParser.parse(schedule.cronSchedule);
        nextRun = interval.next().toDate();
      } catch (_err) {
        console.error(`[${WORKER_ID}] Invalid cron expression for schedule ${schedule.id}`);
        nextRun = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      await prisma.scheduledScan.update({
        where: { id: schedule.id },
        data: { nextRunAt: nextRun }
      });
      console.log(`[${WORKER_ID}] ⏰ Enqueued scheduled scan for ${schedule.target} using ${schedule.toolName}. Next run: ${nextRun}`);
    }
  } catch (err) {
    console.error(`[${WORKER_ID}] Error processing scheduled scans:`, err);
  }
}

// ── Main Loop ────────────────────────────────────────────

async function pollForScans() {
  if (isShuttingDown) return;
  if (activeScanCount >= MAX_CONCURRENT_SCANS) return;

  try {
    // Find the oldest queued scan
    // Use a transaction to atomically claim the scan (prevent duplicate processing)
    const scan = await prisma.$transaction(async (tx) => {
      const queued = await tx.scan.findFirst({
        where: { status: 'queued' },
        orderBy: { startedAt: 'asc' },
      });

      if (!queued) return null;

      // Atomically update to 'running' to claim it
      const claimed = await tx.scan.update({
        where: { id: queued.id, status: 'queued' }, // Optimistic lock
        data: {
          status: 'running',
          progress: 5,
          results: `[*] Claimed by ${WORKER_ID}`,
        },
      });

      return claimed;
    });

    if (!scan) return; // No work to do

    broadcastScanUpdate(scan.id, 'running', 5, `[*] Claimed by ${WORKER_ID}`, scan.organizationId);

    // Process the scan asynchronously
    activeScanCount++;
    processScan(scan).finally(() => {
      activeScanCount--;
    });

  } catch (err) {
    // P2025 = "Record not found" — another worker claimed it first
    if ((err as { code?: string }).code !== 'P2025') {
      console.error(`[${WORKER_ID}] Poll error:`, err);
    }
  }
}

async function processScan(scan: {
  id: string;
  toolName: string;
  target: string;
  organizationId: string;
}) {
  const { id, toolName, target, organizationId } = scan;
  console.log(`[${WORKER_ID}] Starting scan ${id}: ${toolName} → ${target}`);

  try {
    // Validate inputs again (defense in depth)
    if (!validateToolName(toolName)) {
      await prisma.scan.update({
        where: { id },
        data: {
          status: 'failed',
          progress: 100,
          results: `[!] Unknown or unavailable tool: ${toolName}`,
          completedAt: new Date(),
        },
      });
      broadcastScanUpdate(id, 'failed', 100, `[!] Unknown or unavailable tool: ${toolName}`, organizationId);
      return;
    }

    if (!validateTarget(target)) {
      await prisma.scan.update({
        where: { id },
        data: {
          status: 'failed',
          progress: 100,
          results: `[!] Invalid or blocked target: ${target}`,
          completedAt: new Date(),
        },
      });
      broadcastScanUpdate(id, 'failed', 100, `[!] Invalid or blocked target: ${target}`, organizationId);
      return;
    }

    // Update progress — starting
    await prisma.scan.update({
      where: { id },
      data: { progress: 10, results: `[*] Initializing ${toolName} scan against ${target}...` },
    });
    broadcastScanUpdate(id, 'running', 10, `[*] Initializing ${toolName} scan against ${target}...`, organizationId);

    // Start a simulated progress interval to keep the UI moving
    let currentProgress = 10;
    const progressInterval = setInterval(async () => {
      if (currentProgress < 90) {
        currentProgress += Math.floor(Math.random() * 8) + 2; // Jump up by 2-9%
        if (currentProgress > 90) currentProgress = 90;
        try {
          await prisma.scan.update({
            where: { id },
            data: { progress: currentProgress },
          });
          broadcastScanUpdate(id, 'running', currentProgress, null, organizationId);
        } catch { /* ignore */ }
      }
    }, 5000); // Update DB every 5 seconds

    // Execute the real scan (this blocks until completion)
    const result = await executeScan(toolName, target);

    // Stop the progress simulation
    clearInterval(progressInterval);

    // Fetch the previous successful scan for diffing
    const prevScan = await prisma.scan.findFirst({
      where: {
        target,
        toolName,
        status: 'completed',
        id: { not: id },
      },
      orderBy: { completedAt: 'desc' },
    });

    let prevRaw = '';
    if (prevScan?.results) {
       const pr = prevScan.results as { raw?: string } | string | null;
       prevRaw = typeof pr === 'string' ? pr : (pr?.raw || '');
    }

    const diffAlert = (prevScan && result.success) 
      ? generateDiff(prevRaw, result.output) 
      : null;

    // Update with final results
    const finalStatus = result.success ? 'completed' : 'failed';
    const finalResultsRaw = formatFinalOutput(result, toolName, target, diffAlert);
    
    const structuredResults = {
      raw: finalResultsRaw,
      summary: {
        tool: toolName,
        target: target,
        duration: (result.executionTimeMs / 1000).toFixed(1) + 's',
        status: finalStatus,
        version: result.toolVersion,
        hasDiffAlert: !!diffAlert
      }
    };

    await prisma.scan.update({
      where: { id },
      data: {
        status: finalStatus,
        progress: 100,
        results: structuredResults,
        completedAt: new Date(),
      },
    });
    broadcastScanUpdate(id, finalStatus, 100, structuredResults, organizationId);

    // Fire off enterprise webhook alert
    await sendWebhookAlert(toolName, target, diffAlert, result.success, organizationId).catch(() => {});

    totalProcessed++;
    console.log(
      `[${WORKER_ID}] Scan ${id} ${result.success ? 'completed' : 'failed'} ` +
      `in ${result.executionTimeMs}ms (total: ${totalProcessed})`
    );

  } catch (err) {
    console.error(`[${WORKER_ID}] Scan ${id} crashed:`, err);
    try {
      await prisma.scan.update({
        where: { id },
        data: {
          status: 'failed',
          progress: 100,
          results: `[!] Scan execution crashed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          completedAt: new Date(),
        },
      });
      broadcastScanUpdate(id, 'failed', 100, `[!] Scan execution crashed: ${err instanceof Error ? err.message : 'Unknown error'}`, organizationId);
    } catch {
      // Can't even update the DB — log and move on
    }
  }
}

function formatFinalOutput(
  result: Awaited<ReturnType<typeof executeScan>>,
  toolName: string,
  target: string,
  diffAlert: string | null = null,
): string {
  const header = [
    `╔══════════════════════════════════════════╗`,
    `║  PwnOps Scan Report                     ║`,
    `╚══════════════════════════════════════════╝`,
    ``,
    `  Tool:       ${toolName}`,
    result.toolVersion ? `  Version:    ${result.toolVersion}` : null,
    `  Target:     ${target}`,
    `  Status:     ${result.success ? 'COMPLETED' : 'FAILED'}`,
    `  Duration:   ${(result.executionTimeMs / 1000).toFixed(1)}s`,
    `  Exit Code:  ${result.exitCode ?? 'N/A'}`,
    ``,
    `════════════════════════════════════════════`,
    ``,
  ].filter(Boolean).join('\n');

  return header + (diffAlert ? diffAlert + '\n' : '') + result.output;
}

// Naive line-by-line diffing to find new findings
function generateDiff(oldOut: string, newOut: string): string | null {
  const ignorePhrases = ['duration', 'version', 'completed', 'started', 'time', 'elapsed', 'pwnops scan report', 'tool:', 'target:', 'status:', 'exit code:'];
  
  const cleanLine = (l: string) => l.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').trim();
  const isNoise = (l: string) => l.length < 5 || ignorePhrases.some(p => l.toLowerCase().includes(p)) || l.startsWith('─') || l.startsWith('═') || l.startsWith('╔') || l.startsWith('╚');

  const oldLines = new Set(oldOut.split('\n').map(cleanLine).filter(l => !isNoise(l)));
  const newLines = newOut.split('\n').map(cleanLine).filter(l => !isNoise(l));

  const added = newLines.filter(l => !oldLines.has(l));
  
  if (added.length === 0) return null;

  return [
    `🚨 [ALERT] NEW FINDINGS DETECTED SINCE LAST SCAN 🚨`,
    `───────────────────────────────────────────────────`,
    ...added.slice(0, 15).map(l => `  [+] ${l}`),
    added.length > 15 ? `  ... and ${added.length - 15} more new lines.` : '',
    `───────────────────────────────────────────────────`,
    ``
  ].filter(Boolean).join('\n');
}

// Enterprise Webhook Alerting (Slack/Discord/SIEM)
async function sendWebhookAlert(toolName: string, target: string, diffAlert: string | null, success: boolean, organizationId: string) {
  try {
    const eventType = success ? 'SCAN_COMPLETED' : 'SCAN_FAILED';
    
    // Also include legacy WEBHOOK_URL from env if set
    const integrations = await prisma.integration.findMany({
      where: { organizationId, events: { has: eventType } }
    });

    const endpoints = integrations.map(i => i.endpoint);
    if (WEBHOOK_URL && !endpoints.includes(WEBHOOK_URL)) endpoints.push(WEBHOOK_URL);

    if (endpoints.length === 0) return;

    const title = diffAlert 
      ? `🚨 **[NEW FINDINGS]** ${toolName} scan on \`${target}\``
      : (success ? `✅ **[COMPLETED]** ${toolName} scan on \`${target}\`` : `❌ **[FAILED]** ${toolName} scan on \`${target}\``);
      
    // Discord / Slack compatible payload format
    const payload = {
      content: title,
      embeds: diffAlert ? [{
        title: 'Changes Detected Since Last Scan',
        description: '```diff\n' + diffAlert.split('\n').filter(l => l.includes('[+]')).slice(0, 10).join('\n') + '\n```',
        color: 16711680 // Red alert color
      }] : undefined
    };

    // Dispatch to all endpoints
    await Promise.all(endpoints.map(ep => 
      fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.error(`[${WORKER_ID}] Webhook failed for ${ep}:`, err.message))
    ));
  } catch (err) {
    console.error(`[${WORKER_ID}] Webhook dispatch failed:`, err);
  }
}

// ── Lifecycle ────────────────────────────────────────────

// ── Watchdog ─────────────────────────────────────────────
// Cleans up scans that are stuck in 'running' state because
// a worker crashed or was forcefully restarted.
async function cleanZombieScans() {
  try {
    // 20 minutes ago (longer than our longest 15 min nuclei timeout)
    const staleThreshold = new Date(Date.now() - 20 * 60 * 1000);
    
    const zombies = await prisma.scan.updateMany({
      where: {
        status: 'running',
        startedAt: {
          lt: staleThreshold,
        }
      },
      data: {
        status: 'failed',
        progress: 100,
        results: '[!] ERROR: Scan timed out or worker crashed (Zombie Process detected and killed by Watchdog).',
        completedAt: new Date(),
      }
    });

    if (zombies.count > 0) {
      console.warn(`[${WORKER_ID}] 🧹 Cleaned up ${zombies.count} zombie scan(s)`);
    }
  } catch (err) {
    console.error(`[${WORKER_ID}] Failed to clean zombies:`, err);
  }
}

async function cleanExpiredTokens() {
  try {
    const result = await prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      console.log(`[${WORKER_ID}] 🧹 Cleaned up ${result.count} expired password reset token(s)`);
    }
  } catch (err) {
    console.error(`[${WORKER_ID}] Failed to clean expired tokens:`, err);
  }
}

function printBanner() {
  console.log(`
╔══════════════════════════════════════════╗
║         PwnOps Scan Worker v1.0         ║
╚══════════════════════════════════════════╝
  Worker ID:       ${WORKER_ID}
  Poll interval:   ${POLL_INTERVAL_MS}ms
  Max concurrent:  ${MAX_CONCURRENT_SCANS}
  Database:        ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@')}
`);

  // Print tool availability
  const tools = getAvailableTools();
  console.log('  Available tools:');
  for (const tool of tools) {
    const status = tool.available ? `✓ ${tool.binaryPath}` : '✗ NOT FOUND';
    console.log(`    ${tool.available ? '🟢' : '🔴'} ${tool.displayName.padEnd(25)} ${status}`);
  }
  console.log('');

  const available = tools.filter(t => t.available).length;
  if (available === 0) {
    console.warn('  ⚠ WARNING: No scanning tools are installed on this system!');
    console.warn('  Install tools with:');
    console.warn('    sudo apt install nmap        # Port scanning');
    console.warn('    sudo apt install testssl.sh   # SSL auditing');
    console.warn('    sudo apt install lynis        # Config auditing');
    console.warn('');
  }
}

async function start() {
  const port = process.env.PORT || 10000;
  const workerApiKey = process.env.WORKER_API_KEY;

  // ── Auth Middleware ──
  // All endpoints except GET / (health check) require API key
  function isAuthenticated(req: import('http').IncomingMessage): boolean {
    if (!workerApiKey) return true; // No key configured = open (dev mode)
    const authHeader = req.headers['x-api-key'] || req.headers['authorization'];
    const providedKey = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : '';
    return providedKey === workerApiKey;
  }

  const server = createServer((req, res) => {
    // Health check — unauthenticated (needed for Docker/load balancer health probes)
    if (req.url === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', worker: WORKER_ID }));
      return;
    }

    // All other endpoints require API key
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (req.url === '/tools' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getAvailableTools()));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  // ── WebSocket with Authentication ──
  wss = new WebSocketServer({ server });
  wss.on('connection', (ws, req) => {
    // Authenticate via query param: ws://host:port?key=YOUR_API_KEY
    if (workerApiKey) {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const providedKey = url.searchParams.get('key') || '';
      if (providedKey !== workerApiKey) {
        ws.close(1008, 'Unauthorized');
        return;
      }
    }
    // Optionally track organization for scoped broadcasts
    // (org can be sent as a query param: ?key=...&org=orgId)
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const orgId = url.searchParams.get('org');
    if (orgId) wsOrgMap.set(ws, orgId);
    ws.on('error', console.error);
  });

  server.listen(port, () => {
    console.log(`\n  [Network] HTTP & WS server running on port ${port}`);
    if (workerApiKey) console.log(`  [Security] Worker API key authentication enabled`);
  });

  printBanner();

  // Verify database connection
  try {
    const count = await prisma.scan.count({ where: { status: 'queued' } });
    console.log(`  Queued scans in database: ${count}`);
    
    // Initial zombie cleanup
    await cleanZombieScans();
    
    console.log(`  Worker is now polling for jobs...\n`);
  } catch (err) {
    console.error('FATAL: Cannot connect to database:', err);
    process.exit(1);
  }

  // Start polling loop and watchdog
  const interval = setInterval(pollForScans, POLL_INTERVAL_MS);
  const watchdogInterval = setInterval(cleanZombieScans, 60_000); // Check every minute
  const schedulerInterval = setInterval(processScheduledScans, 10_000); // Check schedules every 10s
  const tokenCleanupInterval = setInterval(cleanExpiredTokens, 60 * 60 * 1000); // Clean expired tokens every hour

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n  [${WORKER_ID}] Received ${signal}, shutting down gracefully...`);
    clearInterval(interval);
    clearInterval(watchdogInterval);
    clearInterval(schedulerInterval);
    clearInterval(tokenCleanupInterval);

    // Wait for active scans to finish (max 30s)
    const maxWait = Date.now() + 30_000;
    while (activeScanCount > 0 && Date.now() < maxWait) {
      console.log(`  Waiting for ${activeScanCount} active scan(s) to finish...`);
      await new Promise(r => setTimeout(r, 2000));
    }

    if (activeScanCount > 0) {
      console.warn(`  ⚠ Forcing shutdown with ${activeScanCount} scan(s) still running`);
    }

    await prisma.$disconnect();
    console.log(`  [${WORKER_ID}] Shutdown complete. Processed ${totalProcessed} scan(s).`);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
