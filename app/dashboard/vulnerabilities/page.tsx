'use client';

import { useEffect, useState } from 'react';

interface Vuln {
  id: string; cveId: string; version: string; title: string; description: string;
  severity: string; cvssScore: number; affectedAsset: string; status: string; discoveredAt: string;
}

const PER_PAGE = 5;

export default function VulnerabilitiesPage() {
  const [vulns, setVulns] = useState<Vuln[]>([]);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (severityFilter !== 'all') params.set('severity', severityFilter);
    fetch(`/api/vulnerabilities?${params}`)
      .then(r => r.json())
      .then(d => { setVulns(d.vulnerabilities || []); setPage(1); })
      .finally(() => setLoading(false));
  }, [search, severityFilter]);

  const handleExport = () => {
    if (vulns.length === 0) return;
    const headers = ['CVE ID', 'Title', 'Severity', 'CVSS Score', 'Asset', 'Status'];
    const rows = vulns.map(v => [
      v.cveId,
      `"${v.title.replace(/"/g, '""')}"`,
      v.severity,
      v.cvssScore,
      `"${v.affectedAsset}"`,
      v.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pwnops_vulnerability_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(vulns.length / PER_PAGE);
  const paginated = vulns.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const counts = {
    critical: vulns.filter(v => v.severity === 'critical').length,
    high: vulns.filter(v => v.severity === 'high').length,
    open: vulns.filter(v => v.status === 'open').length,
    fixed: vulns.filter(v => v.status === 'fixed' || v.status === 'in_progress').length,
  };

  const statusBadge = (s: string) => {
    if (s === 'open') return 'badge-open';
    if (s === 'in_progress') return 'badge-in-progress';
    return 'badge-fixed';
  };

  const statusLabel = (s: string) => {
    if (s === 'in_progress') return 'In Progress';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-dot" />
        <span className="label-mono text-accent-green">Live Threat Feed</span>
      </div>
      <h1 className="text-xl font-bold mb-1">Vulnerability Inventory</h1>
      <p className="text-text-muted text-sm mb-4">
        Manage and remediate identified risks across your infrastructure.
      </p>

      {/* Search */}
      <div className="relative mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search CVE, Asset, or ID"
          className="input-field pl-10! text-sm"
        />
      </div>

      {/* Filter + Export */}
      <div className="flex gap-2 mb-4">
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="btn-outline text-xs bg-transparent appearance-none cursor-pointer pr-8"
        >
          <option value="all">≡ Filters</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button onClick={handleExport} className="btn-outline text-xs">↓ Export Report</button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-accent-red)' }}>
          <div className="label-mono mb-1">Critical</div>
          <div className="text-2xl font-bold">{counts.critical}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-accent-orange)' }}>
          <div className="label-mono mb-1">High</div>
          <div className="text-2xl font-bold">{counts.high}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-accent-amber)' }}>
          <div className="label-mono mb-1">Open Risks</div>
          <div className="text-2xl font-bold">{counts.open}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-accent-green)' }}>
          <div className="label-mono mb-1">Remediated</div>
          <div className="text-2xl font-bold">{counts.fixed}</div>
        </div>
      </div>

      {/* Vuln Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3 stagger">
          {paginated.map(v => (
            <div key={v.id} className="card-glass p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-accent-cyan text-sm font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{v.cveId}</span>
                <span className="text-text-muted text-xs" style={{ fontFamily: 'var(--font-mono)' }}>{v.version}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-text-muted">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
              <h3 className="font-bold text-sm mb-1">{v.title}</h3>
              <p className="text-text-muted text-xs mb-3 line-clamp-2">{v.description}</p>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge badge-${v.severity}`}>● {v.severity.toUpperCase()} ({v.cvssScore})</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                {v.affectedAsset}
              </div>
              <div className="mt-2">
                <span className={`badge ${statusBadge(v.status)}`}>
                  ◉ {statusLabel(v.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-outline text-xs px-3 py-2 disabled:opacity-30">&lt;</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i + 1} onClick={() => setPage(i + 1)}
              className={`text-xs px-3 py-2 rounded-lg font-bold ${page === i + 1 ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30' : 'text-text-muted hover:text-text-primary'}`}
            >{i + 1}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="btn-outline text-xs px-3 py-2 disabled:opacity-30">&gt;</button>
        </div>
      )}
    </div>
  );
}