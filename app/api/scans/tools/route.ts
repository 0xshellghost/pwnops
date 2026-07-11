// ──────────────────────────────────────────────────────────
// PwnOps — Scan Tools Availability API
// Returns which scanning tools are installed on the worker.
// ──────────────────────────────────────────────────────────
import { getAuthUser } from '@/lib/auth';
import { TOOL_REGISTRY } from '@/lib/scan-engine';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let tools: { name: string; displayName?: string; description: string; available: boolean; binaryPath?: string | null }[] = [];
  const workerUrl = process.env.WORKER_URL || process.env.RENDER_WORKER_URL;

  if (workerUrl) {
    try {
      const headers: Record<string, string> = {};
      if (process.env.WORKER_API_KEY) {
        headers['x-api-key'] = process.env.WORKER_API_KEY;
      }
      const res = await fetch(`${workerUrl.replace(/\/$/, '')}/tools`, { cache: 'no-store', headers });
      if (res.ok) {
        tools = await res.json();
      }
    } catch (err: any) {
      console.error('Failed to fetch tools from worker:', err);
      return Response.json({ error: 'Worker fetch failed', details: err.message, url: workerUrl });
    }
  }
  // Fallback if worker is unreachable or URL is not set
  if (!tools || tools.length === 0) {
    tools = Object.entries(TOOL_REGISTRY).map(([name, tool]) => ({
        name,
        displayName: tool.displayName,
        description: tool.description,
        available: false,
        binaryPath: null,
    }));
  }

  return Response.json({
    tools,
    summary: {
      total: tools.length,
      available: tools.filter(t => t.available).length,
      missing: tools.filter(t => !t.available).map(t => t.displayName),
    },
  });
}
