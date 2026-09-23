"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Last-resort boundary for the root layout. Reports the error, shows something a student can act on.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#08090B", color: "#F2F0EB", margin: 0 }}>
        <main style={{ maxWidth: 480, margin: "15vh auto", padding: 24 }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Something broke on our side.</h1>
          <p style={{ margin: "0 0 16px", opacity: 0.8 }}>It has been reported. Nothing you did caused it, and no tokens were spent.</p>
          <button onClick={reset} style={{ borderRadius: 999, border: 0, padding: "8px 16px", background: "#F2B441", color: "#1a1408", cursor: "pointer" }}>Try again</button>
          {error.digest && <p style={{ marginTop: 16, fontSize: 12, opacity: 0.6 }}>Reference {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
