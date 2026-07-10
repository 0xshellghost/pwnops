// ──────────────────────────────────────────────────────────
// PwnOps — Users API
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';
import { getUsers, updateUserRole, addUser, findUserByEmail, getOrganizationById, logAudit } from '@/lib/store';
import bcrypt from 'bcryptjs';

const VALID_ROLES = ['admin', 'analyst', 'viewer'] as const;

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

  if (!VALID_ROLES.includes(role)) {
    return Response.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  const updated = await updateUserRole(id, role, user.organizationId!);
  if (!updated) return Response.json({ error: 'User not found' }, { status: 404 });

  // Audit log: role change
  logAudit({
    userId: user.id,
    action: 'ROLE_CHANGE',
    resource: `user:${id}`,
    details: `Changed user ${updated.email} role to "${role}"`,
    organizationId: user.organizationId,
  });

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

  if (role && !VALID_ROLES.includes(role)) {
    return Response.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
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
    role: role || 'viewer',
    organizationId: user.organizationId,
  });

  return Response.json({ user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role } }, { status: 201 });
}
