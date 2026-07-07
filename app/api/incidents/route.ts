// ──────────────────────────────────────────────────────────
// PwnOps — Incidents API
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';
import { getIncidents, addIncident, updateIncidentStatus, getIncidentById } from '@/lib/store';
import type { IncidentStatus } from '@/lib/types';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ incidents: getIncidents() });
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

  const incident = addIncident({
    title,
    description: description || '',
    severity,
    status: 'new',
    assigneeId: assigneeId || null,
    assigneeName: assigneeName || null,
    createdBy: user.id,
    mitigationSteps: [],
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

  const incident = updateIncidentStatus(id, status as IncidentStatus);
  if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 });

  return Response.json({ incident });
}
