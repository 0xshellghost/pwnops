export async function GET(request: Request) {
  const workerUrl = process.env.WORKER_URL || process.env.RENDER_WORKER_URL;

  let workerStatus = 'degraded';

  if (workerUrl) {
    try {
      const headers: Record<string, string> = {};
      if (process.env.WORKER_API_KEY) {
        headers['x-api-key'] = process.env.WORKER_API_KEY;
      }
      
      // The worker has a /health endpoint that just returns 200 { status: 'healthy' }
      const res = await fetch(`${workerUrl.replace(/\/$/, '')}/health`, { cache: 'no-store', headers });
      if (res.ok) {
        workerStatus = 'online';
      }
    } catch (err) {
      console.error('Failed to fetch worker health:', err);
    }
  }

  return Response.json({ status: workerStatus });
}
