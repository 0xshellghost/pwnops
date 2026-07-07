'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface Incident {
  id: string; numericId: number; title: string; description: string;
  severity: string; status: string; assigneeName: string | null;
  createdAt: string; mitigationSteps: string[];
}

const COLUMNS = [
  { key: 'new', label: 'New' },
  { key: 'investigating', label: 'In Progress' },
  { key: 'containing', label: 'Containing' },
  { key: 'resolved', label: 'Resolved' },
];

const SEVERITIES = ['critical', 'high', 'medium', 'low'];

export default function IncidentsPage() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    const res = await fetch('/api/incidents');
    if (res.ok) { const d = await res.json(); setIncidents(d.incidents || []); }
  }, []);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);
  useEffect(() => {
    const iv = setInterval(fetchIncidents, 5000);
    return () => clearInterval(iv);
  }, [fetchIncidents]);

  const moveIncident = async (id: string, status: string) => {
    await fetch('/api/incidents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    fetchIncidents();
  };

  const createIncident = async (data: { title: string; description: string; severity: string }) => {
    await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setShowModal(false);
    fetchIncidents();
  };

  const filtered = filter ? incidents.filter(i => i.severity === filter) : incidents;
  const canEdit = user?.role !== 'viewer';

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold">Incident Board</h1>
        <p className="text-text-muted text-sm">Manage active security threats and response workflows.</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-4">
        <div className="relative">
          <button
            onClick={() => setFilter(filter ? null : 'critical')}
            className="btn-outline text-xs"
          >
            ≡ Filter {filter && `(${filter})`}
          </button>
          {filter && (
            <div className="absolute top-full left-0 mt-1 bg-bg-card border border-border rounded-lg p-2 z-20 space-y-1 min-w-[120px]">
              {[null, ...SEVERITIES].map(s => (
                <button key={s || 'all'} onClick={() => setFilter(s)}
                  className={`block w-full text-left px-3 py-1.5 rounded text-xs ${filter === s ? 'bg-accent-cyan/10 text-accent-cyan' : 'text-text-secondary hover:bg-bg-card-hover'}`}
                >
                  {s ? s.toUpperCase() : 'ALL'}
                </button>
              ))}
            </div>
          )}
        </div>
        {canEdit && (
          <button onClick={() => setShowModal(true)} className="btn-primary text-xs">
            ⊕ New Incident
          </button>
        )}
      </div>

      {/* Kanban Board - horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4" style={{ scrollSnapType: 'x mandatory' }}>
        {COLUMNS.map(col => {
          const colIncidents = filtered.filter(i => i.status === col.key);
          return (
            <div
              key={col.key}
              className="kanban-column"
              style={{ scrollSnapAlign: 'start' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const id = e.dataTransfer.getData('incidentId');
                if (id && canEdit) moveIncident(id, col.key);
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="label-mono text-text-primary">{col.label}</span>
                <span className="bg-bg-card border border-border rounded-md px-2 py-0.5 text-xs text-text-muted font-bold">{colIncidents.length}</span>
                <span className="ml-auto text-text-muted cursor-pointer">⋯</span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {colIncidents.map(inc => (
                  <div
                    key={inc.id}
                    draggable={canEdit}
                    onDragStart={e => { e.dataTransfer.setData('incidentId', inc.id); setDragId(inc.id); }}
                    onDragEnd={() => setDragId(null)}
                    className={`kanban-card severity-border-${inc.severity} ${dragId === inc.id ? 'dragging' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`badge badge-${inc.severity}`}>● {inc.severity.toUpperCase()}</span>
                      <span className="text-text-muted text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                        ID: #{inc.numericId}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm mb-2">{inc.title}</h4>
                    <div className="flex items-center justify-between">
                      {inc.assigneeName ? (
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-xs font-bold text-accent-cyan">
                            {inc.assigneeName.split(' ').map(w => w[0]).join('')}
                          </span>
                          <span className="text-text-muted text-xs">{inc.assigneeName}</span>
                        </div>
                      ) : (
                        <span className="text-text-muted text-xs italic">Unassigned</span>
                      )}
                      {inc.mitigationSteps.length > 0 && (
                        <span className="text-text-muted text-xs">🔗</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showModal && <CreateModal onClose={() => setShowModal(false)} onCreate={createIncident} />}
    </div>
  );
}

function CreateModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: { title: string; description: string; severity: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [sev, setSev] = useState('high');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-1">New Incident</h2>
        <p className="text-text-muted text-sm mb-4">Log a new security incident for triage.</p>
        <form onSubmit={e => { e.preventDefault(); onCreate({ title, description: desc, severity: sev }); }} className="space-y-4">
          <div>
            <label className="label-mono block mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Incident title" className="input-field !pl-4" required />
          </div>
          <div>
            <label className="label-mono block mb-1">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the incident..." rows={3}
              className="w-full p-3 bg-bg-input border border-border rounded-lg text-text-primary text-sm outline-none focus:border-accent-cyan resize-none" />
          </div>
          <div>
            <label className="label-mono block mb-1">Severity</label>
            <div className="flex gap-2">
              {SEVERITIES.map(s => (
                <button key={s} type="button" onClick={() => setSev(s)}
                  className={`badge cursor-pointer ${sev === s ? `badge-${s}` : 'badge-info'}`}
                >{s}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1 text-xs">Cancel</button>
            <button type="submit" className="btn-primary flex-1 text-xs">Create Incident</button>
          </div>
        </form>
      </div>
    </div>
  );
}