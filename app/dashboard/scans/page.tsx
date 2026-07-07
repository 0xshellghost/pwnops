'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface Scan {
  id: string; toolName: string; target: string; status: string;
  progress: number; startedAt: string; completedAt: string | null; results: string | null;
}

const TOOLS = ['Network Recon', 'Port Scanner', 'Config Audit', 'SSL Check'];

export default function ScansPage() {
  const { user } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [tool, setTool] = useState(TOOLS[0]);
  const [target, setTarget] = useState('');
  const [launching, setLaunching] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchScans = async () => {
    const res = await fetch('/api/scans');
    if (res.ok) { const d = await res.json(); setScans(d.scans || []); }
  };

  useEffect(() => { fetchScans(); }, []);
  useEffect(() => {
    const hasRunning = scans.some(s => s.status === 'running' || s.status === 'queued');
    if (!hasRunning) return;
    const iv = setInterval(fetchScans, 2000);
    return () => clearInterval(iv);
  }, [scans]);

  const launchScan = async () => {
    if (!target.trim()) return;
    setLaunching(true);
    await fetch('/api/scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName: tool, target: target.trim() }),
    });
    setTarget('');
    await fetchScans();
    setLaunching(false);
  };

  const canLaunch = user?.role !== 'viewer';

  const statusColor = (s: string) => {
    if (s === 'completed') return 'text-accent-green';
    if (s === 'running') return 'text-accent-cyan';
    if (s === 'failed') return 'text-accent-red';
    return 'text-accent-amber';
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold">Tool Orchestration</h1>
        <p className="text-text-muted text-sm">Launch infrastructure scans and view results.</p>
      </div>

      {/* Scan Launcher */}
      <div className="card-glass p-4">
        <h3 className="font-bold mb-3">Launch New Scan</h3>
        <div className="space-y-3">
          <div>
            <label className="label-mono block mb-1">Select Tool</label>
            <div className="grid grid-cols-2 gap-2">
              {TOOLS.map(t => (
                <button key={t} onClick={() => setTool(t)}
                  className={`text-xs py-2.5 px-3 rounded-lg border text-left transition-all ${tool === t
                    ? 'border-accent-cyan bg-accent-cyan/8 text-accent-cyan'
                    : 'border-border text-text-secondary hover:border-border-bright'}`}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {t === 'Network Recon' && '⊕ '}
                  {t === 'Port Scanner' && '⊙ '}
                  {t === 'Config Audit' && '⊘ '}
                  {t === 'SSL Check' && '⊛ '}
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-mono block mb-1">Target</label>
            <input value={target} onChange={e => setTarget(e.target.value)}
              placeholder="e.g. 10.0.0.0/24 or prod-gw-01"
              className="input-field !pl-4 text-sm" />
          </div>
          <button onClick={launchScan} disabled={!canLaunch || launching || !target.trim()}
            className="btn-primary w-full text-sm">
            {launching ? '⟳ Queuing...' : '⚡ Launch Scan'}
          </button>
          {!canLaunch && <p className="text-accent-red text-xs text-center">Viewer role cannot launch scans</p>}
        </div>
      </div>

      {/* Scan History */}
      <div>
        <h3 className="font-bold mb-3">Scan History</h3>
        <div className="space-y-3 stagger">
          {scans.length === 0 && <p className="text-text-muted text-sm">No scans yet. Launch one above!</p>}
          {scans.map(s => (
            <div key={s.id} className="card-glass p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-mono)' }}>{s.toolName}</span>
                <span className={`label-mono ${statusColor(s.status)}`}>
                  {s.status === 'running' && '● '}{s.status.toUpperCase()}
                </span>
              </div>
              <div className="text-text-muted text-xs mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                Target: {s.target}
              </div>

              {/* Progress */}
              {(s.status === 'running' || s.status === 'queued') && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-muted">Progress</span>
                    <span className="text-accent-cyan font-bold">{s.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${s.progress}%` }} />
                  </div>
                </div>
              )}

              {/* Completed info */}
              {s.status === 'completed' && (
                <>
                  <div className="text-text-muted text-xs mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                    Completed: {new Date(s.completedAt!).toLocaleString()}
                  </div>
                  <button onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                    className="btn-outline text-xs w-full">
                    {expanded === s.id ? 'Hide Results ▲' : 'View Results ▼'}
                  </button>
                  {expanded === s.id && s.results && (
                    <div className="terminal-output mt-3">{s.results}</div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}