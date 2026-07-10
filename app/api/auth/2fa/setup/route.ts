import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/store';
import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Generate a new secret if not enabled yet, or if they want to reset
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(dbUser.email, 'PwnOps', secret);
  
  const qrCodeUrl = await QRCode.toDataURL(otpauth);

  return NextResponse.json({ secret, qrCodeUrl, enabled: dbUser.twoFactorEnabled });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token, secret } = await request.json();
  if (!token || !secret) return NextResponse.json({ error: 'Token and secret required' }, { status: 400 });

  const isValid = authenticator.check(token, secret);
  if (!isValid) return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });

  // Save the secret and enable 2FA
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: true },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: null, twoFactorEnabled: false },
  });

  return NextResponse.json({ success: true });
}
