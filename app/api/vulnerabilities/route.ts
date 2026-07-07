// ──────────────────────────────────────────────────────────
// PwnOps — Vulnerabilities API
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';
import { getVulnerabilities, updateVulnStatus } from '@/lib/store';
import type { VulnStatus } from '@/lib/types';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const severity = url.searchParams.get('severity');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search')?.toLowerCase();

  let vulns = await getVulnerabilities();

  if (severity && severity !== 'all') vulns = vulns.filter((v: any) => v.severity === severity);
  if (status && status !== 'all') vulns = vulns.filter((v: any) => v.status === status);
  if (search) vulns = vulns.filter((v: any) =>
    v.cveId.toLowerCase().includes(search) ||
    v.title.toLowerCase().includes(search) ||
    v.affectedAsset.toLowerCase().includes(search)
  );

  return Response.json({ vulnerabilities: vulns });
}

export async function PATCH(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { id, status } = body;

  const vuln = await updateVulnStatus(id, status as VulnStatus);
  if (!vuln) return Response.json({ error: 'Vulnerability not found' }, { status: 404 });

  return Response.json({ vulnerability: vuln });
}
