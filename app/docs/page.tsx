import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Learn how to use PwnOps, the enterprise-grade automated defense platform for cloud-native environments.',
};

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-bg-base flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-cyan/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 w-full px-6 md:px-12 py-6 flex justify-between items-center max-w-7xl mx-auto border-b border-border/50">
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

      {/* Content */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto py-20">
        <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight leading-tight">
          Platform <span className="text-transparent bg-clip-text bg-linear-to-r from-accent-cyan to-accent-blue">Documentation</span>
        </h1>
        <p className="text-text-muted mb-12 max-w-2xl leading-relaxed">
          Learn how to deploy workers, configure scanning modules, and orchestrate offensive security workflows.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
          {[
            { title: 'Getting Started', desc: 'Deploy your first PwnOps worker node.' },
            { title: 'Scan Engine', desc: 'How Nmap, Nuclei, and Subfinder integrate.' },
            { title: 'Access Control', desc: 'Managing users, roles, and RBAC policies.' },
            { title: 'Self-Hosting', desc: 'Deploying the Next.js frontend on Vercel.' }
          ].map((item, i) => (
            <div key={i} className="card-glass p-6 group cursor-pointer hover:border-accent-cyan/50 transition-colors">
              <h3 className="text-lg font-bold mb-2 group-hover:text-accent-cyan transition-colors">{item.title}</h3>
              <p className="text-text-muted text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-text-muted text-sm border border-border bg-bg-input p-4 rounded-lg">
          Detailed markdown documentation is currently being written by the PwnOps team. Check back later.
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
