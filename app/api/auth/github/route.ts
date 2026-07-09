import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GitHub OAuth not configured in environment variables' }, { status: 500 });
  }

  const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/github/callback';
  
  // Generate CSRF state parameter
  const state = crypto.randomBytes(32).toString('hex');
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user user:email&state=${state}`;

  const response = NextResponse.redirect(githubAuthUrl);
  // Store state in a short-lived cookie for validation on callback
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return response;
}
