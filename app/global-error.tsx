"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ro">
      <body style={{ fontFamily: "system-ui", padding: 24 }}>
        <h1>Something went wrong</h1>
        <p>{error.message || "Application error"}</p>
        {error.digest ? <p>Digest: {error.digest}</p> : null}
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </body>
    </html>
  );
}
