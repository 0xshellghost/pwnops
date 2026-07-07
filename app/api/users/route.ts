// ──────────────────────────────────────────────────────────
// PwnOps — Users API
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';
import { getUsers, updateUserRole } from '@/lib/store';
import type { Role } from '@/lib/types';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ users: await getUsers() });
}

export async function PATCH(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

  const body = await request.json();
  const { id, role } = body;

  if (!id || !role) {
    return Response.json({ error: 'id and role are required' }, { status: 400 });
  }

  const updated = await updateUserRole(id, role as Role);
  if (!updated) return Response.json({ error: 'User not found' }, { status: 404 });

  return Response.json({ user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role } });
}
