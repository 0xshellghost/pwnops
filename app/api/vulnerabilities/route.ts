import { getAuthUser } from '@/lib/auth';
import { getVulnerabilities, updateVulnStatus } from '@/lib/store';

const VALID_VULN_STATUSES = ['open', 'in_progress', 'fixed'] as const;

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user || !user.organizationId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const severity = url.searchParams.get('severity') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const search = url.searchParams.get('search')?.trim() || undefined;

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));

  const vulnsResult = await getVulnerabilities(user.organizationId, page, limit, {
    severity,
    status,
    search,
  });

  return Response.json({
    vulnerabilities: vulnsResult.data,
    pagination: {
      total: vulnsResult.total,
      page: vulnsResult.page,
      totalPages: vulnsResult.totalPages,
    },
  });
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
