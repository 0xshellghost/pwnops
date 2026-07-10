'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [gPressed, setGPressed] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === '?') {
        setShowHelp(prev => !prev);
        return;
      }

      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        setGPressed(true);
        clearTimeout(timeout);
        timeout = setTimeout(() => setGPressed(false), 1000);
        return;
      }

      if (gPressed) {
        const key = e.key.toLowerCase();
        if (key === 's') {
          router.push('/dashboard/scans');
          setGPressed(false);
        } else if (key === 'i') {
          router.push('/dashboard/incidents');
          setGPressed(false);
        } else if (key === 'v') {
          router.push('/dashboard/vulnerabilities');
          setGPressed(false);
        } else if (key === 'd') {
          router.push('/dashboard');
          setGPressed(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [gPressed, router, showHelp]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowHelp(false)}>
      <div className="card-glass w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
          <button onClick={() => setShowHelp(false)} className="text-text-muted hover:text-text-primary text-xl" aria-label="Close shortcuts help">&times;</button>
        </div>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex justify-between border-b border-border py-2">
            <span>Show this help</span>
            <kbd className="bg-bg-input border border-border rounded px-2 py-1 text-accent-cyan">?</kbd>
          </div>
          <div className="flex justify-between border-b border-border py-2">
            <span>Go to Dashboard</span>
            <div>
              <kbd className="bg-bg-input border border-border rounded px-2 py-1 text-accent-cyan mr-1">g</kbd>
              <kbd className="bg-bg-input border border-border rounded px-2 py-1 text-accent-cyan">d</kbd>
            </div>
          </div>
          <div className="flex justify-between border-b border-border py-2">
            <span>Go to Scans</span>
            <div>
              <kbd className="bg-bg-input border border-border rounded px-2 py-1 text-accent-cyan mr-1">g</kbd>
              <kbd className="bg-bg-input border border-border rounded px-2 py-1 text-accent-cyan">s</kbd>
            </div>
          </div>
          <div className="flex justify-between border-b border-border py-2">
            <span>Go to Incidents</span>
            <div>
              <kbd className="bg-bg-input border border-border rounded px-2 py-1 text-accent-cyan mr-1">g</kbd>
              <kbd className="bg-bg-input border border-border rounded px-2 py-1 text-accent-cyan">i</kbd>
            </div>
          </div>
          <div className="flex justify-between border-b border-border py-2">
            <span>Go to Vulnerabilities</span>
            <div>
              <kbd className="bg-bg-input border border-border rounded px-2 py-1 text-accent-cyan mr-1">g</kbd>
              <kbd className="bg-bg-input border border-border rounded px-2 py-1 text-accent-cyan">v</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
