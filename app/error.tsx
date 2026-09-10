"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4">
      <h1 className="font-display text-2xl">Something went wrong</h1>
      <p className="text-sm text-muted">
        {error.message || "Server error. Check Vercel env vars and Supabase setup."}
      </p>
      {error.digest ? (
        <p className="text-xs text-muted">Digest: {error.digest}</p>
      ) : null}
      <button
        type="button"
        className="min-h-12 rounded-xl bg-accent px-5 text-white"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
