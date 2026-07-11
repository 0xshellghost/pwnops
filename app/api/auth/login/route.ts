// ──────────────────────────────────────────────────────────
// PwnOps — Login API
// ──────────────────────────────────────────────────────────
import bcrypt from 'bcryptjs';
import { findUserByEmail, logAudit } from '@/lib/store';
import { signToken, buildCookieHeader, signPreAuthToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return Response.json({ error: 'Invalid input types' }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Reject OAuth-only users from password login
    if (!user.passwordHash || user.passwordHash === '!OAUTH_NO_PASSWORD!') {
      return Response.json({ error: 'This account uses external authentication (OAuth). Please sign in via Google or GitHub.' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.twoFactorEnabled) {
      const preAuthToken = await signPreAuthToken(user.email);
      return Response.json({ requires2FA: true, preAuthToken });
    }

    const token = await signToken({ userId: user.id, role: user.role, organizationId: user.organizationId });

    // Audit log: successful login
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    logAudit({
      userId: user.id,
      action: 'LOGIN',
      details: `Successful login from ${ip}`,
      ip,
      organizationId: user.organizationId,
    });

    const response = Response.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });

    response.headers.set('Set-Cookie', buildCookieHeader(token));

    return response;
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
