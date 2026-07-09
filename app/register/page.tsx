'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok) router.push('/dashboard');
      else setError(data.error || 'Registration failed');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="px-5 py-5 flex items-center gap-2">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-accent-cyan">
          <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <span className="text-accent-cyan font-bold text-2xl tracking-tight" style={{ fontFamily: 'var(--font-mono)' }}>PwnOps</span>
      </header>

      <main className="flex-1 flex items-start justify-center px-5 pt-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="card-glass p-6">
            <h1 className="text-2xl font-bold mb-1">Provision Account</h1>
            <p className="text-text-secondary text-sm mb-6">Create your secure operator identity.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label-mono block mb-2">Operator Name</label>
                <div className="relative">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" className="input-field" required/>
                </div>
              </div>

              <div>
                <label className="label-mono block mb-2">Identifier (Email)</label>
                <div className="relative">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94"/>
                  </svg>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="operator@pwnops.sec" className="input-field" required/>
                </div>
              </div>

              <div>
                <label className="label-mono block mb-2">Access Key (Password)</label>
                <div className="relative">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" className="input-field" required minLength={8}/>
                </div>
              </div>

              {error && <div className="text-accent-red text-sm bg-accent-red/10 border border-accent-red/20 rounded-lg px-4 py-2">{error}</div>}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Provisioning...' : 'Create Secure Account ⊘'}
              </button>
            </form>

            <div className="mt-6 border-t border-border/50 pt-6">
              <p className="text-center label-mono mb-4">External Providers</p>
              <div className="grid grid-cols-1 gap-3">
                <a href="/api/auth/github" className="btn-outline text-xs py-3 flex items-center justify-center gap-2 hover:bg-accent-cyan/10">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  Continue with GitHub ⊡
                </a>
              </div>
            </div>

            <p className="text-center text-sm mt-6 text-text-secondary">
              Already deployed?{' '}
              <Link href="/login" className="text-accent-cyan font-semibold hover:underline">Initialize session</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}