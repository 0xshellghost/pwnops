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

  try {
    const { name, type, endpoint, events } = await request.json();
    if (!name || !type || !endpoint || !events) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
