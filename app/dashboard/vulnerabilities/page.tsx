'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Vuln {
  id: string;
  cveId: string;
  version: string;
  title: string;
  description: string;
  severity: string;
  cvssScore: number;
  affectedAsset: string;
  status: string;
  discoveredAt: string;
}

const PER_PAGE = 10;

export default function VulnerabilitiesPage() {
  const [vulns, setVulns] = useState<Vuln[]>([]);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string; incidentId?: string } | null>(null);

  const fetchVulnerabilities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('limit', String(PER_PAGE));

      const res = await fetch(`/api/vulnerabilities?${params}`);
      if (res.ok) {
        const d = await res.json();
        setVulns(d.vulnerabilities || []);
        if (d.pagination) {
          setTotalPages(Math.max(1, d.pagination.totalPages || 1));
          setTotalCount(d.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load vulnerabilities:', err);
    } finally {
      setLoading(false);
    }
  }, [search, severityFilter, statusFilter, page]);

  useEffect(() => {
    void fetchVulnerabilities();
  }, [fetchVulnerabilities]);

  // Reset to page 1 on filter changes
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleSeverityChange = (val: string) => {
    setSeverityFilter(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/vulnerabilities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setVulns(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
        setNotification({ type: 'success', message: `Vulnerability status updated to ${newStatus}.` });
        setTimeout(() => setNotification(null), 3500);
      } else {
        const err = await res.json();
        setNotification({ type: 'error', message: err.error || 'Failed to update vulnerability status' });
        setTimeout(() => setNotification(null), 4000);
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error updating vulnerability' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePromoteToIncident = async (v: Vuln) => {
    setPromotingId(v.id);
    try {
      const sevMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
        critical: 'critical',
        high: 'high',
        medium: 'medium',
        low: 'low',
        info: 'low'
      };
      const severity = sevMap[v.severity] || 'medium';

      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[VULN] ${v.cveId}: ${v.title}`,
          description: `Discovered on affected asset: ${v.affectedAsset}\nCVSS Score: ${v.cvssScore}\nVersion: ${v.version}\n\n${v.description}`,
          severity,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // If vuln is open, mark in_progress
        if (v.status === 'open') {
          await handleUpdateStatus(v.id, 'in_progress');
        }
        setNotification({
          type: 'success',
          message: `Escalated ${v.cveId} to Incident Board!`,
          incidentId: data.incident?.id,
        });
        setTimeout(() => setNotification(null), 6000);
      } else {
        const err = await res.json();
        setNotification({ type: 'error', message: err.error || 'Failed to escalate vulnerability' });
        setTimeout(() => setNotification(null), 4000);
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error creating incident' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setPromotingId(null);
    }
  };

  const handleExport = () => {
    if (vulns.length === 0) return;
    const headers = ['CVE ID', 'Title', 'Severity', 'CVSS Score', 'Asset', 'Status', 'Discovered At'];
    const rows = vulns.map(v => [
      v.cveId,
      `"${v.title.replace(/"/g, '""')}"`,
      v.severity,
      v.cvssScore,
      `"${v.affectedAsset}"`,
      v.status,
      v.discoveredAt
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
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-dot" />
        <span className="label-mono text-accent-green">Live Threat Feed</span>
      </div>
      <h1 className="text-xl font-bold mb-1">Vulnerability Inventory</h1>
      <p className="text-text-muted text-sm mb-4">
        Manage and remediate identified risks across your infrastructure.
      </p>

      {notification && (
        <div className={`mb-4 p-3 rounded-lg border text-sm flex items-center justify-between ${
          notification.type === 'success'
            ? 'bg-accent-green/10 border-accent-green/30 text-accent-green'
            : 'bg-accent-red/10 border-accent-red/30 text-accent-red'
        }`}>
          <span>{notification.message}</span>
          {notification.incidentId && (
            <Link href="/dashboard/incidents" className="underline font-bold ml-4 text-xs">
              View Incident Board →
            </Link>
          )}
        </div>
      )}

      <div className="relative mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search CVE, Asset, or Title"
          className="input-field pl-10! text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={severityFilter}
          onChange={e => handleSeverityChange(e.target.value)}
          className="btn-outline text-xs bg-transparent appearance-none cursor-pointer pr-8"
        >
          <option value="all">Severity: All</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => handleStatusFilterChange(e.target.value)}
          className="btn-outline text-xs bg-transparent appearance-none cursor-pointer pr-8"
        >
          <option value="all">Status: All</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="fixed">Fixed</option>
        </select>

        <button onClick={handleExport} className="btn-outline text-xs">↓ Export CSV</button>
        <div className="ml-auto text-xs text-text-muted self-center">
          Showing {vulns.length} of {totalCount} findings
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-accent-red)' }}>
          <div className="label-mono mb-1">Critical (Loaded)</div>
          <div className="text-2xl font-bold">{counts.critical}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-accent-orange)' }}>
          <div className="label-mono mb-1">High (Loaded)</div>
          <div className="text-2xl font-bold">{counts.high}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-accent-amber)' }}>
          <div className="label-mono mb-1">Open (Loaded)</div>
          <div className="text-2xl font-bold">{counts.open}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-accent-green)' }}>
          <div className="label-mono mb-1">Remediated/Active</div>
          <div className="text-2xl font-bold">{counts.fixed}</div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="hidden lg:block card-glass p-0 overflow-hidden">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>CVE ID</th>
                  <th>Title</th>
                  <th>Asset</th>
                  <th>Severity</th>
                  <th>CVSS</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="stagger">
                {vulns.map(v => (
                  <tr key={v.id} className={`severity-border-${v.severity}`}>
                    <td className="text-accent-cyan font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{v.cveId}</td>
                    <td>
                      <div className="font-bold text-sm">{v.title}</div>
                      <div className="text-text-muted text-xs line-clamp-1 max-w-xs">{v.description}</div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }} className="text-xs">{v.affectedAsset}</td>
                    <td><span className={`badge badge-${v.severity}`}>● {v.severity.toUpperCase()}</span></td>
                    <td className="font-bold">{v.cvssScore}</td>
                    <td>
                      <select
                        value={v.status}
                        disabled={updatingId === v.id}
                        onChange={e => handleUpdateStatus(v.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded bg-bg-input border border-border cursor-pointer ${statusBadge(v.status)}`}
                      >
                        <option value="open">◉ Open</option>
                        <option value="in_progress">◉ In Progress</option>
                        <option value="fixed">◉ Fixed</option>
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={() => handlePromoteToIncident(v)}
                        disabled={promotingId === v.id}
                        className="btn-outline text-xs px-2.5 py-1 flex items-center gap-1.5 hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-50"
                        title="Promote this finding to the Incident Board"
                      >
                        <span>⚡</span>
                        <span>{promotingId === v.id ? 'Escalating...' : 'Escalate'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {vulns.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-text-muted py-8">No vulnerabilities found matching current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3 stagger">
            {vulns.map(v => (
              <div key={v.id} className={`card-glass p-4 severity-border-${v.severity}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-accent-cyan text-sm font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{v.cveId}</span>
                  <span className="text-text-muted text-xs" style={{ fontFamily: 'var(--font-mono)' }}>{v.version}</span>
                </div>
                <h3 className="font-bold text-sm mb-1">{v.title}</h3>
                <p className="text-text-muted text-xs mb-3 line-clamp-2">{v.description}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-${v.severity}`}>● {v.severity.toUpperCase()} ({v.cvssScore})</span>
                    <select
                      value={v.status}
                      disabled={updatingId === v.id}
                      onChange={e => handleUpdateStatus(v.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded bg-bg-input border border-border ${statusBadge(v.status)}`}
                    >
                      <option value="open">◉ Open</option>
                      <option value="in_progress">◉ In Progress</option>
                      <option value="fixed">◉ Fixed</option>
                    </select>
                  </div>
                  <button
                    onClick={() => handlePromoteToIncident(v)}
                    disabled={promotingId === v.id}
                    className="btn-outline text-xs px-2.5 py-1 flex items-center gap-1 hover:border-accent-cyan hover:text-accent-cyan"
                  >
                    <span>⚡</span>
                    <span>{promotingId === v.id ? 'Escalating...' : 'Escalate'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                  {v.affectedAsset}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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