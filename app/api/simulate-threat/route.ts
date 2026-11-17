import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/store';
import { NextResponse } from 'next/server';

interface CisaVuln {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  knownRansomwareCampaignUse?: string;
}

interface CisaFeed {
  vulnerabilities: CisaVuln[];
}

let cisaCache: { data: CisaVuln[]; expiresAt: number } | null = null;

const SIMULATED_DETECTIONS = [
  'Critical: Unauthorized AWS IAM Access - PutUserPolicy invoked from IP 198.51.100.42 [CloudTrail-T1098]',
  'Critical: Ransomware canary file modified in /var/data by unrecognized PID 4412 [T1486]',
  'Critical: Privileged container escape detected in cluster pod ingress-controller-7f4c [T1611]',
  'Critical: Massive data exfiltration (4.2 GB) via DNS tunneling to ns1.data-stealer.biz [T1048]',
  'High: Kerberoasting attack detected against ServiceAccount-SQL from Workstation-07 [T1558.003]',
  'High: Cobalt Strike C2 beacon pattern observed to 203.0.113.88:8443 (Jitter: 15%) [T1071.001]',
  'High: Blind SQL Injection payload detected targeting /api/v1/auth/login [OWASP A03:2021]',
  'High: Known LockBit 3.0 affiliate IP communicating with internal DMZ host 10.0.4.15 [T1190]',
  'High: S3 bucket "pwnops-prod-backups" policy altered to Public Read [T1530]',
  'Medium: Suspicious lateral movement via Pass-the-Hash from Workstation-Alpha [T1550.002]',
  'Medium: Suspicious crontab persistence entry added for user www-data [T1053.003]',
  'Medium: Malicious npm dependency typo-squatting attempt quarantined in CI/CD pipeline [T1195.001]',
];

async function fetchCisaKevThreat(): Promise<string | null> {
  const now = Date.now();
  if (cisaCache && cisaCache.expiresAt > now && cisaCache.data.length > 0) {
    const item = cisaCache.data[Math.floor(Math.random() * cisaCache.data.length)];
    const tag = item.knownRansomwareCampaignUse === 'Known' ? ' | [Ransomware: Active]' : '';
    return `[CISA KEV Alert] ${item.cveID} - ${item.vendorProject} ${item.product}: ${item.vulnerabilityName}${tag}`;
  }

  try {
    const res = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
      signal: AbortSignal.timeout(3000),
      headers: { 'User-Agent': 'PwnOps-ThreatIntel/1.0' },
    });

    if (res.ok) {
      const json: CisaFeed = await res.json();
      if (json.vulnerabilities && json.vulnerabilities.length > 0) {
        cisaCache = {
          data: json.vulnerabilities,
          expiresAt: now + 3600_000,
        };
        const item = json.vulnerabilities[Math.floor(Math.random() * json.vulnerabilities.length)];
        const tag = item.knownRansomwareCampaignUse === 'Known' ? ' | [Ransomware: Active]' : '';
        return `[CISA KEV Alert] ${item.cveID} - ${item.vendorProject} ${item.product}: ${item.vulnerabilityName}${tag}`;
      }
    }
  } catch {
    // Network offline or timeout: fall back gracefully
  }

  return null;
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user || !user.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let message: string | null = null;
  if (Math.random() > 0.3) {
    message = await fetchCisaKevThreat();
  }

  if (!message) {
    message = SIMULATED_DETECTIONS[Math.floor(Math.random() * SIMULATED_DETECTIONS.length)];
  }

  await prisma.threatFeedEntry.create({
    data: {
      message,
      organizationId: user.organizationId,
    },
  });

  return NextResponse.json({ success: true, message });
}
