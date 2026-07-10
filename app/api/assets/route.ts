import { NextResponse } from 'next/server';
import { prisma } from '@/lib/store';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const skip = (page - 1) * limit;

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.asset.count({ where: { organizationId: user.organizationId } })
  ]);

  return NextResponse.json({
    data: assets,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, ipAddress, fqdn, type, status, tags } = await request.json();
    
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const asset = await prisma.asset.create({
      data: {
        name,
        ipAddress: ipAddress || null,
        fqdn: fqdn || null,
        type: type || 'ENDPOINT',
        status: status || 'ACTIVE',
        tags: tags || [],
        organizationId: user.organizationId
      }
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('Create asset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
