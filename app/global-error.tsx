"use client";

import "./globals.css";

import { useEffect } from "react";

import { QueryErrorState } from "@/components/query-error-state";

/**
 * Last-resort error page: it replaces the root layout, so it renders its own <html> and imports
 * the global styles. Production never shows internals (the message is only shown in
 * development); the digest is the reference support can look up.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global] render error", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/60">
          <QueryErrorState
            error={process.env.NODE_ENV === "development" ? error : null}
            title="Entrecore couldn't load this page"
            fallbackMessage="An unexpected error stopped the app from rendering. Retry, or go back to the start page."
            onRetry={reset}
            errorId={error.digest}
          />
          <div className="pb-8 -mt-8 text-center">
            {/* A plain link: the app's router may be what failed. */}
            <a href="/" className="text-sm font-medium text-blue-600 hover:underline">
              Go to the start page
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
