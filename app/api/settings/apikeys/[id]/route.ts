import { NextResponse } from 'next/server';
import { prisma } from '@/lib/store';
import { getAuthUser } from '@/lib/auth';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.apiKey.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete API Key error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
