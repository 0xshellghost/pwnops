// ──────────────────────────────────────────────────────────
// PwnOps — Scans API
// Control plane for scan orchestration. The actual tool
// execution happens in the scan worker process.
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';
import { getScans, addScan, getThreatFeed } from '@/lib/store';
import { validateTarget, validateToolName, getAvailableTools } from '@/lib/scan-engine';

// Allowed tool names mapped to their scan-engine registry keys
const TOOL_NAME_MAP: Record<string, string> = {
  'Nmap Port Scanner': 'nmap',
  'Nmap Network Recon': 'nmap-recon',
  'testssl.sh SSL Audit': 'testssl',
  'Lynis Config Audit': 'lynis',
  // Support direct registry names too
  'nmap': 'nmap',
  'nmap-recon': 'nmap-recon',
  'testssl': 'testssl',
  'lynis': 'lynis',
};

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

  // Resolve display name to registry key
  const registryKey = TOOL_NAME_MAP[toolName];
  if (!registryKey || !validateToolName(registryKey)) {
    return Response.json({
      error: `Unknown tool: "${toolName}". Available tools: ${Object.keys(TOOL_NAME_MAP).filter(k => !k.includes('-')).join(', ')}`,
    }, { status: 400 });
  }

  // Validate target
  const cleanTarget = validateTarget(target);
  if (!cleanTarget) {
    return Response.json({
      error: 'Invalid scan target. Allowed formats: IPv4 (10.0.0.1), CIDR (10.0.0.0/24), or FQDN (example.com). Localhost and link-local addresses are blocked.',
    }, { status: 400 });
  }

  // Queue the scan — the worker process will pick it up
  const scan = await addScan({
    toolName: registryKey,
    target: cleanTarget,
    status: 'queued',
    progress: 0,
    triggeredById: user.id,
    startedAt: new Date().toISOString(),
    completedAt: null,
    results: null,
    organizationId: user.organizationId,
  });

  return Response.json({ scan }, { status: 201 });
}
