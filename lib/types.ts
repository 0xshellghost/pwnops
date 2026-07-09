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
  organizationId: string | null;
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
  organizationId: string | null;
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
  organizationId: string | null;
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
  results: string | null;
  organizationId: string | null;
}

export interface ThreatFeedEntry {
  id: string;
  message: string;
  timestamp: string;
  organizationId: string | null;
}
