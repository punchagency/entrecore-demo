"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bulk actions for the selected rows.
 *
 * There is deliberately NO bulk "update the first match". Choosing which record
 * to update is a per-row judgement, and a bulk version of it is exactly the
 * silent overwrite this feature exists to prevent. The note below says so
 * inline, because otherwise its absence reads as an oversight.
 */
export function BulkActionBar({
  count,
  busy,
  onCreateAll,
  onSkipAll,
  onClear,
}: {
  count: number;
  busy?: boolean;
  onCreateAll: () => void;
  onSkipAll: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="sticky bottom-4 z-10 mx-auto flex w-fit max-w-full flex-wrap items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-lg">
      <span className="text-sm font-medium text-slate-700">
        {count} row{count === 1 ? "" : "s"} selected
      </span>

      <Button size="sm" variant="outline" onClick={onCreateAll} disabled={busy} className="rounded-lg">
        <Plus className="mr-1 h-3.5 w-3.5" /> Create new for each
      </Button>
      <Button size="sm" variant="outline" onClick={onSkipAll} disabled={busy} className="rounded-lg">
        Skip
      </Button>

      <span className="max-w-[16rem] text-xs text-slate-400">
        Picking which record to update stays per-row, on purpose.
      </span>

      <button
        type="button"
        onClick={onClear}
        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
