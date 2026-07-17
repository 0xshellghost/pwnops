// ──────────────────────────────────────────────────────────
// PwnOps — Current User API
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return Response.json({ user });
}
