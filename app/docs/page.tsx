'use client';

import { useState } from 'react';
import Link from 'next/link';

const DOC_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '⚡',
    summary: 'Deploy PwnOps in under 5 minutes using Docker Compose or standalone worker nodes.',
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-accent-cyan">Rapid Deployment Architecture</h3>
        <p className="text-sm text-text-secondary">
          PwnOps is split into two core runtimes: the <strong>Next.js 16 Edge Control Plane</strong> and the <strong>Dockerized Scanning Worker</strong>.
          The control plane handles user auth, multi-tenant isolation, real-time telemetry, and incident management. The background worker claims queued scans and executes security tools within isolated network namespaces.
        </p>
        <div className="bg-bg-input p-4 rounded-lg border border-border font-mono text-xs text-text-primary space-y-2">
          <div className="text-text-muted"># 1. Clone the repository</div>
          <div>git clone https://github.com/lavaygarg/pwnops.git &amp;&amp; cd pwnops</div>
          <div className="text-text-muted"># 2. Configure environment</div>
          <div>cp .env.example .env</div>
          <div className="text-text-muted"># 3. Spin up full SOC stack (Postgres, Web UI, Scan Worker)</div>
          <div>docker compose up -d --build</div>
        </div>
        <p className="text-sm text-text-secondary">
          Once containers are running, navigate to <code className="text-accent-cyan bg-bg-input px-1.5 py-0.5 rounded">http://localhost:3000</code> to create your primary administrator account and launch your first asset discovery scan.
        </p>
      </div>
    ),
  },
  {
    id: 'scan-engine',
    title: 'Scanning Engine',
    icon: '◈',
    summary: 'Integrate and execute Nmap, Nuclei, Subfinder, and WhatWeb with automatic CVE correlation.',
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-accent-cyan">Automated Vulnerability Correlation</h3>
        <p className="text-sm text-text-secondary">
          PwnOps orchestrates multiple industry-standard security tools and extracts findings into unified, actionable CVE records:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-bg-input rounded-lg border border-border">
            <div className="font-bold text-accent-cyan mb-1 font-mono">Nmap (Network Port &amp; Service Discovery)</div>
            <p className="text-text-muted">Scans target IPs/subnets for open ports. Correlates discovered services (e.g. Apache 2.4.49, vsftpd 2.3.4, unauthenticated Redis/MongoDB, MS17-010 EternalBlue) directly into CVSS-rated vulnerabilities.</p>
          </div>
          <div className="p-3 bg-bg-input rounded-lg border border-border">
            <div className="font-bold text-accent-cyan mb-1 font-mono">Nuclei (Vulnerability Engine)</div>
            <p className="text-text-muted">Executes community-curated YAML templates to detect critical misconfigurations, exposed credentials, zero-days, and known CVEs. Output is parsed as structured telemetry.</p>
          </div>
          <div className="p-3 bg-bg-input rounded-lg border border-border">
            <div className="font-bold text-accent-cyan mb-1 font-mono">Subfinder (Passive Reconnaissance)</div>
            <p className="text-text-muted">Discovers external-facing subdomains across passive OSINT sources without actively sending intrusive packets to the target organization.</p>
          </div>
          <div className="p-3 bg-bg-input rounded-lg border border-border">
            <div className="font-bold text-accent-cyan mb-1 font-mono">WhatWeb (Technology Fingerprinting)</div>
            <p className="text-text-muted">Identifies CMS platforms, web servers, JavaScript libraries, and security headers running on target endpoints.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'rbac-security',
    title: 'Role-Based Access Control',
    icon: '🛡️',
    summary: 'Strict multi-tenant isolation, role permission matrices, and token security.',
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-accent-cyan">Multi-Tenant RBAC Matrix</h3>
        <p className="text-sm text-text-secondary">
          Every organization has strict boundary separation. All database operations filter on <code className="text-accent-cyan">organizationId</code> to prevent unauthorized cross-tenant data access.
        </p>
        <div className="overflow-x-auto">
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th>Capability</th>
                <th>Admin</th>
                <th>Analyst</th>
                <th>Viewer</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>View Dashboards, Scans, Vulns</td>
                <td className="text-accent-green">✓ Allowed</td>
                <td className="text-accent-green">✓ Allowed</td>
                <td className="text-accent-green">✓ Allowed</td>
              </tr>
              <tr>
                <td>Launch Scans &amp; Manage Assets</td>
                <td className="text-accent-green">✓ Allowed</td>
                <td className="text-accent-green">✓ Allowed</td>
                <td className="text-accent-red">⊘ Blocked (403)</td>
              </tr>
              <tr>
                <td>Update Vulnerability Status</td>
                <td className="text-accent-green">✓ Allowed</td>
                <td className="text-accent-green">✓ Allowed</td>
                <td className="text-accent-red">⊘ Blocked (403)</td>
              </tr>
              <tr>
                <td>Create &amp; Triage Incidents</td>
                <td className="text-accent-green">✓ Allowed</td>
                <td className="text-accent-green">✓ Allowed</td>
                <td className="text-accent-red">⊘ Blocked (403)</td>
              </tr>
              <tr>
                <td>Manage Users &amp; Change Roles</td>
                <td className="text-accent-green">✓ Allowed</td>
                <td className="text-accent-red">⊘ Blocked (403)</td>
                <td className="text-accent-red">⊘ Blocked (403)</td>
              </tr>
              <tr>
                <td>Configure Integrations &amp; API Keys</td>
                <td className="text-accent-green">✓ Allowed</td>
                <td className="text-accent-red">⊘ Blocked (403)</td>
                <td className="text-accent-red">⊘ Blocked (403)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  {
    id: 'incident-response',
    title: 'Incident Response & Playbooks',
    icon: '⚡',
    summary: 'Escalate findings to Kanban boards, collaborate via timelines, and manage remediation checklists.',
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-accent-cyan">Automated Triage Workflow</h3>
        <p className="text-sm text-text-secondary">
          Security teams can seamlessly promote high-risk findings from the Vulnerability Inventory directly to active incidents:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-text-secondary">
          <li><strong>One-Click Escalation:</strong> Click <em>Escalate</em> on any CVE finding to automatically create an incident with CVSS score, affected asset, and description.</li>
          <li><strong>Interactive Mitigation Checklists:</strong> Define custom remediation steps (e.g. <em>[x] Isolate affected subnet</em>, <em>[ ] Upgrade Apache to 2.4.50</em>) directly within the incident modal.</li>
          <li><strong>Collaborative Timelines:</strong> Add timestamped comments and assign operator ownership to resolve security tickets with full audit trails.</li>
        </ol>
      </div>
    ),
  },
];

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('getting-started');

  const selected = DOC_SECTIONS.find(s => s.id === activeTab) || DOC_SECTIONS[0];

  return (
    <main className="min-h-screen bg-bg-base flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-cyan/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <nav className="relative z-10 w-full px-6 md:px-12 py-6 flex justify-between items-center max-w-7xl mx-auto border-b border-border/50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-accent-cyan to-accent-blue flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.3)] group-hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-wider">Pwn<span className="text-accent-cyan">Ops</span></span>
        </Link>
        <Link href="/login" className="btn-outline text-sm">
          Access Platform →
        </Link>
      </nav>

      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12 w-full">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
            Security Engineering <span className="text-transparent bg-clip-text bg-linear-to-r from-accent-cyan to-accent-blue">Documentation</span>
          </h1>
          <p className="text-text-muted text-sm md:text-base leading-relaxed">
            Operational guides for deploying workers, orchestrating multi-tenant scanning modules, and managing automated incident triage.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {DOC_SECTIONS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`p-4 rounded-xl text-left border transition-all ${
                activeTab === item.id
                  ? 'bg-accent-cyan/10 border-accent-cyan text-text-primary shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                  : 'card-glass hover:border-accent-cyan/40 text-text-muted hover:text-text-primary'
              }`}
            >
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="font-bold text-sm mb-1">{item.title}</div>
              <div className="text-xs text-text-muted line-clamp-2">{item.summary}</div>
            </button>
          ))}
        </div>

        <div className="card-glass p-8 max-w-4xl mx-auto border border-border/80 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
            <span className="text-3xl">{selected.icon}</span>
            <div>
              <h2 className="text-2xl font-bold">{selected.title}</h2>
              <p className="text-text-muted text-xs">{selected.summary}</p>
            </div>
          </div>
          <div>{selected.content}</div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/50 bg-bg-card/30 backdrop-blur-md py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex justify-center gap-6 text-text-muted text-xs">
            <Link href="/docs" className="hover:text-accent-cyan transition-colors">Documentation</Link>
            <Link href="/api-docs" className="hover:text-accent-cyan transition-colors">API Reference</Link>
            <Link href="/support" className="hover:text-accent-cyan transition-colors">Support</Link>
            <Link href="/status" className="hover:text-accent-cyan transition-colors">System Status</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
