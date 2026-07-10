'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
      <div className="text-accent-red mb-4 text-4xl">⚠️</div>
      <h2 className="text-xl font-bold mb-2">Something went wrong!</h2>
      <p className="text-text-muted mb-6 text-sm max-w-md">
        Failed to load this section of the dashboard. This may be due to a network issue or an unexpected error.
      </p>
      <button onClick={() => reset()} className="btn-primary px-6 py-2">
        Retry
      </button>
    </div>
  );
}
