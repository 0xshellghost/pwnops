'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) router.push('/dashboard');
      else setError(data.error || 'Login failed');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="px-5 py-5 flex items-center gap-2">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-accent-cyan">
          <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-accent-cyan font-bold text-2xl tracking-tight" style={{ fontFamily: 'var(--font-mono)' }}>PwnOps</span>
      </header>

      <main className="flex-1 flex items-start justify-center px-5 pt-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="card-glass p-6">
            <h1 className="text-2xl font-bold mb-1">Initialize Session</h1>
            <p className="text-text-secondary text-sm mb-6">Identify yourself to access the platform.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                <div className="flex items-center justify-between mb-2">
                  <label className="label-mono">Access Key (Password)</label>
                  <span className="label-mono text-accent-cyan cursor-pointer">Recovery Flow</span>
                </div>
                <div className="relative">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" className="input-field pr-12" required/>
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </div>

              {error && <div className="text-accent-red text-sm bg-accent-red/10 border border-accent-red/20 rounded-lg px-4 py-2">{error}</div>}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Authenticating...' : 'Authorize Access ⊘'}
              </button>
            </form>

            <div className="mt-6">
              <p className="text-center label-mono mb-4">External Providers</p>
              <div className="grid grid-cols-2 gap-3">
                <a href="/api/auth/google" className="btn-outline text-xs py-3 flex items-center justify-center gap-2 hover:bg-accent-blue/10 border-accent-blue/20 text-accent-blue hover:border-accent-blue">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google SSO
                </a>
                <a href="/api/auth/github" className="btn-outline text-xs py-3 flex items-center justify-center gap-2 hover:bg-accent-cyan/10">GH Auth ⊡</a>
              </div>
            </div>

            <p className="text-center text-sm mt-6 text-text-secondary">
              New deployment?{' '}
              <Link href="/register" className="text-accent-cyan font-semibold hover:underline">Provision account</Link>
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 mt-8 text-text-muted text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
            <span>⊙ SOC2 Compliant</span>
            <span>⊛ End-to-End SSL</span>
          </div>
        </div>
      </main>

      <footer className="px-5 py-6 text-center">
        <p className="text-text-muted text-xs" style={{ fontFamily: 'var(--font-mono)' }}>© 2024 PWNOPS SEC OPS. ENCRYPTED CONNECTION.</p>
        <div className="flex justify-center gap-6 mt-3 text-text-muted text-xs">
          <span>Documentation</span><span>API Reference</span><span>Support</span><span>System Status</span>
        </div>
      </footer>
    </div>
  );
}