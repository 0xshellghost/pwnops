import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { jwtSecret, COOKIE_NAME } from '@/lib/auth';

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

// Fallback in-memory rate limiter for local dev and tests
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

function sweepOldRateLimitEntries() {
  if (Math.random() < 0.05) {
    const now = Date.now();
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // ws/wss included in connect-src for worker status stream
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
  if (!ratelimitAuth) sweepOldRateLimitEntries();
  
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

  // Origin check for state-mutating requests
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
    const origin = request.headers.get('origin');
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    
    if (origin && host) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return withSecurityHeaders(NextResponse.json({ error: 'CSRF token mismatch or invalid origin.' }, { status: 403 }));
      }
    }
  }

  // Rate limiting check
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
    return withSecurityHeaders(NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 }));
  }

  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isProtectedApiRoute = pathname.startsWith('/api/') && 
                              !pathname.startsWith('/api/auth/') && 
                              !pathname.startsWith('/api/health') && 
                              !pathname.startsWith('/api/seed');

  if (isDashboardRoute || isProtectedApiRoute) {
    const authHeader = request.headers.get('authorization');
    const hasBearerToken = isProtectedApiRoute && authHeader && authHeader.startsWith('Bearer ');
    const token = request.cookies.get(COOKIE_NAME)?.value;
    
    // Pass Bearer token through to route handlers (they validate API key against DB)
    if (!token && hasBearerToken) {
      return withSecurityHeaders(NextResponse.next());
    }

    if (!token) {
      if (isProtectedApiRoute) {
        return withSecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }
      return withSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
    }
    
    try {
      await jwtVerify(token, jwtSecret);
    } catch {
      if (isProtectedApiRoute) {
        if (hasBearerToken) {
          return withSecurityHeaders(NextResponse.next());
        }
        const res = NextResponse.json({ error: 'Session expired' }, { status: 401 });
        res.cookies.delete(COOKIE_NAME);
        return withSecurityHeaders(res);
      }
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(COOKIE_NAME);
      return withSecurityHeaders(response);
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
