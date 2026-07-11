import { NextResponse } from 'next/server';
import { prisma } from '@/lib/store';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success even if user not found to prevent user enumeration
      return NextResponse.json({ success: true, message: 'If the email exists, a reset link was sent.' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // TODO: Integrate a real email provider (Resend, SendGrid, etc.)
    // For now, this endpoint generates and stores the token but does not send it.
    // In development, log the token for testing purposes only.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV ONLY] Password reset token for ${email}: ${token}`);
    }

    return NextResponse.json({ success: true, message: 'If the email exists, a reset link was sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
