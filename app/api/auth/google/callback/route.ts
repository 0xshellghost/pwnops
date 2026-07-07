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

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
  
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=unconfigured', request.url));
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }
    
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    const googleUser = await userRes.json();
    const primaryEmail = googleUser.email;

    if (!primaryEmail) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }

    // 3. Find or Create User in Store
    let user = findUserByEmail(primaryEmail);
    if (!user) {
      user = {
        id: uuid(),
        name: googleUser.name || 'Google User',
        email: primaryEmail,
        passwordHash: '', // OAuth users don't use a password hash
        role: 'analyst', // Default role for new users
        createdAt: new Date().toISOString(),
      };
      addUser(user);
    }

    // 4. Issue JWT and set cookie
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
    console.error('Google OAuth Error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}
