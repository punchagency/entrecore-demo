"use client";

import { useMemo, useState } from "react";
import type { UpsertDecision } from "../../services/data-integration-api";
import { CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useApplyUpsertReview,
  useDecideUpsertRow,
  useDecideUpsertRowsBulk,
  useDiscardUpsertReview,
  useRefreshUpsertCandidates,
  useUpsertReview,
  useUpsertReviewRows,
  useUpsertReviewRuns,
} from "../../hooks/use-data-integrations";
import { BulkActionBar } from "./bulk-action-bar";
import { MatchCard } from "./match-card";
import { ReviewHeader } from "./review-header";

type FastApiDetail = string | { message?: string } | Array<{ msg?: string }> | undefined;

/**
 * Pull a human-readable message out of a FastAPI error response.
 *
 * Every endpoint on this router funnels through one `_translate` helper, so
 * `detail` arrives in three different shapes depending on what failed:
 *   404/400 → a bare string
 *   409     → an object, `{ message, ...payload }` (the conflict cases)
 *   422     → an array of `{ loc, msg }` validation errors
 * Reading it as a string renders "[object Object]" on a conflict; reading it as
 * `detail.message` silently drops the 404/400 text and shows the fallback
 * instead. Both were live here, in different handlers, so this is one function
 * rather than a per-call-site guess.
 */
function errorDetail(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: FastApiDetail } } })?.response?.data
    ?.detail;

  if (typeof detail === "string") return detail.trim() || fallback;
  if (Array.isArray(detail)) {
    const msgs = detail.map((d) => d?.msg).filter(Boolean);
    return msgs.length ? msgs.join(", ") : fallback;
  }
  if (detail && typeof detail.message === "string" && detail.message.trim()) {
    return detail.message;
  }
  return fallback;
}

/**
 * Pick which record an upsert should update.
 *
 * A panel rather than a page, because this has to render in two places without
 * yanking anyone out of their workflow: standalone under
 * /data-room/integrations/…/review, and inline in Abstraction → Integrate,
 * which is where people actually run these jobs from. Sending them across the
 * app to resolve a conflict they hit mid-flow is disjoint.
 *
 * Pass a `runId` to review a specific run, or just a `jobId` to resolve
 * whichever of that job's runs is currently parked.
 */
export function UpsertReviewPanel({
  jobId,
  runId: runIdProp,
  onBack,
  onResolved,
}: {
  jobId: string;
  runId?: string;
  /** Omit to hide the back link — the embedded tab has its own navigation. */
  onBack?: () => void;
  /** Called after a successful apply or discard, so a host can refresh. */
  onResolved?: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pollForApply, setPollForApply] = useState(false);

  // Without an explicit runId, find this job's parked run. That is what lets
  // the embedded tab be a plain <UpsertReviewPanel jobId={…} /> and still work
  // when the user reloads, or comes back to a run parked days ago.
  const { data: parkedRuns, isLoading: parkedLoading } = useUpsertReviewRuns(jobId);
  const runId = runIdProp ?? parkedRuns?.items?.[0]?.run_id ?? "";

  const { data: view, isLoading, isError, error } = useUpsertReview(runId, pollForApply);
  const applying = view?.status === "applying";
  const { data: rowsData, isLoading: rowsLoading } = useUpsertReviewRows(runId);

  const decide = useDecideUpsertRow(runId);
  const decideBulk = useDecideUpsertRowsBulk(runId);
  const apply = useApplyUpsertReview(runId);
  const discard = useDiscardUpsertReview(runId);
  const refresh = useRefreshUpsertCandidates(runId);

  const rows = useMemo(() => rowsData?.items ?? [], [rowsData]);
  const undecided = useMemo(() => rows.filter((r) => r.decision === null), [rows]);
  const busy = decide.isPending || decideBulk.isPending || apply.isPending;

  // Rows are collapsed by default — each one carries an Incoming panel and up
  // to 25 candidate cards with full diffs, so an all-open list is unreadable.
  // `null` means "not touched yet", which is how the first undecided row can be
  // open on arrival without fighting the user once they start collapsing things.
  const [openRows, setOpenRows] = useState<Set<string> | null>(null);
  const firstUndecidedId = undecided[0]?.id;
  const isOpen = (rowId: string) =>
    openRows === null ? rowId === firstUndecidedId : openRows.has(rowId);

  const toggleExpand = (rowId: string) =>
    setOpenRows((prev) => {
      const base = prev ?? new Set(firstUndecidedId ? [firstUndecidedId] : []);
      const next = new Set(base);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });

  // Expand all covers everything that HAS a body to show: the undecided rows,
  // plus the updates already decided — those keep their card so their field
  // checkboxes stay reachable, so leaving them out would make "Expand all"
  // silently collapse them.
  const setAllOpen = (open: boolean) =>
    setOpenRows(
      open
        ? new Set(
            rows.filter((r) => r.decision === null || r.decision === "update").map((r) => r.id)
          )
        : new Set()
    );

  const toggleSelect = (rowId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });

  const handleDecide = (
    rowId: string,
    decision: UpsertDecision,
    recordId?: string,
    excludedFields?: string[]
  ) => {
    // Picking a record is only half the decision — the other half is which of
    // its fields to write — so pin the row open. Without this, deciding moves
    // it out of `undecided`, `firstUndecidedId` advances to the next row, and
    // the card carrying the field checkboxes closes the instant it becomes
    // useful. Explicit rather than derived, so a later collapse still sticks.
    if (decision === "update") {
      setOpenRows((prev) => {
        const base = prev ?? new Set(firstUndecidedId ? [firstUndecidedId] : []);
        return new Set(base).add(rowId);
      });
    }

    decide.mutate(
      { rowId, decision, recordId, excludedFields },
      {
        onError: (err) => toast.error(errorDetail(err, "Could not save that decision.")),
      }
    );
  };

  const handleBulk = (decision: "create" | "skip") => {
    const rowIds = Array.from(selected);
    decideBulk.mutate(
      { rowIds, decision },
      {
        onSuccess: () => {
          setSelected(new Set());
          toast.success(
            decision === "create"
              ? `${rowIds.length} row(s) will be added as new records.`
              : `${rowIds.length} row(s) will not be written.`
          );
        },
        onError: (err) =>
          toast.error(errorDetail(err, "Could not apply that to the selected rows.")),
      }
    );
  };

  const handleApply = () => {
    setPollForApply(true);
    apply.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(res.message);
        onResolved?.();
      },
      onError: (err) => {
        setPollForApply(false);
        toast.error(errorDetail(err, "Could not write these rows."), { duration: 8000 });
      },
    });
  };

  const handleDiscard = () => {
    discard.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(res.message);
        onResolved?.();
      },
      onError: (err) => toast.error(errorDetail(err, "Could not discard this review.")),
      onSettled: () => setConfirmDiscard(false),
    });
  };

  const handleRefresh = () => {
    refresh.mutate(undefined, {
      onSuccess: (res) => {
        if (res.rows_stale > 0) toast.warning(res.message, { duration: 8000 });
        else toast.success(res.message);
      },
      onError: (err) => toast.error(errorDetail(err, "Could not re-read the destination.")),
    });
  };

  // --- States ---------------------------------------------------------------

  if (parkedLoading || (runId && (isLoading || rowsLoading))) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // Nothing parked. Never an error — this is the normal, healthy state.
  if (!runId) {
    return (
      <Card className="rounded-3xl">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">No write conflicts</h2>
          <p className="mt-1 text-sm text-slate-500">
            Every row this job wrote matched either no existing record or exactly one, so nothing
            needed a decision.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isError || !view) {
    return (
      <Card className="rounded-3xl border-red-200">
        <CardContent className="p-8">
          <h2 className="text-lg font-semibold text-slate-900">Could not load this review</h2>
          <p className="mt-1 text-sm text-slate-500">
            {errorDetail(error, "The run could not be found.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (view.status !== "awaiting_review" && view.status !== "applying") {
    return (
      <Card className="rounded-3xl">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">Nothing left to decide</h2>
          <p className="mt-1 text-sm text-slate-500">
            This run is <span className="font-medium">{view.status}</span>. Its rows have already
            been resolved — possibly by someone else on your team.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <ReviewHeader
        summary={view}
        undecided={undecided.length}
        applying={applying || apply.isPending}
        refreshing={refresh.isPending}
        onBack={onBack}
        onApply={handleApply}
        onDiscard={() => setConfirmDiscard(true)}
        onRefresh={handleRefresh}
      />

      <div className="flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <p className="text-sm text-blue-900">
          These rows matched more than one existing record, so nothing was written for them. Every
          other row in this run was written as usual. Open a row to see what each match would
          change, or tick rows to handle several at once. Once you pick a record you can untick
          individual fields to leave those values as they are — anything that would wipe a filled
          cell starts unticked.
        </p>
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-slate-500">
          {undecided.length} of {rows.length} still need a decision
        </p>
        <div className="flex items-center gap-3 text-xs font-medium">
          <button
            type="button"
            onClick={() => setAllOpen(true)}
            className="text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setAllOpen(false)}
            className="text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <MatchCard
            key={row.id}
            row={row}
            baseId={view.base_id}
            tableId={view.table_id}
            // The write key, so the diff can mark those columns as always
            // written. The backend rejects excluding them anyway; showing it
            // means nobody discovers the rule by hitting an error.
            upsertKeys={view.upsert_keys ?? []}
            selected={selected.has(row.id)}
            expanded={isOpen(row.id)}
            busy={busy}
            onToggleSelect={() => toggleSelect(row.id)}
            onToggleExpand={() => toggleExpand(row.id)}
            onDecide={(decision, recordId, excludedFields) =>
              handleDecide(row.id, decision, recordId, excludedFields)
            }
            // Back to undecided — NOT "skip". Undo previously set the row to
            // skip, so undoing a mis-clicked Skip left it still skipped, and
            // Apply counted the row as resolved either way.
            onUndo={() => handleDecide(row.id, "clear")}
          />
        ))}
      </div>

      <BulkActionBar
        count={selected.size}
        busy={busy}
        onCreateAll={() => handleBulk("create")}
        onSkipAll={() => handleBulk("skip")}
        onClear={() => setSelected(new Set())}
      />

      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard these {rows.length} row(s)?</DialogTitle>
            <DialogDescription>
              They will not be written to {view.destination_table}, and this run will be marked
              cancelled.
              {view.records_written !== null && (
                <> The {view.records_written} record(s) already written are unaffected.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDiscard(false)}
              className="rounded-xl"
            >
              Keep reviewing
            </Button>
            <Button
              onClick={handleDiscard}
              disabled={discard.isPending}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
