// ──────────────────────────────────────────────────────────
// PwnOps — JWT Auth Helpers
// ──────────────────────────────────────────────────────────
import { SignJWT, jwtVerify } from 'jose';
import { getUserById } from './store';

// ── Centralized JWT Secret ──────────────────────────────
// CRITICAL: No fallback — crash loudly if JWT_SECRET is missing.
// This is the single source of truth; proxy.ts imports from here.
if (!process.env.JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is not set. ' +
    'Generate one with: openssl rand -base64 32'
  );
}

export const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);

const COOKIE_NAME = 'pwnops_token';

/** Whether cookies should be marked Secure (true in production) */
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/** Build a Set-Cookie header string with proper security attributes */
export function buildCookieHeader(token: string, maxAge: number = 60 * 60 * 24): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (IS_PRODUCTION) parts.push('Secure');
  return parts.join('; ');
}

/** Build a cookie-clearing header */
export function buildClearCookieHeader(): string {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (IS_PRODUCTION) parts.push('Secure');
  return parts.join('; ');
}

export async function signToken(payload: { userId: string; role: string; organizationId: string | null }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(jwtSecret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    return payload as { userId: string; role: string; organizationId: string | null };
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
  return { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId };
}

/** Get token from request for middleware (Edge-compatible) */
export async function verifyTokenFromCookie(cookieValue: string | undefined) {
  if (!cookieValue) return null;
  return verifyToken(cookieValue);
}

export { COOKIE_NAME };
