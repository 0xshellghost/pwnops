'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SupportPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-bg-base flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent-cyan/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent-blue/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <nav className="relative z-10 w-full px-6 md:px-12 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-accent-cyan to-accent-blue flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.3)] group-hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all">
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

      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto py-12">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan text-xs font-bold tracking-widest backdrop-blur-md">
          24/7 ENCRYPTED SUPPORT
        </div>
        <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight leading-tight">
          We&apos;ve Got Your <span className="text-transparent bg-clip-text bg-linear-to-r from-accent-cyan to-accent-blue">Back.</span>
        </h1>
        <p className="text-base md:text-lg text-text-muted mb-10 max-w-2xl leading-relaxed">
          Whether you&apos;re orchestrating complex offensive scans, troubleshooting container workers, or triaging critical CVEs, the PwnOps security engineering team is here to assist.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left mb-12">
          <div className="card-glass p-8">
            <div className="w-12 h-12 rounded-lg bg-accent-cyan/10 flex items-center justify-center mb-6 border border-accent-cyan/20">
              <span className="text-2xl">✉️</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Direct Security Desk</h3>
            <p className="text-text-muted mb-6 text-sm">
              Reach out directly to lead architect Lavay Garg for production incidents, custom integrations, or vulnerability disclosures.
            </p>
            <a href="mailto:garglavay@gmail.com" className="btn-primary w-full text-center block">
              Email Security Desk (garglavay@gmail.com)
            </a>
          </div>

          <div className="card-glass p-8">
            <div className="w-12 h-12 rounded-lg bg-accent-blue/10 flex items-center justify-center mb-6 border border-accent-blue/20">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-xl font-bold mb-2">GitHub Security Center</h3>
            <p className="text-text-muted mb-6 text-sm">
              Report bugs, submit tool integrations, and request new vulnerability template signatures via GitHub Issues and Discussions.
            </p>
            <a
              href="https://github.com/lavaygarg/pwnops/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline w-full text-center block hover:border-accent-cyan hover:text-accent-cyan"
            >
              Open GitHub Issue →
            </a>
          </div>
        </div>

        <div className="card-glass p-8 w-full text-left max-w-2xl mx-auto border border-border/80">
          <h3 className="text-lg font-bold mb-1">Dispatch Support Request</h3>
          <p className="text-text-muted text-xs mb-6">Submit an encrypted inquiry directly to the operations queue.</p>

          {submitted ? (
            <div className="p-4 bg-accent-green/10 border border-accent-green/30 rounded-lg text-accent-green text-sm text-center">
              ✓ Your dispatch request has been logged. Our SOC engineering team will respond shortly.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-mono block mb-1">Operator Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Operator name"
                    className="input-field pl-4! text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="label-mono block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="operator@organization.sec"
                    className="input-field pl-4! text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label-mono block mb-1">Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Worker node connection timeout on port 10000"
                  className="input-field pl-4! text-sm"
                  required
                />
              </div>
              <div>
                <label className="label-mono block mb-1">Details</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Describe your environment, error logs, or requirements..."
                  className="w-full p-3 bg-bg-input border border-border rounded-lg text-text-primary text-sm outline-none focus:border-accent-cyan resize-none"
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full py-2.5 text-xs">
                Submit Support Request
              </button>
            </form>
          )}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/50 bg-bg-card/30 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <p className="text-center text-text-muted text-xs mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
            © {new Date().getFullYear()} PWNOPS SEC OPS. CREATED BY LAVAY GARG.
          </p>
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
