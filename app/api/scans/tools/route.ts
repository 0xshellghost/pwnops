// ──────────────────────────────────────────────────────────
// PwnOps — Scan Tools Availability API
// Returns which scanning tools are installed on the worker.
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';
import { getAvailableTools } from '@/lib/scan-engine';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const tools = getAvailableTools();

  return Response.json({
    tools,
    summary: {
      total: tools.length,
      available: tools.filter(t => t.available).length,
      missing: tools.filter(t => !t.available).map(t => t.displayName),
    },
  });
}
