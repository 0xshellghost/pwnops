import { getAuthUser } from '@/lib/auth';
import { addComment, getComments, logAudit } from '@/lib/store';
import { NextResponse } from 'next/server';

export async function GET(request: Request, context: any) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const comments = await getComments(id, user.organizationId!);
  return NextResponse.json({ comments });
}

export async function POST(request: Request, context: any) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const { content } = await request.json();

  if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

  const comment = await addComment(id, user.id, content, user.organizationId!);
  if (!comment) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });

  logAudit({
    userId: user.id,
    action: 'INCIDENT_COMMENT',
    resource: `incident:${id}`,
    details: 'Added comment to incident',
    organizationId: user.organizationId!,
  });

  return NextResponse.json({ comment }, { status: 201 });
}
