"use client";

import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UpsertReviewRunSummary } from "../../services/data-integration-api";

function waitedFor(parkedAt: string | null): string {
  if (!parkedAt) return "";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(parkedAt).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `waiting ${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `waiting ${hours}h`;
  return `waiting ${Math.round(hours / 24)}d`;
}

interface ReviewHeaderProps {
  summary: UpsertReviewRunSummary;
  undecided: number;
  applying: boolean;
  refreshing: boolean;
  /** Omitted when embedded in a tab that has its own navigation. */
  onBack?: () => void;
  onApply: () => void;
  onDiscard: () => void;
  onRefresh: () => void;
}

export function ReviewHeader({
  summary,
  undecided,
  applying,
  refreshing,
  onBack,
  onApply,
  onDiscard,
  onRefresh,
}: ReviewHeaderProps) {
  const decided = summary.rows_total - undecided;
  const progress = summary.rows_total > 0 ? (decided / summary.rows_total) * 100 : 0;

  return (
    <div className="sticky top-0 z-10 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to run
            </button>
          )}
          <h1 className="text-xl font-semibold text-slate-900">Pick a record to update</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>{summary.job_name ?? "Integration job"}</span>
            <span className="text-slate-300">·</span>
            <span>
              writing to <span className="font-medium text-slate-700">{summary.destination_table}</span>
            </span>
            {summary.parked_at && (
              <>
                <span className="text-slate-300">·</span>
                <span>{waitedFor(summary.parked_at)}</span>
              </>
            )}
          </p>
          {summary.upsert_keys.length > 0 && (
            <span className="mt-2 inline-block rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              Matched on {summary.upsert_keys.join(" + ")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={applying || refreshing}
            className="rounded-xl"
            title="Re-read the destination in case it changed since this run stopped."
          >
            {refreshing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            variant="ghost"
            onClick={onDiscard}
            disabled={applying}
            className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Discard
          </Button>
          <Button
            onClick={onApply}
            disabled={applying || undecided > 0}
            className="rounded-xl bg-blue-600 hover:bg-blue-700"
            title={
              undecided > 0
                ? `${undecided} row${undecided === 1 ? "" : "s"} still need a decision`
                : "Write these rows to the destination"
            }
          >
            {applying && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {applying ? "Writing…" : "Apply"}
          </Button>
        </div>
      </div>

      {/* The written half is stated in the past tense, because it already
          happened and is not waiting on anyone. Presenting it as pending would
          make the user think the whole run is blocked. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-sm">
        {summary.records_written !== null && (
          <span className="text-slate-600">
            <span className="font-semibold text-emerald-700">{summary.records_written}</span> already
            written
          </span>
        )}
        <span className="text-slate-600">
          <span className={cn("font-semibold", undecided > 0 ? "text-amber-700" : "text-slate-400")}>
            {undecided}
          </span>{" "}
          need you
        </span>
        {summary.rows_stale > 0 && (
          <span className="text-amber-700">
            {summary.rows_stale} changed in the destination since this run stopped
          </span>
        )}

        <div className="ml-auto flex min-w-[160px] items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="whitespace-nowrap text-xs text-slate-500">
            {decided} of {summary.rows_total} decided
          </span>
        </div>
      </div>
    </div>
  );
}
