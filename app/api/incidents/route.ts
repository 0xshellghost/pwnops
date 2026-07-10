// ──────────────────────────────────────────────────────────
// PwnOps — Incidents API
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';
import { getIncidents, addIncident, updateIncidentStatus, logAudit } from '@/lib/store';

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const VALID_STATUSES = ['new', 'investigating', 'containing', 'resolved'] as const;

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user || !user.organizationId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  
  const result = await getIncidents(user.organizationId, page, limit);
  return Response.json({ incidents: result.data, pagination: { total: result.total, page: result.page, totalPages: result.totalPages } });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { title, description, severity, assigneeId, assigneeName } = body;

  if (!title || !severity) {
    return Response.json({ error: 'Title and severity are required' }, { status: 400 });
  }

  if (!VALID_SEVERITIES.includes(severity)) {
    return Response.json({ error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}` }, { status: 400 });
  }

  const incident = await addIncident({
    title,
    description: description || '',
    severity,
    status: 'new',
    assigneeId: assigneeId || null,
    assigneeName: assigneeName || null,
    createdBy: user.id,
    mitigationSteps: [],
    organizationId: user.organizationId,
  });

  // Audit log
  logAudit({
    userId: user.id,
    action: 'INCIDENT_CREATE',
    resource: `incident:${incident.id}`,
    details: `Created incident "${title}" [${severity}]`,
    organizationId: user.organizationId,
  });

  return Response.json({ incident }, { status: 201 });
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

  if (!VALID_STATUSES.includes(status)) {
    return Response.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  const incident = await updateIncidentStatus(id, status, user.organizationId!);
  if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 });

  // Audit log
  logAudit({
    userId: user.id,
    action: 'INCIDENT_STATUS_CHANGE',
    resource: `incident:${id}`,
    details: `Changed incident status to "${status}"`,
    organizationId: user.organizationId,
  });

  return Response.json({ incident });
}
