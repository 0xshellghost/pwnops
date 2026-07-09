import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, addUser } from '@/lib/store';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  // Validate CSRF state parameter
  const storedState = request.cookies.get('oauth_state')?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
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
        passwordHash: '!OAUTH_NO_PASSWORD!', // Sentinel — blocks password login
        role: 'analyst',
      };
      user = await addUser(newUserObj);
    }

    // 5. Issue JWT and set cookie
    const token = await signToken({
      userId: user.id,
      role: user.role,
      organizationId: user.organizationId,
    });

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    
    // Clear the OAuth state cookie
    response.cookies.delete('oauth_state');
    
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
