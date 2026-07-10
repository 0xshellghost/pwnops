import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/store';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user || !user.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = user.organizationId;

  const [
    totalIncidents, activeIncidents, criticalIncidents,
    highIncidents, medIncidents, lowIncidents,
    totalScans, completedScans, failedScans,
    totalVulns, openVulns, criticalVulns,
    recentVulns, threatFeed
  ] = await Promise.all([
    prisma.incident.count({ where: { organizationId: orgId } }),
    prisma.incident.count({ where: { organizationId: orgId, status: { not: 'resolved' } } }),
    prisma.incident.count({ where: { organizationId: orgId, severity: 'critical', status: { not: 'resolved' } } }),
    prisma.incident.count({ where: { organizationId: orgId, severity: 'high', status: { not: 'resolved' } } }),
    prisma.incident.count({ where: { organizationId: orgId, severity: 'medium', status: { not: 'resolved' } } }),
    prisma.incident.count({ where: { organizationId: orgId, severity: 'low', status: { not: 'resolved' } } }),
    
    prisma.scan.count({ where: { organizationId: orgId } }),
    prisma.scan.count({ where: { organizationId: orgId, status: 'completed' } }),
    prisma.scan.count({ where: { organizationId: orgId, status: 'failed' } }),
    
    prisma.vulnerability.count({ where: { organizationId: orgId } }),
    prisma.vulnerability.count({ where: { organizationId: orgId, status: 'open' } }),
    prisma.vulnerability.count({ where: { organizationId: orgId, severity: 'critical' } }),
    
    prisma.vulnerability.findMany({ where: { organizationId: orgId }, orderBy: { discoveredAt: 'desc' }, take: 4 }),
    prisma.threatFeedEntry.findMany({ where: { organizationId: orgId }, orderBy: { timestamp: 'desc' }, take: 5 })
  ]);

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
