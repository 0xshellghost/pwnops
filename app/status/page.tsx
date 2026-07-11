'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function StatusPage() {
  const [status, setStatus] = useState<'checking' | 'online' | 'degraded'>('checking');

  useEffect(() => {
    // Simulated status check
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status === 'online' ? 'online' : 'degraded');
        } else {
          setStatus('degraded');
        }
      } catch {
        setStatus('degraded');
      }
    };
    checkStatus();
  }, []);

  return (
    <main className="min-h-screen bg-bg-base flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full overflow-hidden pointer-events-none">
        <div className={`absolute top-[20%] left-[30%] w-[40%] h-[40%] blur-[150px] rounded-full mix-blend-screen transition-colors duration-1000 ${
          status === 'online' ? 'bg-accent-green/10' : status === 'degraded' ? 'bg-accent-red/10' : 'bg-text-muted/10'
        }`} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 w-full px-6 md:px-12 py-6 flex justify-between items-center max-w-7xl mx-auto border-b border-border/50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.3)] group-hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-wider">Pwn<span className="text-accent-cyan">Ops</span></span>
        </Link>
        <Link href="/login" className="btn-outline text-sm">
          Access Platform →
        </Link>
      </nav>

      {/* Content */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto py-20">
        <div className="mb-8">
          {status === 'checking' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-bg-input text-text-muted text-sm font-mono animate-pulse">
              <span className="w-2 h-2 rounded-full bg-text-muted"></span>
              Checking Systems...
            </div>
          )}
          {status === 'online' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent-green/30 bg-accent-green/10 text-accent-green text-sm font-mono shadow-[0_0_15px_rgba(0,255,128,0.2)]">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
              All Systems Operational
            </div>
          )}
          {status === 'degraded' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent-red/30 bg-accent-red/10 text-accent-red text-sm font-mono shadow-[0_0_15px_rgba(255,64,64,0.2)]">
              <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse"></span>
              Partial Outage Detected
            </div>
          )}
        </div>

        <h1 className="text-4xl md:text-5xl font-black mb-12 tracking-tight leading-tight">
          System <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-accent-blue">Status</span>
        </h1>

        <div className="w-full text-left space-y-4">
          {[
            { component: 'Next.js Frontend (Vercel)', status: 'online' },
            { component: 'Supabase Database', status: 'online' },
            { component: 'Scan Worker Pool (AWS)', status: status },
            { component: 'WebSocket Streaming', status: status }
          ].map((item, i) => (
            <div key={i} className="card-glass p-4 flex items-center justify-between">
              <span className="font-bold">{item.component}</span>
              <span className={`text-sm font-mono flex items-center gap-2 ${
                item.status === 'online' ? 'text-accent-green' : item.status === 'degraded' ? 'text-accent-red' : 'text-text-muted'
              }`}>
                {item.status === 'online' ? 'Operational' : item.status === 'degraded' ? 'Degraded' : 'Checking...'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-bg-card/30 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex justify-center gap-6 text-text-muted text-xs">
            <Link href="/docs" className="hover:text-accent-cyan transition-colors">Documentation</Link>
            <Link href="/api-docs" className="hover:text-accent-cyan transition-colors">API Reference</Link>
            <Link href="/support" className="hover:text-accent-cyan transition-colors">Support</Link>
            <Link href="/status" className="hover:text-accent-cyan transition-colors">System Status</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
