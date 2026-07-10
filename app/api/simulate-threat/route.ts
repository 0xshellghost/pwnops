import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/store';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user || !user.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const threats = [
    'Critical: Unauthorized AWS IAM Access Detected from IP 192.168.1.104',
    'High: Brute force attempt blocked on Admin Panel',
    'Medium: Suspicious lateral movement from Workstation-Alpha',
    'High: SQL Injection payload detected on /api/login',
    'Critical: Data exfiltration attempt to unknown ASN'
  ];
  
  const randomThreat = threats[Math.floor(Math.random() * threats.length)];

  await prisma.threatFeedEntry.create({
    data: {
      message: randomThreat,
      organizationId: user.organizationId
    }
  });

  return NextResponse.json({ success: true, message: randomThreat });
}
