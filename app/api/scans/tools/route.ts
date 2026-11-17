import { getAuthUser } from '@/lib/auth';
import { getAvailableTools } from '@/lib/scan-engine';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let tools: { name: string; displayName?: string; description: string; available: boolean; binaryPath?: string | null }[] = [];
  const workerUrl = process.env.WORKER_URL || process.env.RENDER_WORKER_URL;
  let workerConnected = false;

  if (workerUrl) {
    try {
      const headers: Record<string, string> = {};
      if (process.env.WORKER_API_KEY) {
        headers['x-api-key'] = process.env.WORKER_API_KEY;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${workerUrl.replace(/\/$/, '')}/tools`, {
        cache: 'no-store',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        tools = await res.json();
        workerConnected = true;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[PwnOps] Scan worker at ${workerUrl} unreachable (${errMsg}). Falling back to local tool registry.`);
    }
  }

  // Fallback if worker is unreachable, timed out, or URL is not set
  if (!tools || tools.length === 0) {
    tools = getAvailableTools();
  }

  return Response.json({
    tools,
    summary: {
      total: tools.length,
      available: tools.filter(t => t.available).length,
      missing: tools.filter(t => !t.available).map(t => t.displayName),
    },
    workerConnected,
  });
}
