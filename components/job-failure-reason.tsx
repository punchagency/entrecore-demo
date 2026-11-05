"use client";

import { AlertCircle } from "lucide-react";

import { CopyableId } from "@/components/copyable-id";
import { cn } from "@/lib/utils";

interface JobFailureReasonProps {
  /** A readable reason, usually from `jobFailureMessage` (never raw exception text). */
  reason: string;
  /** The run or job ID; the backend logs the full error under it. */
  runId?: string | null;
  runIdLabel?: string;
  /** Optional heading, e.g. "Why this run failed". */
  title?: string;
  /** Neutral styling for runs that stopped on purpose (cancelled), red otherwise. */
  tone?: "error" | "neutral";
  className?: string;
}

/**
 * Why a background job (workflow run, DRAT filing, abstraction run, integration run) failed:
 * the readable reason plus the run ID support uses to find the full error in the logs.
 */
export function JobFailureReason({
  reason,
  runId,
  runIdLabel = "Run ID",
  title,
  tone = "error",
  className,
}: JobFailureReasonProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-xl border px-3 py-2.5 text-sm",
        tone === "error" ? "border-rose-200 bg-rose-50/70" : "border-slate-200 bg-slate-50",
        className
      )}
    >
      <AlertCircle className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "error" ? "text-rose-600" : "text-slate-500")} />
      <div className="min-w-0 space-y-1">
        {title && (
          <p className={cn("font-semibold", tone === "error" ? "text-rose-900" : "text-slate-800")}>{title}</p>
        )}
        <p className={cn("break-words", tone === "error" ? "text-rose-800" : "text-slate-700")}>{reason}</p>
        {runId && <CopyableId label={runIdLabel} value={runId} className="text-xs text-slate-500" />}
      </div>
    </div>
  );
}
