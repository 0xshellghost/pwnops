// ──────────────────────────────────────────────────────────
// PwnOps — Register API
// ──────────────────────────────────────────────────────────
import bcrypt from 'bcryptjs';
import { findUserByEmail, addUser } from '@/lib/store';
import { signToken, buildCookieHeader } from '@/lib/auth';

const MIN_PASSWORD_LENGTH = 8;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Optional: Restrict registration to specific domains for SOC environments
// Set ALLOWED_REGISTRATION_DOMAINS=yourcompany.com,partner.com in .env
const ALLOWED_DOMAINS = process.env.ALLOWED_REGISTRATION_DOMAINS
  ? process.env.ALLOWED_REGISTRATION_DOMAINS.split(',').map(d => d.trim().toLowerCase())
  : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return Response.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (typeof email !== 'string' || typeof name !== 'string' || typeof password !== 'string') {
      return Response.json({ error: 'Invalid input types' }, { status: 400 });
    }

    // Email format validation
    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Domain restriction (if configured)
    if (ALLOWED_DOMAINS) {
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
        return Response.json(
          { error: 'Registration is restricted to authorized organization domains. Contact your admin for access.' },
          { status: 403 }
        );
      }
    }

    // Server-side password strength validation
    if (password.length < MIN_PASSWORD_LENGTH) {
      return Response.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return Response.json(
        { error: 'Password must contain at least one uppercase letter, one lowercase letter, and one digit' },
        { status: 400 }
      );
    }

    if (name.trim().length === 0 || name.length > 100) {
      return Response.json({ error: 'Name must be between 1 and 100 characters' }, { status: 400 });
    }

    if (await findUserByEmail(email)) {
      return Response.json({ error: 'User already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      passwordHash,
      role: 'analyst' as const,
    };

    const newUser = await addUser(user);
    const token = await signToken({ userId: newUser.id, role: newUser.role, organizationId: newUser.organizationId });

    const response = Response.json({
      user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
    });

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        await resend.emails.send({
          from: 'PwnOps Security <onboarding@resend.dev>',
          to: email,
          subject: 'Welcome to PwnOps!',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Welcome to PwnOps, ${name}!</h2>
              <p>Your account has been successfully created.</p>
              <p>You can now log in and start managing your security scans and threats.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 4px; margin-top: 16px;">Go to Dashboard</a>
            </div>
          `
        });
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr);
      }
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV ONLY] Resend API key missing. Welcome email not sent to ${email}`);
    }

    // Set cookie with proper Secure flag
    response.headers.set('Set-Cookie', buildCookieHeader(token));

    return response;
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
