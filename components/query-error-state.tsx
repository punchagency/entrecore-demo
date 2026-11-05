"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import { CopyableId } from "@/components/copyable-id";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getApiError } from "@/utils/api-error";

interface QueryErrorStateProps {
  /** The thrown value or query error. */
  error: unknown;
  /** What failed, specific to the screen, e.g. "Couldn't load routing rules". */
  title: string;
  /** Shown when the response carries no message of its own. */
  fallbackMessage?: string;
  /** Renders a Retry button. Omit it when repeating the request would not help. */
  onRetry?: () => void;
  isRetrying?: boolean;
  /** "panel" fills an empty content area; "inline" is a compact banner inside a card. */
  variant?: "panel" | "inline";
  className?: string;
  /** A reference to show when the error has no correlation ID, e.g. a Next.js error digest. */
  errorId?: string;
}

/**
 * The error state for data-loading screens (EP-1004): what failed, the API message, the HTTP
 * status, a Retry button and a copyable correlation ID support can look up. Use
 * variant="inline" inside cards and tables.
 */
export function QueryErrorState({
  error,
  title,
  fallbackMessage = "The server didn't say why.",
  onRetry,
  isRetrying = false,
  variant = "panel",
  className,
  errorId,
}: QueryErrorStateProps) {
  const parsed = getApiError(error, fallbackMessage);
  const { message, status } = parsed;
  const correlationId = parsed.correlationId ?? errorId ?? null;

  const retryButton = onRetry ? (
    <Button
      variant="outline"
      size="sm"
      onClick={onRetry}
      disabled={isRetrying}
      className="rounded-xl border-slate-200 shrink-0"
    >
      <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRetrying && "animate-spin")} />
      {isRetrying ? "Retrying…" : "Retry"}
    </Button>
  ) : null;

  const details = (
    <>
      <p className="text-sm text-slate-600 break-words">{message}</p>
      {(status != null || correlationId) && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500",
            variant === "panel" && "justify-center"
          )}
        >
          {status != null && <span>Status {status}</span>}
          {correlationId && <CopyableId label="Correlation ID" value={correlationId} />}
        </div>
      )}
    </>
  );

  if (variant === "inline") {
    return (
      <div
        role="alert"
        className={cn(
          "rounded-xl border border-rose-200 bg-rose-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
          className
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="font-semibold text-rose-900">{title}</p>
            {details}
          </div>
        </div>
        {retryButton}
      </div>
    );
  }

  return (
    <div role="alert" className={cn("py-16 px-4 text-center", className)}>
      <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
      <div className="space-y-2 max-w-md mx-auto mb-4">{details}</div>
      {retryButton}
    </div>
  );
}
