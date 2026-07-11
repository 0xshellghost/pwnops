import Link from 'next/link';

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-bg-base flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute bottom-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-blue/10 blur-[120px] rounded-full mix-blend-screen" />
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
        <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight leading-tight">
          API <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-cyan">Reference</span>
        </h1>
        <p className="text-text-muted mb-12 max-w-2xl leading-relaxed">
          Programmatically launch scans and manage infrastructure using the REST API.
        </p>

        <div className="w-full text-left space-y-4">
          {[
            { method: 'GET', endpoint: '/api/scans', desc: 'List recent scan activity' },
            { method: 'POST', endpoint: '/api/scans', desc: 'Launch a new infrastructure scan' },
            { method: 'GET', endpoint: '/api/scans/tools', desc: 'List available scanner binaries' },
            { method: 'POST', endpoint: '/api/auth/login', desc: 'Authenticate and receive session' }
          ].map((api, i) => (
            <div key={i} className="card-glass p-4 flex flex-col md:flex-row md:items-center gap-4">
              <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                api.method === 'GET' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-cyan/20 text-accent-cyan'
              }`}>
                {api.method}
              </span>
              <code className="text-sm text-text-primary flex-1">{api.endpoint}</code>
              <span className="text-text-muted text-sm">{api.desc}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-text-muted text-sm border border-border bg-bg-input p-4 rounded-lg">
          Full OpenAPI / Swagger specification is currently being generated.
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
