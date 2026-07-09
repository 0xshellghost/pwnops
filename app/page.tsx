import Link from 'next/link';

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "PwnOps",
    "applicationCategory": "SecurityApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Enterprise-grade automated defense for cloud-native environments. Detect, prioritize, and remediate critical vulnerabilities.",
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ─── Header ──────────────────────────────────── */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="label-mono text-text-muted">security</span>
            <span className="text-accent-cyan font-bold text-xl tracking-tight" style={{ fontFamily: 'var(--font-mono)' }}>
              PwnOps
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-accent-cyan ml-0.5">
              <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zM3 14h7v7H3v-7z" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <Link href="/login" className="text-accent-cyan text-sm font-medium hover:underline" style={{ fontFamily: 'var(--font-mono)' }}>
            Sign In →
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ─── Hero ────────────────────────────────────── */}
      <section className="hero-gradient">
        <div className="max-w-6xl mx-auto w-full px-5 pt-12 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-dot" />
            <span className="label-mono text-accent-green">System Active</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight mb-2">
            Automated Cybersecurity for{' '}
            <span className="text-accent-cyan">Cloud-Native Environments</span>
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed mb-8">
            Deploy PwnOps in minutes to gain full-spectrum visibility. Our enterprise-grade
            automated scanner detects, prioritizes, and assists in the remediation of critical
            vulnerabilities across your entire attack surface.
          </p>
          <div className="flex gap-3">
            <Link href="/register" className="btn-primary text-sm">
              Deploy Now
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L12 16M12 16L7 11M12 16L17 11" />
                <path d="M4 22h16" />
              </svg>
            </Link>
            <Link href="/login" className="btn-outline text-sm">
              Live Demo →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-5 py-10">
        <h2 className="label-mono text-accent-cyan mb-6">Mission Critical Intelligence</h2>
        <p className="text-text-secondary text-sm mb-8">
          Our platform handles the heavy lifting of security operations, allowing your team to
          focus on strategy, not on wading elbow-deep through manual patches.
        </p>

        <div className="flex flex-col gap-4 stagger">
          <div className="feature-card">
            <div className="text-accent-cyan mb-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3 className="font-bold mb-1">Automated Detection</h3>
            <p className="text-text-secondary text-sm">
              Continuous infrastructure monitoring with zero-day vulnerability research. We identify common
              CVE IDs and zero-day threats in real-time.
            </p>
          </div>

          <div className="feature-card">
            <div className="text-accent-orange mb-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <h3 className="font-bold mb-1">Rapid Response</h3>
            <p className="text-text-secondary text-sm">
              Auto-generate remediation briefs and deploy virtual patches instantly. Reduce
              Mean Time to Remediate (MTTR) by 87%.
            </p>
          </div>

          <div className="feature-card">
            <div className="text-accent-green mb-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <h3 className="font-bold mb-1">Full Asset Inventory</h3>
            <p className="text-text-secondary text-sm">
              You can&apos;t protect what you can&apos;t see. Our discovery engine builds a living map of your
              entire digital ecosystem.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Stats ───────────────────────────────────── */}
      <section className="px-5 py-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-accent-cyan">99.9%</div>
            <div className="label-mono mt-1">Scan Accuracy</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-accent-green">500ms</div>
            <div className="label-mono mt-1">Avg Detection</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-accent-orange">1M+</div>
            <div className="label-mono mt-1">CVEs Tracked</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-accent-red">24/7</div>
            <div className="label-mono mt-1">Monitoring</div>
          </div>
        </div>
      </section>

      {/* ─── SOC Dashboard Preview ───────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-5 py-8">
        <div className="card-glass p-6">
          <h2 className="text-xl font-bold mb-2">The SOC Dashboard Reimagined</h2>
          <p className="text-text-secondary text-sm mb-4">
            Stop drowning in alerts. PwnOps uses intelligent cybersecurity
            algorithms to prioritize what actually matters. Allowing you to cut the
            noise of false positives.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-accent-cyan">●</span>
              <span>Visual Attack Path Analysis</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent-green">●</span>
              <span>MITRE/OWASP Native Integration</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent-orange">●</span>
              <span>Regulatory Compliance Audits</span>
            </li>
          </ul>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────── */}
      <section className="px-5 py-10 text-center">
        <Link href="/register" className="btn-primary w-full max-w-xs mx-auto">
          Get Started Free →
        </Link>
      </section>
      </main>

      {/* ─── Footer ──────────────────────────────────── */}
      <footer className="border-t border-border mt-8">
        <div className="max-w-6xl mx-auto w-full px-5 py-8">
          <div className="flex items-center justify-center gap-4 mb-4 text-text-muted text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              SOC2 Compliant
            </span>
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              End-to-End SSL
            </span>
          </div>
          <p className="text-center text-text-muted text-xs mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
            © {new Date().getFullYear()} PWNOPS SEC OPS. ENCRYPTED CONNECTION.
          </p>
          <div className="flex justify-center gap-6 text-text-muted text-xs">
            <span className="hover:text-text-secondary cursor-pointer">Documentation</span>
            <span className="hover:text-text-secondary cursor-pointer">API Reference</span>
            <span className="hover:text-text-secondary cursor-pointer">Support</span>
            <span className="hover:text-text-secondary cursor-pointer">System Status</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
