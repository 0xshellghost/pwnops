// ──────────────────────────────────────────────────────────
// PwnOps — Scans API
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';
import { getScans, addScan, updateScan } from '@/lib/store';
import { getThreatFeed } from '@/lib/store';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Auto-progress running scans based on elapsed time
  const scans = await getScans();
  const now = Date.now();
  for (const scan of scans) {
    if (scan.status === 'running' || scan.status === 'queued') {
      const elapsed = now - new Date(scan.startedAt).getTime();
      const progressTime = 15000; // 15 seconds to complete
      const progress = Math.min(100, Math.round((elapsed / progressTime) * 100));
      
      let changed = false;
      if (progress >= 100) {
        scan.status = 'completed';
        scan.completedAt = new Date().toISOString();
        if (!scan.results) {
          scan.results = generateResults(scan.toolName, scan.target);
        }
        changed = true;
      } else if (progress > 0 && scan.status === 'queued') {
        scan.status = 'running';
        changed = true;
      }
      
      if (scan.progress !== progress) {
        scan.progress = progress;
        changed = true;
      }

      if (changed) {
        await updateScan(scan.id, {
          progress: scan.progress,
          status: scan.status,
          results: scan.results,
          completedAt: scan.completedAt,
        });
      }
    }
  }

  return Response.json({ scans, threatFeed: await getThreatFeed() });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { toolName, target } = body;

  if (!toolName || !target) {
    return Response.json({ error: 'toolName and target are required' }, { status: 400 });
  }

  const scan = await addScan({
    toolName,
    target,
    status: 'queued',
    progress: 0,
    triggeredBy: user.id,
    startedAt: new Date().toISOString(),
    completedAt: null,
    results: null,
  });

  return Response.json({ scan }, { status: 201 });
}

function generateResults(tool: string, target: string): string {
  const lines: Record<string, string> = {
    'Network Recon': `[+] Host Discovery — ${target}\n────────────────────────────────\n  ${target.replace('/24', '.1')}    GATEWAY      UP  [22,80,443]\n  ${target.replace('/24', '.5')}    DB-PRIMARY   UP  [3306,22]\n  ${target.replace('/24', '.12')}   WEB-APP-01   UP  [80,443,8080]\n────────────────────────────────\n[+] 3 hosts discovered, 8 open ports`,
    'Port Scanner': `[*] Port Scan — ${target}\n────────────────────────────────\n  PORT    STATE   SERVICE\n  22/tcp  open    OpenSSH 8.9\n  80/tcp  open    nginx 1.24\n  443/tcp open    nginx 1.24\n  3306/tcp filtered MySQL\n  8080/tcp open    HTTP Proxy\n────────────────────────────────\n[+] 5 ports scanned, 4 open, 1 filtered`,
    'Config Audit': `[*] Configuration Audit — ${target}\n─────────────────────────────────────\n  ✓ SSH key auth enforced\n  ✓ Firewall rules validated\n  ✗ TLS 1.0 still enabled (WARN)\n  ✗ Default credentials detected\n  ✓ Disk encryption active\n─────────────────────────────────────\n[!] 2 FAILURES / 3 PASSES`,
    'SSL Check': `[*] SSL/TLS Audit — ${target}\n─────────────────────────────────────\n  Certificate:  Let's Encrypt (Valid)\n  Expires:      2024-09-15\n  Protocol:     TLS 1.3 ✓\n  Cipher:       TLS_AES_256_GCM_SHA384\n  HSTS:         Missing ✗\n  OCSP Staple:  Enabled ✓\n─────────────────────────────────────\n[+] Grade: B+ (HSTS missing)`,
  };
  return lines[tool] || `[+] Scan complete for ${target}`;
}
