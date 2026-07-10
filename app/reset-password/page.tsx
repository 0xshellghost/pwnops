'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordContent() {
  
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatus('error');
      setMessage('Missing reset token');
      return;
    }

    setStatus('loading');
    setMessage('');
    
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to reset password');
      }
    } catch {
      setStatus('error');
      setMessage('Network error');
    }
  };

  if (!token) {
    return (
      <div className="text-center p-6 card-glass mt-10 max-w-md mx-auto">
        <div className="text-accent-red mb-4">Invalid or missing token</div>
        <Link href="/forgot-password" className="text-accent-cyan hover:underline">Request a new reset token</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-fade-in mt-8 mx-auto">
      <div className="card-glass p-6">
        <h1 className="text-2xl font-bold mb-1">Set New Access Key</h1>
        <p className="text-text-secondary text-sm mb-6">Enter your new password below.</p>

        {status === 'success' ? (
          <div className="text-accent-cyan text-sm bg-accent-cyan/10 border border-accent-cyan/20 rounded-lg px-4 py-4 mb-6 text-center">
            Password updated successfully.
            <div className="mt-4">
              <Link href="/login" className="btn-primary w-full py-2 flex justify-center">Proceed to Login</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-mono block mb-2">New Password</label>
              <div className="relative">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" className="input-field pl-10! pr-12!" required minLength={8}/>
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-text-muted mt-2 font-mono">Must be 8+ chars with uppercase, lowercase, and digit.</p>
            </div>

            {status === 'error' && <div className="text-accent-red text-sm bg-accent-red/10 border border-accent-red/20 rounded-lg px-4 py-2">{message}</div>}

            <button type="submit" disabled={status === 'loading'} className="btn-primary w-full py-3">
              {status === 'loading' ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<div className="text-text-muted">Loading...</div>}>
          <ResetPasswordContent />
        </Suspense>
      </main>
    </div>
  );
}
