'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface Integration {
  id: string; name: string; type: string; endpoint: string; events: string[]; createdAt: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [newIntegration, setNewIntegration] = useState({ name: '', type: 'SLACK', endpoint: '', events: ['SCAN_FAILED'] });

  useEscapeKey(() => setShowAdd(false), showAdd);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/integrations');
    if (res.ok) {
      const d = await res.json();
      setIntegrations(d.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchIntegrations(); }, [fetchIntegrations]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newIntegration)
    });
    
    setShowAdd(false);
    setNewIntegration({ name: '', type: 'SLACK', endpoint: '', events: ['SCAN_FAILED'] });
    fetchIntegrations();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;
    await fetch(`/api/integrations/${id}`, { method: 'DELETE' });
    fetchIntegrations();
  };

  const toggleEvent = (e: string) => {
    setNewIntegration(prev => ({
      ...prev,
      events: prev.events.includes(e) ? prev.events.filter(x => x !== e) : [...prev.events, e]
    }));
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-text-muted text-sm mt-1">Configure external webhooks for alerts (Slack, Discord, SIEM).</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + Add Webhook
        </button>
      </div>

      <div className="card-glass p-0 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg-card-hover border-b border-border">
            <tr>
              <th className="p-4 font-semibold text-text-muted">NAME</th>
              <th className="p-4 font-semibold text-text-muted">TYPE</th>
              <th className="p-4 font-semibold text-text-muted">ENDPOINT</th>
              <th className="p-4 font-semibold text-text-muted">EVENTS</th>
              <th className="p-4 font-semibold text-text-muted text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-text-muted">Loading...</td></tr>
            ) : integrations.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-text-muted">No integrations found.</td></tr>
            ) : (
              integrations.map(a => (
                <tr key={a.id} className="border-b border-border hover:bg-bg-card-hover/50 transition-colors">
                  <td className="p-4 font-medium">{a.name}</td>
                  <td className="p-4">
                    <span className="badge badge-info">{a.type}</span>
                  </td>
                  <td className="p-4 font-mono text-xs text-text-secondary max-w-[200px] truncate">{a.endpoint}</td>
                  <td className="p-4 flex gap-1 flex-wrap">
                    {a.events.map(e => <span key={e} className="badge bg-bg-input border border-border text-[10px]">{e}</span>)}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(a.id)} className="text-accent-red hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="card-glass w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Webhook Integration</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input required type="text" value={newIntegration.name} onChange={e => setNewIntegration({...newIntegration, name: e.target.value})} className="input-field w-full" placeholder="SOC Slack Channel" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select value={newIntegration.type} onChange={e => setNewIntegration({...newIntegration, type: e.target.value})} className="input-field w-full bg-bg-card">
                  <option value="SLACK">Slack</option>
                  <option value="DISCORD">Discord</option>
                  <option value="PAGERDUTY">PagerDuty</option>
                  <option value="GENERIC_WEBHOOK">Generic Webhook / SIEM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Endpoint URL</label>
                <input required type="url" value={newIntegration.endpoint} onChange={e => setNewIntegration({...newIntegration, endpoint: e.target.value})} className="input-field w-full" placeholder="https://hooks.slack.com/..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subscribe to Events</label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {['SCAN_COMPLETED', 'SCAN_FAILED', 'INCIDENT_CREATED', 'INCIDENT_UPDATED'].map(evt => (
                    <label key={evt} className="flex items-center gap-2 bg-bg-input p-2 rounded border border-border cursor-pointer">
                      <input type="checkbox" checked={newIntegration.events.includes(evt)} onChange={() => toggleEvent(evt)} className="rounded border-border bg-bg-card text-accent-cyan" />
                      <span className="text-xs" style={{ fontFamily: 'var(--font-mono)' }}>{evt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 btn-outline">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Save Integration</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
