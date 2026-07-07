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
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" className="input-field" required minLength={6}/>
                </div>
              </div>

              {error && <div className="text-accent-red text-sm bg-accent-red/10 border border-accent-red/20 rounded-lg px-4 py-2">{error}</div>}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Provisioning...' : 'Create Secure Account ⊘'}
              </button>
            </form>

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