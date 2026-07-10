'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface Asset {
  id: string; name: string; ipAddress: string | null; fqdn: string | null;
  type: string; status: string; tags: string[]; createdAt: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [newAsset, setNewAsset] = useState({ name: '', ipAddress: '', fqdn: '', type: 'ENDPOINT', status: 'ACTIVE', tags: '' });

  useEscapeKey(() => setShowAdd(false), showAdd);

  const fetchAssets = useCallback(async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/assets?page=${p}&limit=10`);
    if (res.ok) {
      const d = await res.json();
      setAssets(d.data);
      setTotalPages(d.totalPages);
      setTotal(d.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAssets(page); }, [page, fetchAssets]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...newAsset,
      tags: newAsset.tags.split(',').map(t => t.trim()).filter(Boolean)
    };
    
    await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    setShowAdd(false);
    setNewAsset({ name: '', ipAddress: '', fqdn: '', type: 'ENDPOINT', status: 'ACTIVE', tags: '' });
    fetchAssets(page);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    fetchAssets(page);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">Asset Inventory</h1>
          <p className="text-text-muted text-sm mt-1">Manage network and endpoint assets for scanning.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + Add Asset
        </button>
      </div>

      <div className="card-glass p-0 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg-card-hover border-b border-border">
            <tr>
              <th className="p-4 font-semibold text-text-muted">NAME</th>
              <th className="p-4 font-semibold text-text-muted">TARGET</th>
              <th className="p-4 font-semibold text-text-muted">TYPE</th>
              <th className="p-4 font-semibold text-text-muted">STATUS</th>
              <th className="p-4 font-semibold text-text-muted">TAGS</th>
              <th className="p-4 font-semibold text-text-muted text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-text-muted">Loading...</td></tr>
            ) : assets.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-text-muted">No assets found.</td></tr>
            ) : (
              assets.map(a => (
                <tr key={a.id} className="border-b border-border hover:bg-bg-card-hover/50 transition-colors">
                  <td className="p-4 font-medium">{a.name}</td>
                  <td className="p-4 font-mono text-xs text-text-secondary">{a.ipAddress || a.fqdn || 'N/A'}</td>
                  <td className="p-4">
                    <span className="badge badge-info">{a.type}</span>
                  </td>
                  <td className="p-4">
                    <span className={`badge ${a.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>{a.status}</span>
                  </td>
                  <td className="p-4 flex gap-1 flex-wrap">
                    {a.tags.map(t => <span key={t} className="badge bg-bg-input border border-border">{t}</span>)}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(a.id)} className="text-accent-red hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center bg-bg-card-hover/30">
            <div className="text-sm text-text-muted">Total: {total}</div>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline px-3 py-1 text-sm disabled:opacity-50">Prev</button>
              <span className="px-3 py-1 text-sm">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-outline px-3 py-1 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="card-glass w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Asset</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Asset Name</label>
                <input required type="text" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} className="input-field w-full" placeholder="Production DB Server" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">IP Address</label>
                  <input type="text" value={newAsset.ipAddress} onChange={e => setNewAsset({...newAsset, ipAddress: e.target.value})} className="input-field w-full" placeholder="10.0.0.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">FQDN</label>
                  <input type="text" value={newAsset.fqdn} onChange={e => setNewAsset({...newAsset, fqdn: e.target.value})} className="input-field w-full" placeholder="db.prod.internal" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value})} className="input-field w-full bg-bg-card">
                    <option value="ENDPOINT">Endpoint</option>
                    <option value="SERVER">Server</option>
                    <option value="NETWORK">Network Device</option>
                    <option value="CLOUD">Cloud Resource</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={newAsset.status} onChange={e => setNewAsset({...newAsset, status: e.target.value})} className="input-field w-full bg-bg-card">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                <input type="text" value={newAsset.tags} onChange={e => setNewAsset({...newAsset, tags: e.target.value})} className="input-field w-full" placeholder="prod, database, pci-dss" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 btn-outline">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Save Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
