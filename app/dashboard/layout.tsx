'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthProvider, { useAuth } from '@/components/AuthProvider';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-accent-cyan animate-pulse text-lg" style={{ fontFamily: 'var(--font-mono)' }}>
          ⟳ Initializing secure session...
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )},
    { href: '/dashboard/vulnerabilities', label: 'Vulns', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    )},
    { href: '/dashboard/incidents', label: 'Incidents', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6"/><path d="M3 15h6"/>
      </svg>
    )},
    { href: '/dashboard/users', label: 'Profile', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    )},
  ];

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      {/* ── Top Bar ──────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-bg-primary/90 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent-cyan">
              <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span className="text-accent-cyan font-bold text-lg" style={{ fontFamily: 'var(--font-mono)' }}>PwnOps</span>
            {user && (
              <span className="label-mono text-text-muted ml-2 hidden sm:inline">
                {user.role === 'admin' ? 'SOC Admin' : user.role === 'analyst' ? 'SOC Analyst' : 'Viewer'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="label-mono text-accent-cyan hidden sm:inline">{user.name}</span>
            )}
            <button
              onClick={logout}
              className="w-8 h-8 rounded-full bg-bg-card border border-border flex items-center justify-center text-text-muted hover:text-accent-red hover:border-accent-red/30 transition-all"
              title="Logout"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Page Content ─────────────────────────────── */}
      <main className="px-4 py-4 max-w-6xl mx-auto w-full">
        {children}
      </main>

      {/* ── Bottom Nav ───────────────────────────────── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${pathname === item.href ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
