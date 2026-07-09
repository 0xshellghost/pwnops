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

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── State ────────────────────────────────────────────────
let activeScanCount = 0;
let isShuttingDown = false;
let totalProcessed = 0;

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
}) {
  const { id, toolName, target } = scan;
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
      return;
    }

    // Update progress — starting
    await prisma.scan.update({
      where: { id },
      data: { progress: 10, results: `[*] Initializing ${toolName} scan against ${target}...` },
    });

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

    const diffAlert = (prevScan && result.success) 
      ? generateDiff(prevScan.results || '', result.output) 
      : null;

    // Update with final results
    await prisma.scan.update({
      where: { id },
      data: {
        status: result.success ? 'completed' : 'failed',
        progress: 100,
        results: formatFinalOutput(result, toolName, target, diffAlert),
        completedAt: new Date(),
      },
    });

    // Fire off enterprise webhook alert
    if (result.success) {
      await sendWebhookAlert(toolName, target, diffAlert).catch(() => {});
    }

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

// Enterprise Webhook Alerting (Slack/Discord)
async function sendWebhookAlert(toolName: string, target: string, diffAlert: string | null) {
  if (!WEBHOOK_URL) return;
  
  try {
    const title = diffAlert 
      ? `🚨 **[NEW FINDINGS]** ${toolName} scan on \`${target}\``
      : `✅ **[COMPLETED]** ${toolName} scan on \`${target}\``;
      
    // Discord / Slack compatible payload format
    const payload = {
      content: title,
      embeds: diffAlert ? [{
        title: 'Changes Detected Since Last Scan',
        description: '```diff\n' + diffAlert.split('\n').filter(l => l.includes('[+]')).slice(0, 10).join('\n') + '\n```',
        color: 16711680 // Red alert color
      }] : undefined
    };

    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error(`[${WORKER_ID}] Webhook failed:`, err);
  }
}

// ── Lifecycle ────────────────────────────────────────────

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
  // ── Render Free Tier Hack ──
  // Start a dummy HTTP server so Render thinks this is a healthy "Web Service"
  const port = process.env.PORT || 10000;
  createServer((req, res) => {
    if (req.url === '/tools' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getAvailableTools()));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('PwnOps Scan Worker is healthy!\n');
  }).listen(port, () => {
    console.log(`\n  [Network] Dummy HTTP health-check server running on port ${port}`);
  });

  printBanner();

  // Verify database connection
  try {
    const count = await prisma.scan.count({ where: { status: 'queued' } });
    console.log(`  Queued scans in database: ${count}`);
    console.log(`  Worker is now polling for jobs...\n`);
  } catch (err) {
    console.error('FATAL: Cannot connect to database:', err);
    process.exit(1);
  }

  // Start polling loop
  const interval = setInterval(pollForScans, POLL_INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n  [${WORKER_ID}] Received ${signal}, shutting down gracefully...`);
    clearInterval(interval);

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
