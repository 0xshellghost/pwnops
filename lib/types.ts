// ──────────────────────────────────────────────────────────
// PwnOps — Type Definitions
// ──────────────────────────────────────────────────────────

export type Role = 'admin' | 'analyst' | 'viewer';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type IncidentStatus = 'new' | 'investigating' | 'containing' | 'resolved';
export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed';
export type VulnStatus = 'open' | 'in_progress' | 'fixed';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
  organizationId: string;
}

export interface Incident {
  id: string;
  numericId: number;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  mitigationSteps: string[];
  organizationId: string;
}

export interface Vulnerability {
  id: string;
  cveId: string;
  version: string;
  title: string;
  description: string;
  severity: Severity;
  cvssScore: number;
  affectedAsset: string;
  status: VulnStatus;
  discoveredAt: string;
  organizationId: string;
}

export interface ScanResult {
  summary?: {
    version?: string;
    duration?: string;
    hasDiffAlert?: boolean;
    [key: string]: string | boolean | number | undefined;
  };
  raw?: string;
}

export interface Scan {
  id: string;
  toolName: string;
  target: string;
  status: ScanStatus;
  progress: number;
  triggeredById: string;
  startedAt: string;
  completedAt: string | null;
  results: ScanResult | null;
  organizationId: string;
}

export interface IncidentComment {
  id: string;
  content: string;
  incidentId: string;
  userId: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export interface DashboardMetrics {
  incidents: { total: number; critical: number; recent: Incident[] };
  scans: { running: number; completed: number; recent: Scan[] };
  vulns: { total: number; open: number; critical: number; recent: Vulnerability[] };
}

export interface ThreatFeedEntry {
  id: string;
  message: string;
  timestamp: string;
  organizationId: string;
}
