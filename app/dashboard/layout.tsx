'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';

// ── Navigation configuration with grouped sections ──
const NAV_SECTIONS = [
  {
    title: 'Operations',
    items: [
      { href: '/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      )},
      { href: '/dashboard/incidents', label: 'Incidents', shortLabel: 'Incidents', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6"/><path d="M3 15h6"/>
        </svg>
      )},
      { href: '/dashboard/scans', label: 'Scan Orchestration', shortLabel: 'Scans', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
      )},
    ],
  },
  {
    title: 'Analysis',
    items: [
      { href: '/dashboard/vulnerabilities', label: 'Vulnerabilities', shortLabel: 'Vulns', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      )},
      { href: '/dashboard/assets', label: 'Asset Inventory', shortLabel: 'Assets', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
        </svg>
      )},
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/dashboard/integrations', label: 'Integrations', shortLabel: 'Alerts', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
        </svg>
      )},
      { href: '/dashboard/users', label: 'Team & Profile', shortLabel: 'Profile', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      )},
    ],
  },
];

// Flatten for bottom nav
const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
}

// ── Breadcrumb builder ──
function Breadcrumbs({ pathname }: { pathname: string }) {
  const crumbs = useMemo(() => {
    const map: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/dashboard/incidents': 'Incidents',
      '/dashboard/scans': 'Scans',
      '/dashboard/vulnerabilities': 'Vulnerabilities',
      '/dashboard/assets': 'Assets',
      '/dashboard/integrations': 'Integrations',
      '/dashboard/users': 'Team',
    };
    const parts = pathname.split('/').filter(Boolean);
    const result: { label: string; href: string }[] = [];
    let path = '';
    for (const part of parts) {
      path += '/' + part;
      if (map[path]) {
        result.push({ label: map[path], href: path });
      }
    }
    return result;
  }, [pathname]);

  if (crumbs.length <= 1) return null;

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1.5">
          {i > 0 && <span className="separator">›</span>}
          {i === crumbs.length - 1 ? (
            <span className="current">{c.label}</span>
          ) : (
            <Link href={c.href}>{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [isOffline, setIsOffline] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load sidebar collapse state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pwnops_sidebar_collapsed');
      if (saved === 'true') setSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('pwnops_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-accent-cyan animate-pulse text-lg" style={{ fontFamily: 'var(--font-mono)' }}>
          ⟳ Initializing secure session...
        </div>
      </div>
    );
  }

  const roleLabel = user?.role === 'admin' ? 'SOC Admin' : user?.role === 'analyst' ? 'SOC Analyst' : 'Viewer';

  return (
    <div className={`min-h-screen bg-bg-primary dashboard-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── Offline Banner ── */}
      {isOffline && (
        <div className="bg-accent-amber text-bg-primary text-center text-xs font-bold py-1.5 animate-pulse-slow z-[60] relative">
          ⚠️ You are currently offline. Some features may be unavailable.
        </div>
      )}

      {/* ── Desktop Sidebar ── */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent-cyan flex-shrink-0">
            <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span className="text-accent-cyan font-bold text-lg" style={{ fontFamily: 'var(--font-mono)' }}>PwnOps</span>
        </div>

        {/* Navigation Sections */}
        {NAV_SECTIONS.map(section => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item ${isActive(pathname, item.href) ? 'active' : ''}`}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}

        {/* Sidebar Footer — User */}
        <div className="sidebar-footer">
          {user && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-xs font-bold text-accent-cyan flex-shrink-0">
                {user.name.split(' ').map(w => w[0]).join('')}
              </div>
              <div className="sidebar-user-info flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{user.name}</div>
                <div className="text-[10px] text-text-muted truncate" style={{ fontFamily: 'var(--font-mono)' }}>{roleLabel}</div>
              </div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="sidebar-toggle-desktop w-full mt-3 flex items-center justify-center gap-2 text-text-muted hover:text-text-secondary text-xs py-2 rounded-lg hover:bg-bg-card transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span>{sidebarCollapsed ? '' : 'Collapse'}</span>
          </button>
        </div>
      </aside>

      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-40 top-bar-physical px-4 py-3">
        <div className="max-w-[90rem] mx-auto flex items-center justify-between w-full">
          {/* Mobile: show brand. Desktop: show breadcrumbs */}
          <div className="flex items-center gap-3 lg:hidden">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent-cyan">
              <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span className="text-accent-cyan font-bold text-lg" style={{ fontFamily: 'var(--font-mono)' }}>PwnOps</span>
            {user && (
              <span className="label-mono text-text-muted">{roleLabel}</span>
            )}
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <Breadcrumbs pathname={pathname} />
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <span className="label-mono text-accent-cyan hidden sm:inline">{user.name}</span>
            )}
            <button
              onClick={logout}
              className="w-8 h-8 rounded-full bg-bg-card border border-border flex items-center justify-center text-text-muted hover:text-accent-red hover:border-accent-red/30 transition-all"
              title="Logout"
              aria-label="Logout"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="px-4 py-4 max-w-[90rem] mx-auto w-full">
        {children}
      </main>

      {/* ── Global Hotkeys ── */}
      <KeyboardShortcuts />

      {/* ── Bottom Nav (Mobile Only — hidden on lg via CSS) ── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {ALL_NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${isActive(pathname, item.href) ? 'active' : ''}`}
              aria-label={item.shortLabel}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            >
              {item.icon}
              {item.shortLabel}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
