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

    if (await findUserByEmail(email)) {
      return Response.json({ error: 'User already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      email,
      name,
      passwordHash,
      role: 'analyst' as const,
    };

    const newUser = await addUser(user);
    const token = await signToken({ userId: newUser.id, role: newUser.role });

    const response = Response.json({
      user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
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
