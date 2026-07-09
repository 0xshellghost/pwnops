// ──────────────────────────────────────────────────────────
// PwnOps — Vulnerabilities API
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';
import { getVulnerabilities, updateVulnStatus } from '@/lib/store';

const VALID_VULN_STATUSES = ['open', 'in_progress', 'fixed'] as const;

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user || !user.organizationId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const severity = url.searchParams.get('severity');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search')?.toLowerCase();

  let vulns = await getVulnerabilities(user.organizationId);

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

  if (!id || !status) {
    return Response.json({ error: 'id and status are required' }, { status: 400 });
  }

  if (!VALID_VULN_STATUSES.includes(status)) {
    return Response.json({ error: `Invalid status. Must be one of: ${VALID_VULN_STATUSES.join(', ')}` }, { status: 400 });
  }

  const vuln = await updateVulnStatus(id, status, user.organizationId!);
  if (!vuln) return Response.json({ error: 'Vulnerability not found' }, { status: 404 });

  return Response.json({ vulnerability: vuln });
}
