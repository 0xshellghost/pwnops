// ──────────────────────────────────────────────────────────
// PwnOps — Database Seed API (admin-only or first-run)
// ──────────────────────────────────────────────────────────
import { seedIfEmpty } from '@/lib/store';

export async function POST() {
  try {
    await seedIfEmpty();
    return Response.json({ ok: true, message: 'Seed completed (if database was empty)' });
  } catch (err) {
    console.error('Seed error:', err);
    return Response.json({ error: 'Seed failed' }, { status: 500 });
  }
}
