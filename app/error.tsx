'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error Boundary caught an error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 text-center animate-fade-in">
      <div className="card-glass max-w-lg w-full p-8 space-y-6">
        <div className="w-16 h-16 bg-accent-red/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-accent-red/20">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-text-muted text-sm">
          An unexpected error occurred in the application. Our team has been notified.
        </p>
        
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="bg-bg-input border border-border p-3 rounded text-left overflow-x-auto text-xs text-text-secondary font-mono">
            {error.message}
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button onClick={() => reset()} className="btn-primary flex-1">
            Try again
          </button>
          <Link href="/dashboard" className="btn-outline flex-1">
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
