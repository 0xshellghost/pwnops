'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface DashData {
  incidents: { total: number; active: number; critical: number; high: number; medium: number; low: number };
  scans: { total: number; completed: number; failed: number };
  vulns: { total: number; open: number; critical: number; recent: any[] };
  threatFeed: { message: string; timestamp: string }[];
}

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    const from = prevTarget.current;
    let start = 0;
    const duration = 1200;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(from + (target - from) * p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    prevTarget.current = target;
  }, [target]);
  return <>{val}{suffix}</>;
}

export default function DashboardHome() {
  const [data, setData] = useState<DashData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadData() {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/dashboard/metrics');
      if (!res.ok) throw new Error('API failed');
      const json = await res.json();
      if (!json.error) setData(json);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      // Fallback empty data so the UI doesn't hang in skeleton mode forever
      setData({
        incidents: { total: 0, active: 0, critical: 0, high: 0, medium: 0, low: 0 },
        scans: { total: 0, completed: 0, failed: 0 },
        vulns: { total: 0, open: 0, critical: 0, recent: [] },
        threatFeed: []
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function simulateThreat() {
    try {
      await fetch('/api/simulate-threat', { method: 'POST' });
      await void loadData();
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  if (!data) return (
    <div className="animate-pulse space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="h-20 bg-bg-card rounded-xl" />)}
    </div>
  );

  const total = Math.max(data.incidents.active, 1);
  const critPct = data.incidents.critical / total * 100;
  const highPct = data.incidents.high / total * 100;
  const medPct = data.incidents.medium / total * 100;
  const lowPct = data.incidents.low / total * 100;

  const donutGradient = `conic-gradient(
    #ff3e3e 0% ${critPct}%,
    #ff8c00 ${critPct}% ${critPct + highPct}%,
    #ffb800 ${critPct + highPct}% ${critPct + highPct + medPct}%,
    #3b82f6 ${critPct + highPct + medPct}% ${critPct + highPct + medPct + lowPct}%,
    rgba(255,255,255,0.06) ${critPct + highPct + medPct + lowPct}% 100%
  )`;

  return (
    <div className="animate-fade-in flex flex-col pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ─── Left Column (Main Metrics & Data) ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Computed Metrics */}
          <div className="card-glass p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-xl">Security Posture</h2>
                <p className="text-text-muted text-sm mt-1">Computed from live data</p>
              </div>
              <span className={`badge px-3 py-1 ${data.incidents.critical > 0 ? 'badge-critical' : 'badge-low'}`}>
                {data.incidents.critical > 0 ? `${data.incidents.critical} Critical` : 'Stable'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div className="bg-bg-surface/50 p-4 rounded-xl border border-border/50">
                <div className="text-4xl font-bold text-accent-cyan">
                  <AnimatedNumber target={data.scans.total > 0 ? Math.round(data.scans.completed / data.scans.total * 100) : 0} suffix="" />%
                </div>
                <div className="label-mono mt-2">Scan Success Rate</div>
              </div>
              <div className="bg-bg-surface/50 p-4 rounded-xl border border-border/50">
                <div className="text-4xl font-bold text-text-primary">
                  <AnimatedNumber target={data.incidents.total > 0 ? Math.round((data.incidents.total - data.incidents.active) / data.incidents.total * 100) : 0} suffix="" />%
                </div>
                <div className="label-mono mt-2">Incidents Resolved</div>
              </div>
            </div>
          </div>

          {/* Recent Detections */}
          <div className="card-glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Recent Detections</h3>
              <button onClick={loadData} disabled={isRefreshing} className="text-text-muted hover:text-accent-cyan text-sm transition-colors disabled:opacity-50">
                {isRefreshing ? '↻ Refreshing...' : '↻ Refresh'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr className="text-left text-xs text-text-muted">
                    <th className="py-3 font-mono">CVE ID</th>
                    <th className="py-3 font-mono">Target Asset</th>
                    <th className="py-3 font-mono">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vulns.recent.map(v => (
                    <tr key={v.cveId} className="group transition-colors border-t border-border/50">
                      <td className="text-accent-cyan text-sm py-4" style={{ fontFamily: 'var(--font-mono)' }}>{v.cveId}</td>
                      <td className="text-sm py-4" style={{ fontFamily: 'var(--font-mono)' }}>{v.affectedAsset}</td>
                      <td className="py-4"><span className={`badge badge-${v.severity}`}>{v.severity} ({v.cvssScore})</span></td>
                    </tr>
                  ))}
                  {data.vulns.recent.length === 0 && (
                    <tr><td colSpan={3} className="py-4 text-center text-text-muted text-sm">No recent vulnerabilities found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scan Activity Summary */}
          <div className="card-glass p-6">
            <h3 className="font-bold text-lg mb-5">Scan Activity</h3>
            <div className="space-y-5">
              {[
                { label: 'Completed Scans', value: data.scans.completed, total: Math.max(data.scans.total, 1), color: 'bg-accent-green' },
                { label: 'Failed Scans', value: data.scans.failed, total: Math.max(data.scans.total, 1), color: 'bg-accent-red' },
                { label: 'Open Vulnerabilities', value: data.vulns.open, total: Math.max(data.vulns.total, 1), color: 'bg-accent-amber' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="label-mono">{s.label}</span>
                    <span className="text-text-primary font-bold">{s.value}</span>
                  </div>
                  <div className="progress-bar h-2">
                    <div className={`progress-fill ${s.color}`} style={{ width: `${Math.round(s.value / s.total * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Right Column (Widgets) ─── */}
        <div className="space-y-6">
          {/* Active Incidents Donut */}
          <div className="card-glass p-6 flex flex-col items-center">
            <p className="label-mono text-center mb-6">Active Incidents</p>
            <div className="flex justify-center mb-6">
              <div className="donut w-40 h-40" style={{ background: donutGradient }}>
                <div className="donut-inner w-32 h-32 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{String(data.incidents.active).padStart(2, '0')}</span>
                  <span className="label-mono text-accent-red mt-1">Active</span>
                </div>
              </div>
            </div>
            <Link href="/dashboard/incidents" className="btn-outline w-full text-center text-sm py-3">
              Triage Queue →
            </Link>
          </div>

          {/* Live Threat Feed */}
          <div className="card-glass p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse-dot" />
                <span className="label-mono text-accent-green">Live Threat Vector Feed</span>
              </div>
              <button onClick={simulateThreat} className="text-xs text-text-muted hover:text-accent-cyan flex items-center gap-1 border border-border/50 px-2 py-1 rounded hover:bg-accent-cyan/10 transition-colors">
                + Simulate
              </button>
            </div>
            <ul className="space-y-3">
              {data.threatFeed.map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-text-secondary bg-bg-surface/30 p-3 rounded-lg border border-border/30">
                  <span className="text-accent-cyan mt-0.5">●</span>
                  <span className="leading-relaxed">{t.message}</span>
                </li>
              ))}
              {data.threatFeed.length === 0 && (
                <li className="text-text-muted text-sm text-center italic py-2">No active threats detected.</li>
              )}
            </ul>
          </div>

          {/* Quick Scan */}
          <div className="card-glass p-6">
            <h3 className="font-bold text-lg mb-2">Quick Scan</h3>
            <p className="text-text-muted text-sm mb-5 leading-relaxed">Initialize heuristic deep-dive on configured assets.</p>
            <Link href="/dashboard/scans" className="btn-primary w-full text-center block text-sm py-3">
              ⚡ Run Diagnostic
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}