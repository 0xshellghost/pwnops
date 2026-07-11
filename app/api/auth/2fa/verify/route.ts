import { prisma } from '@/lib/store';
import { NextResponse } from 'next/server';
import { verifySync } from 'otplib';
import { signToken, buildCookieHeader, verifyPreAuthToken } from '@/lib/auth';

export async function POST(request: Request) {
  const { preAuthToken, token } = await request.json();
  if (!preAuthToken || !token) return NextResponse.json({ error: 'Pre-auth token and 2FA code required' }, { status: 400 });

  const email = await verifyPreAuthToken(preAuthToken);
  if (!email) return NextResponse.json({ error: 'Invalid or expired pre-auth session' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email } });
  if (!dbUser || !dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
    return NextResponse.json({ error: '2FA not enabled for this user' }, { status: 400 });
  }

  const isValid = verifySync({ token, secret: dbUser.twoFactorSecret }).valid;
  if (!isValid) return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });

  const jwt = await signToken({ userId: dbUser.id, role: dbUser.role, organizationId: dbUser.organizationId });

  const res = NextResponse.json({ user: { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role } });
  res.headers.set('Set-Cookie', buildCookieHeader(jwt));

  return res;
}
