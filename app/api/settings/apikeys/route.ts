import { NextResponse } from 'next/server';
import { prisma } from '@/lib/store';
import { getAuthUser } from '@/lib/auth';
import { createHash, randomBytes } from 'crypto';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKeys = await prisma.apiKey.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: apiKeys });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    // Generate random 32-byte API key
    const rawKey = randomBytes(32).toString('hex');
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const prefix = `pk_${rawKey.substring(0, 8)}`; // Just for identification in UI

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        prefix,
        createdBy: user.id,
        organizationId: user.organizationId
      }
    });

    // We only return the rawKey ONCE, it is never stored!
    return NextResponse.json({ apiKey, rawKey }, { status: 201 });
  } catch (error) {
    console.error('Create API Key error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
