// ──────────────────────────────────────────────────────────
// PwnOps — Proxy (Route Protection + Security Headers)
// Next.js 16: renamed from middleware.ts → proxy.ts
// ──────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Import the centralized secret — single source of truth
import { jwtSecret, COOKIE_NAME } from '@/lib/auth';

// ── Rate Limiting (Upstash Redis with in-memory fallback) ──
let ratelimitAuth: Ratelimit | null = null;
let ratelimitApi: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  ratelimitAuth = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), analytics: true });
  ratelimitApi = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, '1 m'), analytics: true });
}

// In-memory fallback
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_AUTH = 10;
const RATE_LIMIT_API = 120;

function isRateLimitedInMemory(ip: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}

function runProbabilisticCleanup() {
  if (Math.random() < 0.05) {
    const now = Date.now();
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }
}

// ── Security Headers ────────────────────────────────────
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP: Added ws: and wss: to connect-src to allow real-time worker updates
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws: wss:; frame-ancestors 'none';"
  );
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  return response;
}

export async function proxy(request: NextRequest) {
  if (!ratelimitAuth) runProbabilisticCleanup();
  
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

  // ── CSRF Protection ────────────────────────────────────
  // Validate Origin header for state-changing requests
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const forwardedHost = request.headers.get('x-forwarded-host');
    const validHost = forwardedHost || host;
    
    // Only enforce if origin is present (browsers will send this for POST/PUT/DELETE)
    if (origin && validHost) {
      const originUrl = new URL(origin);
      if (originUrl.host !== validHost) {
        return addSecurityHeaders(NextResponse.json({ error: 'CSRF token mismatch or invalid origin.' }, { status: 403 }));
      }
    }
  }

  // ── Rate Limiting ──────────────────────────────────────
  let rateLimited = false;
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
    if (ratelimitAuth) {
      const { success } = await ratelimitAuth.limit(`auth:${ip}`);
      rateLimited = !success;
    } else {
      rateLimited = isRateLimitedInMemory(`auth:${ip}`, RATE_LIMIT_AUTH);
    }
  } else if (pathname.startsWith('/api/')) {
    if (ratelimitApi) {
      const { success } = await ratelimitApi.limit(`api:${ip}`);
      rateLimited = !success;
    } else {
      rateLimited = isRateLimitedInMemory(`api:${ip}`, RATE_LIMIT_API);
    }
  }

  if (rateLimited) {
    return addSecurityHeaders(NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 }));
  }

  // ── Route Protection (API & Dashboard) ─────────────────
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isProtectedApiRoute = pathname.startsWith('/api/') && 
                              !pathname.startsWith('/api/auth/') && 
                              !pathname.startsWith('/api/seed');

  if (isDashboardRoute || isProtectedApiRoute) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    
    if (!token) {
      if (isProtectedApiRoute) {
        return addSecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }
      return addSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
    }
    
    try {
      await jwtVerify(token, jwtSecret);
      // Valid token, proceed
    } catch {
      // Token invalid or expired
      if (isProtectedApiRoute) {
        const res = NextResponse.json({ error: 'Session expired' }, { status: 401 });
        res.cookies.delete(COOKIE_NAME);
        return addSecurityHeaders(res);
      }
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(COOKIE_NAME);
      return addSecurityHeaders(response);
    }
  }

  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
