"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

import { QueryErrorState } from "@/components/query-error-state";

export interface SectionErrorProps {
  /** The error Next.js passes to a segment's error.tsx. `digest` is set for server errors. */
  error: Error & { digest?: string };
  /** Re-renders the segment that failed. */
  reset: () => void;
  /** Section name shown in the title, e.g. "DRAT". */
  section: string;
}

function isApiError(error: unknown): boolean {
  const candidate = error as { isAxiosError?: unknown; response?: unknown } | null;
  return candidate?.isAxiosError === true || Boolean(candidate?.response);
}

/**
 * Error boundary content for a protected section's error.tsx. It renders inside the protected
 * layout, so the sidebar stays and the user can navigate away; Retry re-renders the section.
 */
export function SectionError({ error, reset, section }: SectionErrorProps) {
  const router = useRouter();
  const [isRetrying, startTransition] = useTransition();

  useEffect(() => {
    console.error(`[${section}] render error`, error);
  }, [error, section]);

  const retry = () =>
    startTransition(() => {
      // Refresh re-fetches server data for the segment; reset re-renders the boundary.
      router.refresh();
      reset();
    });

  // API errors carry a message meant for users. Other render errors are bugs whose text
  // ("Cannot read properties of undefined…") only helps developers, so it stays in the
  // console in production and the generic fallback below is shown instead.
  const shownError = isApiError(error) || process.env.NODE_ENV === "development" ? error : null;

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/60">
        <QueryErrorState
          error={shownError}
          title={`${section} couldn't display this page`}
          fallbackMessage="An unexpected error stopped this page from rendering. Retry, or use the sidebar to go elsewhere."
          onRetry={retry}
          isRetrying={isRetrying}
          errorId={error.digest}
        />
      </div>
    </div>
  );
}
