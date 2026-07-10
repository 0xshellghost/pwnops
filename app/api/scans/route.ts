// ──────────────────────────────────────────────────────────
// PwnOps — Scans API
// Control plane for scan orchestration. The actual tool
// execution happens in the scan worker process.
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';
import { getScans, addScan, getThreatFeed, logAudit } from '@/lib/store';
import { validateTargetSafe, validateToolName } from '@/lib/scan-engine';

// No hardcoded map needed, we validate directly against the engine registry

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user || !user.organizationId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const scans = await getScans(user.organizationId);
  const threatFeed = await getThreatFeed(user.organizationId);

  return Response.json({ scans, threatFeed });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user || !user.organizationId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { toolName, target } = body;

  if (!toolName || !target) {
    return Response.json({ error: 'toolName and target are required' }, { status: 400 });
  }

  // Validate tool against the scan engine registry
  if (!validateToolName(toolName)) {
    return Response.json({
      error: `Unknown or disabled tool: "${toolName}".`,
    }, { status: 400 });
  }

  // Validate target (with DNS rebinding protection)
  const cleanTarget = await validateTargetSafe(target);
  if (!cleanTarget) {
    return Response.json({
      error: 'Invalid scan target. Allowed formats: IPv4 (10.0.0.1), CIDR (10.0.0.0/24), or FQDN (example.com). Localhost and link-local addresses are blocked.',
    }, { status: 400 });
  }

  // Queue the scan — the worker process will pick it up
  const scan = await addScan({
    toolName: toolName,
    target: cleanTarget,
    status: 'queued',
    progress: 0,
    triggeredById: user.id,
    startedAt: new Date().toISOString(),
    completedAt: null,
    results: null,
    organizationId: user.organizationId,
  });

  // Audit log: scan launched
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  logAudit({
    userId: user.id,
    action: 'SCAN_LAUNCH',
    resource: `scan:${scan.id}`,
    details: `Launched ${toolName} scan against ${cleanTarget}`,
    ip,
    organizationId: user.organizationId,
  });

  return Response.json({ scan }, { status: 201 });
}
