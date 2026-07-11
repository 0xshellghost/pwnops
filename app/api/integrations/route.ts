import { NextResponse } from 'next/server';
import { prisma } from '@/lib/store';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const integrations = await prisma.integration.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: integrations });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });

  try {
    const { name, type, endpoint, events } = await request.json();
    if (!name || !type || !endpoint || !events) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate webhook URL to prevent SSRF
    try {
      const url = new URL(endpoint);
      if (!['https:'].includes(url.protocol)) {
        return NextResponse.json({ error: 'Webhook URL must use HTTPS' }, { status: 400 });
      }
      // Block private/link-local/metadata IPs
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254', '[::1]'];
      if (blockedHosts.includes(url.hostname)) {
        return NextResponse.json({ error: 'Webhook URL cannot target internal addresses' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
    }

    const integration = await prisma.integration.create({
      data: {
        name,
        type,
        endpoint,
        events,
        organizationId: user.organizationId
      }
    });

    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    console.error('Create Integration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
