'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface Scan {
  id: string; toolName: string; target: string; status: string;
  progress: number; startedAt: string; completedAt: string | null; results: string | null;
}

interface ToolInfo {
  name: string;
  displayName: string;
  description: string;
  available: boolean;
}

const TOOL_ICONS: Record<string, string> = {
  'nmap': '⊙',
  'nmap-recon': '⊕',
  'testssl': '⊛',
  'lynis': '⊘',
};

const TOOL_PLACEHOLDERS: Record<string, string> = {
  'nmap': 'e.g. 10.0.0.1 or scanme.nmap.org',
  'nmap-recon': 'e.g. 10.0.0.0/24',
  'testssl': 'e.g. example.com or 10.0.0.1:443',
  'lynis': 'e.g. localhost',
};

export default function ScansPage() {
  const { user } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [toolsLoaded, setToolsLoaded] = useState(false);
  const [selectedTool, setSelectedTool] = useState('');
  const [target, setTarget] = useState('');
  const [launching, setLaunching] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchScans = useCallback(async () => {
    const res = await fetch('/api/scans');
    if (res.ok) { const d = await res.json(); setScans(d.scans || []); }
  }, []);

  const fetchTools = useCallback(async () => {
    try {
      const res = await fetch('/api/scans/tools');
      if (res.ok) {
        const d = await res.json();
        setTools(d.tools || []);
        // Auto-select first available tool
        const firstAvail = (d.tools || []).find((t: ToolInfo) => t.available);
        if (firstAvail && !selectedTool) setSelectedTool(firstAvail.name);
      }
    } catch { /* ignore */ }
    setToolsLoaded(true);
  }, [selectedTool]);

  useEffect(() => { fetchScans(); fetchTools(); }, [fetchScans, fetchTools]);

  // Poll only when there are active scans
  useEffect(() => {
    const hasRunning = scans.some(s => s.status === 'running' || s.status === 'queued');
    if (!hasRunning) return;

    let iv: ReturnType<typeof setInterval> | null = null;
    const start = () => { iv = setInterval(fetchScans, 3000); };
    const stop = () => { if (iv) clearInterval(iv); iv = null; };

    const handleVisibility = () => {
      if (document.hidden) stop();
      else { fetchScans(); start(); }
    };

    start();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', handleVisibility); };
  }, [scans, fetchScans]);

  const launchScan = async () => {
    if (!target.trim() || !selectedTool) return;
    setError('');
    setLaunching(true);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName: selectedTool, target: target.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to launch scan');
      } else {
        setTarget('');
      }
      await fetchScans();
    } catch {
      setError('Network error');
    }
    setLaunching(false);
  };

  const canLaunch = user?.role !== 'viewer';
  const currentTool = tools.find(t => t.name === selectedTool);
  const availableTools = tools.filter(t => t.available);
  const unavailableTools = tools.filter(t => !t.available);

  const statusColor = (s: string) => {
    if (s === 'completed') return 'text-accent-green';
    if (s === 'running') return 'text-accent-cyan';
    if (s === 'failed') return 'text-accent-red';
    return 'text-accent-amber';
  };

  const statusIcon = (s: string) => {
    if (s === 'completed') return '✓';
    if (s === 'running') return '●';
    if (s === 'failed') return '✗';
    return '◌';
  };

  // Find display name for a tool key
  const toolDisplayName = (key: string) => {
    const t = tools.find(t => t.name === key);
    return t?.displayName || key;
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold">Tool Orchestration</h1>
        <p className="text-text-muted text-sm">Launch real infrastructure scans using industry-standard security tools.</p>
      </div>

      {/* Tool Status Banner */}
      {toolsLoaded && (
        <div className={`card-glass p-3 flex items-center gap-3 ${availableTools.length > 0 ? 'border-accent-green/20' : 'border-accent-red/20'}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${availableTools.length > 0 ? 'bg-accent-green animate-pulse-dot' : 'bg-accent-red'}`} />
          <span className="text-sm">
            <span className="font-bold">{availableTools.length}/{tools.length}</span>
            <span className="text-text-muted"> scanning tools available on this host</span>
          </span>
          {unavailableTools.length > 0 && (
            <span className="text-text-muted text-xs ml-auto hidden sm:inline">
              Missing: {unavailableTools.map(t => t.displayName).join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Scan Launcher */}
      <div className="card-glass p-4">
        <h3 className="font-bold mb-3">Launch New Scan</h3>
        <div className="space-y-3">
          <div>
            <label className="label-mono block mb-1">Select Tool</label>
            <div className="grid grid-cols-2 gap-2">
              {tools.map(t => (
                <button key={t.name} onClick={() => { if (t.available) setSelectedTool(t.name); }}
                  disabled={!t.available}
                  className={`text-xs py-2.5 px-3 rounded-lg border text-left transition-all ${
                    selectedTool === t.name
                      ? 'border-accent-cyan bg-accent-cyan/8 text-accent-cyan'
                      : t.available
                        ? 'border-border text-text-secondary hover:border-border-bright'
                        : 'border-border/30 text-text-muted/40 cursor-not-allowed opacity-50'
                  }`}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{TOOL_ICONS[t.name] || '⊙'}</span>
                    <span>{t.displayName}</span>
                    {!t.available && <span className="text-accent-red ml-auto text-[10px]">N/A</span>}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5 font-sans">{t.description}</div>
                </button>
              ))}
              {tools.length === 0 && !toolsLoaded && (
                <div className="col-span-2 text-text-muted text-sm text-center py-4">Loading tools...</div>
              )}
            </div>
          </div>
          <div>
            <label className="label-mono block mb-1">Target</label>
            <input value={target} onChange={e => setTarget(e.target.value)}
              placeholder={TOOL_PLACEHOLDERS[selectedTool] || 'e.g. 10.0.0.1 or example.com'}
              className="input-field pl-4! text-sm"
              onKeyDown={e => { if (e.key === 'Enter' && canLaunch && !launching && target.trim()) launchScan(); }}
            />
            <p className="text-text-muted text-[10px] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
              Accepted: IPv4, CIDR /16-/32, or FQDN. Localhost/link-local blocked.
            </p>
          </div>

          {error && (
            <div className="text-accent-red text-xs bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={launchScan}
              disabled={!canLaunch || launching || !target.trim() || !selectedTool || !currentTool?.available}
              className="btn-primary flex-1 text-sm">
              {launching ? '⟳ Queuing...' : '⚡ Launch Single Scan'}
            </button>
            <button onClick={async () => {
                if (!target.trim()) return;
                setError('');
                setLaunching(true);
                const workflowTools = ['subfinder', 'whatweb', 'nmap', 'nuclei'];
                // We shouldn't filter by `available` here because we want to enqueue the jobs
                // into the database regardless. If the worker doesn't have the tool, the worker
                // will fail the job. But if the worker DOES have it, it will pick it up.
                // We will only check if the API is reachable.
                try {
                  await Promise.all(workflowTools.map(t => fetch('/api/scans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toolName: t, target: target.trim() }),
                  })));
                  setTarget('');
                  await fetchScans();
                } catch { setError('Network error'); }
                setLaunching(false);
              }}
              disabled={!canLaunch || launching || !target.trim()}
              className="btn-outline flex-1 text-sm bg-accent-cyan/10 border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/20">
              {launching ? '⟳ Orchestrating...' : '🚀 Full Recon Workflow'}
            </button>
          </div>
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
                <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                  {TOOL_ICONS[s.toolName] || '⊙'} {toolDisplayName(s.toolName)}
                </span>
                <span className={`label-mono flex items-center gap-1.5 ${statusColor(s.status)}`}>
                  <span className={s.status === 'running' ? 'animate-pulse' : ''}>
                    {statusIcon(s.status)}
                  </span>
                  {s.status.toUpperCase()}
                </span>
              </div>
              <div className="text-text-muted text-xs mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                Target: {s.target}
              </div>

              {/* Progress */}
              {(s.status === 'running' || s.status === 'queued') && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-muted">
                      {s.status === 'queued' ? 'Waiting for worker...' : 'Scanning...'}
                    </span>
                    <span className="text-accent-cyan font-bold">{s.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${s.status === 'queued' ? 'bg-accent-amber' : ''}`}
                      style={{ width: `${s.progress}%` }} />
                  </div>
                </div>
              )}

              {/* Completed / Failed info */}
              {(s.status === 'completed' || s.status === 'failed') && (
                <>
                  <div className="flex items-center gap-3 text-text-muted text-xs mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                    {s.completedAt && <span>Completed: {new Date(s.completedAt).toLocaleString()}</span>}
                    {s.startedAt && s.completedAt && (
                      <span className="text-text-muted/60">
                        ({((new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 1000).toFixed(1)}s)
                      </span>
                    )}
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