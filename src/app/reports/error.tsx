'use client';

import { useEffect } from 'react';

export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for debugging
    console.error('Reports page error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-2xl text-[#e8e6e1] mb-4">Reports Error</h1>
        <p className="text-[#8a9490] mb-4 text-sm">
          {error.message || 'Something went wrong loading reports.'}
        </p>
        <p className="text-[#6b7f74] mb-8 text-xs font-mono break-all">
          {error.digest && `Digest: ${error.digest}`}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-gradient-to-r from-[#1a7a6d] to-[#146b5f] text-white rounded-lg hover:opacity-90 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
