// ──────────────────────────────────────────────────────────
// PwnOps — Users API
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';
import { getUsers, updateUserRole, addUser, findUserByEmail, getOrganizationById } from '@/lib/store';
import type { Role } from '@/lib/types';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user || !user.organizationId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  const org = await getOrganizationById(user.organizationId);
  const users = await getUsers(user.organizationId);
  
  return Response.json({ users, organization: org });
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

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user || !user.organizationId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

  const body = await request.json();
  const { email, name, password, role } = body;

  if (!email || !name || !password) {
    return Response.json({ error: 'Email, name, and password are required' }, { status: 400 });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return Response.json({ error: 'User already exists in the system' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newUser = await addUser({
    email,
    name,
    passwordHash,
    role: (role as Role) || 'viewer',
    organizationId: user.organizationId,
  });

  return Response.json({ user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role } }, { status: 201 });
}

