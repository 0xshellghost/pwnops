import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { User, Incident, Vulnerability, Scan, ThreatFeedEntry } from './types';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

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
export async function getUsers() { 
  await seedIfEmpty();
  const users = await prisma.user.findMany();
  return users.map(u => ({ ...u, passwordHash: '' })); 
}
export async function getUserById(id: string) { return prisma.user.findUnique({ where: { id } }); }
export async function findUserByEmail(email: string) { 
  await seedIfEmpty();
  return prisma.user.findUnique({ where: { email } }); 
}
export async function addUser(u: any) {
  let orgId = u.organizationId;
  if (!orgId) {
    const org = await prisma.organization.create({ data: { name: `${u.name || 'User'}'s SOC Team` } });
    orgId = org.id;
  }
  return prisma.user.create({ data: { ...u, organizationId: orgId } });
}
export async function updateUserRole(id: string, role: string) {
  return prisma.user.update({ where: { id }, data: { role } });
}

// ── Incident CRUD ────────────────────────────────────────
export async function getIncidents() { 
  await seedIfEmpty();
  return prisma.incident.findMany({ orderBy: { createdAt: 'desc' } }); 
}
export async function getIncidentById(id: string) { return prisma.incident.findUnique({ where: { id } }); }
export async function addIncident(i: Omit<Incident, 'id' | 'numericId' | 'createdAt' | 'updatedAt'>) {
  return prisma.incident.create({ data: i as any });
}
export async function updateIncidentStatus(id: string, status: string) {
  return prisma.incident.update({ where: { id }, data: { status } });
}

// ── Vulnerability CRUD ───────────────────────────────────
export async function getVulnerabilities() { 
  await seedIfEmpty();
  return prisma.vulnerability.findMany({ orderBy: { discoveredAt: 'desc' } }); 
}
export async function getVulnById(id: string) { return prisma.vulnerability.findUnique({ where: { id } }); }
export async function updateVulnStatus(id: string, status: string) {
  return prisma.vulnerability.update({ where: { id }, data: { status } });
}

// ── Scan CRUD ────────────────────────────────────────────
export async function getScans() { return prisma.scan.findMany({ orderBy: { startedAt: 'desc' } }); }
export async function addScan(s: Omit<Scan, 'id'>) {
  return prisma.scan.create({ data: s as any });
}
export async function updateScan(id: string, update: Partial<Scan>) {
  return prisma.scan.update({ where: { id }, data: update as any });
}

// ── Threat Feed ──────────────────────────────────────────
export async function getThreatFeed() { return prisma.threatFeedEntry.findMany({ orderBy: { timestamp: 'desc' } }); }

// ── Seed Data ────────────────────────────────────────────
let seeding = false;
export async function seedIfEmpty() {
  if (seeding) return;
  const count = await prisma.user.count();
  if (count > 0) return;
  
  seeding = true;
  console.log('Seeding Supabase Database...');

  const adminHash = bcrypt.hashSync('admin123', 12);
  const analystHash = bcrypt.hashSync('analyst123', 12);

  const admin = await prisma.user.create({ data: { email: 'admin@pwnops.sec', name: 'Admin', passwordHash: adminHash, role: 'admin' }});
  const analyst1 = await prisma.user.create({ data: { email: 'j.doe@pwnops.sec', name: 'J. Doe', passwordHash: analystHash, role: 'analyst' }});
  const analyst2 = await prisma.user.create({ data: { email: 'm.smith@pwnops.sec', name: 'M. Smith', passwordHash: analystHash, role: 'analyst' }});
  await prisma.user.create({ data: { email: 'viewer@pwnops.sec', name: 'A. Kumar', passwordHash: bcrypt.hashSync('viewer123', 12), role: 'viewer' }});

  await prisma.incident.createMany({
    data: [
      { title: 'Exfiltration attempt on DB-01', description: 'Detected unusual outbound data transfer from database server DB-01 to external IP.', severity: 'critical', status: 'new', assigneeId: analyst1.id, assigneeName: 'J. Doe', createdBy: admin.id, mitigationSteps: [] },
      { title: 'Unauthorized login from unknown ASN', description: 'Multiple login attempts from an unrecognized autonomous system number detected.', severity: 'high', status: 'new', assigneeId: analyst2.id, assigneeName: 'M. Smith', createdBy: admin.id, mitigationSteps: [] },
      { title: 'Suspicious activity on /auth endpoint', description: 'Rate-limited brute force attempts detected on the authentication endpoint.', severity: 'medium', status: 'new', createdBy: admin.id, mitigationSteps: [] },
      { title: 'Outdated TLS certificate on staging', description: 'TLS certificate on staging-app-4 expires in 3 days.', severity: 'low', status: 'new', createdBy: admin.id, mitigationSteps: [] },
    ]
  });

  await prisma.vulnerability.createMany({
    data: [
      { cveId: 'CVE-2024-4321', version: 'v2.1', title: 'Unauthenticated Remote Code Execution in Gateway', description: 'Buffer overflow in the SSL/TLS termination module allows unauthenticated remote code execution.', severity: 'critical', cvssScore: 9.8, affectedAsset: 'PROD-GW-01', status: 'open' },
      { cveId: 'CVE-2023-9982', version: 'v1.4', title: 'SQL Injection in User Profile Endpoint', description: 'Insufficient sanitization of the sort parameter in the user profile API.', severity: 'high', cvssScore: 8.1, affectedAsset: 'USER-DB-CLUSTER', status: 'in_progress' },
      { cveId: 'CVE-2024-1102', version: 'v3.0', title: 'Exposed Debug Information', description: 'Internal system paths leaking in HTTP error responses on staging environment.', severity: 'medium', cvssScore: 5.4, affectedAsset: 'STAGING-APP-4', status: 'fixed' },
    ]
  });
  
  await prisma.threatFeedEntry.createMany({
    data: [
      { message: 'Brute force detected from 101.2.4.1' },
      { message: 'SQLi attempt blocked on App-Server-02' },
      { message: 'Lateral movement audit initiated' },
    ]
  });
  
  seeding = false;
}
