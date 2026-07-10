'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to request reset');
      }
    } catch {
      setStatus('error');
      setMessage('Network error');
    }
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
            <h1 className="text-2xl font-bold mb-1">Recover Access</h1>
            <p className="text-text-secondary text-sm mb-6">Enter your identifier to receive a reset token.</p>

            {status === 'success' ? (
              <div className="text-accent-cyan text-sm bg-accent-cyan/10 border border-accent-cyan/20 rounded-lg px-4 py-4 mb-6">
                {message}
                <div className="mt-4">
                  <Link href="/login" className="btn-outline w-full py-2 flex justify-center">Return to Login</Link>
                </div>
              </div>
            ) : (
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

                {status === 'error' && <div className="text-accent-red text-sm bg-accent-red/10 border border-accent-red/20 rounded-lg px-4 py-2">{message}</div>}

                <button type="submit" disabled={status === 'loading'} className="btn-primary w-full py-3">
                  {status === 'loading' ? 'Requesting...' : 'Request Reset Token'}
                </button>
              </form>
            )}

            <div className="mt-6 flex justify-center">
              <Link href="/login" className="text-text-secondary text-sm hover:text-accent-cyan hover:underline">
                &larr; Back to Login
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
