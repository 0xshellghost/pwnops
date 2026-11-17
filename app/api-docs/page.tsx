'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  endpoint: string;
  title: string;
  category: 'Scans' | 'Vulnerabilities' | 'Incidents' | 'Assets' | 'System';
  desc: string;
  roles: string;
  requestBody?: string;
  responseExample: string;
  curlExample: string;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    category: 'System',
    method: 'GET',
    endpoint: '/api/health',
    title: 'Health Check & System Diagnostics',
    desc: 'Public unauthenticated endpoint to verify database connectivity and worker operational status.',
    roles: 'Public (No Token Required)',
    responseExample: `{\n  "status": "healthy",\n  "timestamp": "2026-11-17T10:00:00.000Z",\n  "database": "connected",\n  "worker": {\n    "available": true,\n    "version": "1.0.0"\n  }\n}`,
    curlExample: `curl -X GET https://pwnops.sec/api/health`,
  },
  {
    category: 'Scans',
    method: 'GET',
    endpoint: '/api/scans/tools',
    title: 'Available Scanner Binaries',
    desc: 'Lists all available security scanners installed on the active worker node (Nmap, Nuclei, Subfinder, WhatWeb).',
    roles: 'Admin, Analyst, Viewer',
    responseExample: `{\n  "tools": [\n    { "name": "nmap", "available": true, "version": "7.94" },\n    { "name": "nuclei", "available": true, "version": "v3.2.0" },\n    { "name": "subfinder", "available": true, "version": "v2.6.5" },\n    { "name": "whatweb", "available": true, "version": "0.5.5" }\n  ]\n}`,
    curlExample: `curl -X GET https://pwnops.sec/api/scans/tools \\\n  -H "Authorization: Bearer <API_KEY>"`,
  },
  {
    category: 'Scans',
    method: 'POST',
    endpoint: '/api/scans',
    title: 'Launch Infrastructure Scan',
    desc: 'Enqueues a new security scan job for background execution by the worker pool.',
    roles: 'Admin, Analyst',
    requestBody: `{\n  "toolName": "nmap", // "nmap" | "nuclei" | "subfinder" | "whatweb"\n  "target": "192.168.1.0/24"\n}`,
    responseExample: `{\n  "scan": {\n    "id": "c1f7b0f0-8c29-4d92-bb63-9d10a2bb1234",\n    "toolName": "nmap",\n    "target": "192.168.1.0/24",\n    "status": "queued",\n    "progress": 0,\n    "startedAt": "2026-11-17T10:00:00.000Z"\n  }\n}`,
    curlExample: `curl -X POST https://pwnops.sec/api/scans \\\n  -H "Authorization: Bearer <API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"toolName": "nmap", "target": "192.168.1.0/24"}'`,
  },
  {
    category: 'Vulnerabilities',
    method: 'GET',
    endpoint: '/api/vulnerabilities',
    title: 'List Vulnerability Inventory',
    desc: 'Retrieves paginated vulnerabilities with optional server-side filtering by severity, status, and search query.',
    roles: 'Admin, Analyst, Viewer',
    responseExample: `{\n  "vulnerabilities": [\n    {\n      "id": "v-12345",\n      "cveId": "CVE-2021-41773",\n      "title": "Apache HTTP Server Path Traversal",\n      "severity": "critical",\n      "cvssScore": 9.8,\n      "affectedAsset": "10.0.0.15:80",\n      "status": "open",\n      "discoveredAt": "2026-11-17T09:45:00.000Z"\n    }\n  ],\n  "pagination": {\n    "total": 42,\n    "page": 1,\n    "totalPages": 5\n  }\n}`,
    curlExample: `curl -X GET "https://pwnops.sec/api/vulnerabilities?severity=critical&status=open&page=1&limit=10" \\\n  -H "Authorization: Bearer <API_KEY>"`,
  },
  {
    category: 'Vulnerabilities',
    method: 'PATCH',
    endpoint: '/api/vulnerabilities',
    title: 'Update Vulnerability Remediation Status',
    desc: 'Transitions a vulnerability between open, in_progress, and fixed states.',
    roles: 'Admin, Analyst',
    requestBody: `{\n  "id": "v-12345",\n  "status": "fixed" // "open" | "in_progress" | "fixed"\n}`,
    responseExample: `{\n  "vulnerability": {\n    "id": "v-12345",\n    "status": "fixed"\n  }\n}`,
    curlExample: `curl -X PATCH https://pwnops.sec/api/vulnerabilities \\\n  -H "Authorization: Bearer <API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"id": "v-12345", "status": "fixed"}'`,
  },
  {
    category: 'Incidents',
    method: 'POST',
    endpoint: '/api/incidents',
    title: 'Create Security Incident',
    desc: 'Creates a security ticket on the SOC Kanban board with assignees and audit trail logging.',
    roles: 'Admin, Analyst',
    requestBody: `{\n  "title": "[VULN] CVE-2021-41773: Apache Path Traversal",\n  "description": "Exploit verified on DMZ proxy host.",\n  "severity": "critical", // "critical" | "high" | "medium" | "low"\n  "assigneeId": "user-uuid-1234" // optional\n}`,
    responseExample: `{\n  "incident": {\n    "id": "inc-8849",\n    "numericId": 1042,\n    "title": "[VULN] CVE-2021-41773: Apache Path Traversal",\n    "status": "new",\n    "severity": "critical",\n    "createdAt": "2026-11-17T10:00:00.000Z"\n  }\n}`,
    curlExample: `curl -X POST https://pwnops.sec/api/incidents \\\n  -H "Authorization: Bearer <API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"title": "Compromised Host Alert", "severity": "high"}'`,
  },
  {
    category: 'Incidents',
    method: 'PUT',
    endpoint: '/api/incidents/[id]',
    title: 'Update Incident & Mitigation Checklist',
    desc: 'Updates incident attributes, mitigation checklist steps, and assigned operators.',
    roles: 'Admin, Analyst',
    requestBody: `{\n  "mitigationSteps": [\n    "[x] Isolate affected web server from production subnet",\n    "[ ] Deploy vendor security patch KB50123"\n  ]\n}`,
    responseExample: `{\n  "incident": {\n    "id": "inc-8849",\n    "mitigationSteps": [\n      "[x] Isolate affected web server from production subnet",\n      "[ ] Deploy vendor security patch KB50123"\n    ]\n  }\n}`,
    curlExample: `curl -X PUT https://pwnops.sec/api/incidents/inc-8849 \\\n  -H "Authorization: Bearer <API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"mitigationSteps": ["[x] Isolate host"]}'`,
  },
];

export default function ApiDocsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const categories = ['All', 'Scans', 'Vulnerabilities', 'Incidents', 'System'];

  const filtered = selectedCategory === 'All'
    ? API_ENDPOINTS
    : API_ENDPOINTS.filter(e => e.category === selectedCategory);

  const methodBadge = (m: ApiEndpoint['method']) => {
    switch (m) {
      case 'GET': return 'bg-accent-green/20 text-accent-green border-accent-green/30';
      case 'POST': return 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30';
      case 'PATCH': return 'bg-accent-orange/20 text-accent-orange border-accent-orange/30';
      case 'PUT': return 'bg-accent-amber/20 text-accent-amber border-accent-amber/30';
      case 'DELETE': return 'bg-accent-red/20 text-accent-red border-accent-red/30';
    }
  };

  return (
    <main className="min-h-screen bg-bg-base flex flex-col relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-blue/10 blur-[120px] rounded-full mix-blend-screen" />
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
            REST API <span className="text-transparent bg-clip-text bg-linear-to-r from-accent-blue to-accent-cyan">Reference</span>
          </h1>
          <p className="text-text-muted text-sm md:text-base leading-relaxed">
            Programmatically orchestrate attack surface discovery, stream telemetry, and integrate security playbooks into your CI/CD pipelines.
          </p>
        </div>

        <div className="card-glass p-5 mb-8 max-w-4xl mx-auto border-accent-cyan/30">
          <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold text-accent-cyan">
            <span>🛡️</span>
            <span>AUTHENTICATION SPECIFICATION</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            All protected API routes authenticate via either an <strong>HTTP-only session cookie</strong> or an <strong>Authorization Bearer token</strong> (API key generated under Settings → API Keys).
          </p>
          <code className="block bg-bg-input p-2 rounded text-xs font-mono text-text-primary border border-border">
            Authorization: Bearer pwn_live_xxxxxxxxxxxxxxxxxxxxxxxx
          </code>
        </div>

        <div className="flex gap-2 mb-6 max-w-4xl mx-auto overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-accent-cyan text-bg-base shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                  : 'btn-outline text-text-muted hover:text-text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="w-full max-w-4xl mx-auto space-y-4">
          {filtered.map((api, i) => (
            <div key={i} className="card-glass p-5 border border-border/80 rounded-xl">
              <div
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono border ${methodBadge(api.method)}`}>
                    {api.method}
                  </span>
                  <code className="text-sm font-bold text-text-primary">{api.endpoint}</code>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted hidden md:inline">{api.title}</span>
                  <span className="text-text-muted text-sm">{expandedIndex === i ? '▲' : '▼'}</span>
                </div>
              </div>

              {expandedIndex === i && (
                <div className="mt-4 pt-4 border-t border-border/60 space-y-4 text-xs animate-fade-in">
                  <p className="text-text-secondary text-sm">{api.desc}</p>
                  <div className="flex gap-2">
                    <span className="label-mono text-text-muted">Required Role:</span>
                    <span className="text-accent-cyan font-bold">{api.roles}</span>
                  </div>

                  {api.requestBody && (
                    <div>
                      <div className="label-mono mb-1 text-text-muted">Request Body (JSON)</div>
                      <pre className="bg-bg-input p-3 rounded-lg border border-border font-mono text-xs text-accent-green overflow-x-auto">
                        {api.requestBody}
                      </pre>
                    </div>
                  )}

                  <div>
                    <div className="label-mono mb-1 text-text-muted">Response (200 OK)</div>
                    <pre className="bg-bg-input p-3 rounded-lg border border-border font-mono text-xs text-text-primary overflow-x-auto">
                      {api.responseExample}
                    </pre>
                  </div>

                  <div>
                    <div className="label-mono mb-1 text-text-muted">cURL Example</div>
                    <pre className="bg-bg-input p-3 rounded-lg border border-border font-mono text-xs text-accent-cyan overflow-x-auto">
                      {api.curlExample}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
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
