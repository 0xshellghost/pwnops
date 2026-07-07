// ──────────────────────────────────────────────────────────
// PwnOps — JWT Auth Helpers
// ──────────────────────────────────────────────────────────
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getUserById } from './store';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'pwnops-jwt-secret-change-in-production-2024'
);

const COOKIE_NAME = 'pwnops_token';

export async function signToken(payload: { userId: string; role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; role: string };
  } catch {
    return null;
  }
}

/** Extract auth user from request cookies — for use in Route Handlers */
export async function getAuthUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const decoded = await verifyToken(match[1]);
  if (!decoded) return null;
  const user = await getUserById(decoded.userId);
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** Get token from request for middleware (Edge-compatible) */
export async function verifyTokenFromCookie(cookieValue: string | undefined) {
  if (!cookieValue) return null;
  return verifyToken(cookieValue);
}

export { COOKIE_NAME };
