// ──────────────────────────────────────────────────────────
// PwnOps — Logout API
// ──────────────────────────────────────────────────────────
import { getAuthUser, buildClearCookieHeader } from '@/lib/auth';
import { logAudit } from '@/lib/store';

export async function POST(request: Request) {
  // Attempt to identify the user for audit logging before clearing the session
  const user = await getAuthUser(request);

  const response = Response.json({ ok: true });
  response.headers.set('Set-Cookie', buildClearCookieHeader());

  if (user) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    logAudit({
      userId: user.id,
      action: 'LOGOUT',
      details: `User logged out from ${ip}`,
      ip,
      organizationId: user.organizationId,
    });
  }

  return response;
}
