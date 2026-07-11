import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  return Response.json({ key: process.env.WORKER_API_KEY || '' });
}
