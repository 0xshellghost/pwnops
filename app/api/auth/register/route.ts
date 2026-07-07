// ──────────────────────────────────────────────────────────
// PwnOps — Register API
// ──────────────────────────────────────────────────────────
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { findUserByEmail, addUser } from '@/lib/store';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return Response.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (findUserByEmail(email)) {
      return Response.json({ error: 'User already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id: uuid(),
      email,
      name,
      passwordHash,
      role: 'analyst' as const,
      createdAt: new Date().toISOString(),
    };

    addUser(user);
    const token = await signToken({ userId: user.id, role: user.role });

    const response = Response.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });

    // Set cookie
    response.headers.set(
      'Set-Cookie',
      `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}`
    );

    return response;
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
