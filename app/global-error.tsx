'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-bg-primary text-text-primary min-h-screen flex flex-col items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 bg-bg-card border border-border rounded-lg shadow-xl">
          <div className="text-4xl">💥</div>
          <h1 className="text-2xl font-bold">Fatal Application Error</h1>
          <p className="text-text-muted text-sm">A critical layout or routing error occurred.</p>
          <button 
            onClick={() => reset()} 
            className="w-full bg-accent-cyan text-bg-primary font-bold py-2 px-4 rounded hover:bg-accent-cyan/80 transition-colors mt-4"
          >
            Attempt Recovery
          </button>
        </div>
      </body>
    </html>
  );
}
