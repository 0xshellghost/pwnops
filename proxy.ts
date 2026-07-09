// ──────────────────────────────────────────────────────────
// PwnOps — Proxy (Route Protection + Security Headers)
// Next.js 16: renamed from middleware.ts → proxy.ts
// ──────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Import the centralized secret — single source of truth
import { jwtSecret, COOKIE_NAME } from '@/lib/auth';

// ── Rate Limiting (in-memory, per-IP) ───────────────────
// NOTE: In-memory rate limiting is per-instance only.
// For true production rate limiting on serverless, use Redis/Upstash.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_AUTH = 10;       // 10 auth attempts per window
const RATE_LIMIT_API = 120;       // 120 API calls per window

function isRateLimited(ip: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}

// Periodic cleanup to prevent memory leaks
if (typeof globalThis !== 'undefined') {
  const cleanup = () => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  };
  // Run every 5 minutes
  setInterval(cleanup, 300_000).unref?.();
}

// ── Security Headers ────────────────────────────────────
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Clickjacking protection
  response.headers.set('X-Frame-Options', 'DENY');
  // XSS filter
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none';"
  );
  // Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  // Permissions Policy — restrict powerful features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  // ── Rate limit auth endpoints ─────────────────────────
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
    if (isRateLimited(`auth:${ip}`, RATE_LIMIT_AUTH)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        )
      );
    }
  }

  // ── Rate limit all API endpoints ──────────────────────
  if (pathname.startsWith('/api/')) {
    if (isRateLimited(`api:${ip}`, RATE_LIMIT_API)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Rate limit exceeded.' },
          { status: 429 }
        )
      );
    }
  }

  // ── Protect all /dashboard routes ─────────────────────
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return addSecurityHeaders(
        NextResponse.redirect(new URL('/login', request.url))
      );
    }
    try {
      await jwtVerify(token, jwtSecret);
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    } catch {
      // Token invalid or expired — clear and redirect
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
