'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface UserInfo {
  id: string; email: string; name: string; role: string; createdAt: string;
}

const ROLES = ['admin', 'analyst', 'viewer'] as const;

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [teamName, setTeamName] = useState('Team Management');
  const [showAddModal, setShowAddModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'viewer' });
  const [error, setError] = useState('');
  
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null }[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [rawKey, setRawKey] = useState('');

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    if (res.ok) { 
      const d = await res.json(); 
      setUsers(d.users || []); 
      if (d.organization?.name) setTeamName(d.organization.name);
    }
  };

  const fetchApiKeys = async () => {
    const res = await fetch('/api/settings/apikeys');
    if (res.ok) {
      const d = await res.json();
      setApiKeys(d.data || []);
    }
  };

  useEffect(() => { fetchUsers(); fetchApiKeys(); }, []);

  const changeRole = async (id: string, role: string) => {
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    });
    fetchUsers();
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/settings/apikeys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName })
    });
    if (res.ok) {
      const data = await res.json();
      setRawKey(data.rawKey);
      setNewKeyName('');
      fetchApiKeys();
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    await fetch(`/api/settings/apikeys/${id}`, { method: 'DELETE' });
    fetchApiKeys();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    
    if (res.ok) {
      setShowAddModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'viewer' });
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to add user');
    }
  };

  const roleBadge = (r: string) => {
    if (r === 'admin') return 'badge-critical';
    if (r === 'analyst') return 'badge-in-progress';
    return 'badge-info';
  };

  const isAdmin = me?.role === 'admin';

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold">{teamName}</h1>
        <p className="text-text-muted text-sm">Manage operator access and role assignments.</p>
      </div>

      {/* Current user profile card */}
      {me && (
        <div className="card-glass p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent-cyan/10 border-2 border-accent-cyan/30 flex items-center justify-center text-xl font-bold text-accent-cyan">
              {me.name.split(' ').map(w => w[0]).join('')}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{me.name}</h3>
              <p className="text-text-muted text-sm" style={{ fontFamily: 'var(--font-mono)' }}>{me.email}</p>
              <span className={`badge mt-1 ${roleBadge(me.role)}`}>{me.role.toUpperCase()}</span>
            </div>
            <div>
              <button onClick={() => setShow2FAModal(true)} className="btn-outline text-xs">
                Manage 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys */}
      {isAdmin && (
        <div className="card-glass p-5">
          <h3 className="font-bold mb-3">API Keys</h3>
          <p className="text-sm text-text-muted mb-4">Manage API keys for programmatic access to PwnOps.</p>
          
          {rawKey && (
            <div className="bg-accent-green/10 border border-accent-green/30 p-4 rounded-lg mb-4 text-sm animate-fade-in">
              <p className="font-bold text-accent-green mb-1">API Key Generated!</p>
              <p className="text-text-muted mb-2">Please copy your API key now. You will not be able to see it again.</p>
              <code className="block bg-bg-primary p-2 rounded border border-border select-all">{rawKey}</code>
              <button onClick={() => setRawKey('')} className="btn-outline text-xs mt-3">I have copied it</button>
            </div>
          )}

          <form onSubmit={handleAddKey} className="flex gap-2 mb-4">
            <input required type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="New Key Name (e.g. CI/CD Pipeline)" className="input-field flex-1 text-sm" />
            <button type="submit" className="btn-primary text-sm whitespace-nowrap">+ Generate Key</button>
          </form>

          <div className="space-y-2">
            {apiKeys.length === 0 && <p className="text-sm text-text-muted text-center py-2">No API keys found.</p>}
            {apiKeys.map(k => (
              <div key={k.id} className="flex items-center justify-between p-3 bg-bg-card-hover rounded-lg border border-border">
                <div>
                  <div className="font-bold text-sm">{k.name}</div>
                  <div className="text-xs text-text-muted flex gap-3 mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
                    <span>{k.prefix}...</span>
                    <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                    <span>Last Used: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</span>
                  </div>
                </div>
                <button onClick={() => handleRevokeKey(k.id)} className="text-accent-red hover:underline text-xs">Revoke</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team members */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">All Operators ({users.length})</h3>
          {isAdmin && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm px-3 py-1.5">
              + Add Member
            </button>
          )}
        </div>
        <div className="space-y-3 stagger">
          {users.map(u => (
            <div key={u.id} className="card-glass p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-sm font-bold text-accent-cyan shrink-0">
                {u.name.split(' ').map(w => w[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{u.name}</div>
                <div className="text-text-muted text-xs truncate" style={{ fontFamily: 'var(--font-mono)' }}>{u.email}</div>
                <div className="text-text-muted text-xs mt-0.5">
                  Joined {new Date(u.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="shrink-0">
                {isAdmin && u.id !== me?.id ? (
                  <select
                    value={u.role}
                    onChange={e => changeRole(u.id, e.target.value)}
                    className={`badge ${roleBadge(u.role)} cursor-pointer bg-transparent appearance-none text-center pr-4`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                  </select>
                ) : (
                  <span className={`badge ${roleBadge(u.role)}`}>{u.role.toUpperCase()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isAdmin && (
        <div className="card-glass p-4 text-center">
          <p className="text-text-muted text-sm">
            Role management requires <span className="text-accent-red font-bold">ADMIN</span> privileges.
          </p>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="card-glass w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add Team Member</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              {error && <div className="text-accent-red text-sm font-bold bg-accent-red/10 p-2 rounded border border-accent-red/20">{error}</div>}
              
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full bg-bg-card border border-border rounded p-2 focus:border-accent-cyan outline-none transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-bg-card border border-border rounded p-2 focus:border-accent-cyan outline-none transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Temporary Password</label>
                <input
                  type="text"
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full bg-bg-card border border-border rounded p-2 focus:border-accent-cyan outline-none transition-colors"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Initial Role</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-bg-card border border-border rounded p-2 focus:border-accent-cyan outline-none transition-colors"
                >
                  <option value="viewer">Viewer (Read Only)</option>
                  <option value="analyst">Analyst (Triage & Manage)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-border rounded p-2 hover:bg-bg-card-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary rounded p-2 font-medium"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {show2FAModal && <TwoFactorModal onClose={() => setShow2FAModal(false)} />}
    </div>
  );
}

function TwoFactorModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/2fa/setup')
      .then(r => r.json())
      .then(d => {
        setQrCodeUrl(d.qrCodeUrl);
        setSecret(d.secret);
        setEnabled(d.enabled);
        setLoading(false);
      });
  }, []);

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/2fa/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, secret }),
    });
    if (res.ok) {
      setEnabled(true);
      setToken('');
    } else {
      const data = await res.json();
      setError(data.error || 'Invalid code');
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable 2FA?')) return;
    await fetch('/api/auth/2fa/setup', { method: 'DELETE' });
    setEnabled(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="card-glass w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Two-Factor Authentication</h2>
        {loading ? (
          <p className="text-text-muted">Loading...</p>
        ) : enabled ? (
          <div className="space-y-4">
            <div className="bg-accent-green/10 border border-accent-green/20 p-4 rounded-lg text-accent-green">
              2FA is currently enabled for your account.
            </div>
            <button onClick={handleDisable} className="btn-outline text-accent-red border-accent-red/50 hover:bg-accent-red/10 w-full py-2">
              Disable 2FA
            </button>
            <button onClick={onClose} className="btn-outline w-full py-2">Close</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">Scan this QR code with your authenticator app (like Google Authenticator or Authy).</p>
            <div className="flex justify-center bg-white p-4 rounded-lg">
              {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" />}
            </div>
            <div className="text-center">
              <span className="text-text-muted text-xs label-mono">{secret}</span>
            </div>
            <form onSubmit={handleEnable} className="space-y-4 mt-4">
              <div>
                <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Enter 6-digit code" className="input-field text-center tracking-widest text-lg" required maxLength={6} />
              </div>
              {error && <div className="text-accent-red text-sm font-bold bg-accent-red/10 p-2 rounded border border-accent-red/20">{error}</div>}
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 btn-outline">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Enable 2FA</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}