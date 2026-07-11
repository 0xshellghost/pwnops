// ──────────────────────────────────────────────────────────
// PwnOps — JWT Auth Helpers
// ──────────────────────────────────────────────────────────
import { SignJWT, jwtVerify } from 'jose';
import { getUserById, prisma } from './store';
import { createHash } from 'crypto';

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

export async function signToken(payload: { userId: string; role: string; organizationId: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(jwtSecret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    return payload as { userId: string; role: string; organizationId: string };
  } catch {
    return null;
  }
}

export async function signPreAuthToken(email: string): Promise<string> {
  return new SignJWT({ email, type: 'pre-auth' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(jwtSecret);
}

export async function verifyPreAuthToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    if (payload.type !== 'pre-auth') return null;
    return payload.email as string;
  } catch {
    return null;
  }
}

import { cookies } from 'next/headers';

/** Extract auth user from request cookies — for use in Route Handlers */
export async function getAuthUser(request: Request) {
  // 1. Try Bearer token
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawKey = authHeader.substring(7);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
    });
    
    if (apiKey) {
      prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      const user = await getUserById(apiKey.createdBy);
      if (user) {
        return { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: apiKey.organizationId };
      }
    }
  }

  // 2. Try Cookie
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
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
