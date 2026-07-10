import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { Incident, Scan } from './types';

const globalForPrisma = global as unknown as { prisma: PrismaClient; seeded: boolean };

const createPrismaClient = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ── User CRUD ────────────────────────────────────────────
export async function getOrganizationById(id: string) { return prisma.organization.findUnique({ where: { id } }); }

export async function getUsers(organizationId: string) { 
  const users = await prisma.user.findMany({ where: { organizationId } });
  return users.map(u => ({ ...u, passwordHash: '' })); 
}
export async function getUserById(id: string) { return prisma.user.findUnique({ where: { id } }); }
export async function findUserByEmail(email: string) { 
  return prisma.user.findUnique({ where: { email } }); 
}
export async function addUser(u: {
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  organizationId?: string | null;
}) {
  let orgId = u.organizationId;
  if (!orgId) {
    const org = await prisma.organization.create({ data: { name: `${u.name || 'User'}'s SOC Team` } });
    orgId = org.id;
  }
  return prisma.user.create({ data: { email: u.email, name: u.name, passwordHash: u.passwordHash, role: u.role, organizationId: orgId } });
}
export async function updateUserRole(id: string, role: string, organizationId: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.organizationId !== organizationId) return null;
  return prisma.user.update({ where: { id }, data: { role } });
}

// ── Incident CRUD ────────────────────────────────────────
export async function getIncidents(organizationId: string, page = 1, limit = 50) { 
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.incident.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.incident.count({ where: { organizationId } })
  ]);
  return { data, total, page, totalPages: Math.ceil(total / limit) };
}
export async function getIncidentById(id: string) { return prisma.incident.findUnique({ where: { id } }); }
export async function addIncident(i: Omit<Incident, 'id' | 'numericId' | 'createdAt' | 'updatedAt'>) {
  return prisma.incident.create({
    data: {
      title: i.title,
      description: i.description,
      severity: i.severity,
      status: i.status,
      assigneeId: i.assigneeId,
      assigneeName: i.assigneeName,
      createdBy: i.createdBy,
      mitigationSteps: i.mitigationSteps,
      organizationId: i.organizationId,
    },
  });
}
export async function updateIncidentStatus(id: string, status: string, organizationId: string) {
  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident || incident.organizationId !== organizationId) return null;
  return prisma.incident.update({ where: { id }, data: { status } });
}

export async function updateIncident(id: string, update: Partial<Incident>, organizationId: string) {
  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident || incident.organizationId !== organizationId) return null;
  const { id: _id, numericId: _numericId, createdAt: _createdAt, updatedAt: _updatedAt, organizationId: _oid, ...safeUpdate } = update as Partial<Incident> & Record<string, unknown>;
  return prisma.incident.update({ where: { id }, data: safeUpdate });
}

export async function deleteIncident(id: string, organizationId: string) {
  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident || incident.organizationId !== organizationId) return false;
  await prisma.incidentComment.deleteMany({ where: { incidentId: id } });
  await prisma.incident.delete({ where: { id } });
  return true;
}

export async function addComment(incidentId: string, userId: string, content: string, organizationId: string) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident || incident.organizationId !== organizationId) return null;
  return prisma.incidentComment.create({
    data: { content, incidentId, userId },
    include: { user: { select: { name: true, email: true } } }
  });
}

export async function getComments(incidentId: string, organizationId: string) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident || incident.organizationId !== organizationId) return [];
  return prisma.incidentComment.findMany({
    where: { incidentId },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } }
  });
}

// ── Vulnerability CRUD ───────────────────────────────────
export async function getVulnerabilities(organizationId: string, page = 1, limit = 50) { 
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.vulnerability.findMany({ where: { organizationId }, orderBy: { discoveredAt: 'desc' }, skip, take: limit }),
    prisma.vulnerability.count({ where: { organizationId } })
  ]);
  return { data, total, page, totalPages: Math.ceil(total / limit) };
}
export async function getVulnById(id: string) { return prisma.vulnerability.findUnique({ where: { id } }); }
export async function updateVulnStatus(id: string, status: string, organizationId: string) {
  const vuln = await prisma.vulnerability.findUnique({ where: { id } });
  if (!vuln || vuln.organizationId !== organizationId) return null;
  return prisma.vulnerability.update({ where: { id }, data: { status } });
}

// ── Scan CRUD ────────────────────────────────────────────
export async function getScans(organizationId: string, page = 1, limit = 50) { 
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.scan.findMany({ where: { organizationId }, orderBy: { startedAt: 'desc' }, skip, take: limit }),
    prisma.scan.count({ where: { organizationId } })
  ]);
  return { data, total, page, totalPages: Math.ceil(total / limit) };
}
export async function addScan(s: Omit<Scan, 'id'>) {
  return prisma.scan.create({
    data: {
      toolName: s.toolName,
      target: s.target,
      status: s.status,
      progress: s.progress,
      triggeredById: s.triggeredById,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      results: s.results ? (s.results as any) : undefined,
      organizationId: s.organizationId,
    },
  });
}
export async function updateScan(id: string, update: Partial<Pick<Scan, 'progress' | 'status' | 'results' | 'completedAt'>>, organizationId?: string) {
  // If organizationId is provided, verify the scan belongs to that org
  if (organizationId) {
    const scan = await prisma.scan.findUnique({ where: { id } });
    if (!scan || scan.organizationId !== organizationId) return null;
  }
  return prisma.scan.update({ where: { id }, data: { ...update, results: update.results ? (update.results as any) : undefined } });
}

// ── Threat Feed ──────────────────────────────────────────
export async function getThreatFeed(organizationId: string) { return prisma.threatFeedEntry.findMany({ where: { organizationId }, orderBy: { timestamp: 'desc' } }); }

// ── Seed Data ────────────────────────────────────────────
// Seed is now a one-time explicit action, NOT called on every read.
// Use `seedIfEmpty()` only from a startup script or a dedicated admin endpoint.
let seedPromise: Promise<void> | null = null;

export async function seedIfEmpty() {
  // Use a shared promise to prevent concurrent seeding (race condition fix)
  if (globalForPrisma.seeded) return;
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const count = await prisma.user.count();
      if (count > 0) {
        globalForPrisma.seeded = true;
        return;
      }

      console.log('Seeding Supabase Database...');

      const org = await prisma.organization.create({ data: { name: 'PwnOps Default SOC' } });
      const orgId = org.id;

      // Strict check for environment variables — NO fallback hardcoded passwords
      const seedAdminPw = process.env.SEED_ADMIN_PASSWORD;
      const seedAnalystPw = process.env.SEED_ANALYST_PASSWORD;
      const seedViewerPw = process.env.SEED_VIEWER_PASSWORD;

      if (!seedAdminPw || !seedAnalystPw || !seedViewerPw) {
        throw new Error('Seed passwords must be provided via environment variables (SEED_ADMIN_PASSWORD, SEED_ANALYST_PASSWORD, SEED_VIEWER_PASSWORD)');
      }

      const adminHash = bcrypt.hashSync(seedAdminPw, 12);
      const analystHash = bcrypt.hashSync(seedAnalystPw, 12);

      const admin = await prisma.user.create({ data: { email: 'admin@pwnops.sec', name: 'Admin', passwordHash: adminHash, role: 'admin', organizationId: orgId }});
      const analyst1 = await prisma.user.create({ data: { email: 'j.doe@pwnops.sec', name: 'J. Doe', passwordHash: analystHash, role: 'analyst', organizationId: orgId }});
      const analyst2 = await prisma.user.create({ data: { email: 'm.smith@pwnops.sec', name: 'M. Smith', passwordHash: analystHash, role: 'analyst', organizationId: orgId }});
      await prisma.user.create({ data: { email: 'viewer@pwnops.sec', name: 'A. Kumar', passwordHash: bcrypt.hashSync(seedViewerPw, 12), role: 'viewer', organizationId: orgId }});

      await prisma.incident.createMany({
        data: [
          { title: 'Exfiltration attempt on DB-01', description: 'Detected unusual outbound data transfer from database server DB-01 to external IP.', severity: 'critical', status: 'new', assigneeId: analyst1.id, assigneeName: 'J. Doe', createdBy: admin.id, mitigationSteps: [], organizationId: orgId },
          { title: 'Unauthorized login from unknown ASN', description: 'Multiple login attempts from an unrecognized autonomous system number detected.', severity: 'high', status: 'new', assigneeId: analyst2.id, assigneeName: 'M. Smith', createdBy: admin.id, mitigationSteps: [], organizationId: orgId },
          { title: 'Suspicious activity on /auth endpoint', description: 'Rate-limited brute force attempts detected on the authentication endpoint.', severity: 'medium', status: 'new', createdBy: admin.id, mitigationSteps: [], organizationId: orgId },
          { title: 'Outdated TLS certificate on staging', description: 'TLS certificate on staging-app-4 expires in 3 days.', severity: 'low', status: 'new', createdBy: admin.id, mitigationSteps: [], organizationId: orgId },
        ]
      });

      await prisma.vulnerability.createMany({
        data: [
          { cveId: 'CVE-2024-4321', version: 'v2.1', title: 'Unauthenticated Remote Code Execution in Gateway', description: 'Buffer overflow in the SSL/TLS termination module allows unauthenticated remote code execution.', severity: 'critical', cvssScore: 9.8, affectedAsset: 'PROD-GW-01', status: 'open', organizationId: orgId },
          { cveId: 'CVE-2023-9982', version: 'v1.4', title: 'SQL Injection in User Profile Endpoint', description: 'Insufficient sanitization of the sort parameter in the user profile API.', severity: 'high', cvssScore: 8.1, affectedAsset: 'USER-DB-CLUSTER', status: 'in_progress', organizationId: orgId },
          { cveId: 'CVE-2024-1102', version: 'v3.0', title: 'Exposed Debug Information', description: 'Internal system paths leaking in HTTP error responses on staging environment.', severity: 'medium', cvssScore: 5.4, affectedAsset: 'STAGING-APP-4', status: 'fixed', organizationId: orgId },
        ]
      });
      
      await prisma.threatFeedEntry.createMany({
        data: [
          { message: 'Brute force detected from 101.2.4.1', organizationId: orgId },
          { message: 'SQLi attempt blocked on App-Server-02', organizationId: orgId },
          { message: 'Lateral movement audit initiated', organizationId: orgId },
        ]
      });

      globalForPrisma.seeded = true;
      console.log('Seeding complete.');
    } catch (err) {
      console.error('Seeding error:', err);
    } finally {
      seedPromise = null;
    }
  })();

  return seedPromise;
}
// ── Audit Logging ────────────────────────────────────────
export async function logAudit(entry: {
  userId: string;
  action: string;
  resource?: string;
  details?: string;
  ip?: string;
  organizationId: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource || null,
        details: entry.details || null,
        ip: entry.ip || null,
        organizationId: entry.organizationId,
      },
    });
  } catch (err) {
    // Audit logging should never crash the app — log and continue
    console.error('Audit log write failed:', err);
  }
}

export async function getAuditLogs(organizationId: string, limit = 50) {
  return prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}
