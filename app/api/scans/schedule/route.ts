import { NextResponse } from 'next/server';
import { prisma } from '@/lib/store';
import { getAuthUser } from '@/lib/auth';
import { CronExpressionParser } from 'cron-parser';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const schedules = await prisma.scheduledScan.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ data: schedules });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { toolName, target, cronSchedule } = await request.json();
    
    if (!toolName || !target || !cronSchedule) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let nextRunAt: Date;
    try {
      const interval = CronExpressionParser.parse(cronSchedule);
      nextRunAt = interval.next().toDate();
    } catch (err) {
      return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 });
    }

    const schedule = await prisma.scheduledScan.create({
      data: {
        toolName,
        target,
        cronSchedule,
        nextRunAt,
        createdBy: user.id,
        organizationId: user.organizationId
      }
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('Create schedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
