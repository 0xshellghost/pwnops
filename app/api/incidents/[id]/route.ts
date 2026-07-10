import { getAuthUser } from '@/lib/auth';
import { updateIncident, deleteIncident, logAudit } from '@/lib/store';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  const update = await request.json();

  const incident = await updateIncident(id, update, user.organizationId!);
  if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });

  logAudit({
    userId: user.id,
    action: 'INCIDENT_UPDATE',
    resource: `incident:${id}`,
    details: 'Updated incident details',
    organizationId: user.organizationId!,
  });

  return NextResponse.json({ incident });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden. Only admins can delete incidents.' }, { status: 403 });

  const { id } = await context.params;
  const success = await deleteIncident(id, user.organizationId!);
  if (!success) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });

  logAudit({
    userId: user.id,
    action: 'INCIDENT_DELETE',
    resource: `incident:${id}`,
    details: 'Deleted incident',
    organizationId: user.organizationId!,
  });

  return NextResponse.json({ success: true });
}
