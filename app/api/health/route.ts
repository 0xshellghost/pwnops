import { prisma } from '@/lib/store';

export async function GET(request: Request) {
  const workerUrl = process.env.WORKER_URL || process.env.RENDER_WORKER_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:10000' : undefined);

  let workerStatus = 'degraded';
  let dbStatus = 'degraded';

  // Check Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'online';
  } catch (err) {
    console.error('Failed to fetch db health:', err);
  }

  // Check Worker
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

  return Response.json({
    frontend: 'online', // if this endpoint runs, frontend is online
    database: dbStatus,
    worker: workerStatus,
    websocket: workerStatus // websocket is part of worker in this architecture
  });
}
