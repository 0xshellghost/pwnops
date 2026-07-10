import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/store';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user || !user.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = user.organizationId;

  const totalIncidents = await prisma.incident.count({ where: { organizationId: orgId } });
  const activeIncidents = await prisma.incident.count({ where: { organizationId: orgId, status: { not: 'resolved' } } });
  const criticalIncidents = await prisma.incident.count({ where: { organizationId: orgId, severity: 'critical', status: { not: 'resolved' } } });
  const highIncidents = await prisma.incident.count({ where: { organizationId: orgId, severity: 'high', status: { not: 'resolved' } } });
  const medIncidents = await prisma.incident.count({ where: { organizationId: orgId, severity: 'medium', status: { not: 'resolved' } } });
  const lowIncidents = await prisma.incident.count({ where: { organizationId: orgId, severity: 'low', status: { not: 'resolved' } } });
  
  const totalScans = await prisma.scan.count({ where: { organizationId: orgId } });
  const completedScans = await prisma.scan.count({ where: { organizationId: orgId, status: 'completed' } });
  const failedScans = await prisma.scan.count({ where: { organizationId: orgId, status: 'failed' } });
  
  const totalVulns = await prisma.vulnerability.count({ where: { organizationId: orgId } });
  const openVulns = await prisma.vulnerability.count({ where: { organizationId: orgId, status: 'open' } });
  const criticalVulns = await prisma.vulnerability.count({ where: { organizationId: orgId, severity: 'critical' } });
  
  const recentVulns = await prisma.vulnerability.findMany({ where: { organizationId: orgId }, orderBy: { discoveredAt: 'desc' }, take: 4 });
  const threatFeed = await prisma.threatFeedEntry.findMany({ where: { organizationId: orgId }, orderBy: { timestamp: 'desc' }, take: 5 });

  return NextResponse.json({
    incidents: {
      total: totalIncidents,
      active: activeIncidents,
      critical: criticalIncidents,
      high: highIncidents,
      medium: medIncidents,
      low: lowIncidents
    },
    scans: {
      total: totalScans,
      completed: completedScans,
      failed: failedScans
    },
    vulns: {
      total: totalVulns,
      open: openVulns,
      critical: criticalVulns,
      recent: recentVulns
    },
    threatFeed
  });
}
