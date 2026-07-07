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
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'viewer' });
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    if (res.ok) { 
      const d = await res.json(); 
      setUsers(d.users || []); 
      if (d.organization?.name) setTeamName(d.organization.name);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const changeRole = async (id: string, role: string) => {
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    });
    fetchUsers();
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
            <div>
              <h3 className="font-bold text-lg">{me.name}</h3>
              <p className="text-text-muted text-sm" style={{ fontFamily: 'var(--font-mono)' }}>{me.email}</p>
              <span className={`badge mt-1 ${roleBadge(me.role)}`}>{me.role.toUpperCase()}</span>
            </div>
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
    </div>
  );
}