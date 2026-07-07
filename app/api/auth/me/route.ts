// ──────────────────────────────────────────────────────────
// PwnOps — Current User API
// ──────────────────────────────────────────────────────────
import { getAuthUser, COOKIE_NAME } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return Response.json({ user });
}

/** Logout — clear the cookie */
export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return response;
}
