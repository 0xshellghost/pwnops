'use client';

import { useEffect, useState } from 'react';

interface DashData {
  incidents: { severity: string; status: string }[];
  vulns: { severity: string; status: string; cveId: string; affectedAsset: string; cvssScore: number }[];
  threatFeed: { message: string; timestamp: string }[];
}

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{val}{suffix}</>;
}

export default function DashboardHome() {
  const [data, setData] = useState<DashData | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadData() {
    setIsRefreshing(true);
    try {
      const [incRes, vulnRes, scanRes] = await Promise.all([
        fetch('/api/incidents'), fetch('/api/vulnerabilities'), fetch('/api/scans'),
      ]);
      const inc = await incRes.json();
      const vul = await vulnRes.json();
      const scn = await scanRes.json();
      setData({
        incidents: inc.incidents || [],
        vulns: vul.vulnerabilities || [],
        threatFeed: scn.threatFeed || [],
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (!data) return (
    <div className="animate-pulse space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="h-20 bg-bg-card rounded-xl" />)}
    </div>
  );

  const criticalIncidents = data.incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length;
  const activeIncidents = data.incidents.filter(i => i.status !== 'resolved').length;
  const openVulns = data.vulns.filter(v => v.status === 'open').length;
  const criticalVulns = data.vulns.filter(v => v.severity === 'critical').length;

  // Donut chart segments
  const total = Math.max(activeIncidents, 1);
  const critPct = data.incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length / total * 100;
  const highPct = data.incidents.filter(i => i.severity === 'high' && i.status !== 'resolved').length / total * 100;
  const medPct = data.incidents.filter(i => i.severity === 'medium' && i.status !== 'resolved').length / total * 100;
  const lowPct = data.incidents.filter(i => i.severity === 'low' && i.status !== 'resolved').length / total * 100;

  const donutGradient = `conic-gradient(
    #ff3e3e 0% ${critPct}%,
    #ff8c00 ${critPct}% ${critPct + highPct}%,
    #ffb800 ${critPct + highPct}% ${critPct + highPct + medPct}%,
    #3b82f6 ${critPct + highPct + medPct}% ${critPct + highPct + medPct + lowPct}%,
    rgba(255,255,255,0.06) ${critPct + highPct + medPct + lowPct}% 100%
  )`;

  const recentVulns = data.vulns.slice(0, 4);

  return (
    <div className="animate-fade-in flex flex-col pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ─── Left Column (Main Metrics & Data) ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Security Posture */}
          <div className="card-glass p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-xl">Security Posture</h2>
                <p className="text-text-muted text-sm mt-1">Global Risk Index: Nominal</p>
              </div>
              <span className={`badge px-3 py-1 ${criticalIncidents > 0 ? 'badge-critical' : 'badge-low'}`}>
                {criticalIncidents > 0 ? `${criticalIncidents} Critical` : 'Stable'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div className="bg-bg-surface/50 p-4 rounded-xl border border-border/50">
                <div className="text-4xl font-bold text-accent-cyan">
                  <AnimatedNumber target={98} suffix="." />4%
                </div>
                <div className="label-mono mt-2">Operational Uptime</div>
              </div>
              <div className="bg-bg-surface/50 p-4 rounded-xl border border-border/50">
                <div className="text-4xl font-bold text-text-primary">
                  <AnimatedNumber target={12} /><span className="text-xl text-text-muted ml-1">ms</span>
                </div>
                <div className="label-mono mt-2">Avg Response Time</div>
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
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="py-3">CVE ID</th>
                    <th className="py-3">Target Asset</th>
                    <th className="py-3">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVulns.map(v => (
                    <tr key={v.cveId} className="group transition-colors">
                      <td className="text-accent-cyan text-sm py-4" style={{ fontFamily: 'var(--font-mono)' }}>{v.cveId}</td>
                      <td className="text-sm py-4" style={{ fontFamily: 'var(--font-mono)' }}>{v.affectedAsset}</td>
                      <td className="py-4"><span className={`badge badge-${v.severity}`}>{v.severity} ({v.cvssScore})</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sensor Network Health */}
          <div className="card-glass p-6">
            <h3 className="font-bold text-lg mb-5">Sensor Network Health</h3>
            <div className="space-y-5">
              {[
                { label: 'Cloud Connectors', value: 100, color: 'bg-accent-cyan' },
                { label: 'Endpoint Agents', value: 94, color: 'bg-accent-purple' },
                { label: 'Network Taps', value: 92, color: 'bg-accent-blue' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="label-mono">{s.label}</span>
                    <span className="text-text-primary font-bold">{s.value}%</span>
                  </div>
                  <div className="progress-bar h-2">
                    <div className={`progress-fill ${s.color}`} style={{ width: `${s.value}%` }} />
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
                <div className="donut-inner w-32 h-32">
                  <span className="text-4xl font-bold">{String(activeIncidents).padStart(2, '0')}</span>
                  <span className="label-mono text-accent-red mt-1">Active</span>
                </div>
              </div>
            </div>
            <a href="/dashboard/incidents" className="btn-outline w-full text-center text-sm py-3">
              Triage Queue →
            </a>
          </div>

          {/* Live Threat Feed */}
          <div className="card-glass p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse-dot" />
              <span className="label-mono text-accent-green">Live Threat Vector Feed</span>
            </div>
            <ul className="space-y-3">
              {data.threatFeed.map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-text-secondary bg-bg-surface/30 p-3 rounded-lg border border-border/30">
                  <span className="text-accent-cyan mt-0.5">●</span>
                  <span className="leading-relaxed">{t.message}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Scan */}
          <div className="card-glass p-6">
            <h3 className="font-bold text-lg mb-2">Quick Scan</h3>
            <p className="text-text-muted text-sm mb-5 leading-relaxed">Initialize heuristic deep-dive on configured assets.</p>
            <a href="/dashboard/scans" className="btn-primary w-full text-center text-sm py-3">
              ⚡ Run Diagnostic
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center mt-10 pt-6 border-t border-border/50">
        <p className="text-text-muted text-xs tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
          © {new Date().getFullYear()} PWNOPS SEC OPS. ENCRYPTED CONNECTION.
        </p>
        <div className="flex justify-center gap-6 mt-4 text-text-muted text-xs">
          <span className="hover:text-text-secondary cursor-pointer transition-colors">Documentation</span>
          <span className="hover:text-text-secondary cursor-pointer transition-colors">API Reference</span>
          <span className="hover:text-text-secondary cursor-pointer transition-colors">Support</span>
          <span className="text-accent-cyan underline cursor-pointer">System Status</span>
        </div>
      </footer>
    </div>
  );
}