import Link from 'next/link';

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-bg-base flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent-cyan/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent-blue/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 w-full px-6 md:px-12 py-6 flex justify-between items-center max-w-7xl mx-auto">
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

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto py-20">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan text-xs font-bold tracking-widest backdrop-blur-md">
          24/7 ENCRYPTED SUPPORT
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-tight">
          We've Got Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-accent-blue">Back.</span>
        </h1>
        <p className="text-lg md:text-xl text-text-muted mb-12 max-w-2xl leading-relaxed">
          Whether you're dealing with a configuration issue or a critical vulnerability, the PwnOps support team is here to assist.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
          <div className="card-glass p-8">
            <div className="w-12 h-12 rounded-lg bg-accent-cyan/10 flex items-center justify-center mb-6 border border-accent-cyan/20">
              <span className="text-2xl">✉️</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Direct Contact</h3>
            <p className="text-text-muted mb-6 text-sm">
              Reach out directly to Lavay Garg and the core PwnOps engineering team.
            </p>
            <a href="mailto:support@pwnops.com" className="btn-primary w-full text-center block">
              Email Support
            </a>
          </div>

          <div className="card-glass p-8">
            <div className="w-12 h-12 rounded-lg bg-accent-blue/10 flex items-center justify-center mb-6 border border-accent-blue/20">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Community Discord</h3>
            <p className="text-text-muted mb-6 text-sm">
              Join the PwnOps discord to get help from other security engineers.
            </p>
            <button className="btn-outline w-full text-center block">
              Join Server (Coming Soon)
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
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
