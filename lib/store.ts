// ──────────────────────────────────────────────────────────
// PwnOps — In-Memory Data Store + Seed Data
// ──────────────────────────────────────────────────────────
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  User, Incident, Vulnerability, Scan, ThreatFeedEntry,
  Severity, IncidentStatus, VulnStatus,
} from './types';

// ── Storage Arrays ───────────────────────────────────────
let users: User[] = [];
let incidents: Incident[] = [];
let vulnerabilities: Vulnerability[] = [];
let scans: Scan[] = [];
let threatFeed: ThreatFeedEntry[] = [];
let incidentCounter = 4030;

// ── User CRUD ────────────────────────────────────────────
export function getUsers() { return users.map(u => ({ ...u, passwordHash: '' })); }
export function getUserById(id: string) { return users.find(u => u.id === id); }
export function findUserByEmail(email: string) { return users.find(u => u.email === email); }
export function addUser(u: User) { users.push(u); }
export function updateUserRole(id: string, role: User['role']) {
  const u = users.find(u => u.id === id);
  if (u) u.role = role;
  return u;
}

// ── Incident CRUD ────────────────────────────────────────
export function getIncidents() { return incidents; }
export function getIncidentById(id: string) { return incidents.find(i => i.id === id); }
export function addIncident(i: Omit<Incident, 'id' | 'numericId' | 'createdAt' | 'updatedAt'>): Incident {
  const now = new Date().toISOString();
  const incident: Incident = {
    ...i,
    id: uuid(),
    numericId: ++incidentCounter,
    createdAt: now,
    updatedAt: now,
  };
  incidents.push(incident);
  return incident;
}
export function updateIncidentStatus(id: string, status: IncidentStatus) {
  const i = incidents.find(i => i.id === id);
  if (i) { i.status = status; i.updatedAt = new Date().toISOString(); }
  return i;
}

// ── Vulnerability CRUD ───────────────────────────────────
export function getVulnerabilities() { return vulnerabilities; }
export function getVulnById(id: string) { return vulnerabilities.find(v => v.id === id); }
export function updateVulnStatus(id: string, status: VulnStatus) {
  const v = vulnerabilities.find(v => v.id === id);
  if (v) v.status = status;
  return v;
}

// ── Scan CRUD ────────────────────────────────────────────
export function getScans() { return scans; }
export function addScan(s: Omit<Scan, 'id'>): Scan {
  const scan: Scan = { ...s, id: uuid() };
  scans.push(scan);
  return scan;
}
export function updateScan(id: string, update: Partial<Scan>) {
  const s = scans.find(s => s.id === id);
  if (s) Object.assign(s, update);
  return s;
}

// ── Threat Feed ──────────────────────────────────────────
export function getThreatFeed() { return threatFeed; }

// ── Seed Data ────────────────────────────────────────────
function seed() {
  // Default admin user (password: admin123)
  const adminHash = bcrypt.hashSync('admin123', 12);
  const analystHash = bcrypt.hashSync('analyst123', 12);

  users = [
    { id: uuid(), email: 'admin@pwnops.sec', name: 'Admin', passwordHash: adminHash, role: 'admin', createdAt: '2024-01-15T08:00:00Z' },
    { id: uuid(), email: 'j.doe@pwnops.sec', name: 'J. Doe', passwordHash: analystHash, role: 'analyst', createdAt: '2024-02-20T10:30:00Z' },
    { id: uuid(), email: 'm.smith@pwnops.sec', name: 'M. Smith', passwordHash: analystHash, role: 'analyst', createdAt: '2024-03-10T14:15:00Z' },
    { id: uuid(), email: 'viewer@pwnops.sec', name: 'A. Kumar', passwordHash: bcrypt.hashSync('viewer123', 12), role: 'viewer', createdAt: '2024-04-05T09:00:00Z' },
  ];

  const jDoe = users[1];
  const mSmith = users[2];

  incidents = [
    {
      id: uuid(), numericId: 4021, title: 'Exfiltration attempt on DB-01',
      description: 'Detected unusual outbound data transfer from database server DB-01 to external IP.',
      severity: 'critical', status: 'new', assigneeId: jDoe.id, assigneeName: 'J. Doe',
      createdBy: users[0].id, createdAt: '2024-06-15T02:30:00Z', updatedAt: '2024-06-15T02:30:00Z',
      mitigationSteps: [],
    },
    {
      id: uuid(), numericId: 4025, title: 'Unauthorized login from unknown ASN',
      description: 'Multiple login attempts from an unrecognized autonomous system number detected.',
      severity: 'high', status: 'new', assigneeId: mSmith.id, assigneeName: 'M. Smith',
      createdBy: users[0].id, createdAt: '2024-06-15T04:15:00Z', updatedAt: '2024-06-15T04:15:00Z',
      mitigationSteps: [],
    },
    {
      id: uuid(), numericId: 4018, title: 'Suspicious activity on /auth endpoint',
      description: 'Rate-limited brute force attempts detected on the authentication endpoint.',
      severity: 'medium', status: 'new', assigneeId: null, assigneeName: null,
      createdBy: users[0].id, createdAt: '2024-06-14T22:00:00Z', updatedAt: '2024-06-14T22:00:00Z',
      mitigationSteps: [],
    },
    {
      id: uuid(), numericId: 4012, title: 'Outdated TLS certificate on staging',
      description: 'TLS certificate on staging-app-4 expires in 3 days.',
      severity: 'low', status: 'new', assigneeId: null, assigneeName: null,
      createdBy: users[0].id, createdAt: '2024-06-14T18:00:00Z', updatedAt: '2024-06-14T18:00:00Z',
      mitigationSteps: [],
    },
    {
      id: uuid(), numericId: 4010, title: 'Privilege escalation via misconfigured sudo',
      description: 'User account gained root access through misconfigured sudoers file.',
      severity: 'critical', status: 'investigating', assigneeId: jDoe.id, assigneeName: 'J. Doe',
      createdBy: users[0].id, createdAt: '2024-06-13T11:00:00Z', updatedAt: '2024-06-14T09:30:00Z',
      mitigationSteps: ['Isolated affected server', 'Revoked sudo permissions'],
    },
    {
      id: uuid(), numericId: 4008, title: 'SQL Injection on user profile endpoint',
      description: 'Parameterized query bypass detected on /api/users/profile.',
      severity: 'high', status: 'investigating', assigneeId: mSmith.id, assigneeName: 'M. Smith',
      createdBy: users[0].id, createdAt: '2024-06-12T16:45:00Z', updatedAt: '2024-06-14T08:00:00Z',
      mitigationSteps: ['WAF rules updated'],
    },
    {
      id: uuid(), numericId: 4005, title: 'DDoS mitigation engaged on CDN',
      description: 'Volumetric DDoS attack detected, CDN mitigation activated.',
      severity: 'high', status: 'containing', assigneeId: jDoe.id, assigneeName: 'J. Doe',
      createdBy: users[0].id, createdAt: '2024-06-11T20:00:00Z', updatedAt: '2024-06-13T12:00:00Z',
      mitigationSteps: ['CDN scrubbing enabled', 'Rate limiting configured', 'ISP notified'],
    },
    {
      id: uuid(), numericId: 4001, title: 'Resolved: Phishing campaign targeting HR',
      description: 'Spear phishing emails targeting HR department successfully contained.',
      severity: 'medium', status: 'resolved', assigneeId: mSmith.id, assigneeName: 'M. Smith',
      createdBy: users[0].id, createdAt: '2024-06-08T09:00:00Z', updatedAt: '2024-06-10T17:00:00Z',
      mitigationSteps: ['Emails quarantined', 'Staff notified', 'SPF/DKIM updated', 'Training scheduled'],
    },
  ];

  vulnerabilities = [
    {
      id: uuid(), cveId: 'CVE-2024-4321', version: 'v2.1', title: 'Unauthenticated Remote Code Execution in Gateway',
      description: 'Buffer overflow in the SSL/TLS termination module allows unauthenticated remote code execution.',
      severity: 'critical', cvssScore: 9.8, affectedAsset: 'PROD-GW-01', status: 'open', discoveredAt: '2024-06-14T10:00:00Z',
    },
    {
      id: uuid(), cveId: 'CVE-2023-9982', version: 'v1.4', title: 'SQL Injection in User Profile Endpoint',
      description: 'Insufficient sanitization of the sort parameter in the user profile API.',
      severity: 'high', cvssScore: 8.1, affectedAsset: 'USER-DB-CLUSTER', status: 'in_progress', discoveredAt: '2024-06-13T14:30:00Z',
    },
    {
      id: uuid(), cveId: 'CVE-2024-1102', version: 'v3.0', title: 'Exposed Debug Information',
      description: 'Internal system paths leaking in HTTP error responses on staging environment.',
      severity: 'medium', cvssScore: 5.4, affectedAsset: 'STAGING-APP-4', status: 'fixed', discoveredAt: '2024-06-12T08:15:00Z',
    },
    {
      id: uuid(), cveId: 'POLICY-09', version: 'v1.0', title: 'Missing HSTS Header',
      description: 'Strict-Transport-Security header is not set on secondary portal.',
      severity: 'low', cvssScore: 2.3, affectedAsset: 'DEV-PORTAL-3', status: 'open', discoveredAt: '2024-06-11T16:45:00Z',
    },
    {
      id: uuid(), cveId: 'CVE-2024-5567', version: 'v2.3', title: 'Cross-Site Scripting in Admin Panel',
      description: 'Reflected XSS vulnerability in the search parameter of the admin panel.',
      severity: 'high', cvssScore: 7.5, affectedAsset: 'ADMIN-PANEL-1', status: 'open', discoveredAt: '2024-06-10T11:00:00Z',
    },
    {
      id: uuid(), cveId: 'CVE-2024-7789', version: 'v1.2', title: 'Authentication Bypass via JWT Manipulation',
      description: 'Algorithm confusion vulnerability allows forging of authentication tokens.',
      severity: 'critical', cvssScore: 9.1, affectedAsset: 'AUTH-SERVICE-2', status: 'in_progress', discoveredAt: '2024-06-09T22:30:00Z',
    },
    {
      id: uuid(), cveId: 'CVE-2023-4456', version: 'v4.1', title: 'Insecure Direct Object Reference',
      description: 'IDOR vulnerability allows accessing other users\' documents via sequential IDs.',
      severity: 'high', cvssScore: 7.2, affectedAsset: 'DOC-SERVICE-1', status: 'open', discoveredAt: '2024-06-08T09:20:00Z',
    },
    {
      id: uuid(), cveId: 'CVE-2024-3210', version: 'v2.0', title: 'Server-Side Request Forgery',
      description: 'SSRF vulnerability in the webhook integration module.',
      severity: 'critical', cvssScore: 9.4, affectedAsset: 'WEBHOOK-SVC', status: 'open', discoveredAt: '2024-06-07T15:00:00Z',
    },
    {
      id: uuid(), cveId: 'CVE-2024-6543', version: 'v1.8', title: 'Privilege Escalation via API',
      description: 'Improper access control in the role management API allows privilege escalation.',
      severity: 'high', cvssScore: 8.4, affectedAsset: 'API-GATEWAY', status: 'open', discoveredAt: '2024-06-06T13:45:00Z',
    },
    {
      id: uuid(), cveId: 'CVE-2023-8901', version: 'v3.2', title: 'Denial of Service via ReDoS',
      description: 'Regular expression denial of service in input validation middleware.',
      severity: 'medium', cvssScore: 5.9, affectedAsset: 'INPUT-VALIDATOR', status: 'fixed', discoveredAt: '2024-06-05T10:30:00Z',
    },
    {
      id: uuid(), cveId: 'CVE-2024-2345', version: 'v1.1', title: 'Information Disclosure via Error Pages',
      description: 'Detailed stack traces exposed in production error responses.',
      severity: 'medium', cvssScore: 4.7, affectedAsset: 'WEB-APP-2', status: 'open', discoveredAt: '2024-06-04T17:20:00Z',
    },
    {
      id: uuid(), cveId: 'POLICY-12', version: 'v1.0', title: 'Weak Password Policy',
      description: 'Password policy does not enforce complexity requirements.',
      severity: 'low', cvssScore: 3.1, affectedAsset: 'IAM-MODULE', status: 'open', discoveredAt: '2024-06-03T12:00:00Z',
    },
  ];

  scans = [
    {
      id: uuid(), toolName: 'Network Recon', target: '10.0.0.0/24', status: 'completed', progress: 100,
      triggeredBy: jDoe.id, startedAt: '2024-06-14T08:00:00Z', completedAt: '2024-06-14T08:12:00Z',
      results: `[+] Host Discovery — 10.0.0.0/24\n────────────────────────────────\n  10.0.0.1    GATEWAY      UP  [22,80,443]\n  10.0.0.5    DB-PRIMARY   UP  [3306,22]\n  10.0.0.12   WEB-APP-01   UP  [80,443,8080]\n  10.0.0.15   API-GW       UP  [443,8443]\n  10.0.0.20   MONITOR      UP  [9090,3000]\n────────────────────────────────\n[+] 5 hosts discovered, 14 open ports\n[!] WARNING: 10.0.0.5 exposes MySQL on default port`,
    },
    {
      id: uuid(), toolName: 'Config Audit', target: 'PROD-GW-01', status: 'completed', progress: 100,
      triggeredBy: users[0].id, startedAt: '2024-06-13T14:00:00Z', completedAt: '2024-06-13T14:08:00Z',
      results: `[*] Configuration Audit — PROD-GW-01\n─────────────────────────────────────\n  ✗ TLS 1.0 enabled (CRITICAL)\n  ✗ Default admin credentials detected\n  ✓ Firewall rules validated\n  ✓ SSH key auth enforced\n  ✗ Debug mode active in production\n─────────────────────────────────────\n[!] 3 FAILURES / 2 PASSES`,
    },
  ];

  threatFeed = [
    { id: uuid(), message: 'Brute force detected from 101.2.4.1', timestamp: '2024-06-15T06:30:00Z' },
    { id: uuid(), message: 'SQLi attempt blocked on App-Server-02', timestamp: '2024-06-15T06:28:00Z' },
    { id: uuid(), message: 'Lateral movement audit initiated', timestamp: '2024-06-15T06:25:00Z' },
    { id: uuid(), message: 'New CVE published: CVE-2024-5567', timestamp: '2024-06-15T06:20:00Z' },
    { id: uuid(), message: 'Port scan detected from 203.0.113.42', timestamp: '2024-06-15T06:15:00Z' },
  ];
}

seed();
