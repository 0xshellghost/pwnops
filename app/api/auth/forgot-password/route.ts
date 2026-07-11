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

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: 'PwnOps Security <onboarding@resend.dev>',
        to: email,
        subject: 'Reset your PwnOps Password',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>PwnOps Password Reset</h2>
            <p>You requested a password reset for your PwnOps account.</p>
            <p>Click the link below to securely reset your password. This link will expire in 15 minutes.</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 4px; margin-top: 16px;">Reset Password</a>
            <p style="margin-top: 32px; font-size: 12px; color: #666;">If you did not request this, please ignore this email.</p>
          </div>
        `
      });
    } else {
      console.log(`[DEV ONLY] Resend API key missing. Password reset URL for ${email}:\n${resetUrl}`);
    }

    return NextResponse.json({ success: true, message: 'If the email exists, a reset link was sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
