import { prisma } from '@/lib/store';
import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  const { email, token } = await request.json();
  if (!email || !token) return NextResponse.json({ error: 'Email and token required' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { email } });
  if (!dbUser || !dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
    return NextResponse.json({ error: '2FA not enabled for this user' }, { status: 400 });
  }

  const isValid = authenticator.check(token, dbUser.twoFactorSecret);
  if (!isValid) return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });

  const jwt = await signToken({ userId: dbUser.id, role: dbUser.role, organizationId: dbUser.organizationId });

  const res = NextResponse.json({ user: { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role } });
  res.cookies.set('token', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return res;
}
