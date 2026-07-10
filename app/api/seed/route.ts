// ──────────────────────────────────────────────────────────
// PwnOps — Database Seed API (admin-only)
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';
import { seedIfEmpty } from '@/lib/store';

export async function POST(request: Request) {
  const user = await getAuthUser(request);

  // Allow unauthenticated seeding ONLY when the database is completely empty
  // (first-run bootstrap). Once users exist, require admin role.
  if (user && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  try {
    await seedIfEmpty();
    return Response.json({ ok: true, message: 'Seed completed (if database was empty)' });
  } catch (err) {
    console.error('Seed error:', err);
    return Response.json({ error: 'Seed failed' }, { status: 500 });
  }
}
