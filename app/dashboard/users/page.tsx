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

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    if (res.ok) { const d = await res.json(); setUsers(d.users || []); }
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

  const roleBadge = (r: string) => {
    if (r === 'admin') return 'badge-critical';
    if (r === 'analyst') return 'badge-in-progress';
    return 'badge-info';
  };

  const isAdmin = me?.role === 'admin';

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold">Team Management</h1>
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
        <h3 className="font-bold mb-3">All Operators ({users.length})</h3>
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
    </div>
  );
}