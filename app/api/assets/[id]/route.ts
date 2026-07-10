import { NextResponse } from 'next/server';
import { prisma } from '@/lib/store';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await request.json();
    
    // Check if belongs to org
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        ipAddress: data.ipAddress !== undefined ? data.ipAddress : undefined,
        fqdn: data.fqdn !== undefined ? data.fqdn : undefined,
        type: data.type !== undefined ? data.type : undefined,
        status: data.status !== undefined ? data.status : undefined,
        tags: data.tags !== undefined ? data.tags : undefined,
      }
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Update asset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.asset.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete asset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
