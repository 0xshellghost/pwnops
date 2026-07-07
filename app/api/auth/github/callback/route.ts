import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, addUser } from '@/lib/store';
import { signToken, COOKIE_NAME } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=unconfigured', request.url));
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }
    
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const ghUser = await userRes.json();

    // 3. Fetch user email
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const emails = await emailsRes.json();
    const primaryEmail = emails.find((e: any) => e.primary)?.email || emails[0]?.email;

    if (!primaryEmail) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }

    // 4. Find or Create User in Store
    let user = await findUserByEmail(primaryEmail);
    if (!user) {
      const newUserObj = {
        name: ghUser.name || ghUser.login || 'GitHub User',
        email: primaryEmail,
        passwordHash: '', // OAuth users don't use a password hash
        role: 'analyst', // Default role for new users
      };
      user = await addUser(newUserObj);
    }

    // 5. Issue JWT and set cookie
    const token = await signToken({
      userId: user.id,
      role: user.role,
    });

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('GitHub OAuth Error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}
