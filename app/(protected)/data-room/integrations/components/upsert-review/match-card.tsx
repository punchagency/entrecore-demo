"use client";

import { useMemo } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronRight, FileText, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  UpsertCandidate,
  UpsertDecision,
  UpsertMatchRow,
} from "../../services/data-integration-api";
import { CandidateCard, CreateNewCard } from "./candidate-card";
import type { FieldSelection } from "./field-diff";

/**
 * One outgoing row whose key matched several destination records.
 *
 * Once decided the card collapses to a single line. The list visibly shortens
 * as the user works, which is the progress sensation — a static list of twelve
 * cards with checkmarks feels like no progress at all.
 */

function keyDisplay(keyValues: Record<string, unknown>): string {
  return Object.values(keyValues)
    .map((v) => (v === null || v === undefined ? "" : String(v)))
    .filter((v) => v.trim().length > 0)
    .join(" · ");
}

/**
 * The fields a freshly-picked record should start out NOT writing.
 *
 * Only the destructive ones: a `would_clear` field is an empty incoming value
 * about to blank a cell that holds real data, which is almost never what anyone
 * came here to do. Everything else starts ticked, so the default outcome of
 * picking a record is still "apply this run's data" — just without the silent
 * deletions.
 *
 * Key columns are never included. They already match the record by definition
 * of it being a candidate, so excluding them would be a no-op that reads as a
 * decision.
 */
function defaultExclusions(candidate: UpsertCandidate, locked: Set<string>): string[] {
  return candidate.diff
    .filter((d) => d.state === "would_clear" && !locked.has(d.field))
    .map((d) => d.field);
}

function IncomingRow({ record }: { record: Record<string, unknown> }) {
  const entries = Object.entries(record);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Incoming</p>
      <p className="mb-2 text-xs text-slate-500">The record this run wants to write.</p>
      <dl className="space-y-1.5">
        {entries.map(([field, value]) => (
          <div key={field}>
            <dt className="text-[11px] uppercase tracking-wide text-slate-400">{field}</dt>
            <dd className="text-sm font-medium text-slate-800">
              {value === null || value === undefined || value === "" ? (
                <span className="italic font-normal text-slate-400">empty</span>
              ) : (
                String(value)
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StaleBanner({ message }: { message: string }) {
  // Amber, and worded as something SOMEONE ELSE did — visually distinct from
  // the diff's own amber "changed" indicator, which describes what this run
  // would do. Conflating the two reads as "your edit changed it".
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <p className="text-xs text-amber-800">{message}</p>
    </div>
  );
}

interface MatchCardProps {
  row: UpsertMatchRow;
  baseId: string | null;
  tableId: string | null;
  /** Write-key columns for this job — always written, never tickable. */
  upsertKeys: string[];
  selected: boolean;
  expanded: boolean;
  busy?: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onDecide: (
    decision: UpsertDecision,
    recordId?: string,
    excludedFields?: string[]
  ) => void;
  onUndo: () => void;
}

export function MatchCard({
  row,
  baseId,
  tableId,
  upsertKeys,
  selected,
  expanded,
  busy,
  onToggleSelect,
  onToggleExpand,
  onDecide,
  onUndo,
}: MatchCardProps) {
  const identity = keyDisplay(row.key_values) || "(no key values)";
  const decided = row.decision !== null;
  const hidden = Math.max(0, row.candidate_count - row.candidates.length);

  // Server state, not local state. The exclusions live on the row and come back
  // from the optimistic cache update, so a reload — or a colleague working the
  // same queue — sees the same ticks. A useState mirror here would drift from
  // what apply actually writes, which on this screen is the one thing that must
  // never happen.
  const excluded = useMemo(
    () => new Set(row.excluded_fields ?? []),
    [row.excluded_fields]
  );
  const locked = useMemo(() => new Set(upsertKeys), [upsertKeys]);

  const kept = excluded.size;
  const isUpdate = row.decision === "update";
  const summary = isUpdate
    ? `Will update ${row.decision_record_id}` +
      (kept > 0 ? ` · keeping ${kept} existing value${kept === 1 ? "" : "s"}` : "")
    : row.decision === "create"
    ? "Will be added as a new record"
    : "Will not be written";

  // --- Collapsed: decided, and there is nothing left to say ------------------
  // Create and skip are complete the moment they are clicked, so they collapse
  // and the list visibly shortens — that is the progress sensation.
  //
  // An UPDATE deliberately does not. Picking the record is only half of it; the
  // other half is which of its fields to write, and collapsing here replaced
  // the card holding those checkboxes with a one-line summary. The control was
  // unreachable: select a record and the only thing left on screen was Undo.
  if (decided && !isUpdate) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5">
        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-700">{identity}</p>
          <p className="truncate text-xs text-slate-500">{summary}</p>
        </div>
        <button
          type="button"
          onClick={onUndo}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" /> Undo
        </button>
      </div>
    );
  }

  // --- A collapsible section: undecided, or decided as an update -------------
  // Collapsed by default when undecided. Thirteen of these, each carrying an
  // Incoming panel and up to 25 candidate cards with full diffs, is thousands
  // of pixels of scroll — the list becomes unreadable exactly when there is
  // most to read.
  const closest = row.candidates[0];

  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm",
        // A resolved update stays on the list but must not still look like
        // outstanding work — green rather than white, so a glance down the page
        // separates "done, adjustable" from "still needs you".
        isUpdate
          ? "border-emerald-300 bg-emerald-50/30"
          : expanded
          ? "border-slate-300 bg-white"
          : "border-slate-200 bg-white"
      )}
    >
      {/* Header doubles as the collapse toggle. The checkbox and the DOC chip
          stop propagation so neither collapses the card out from under you. */}
      <div className="flex flex-wrap items-center gap-2 p-4">
        <span onClick={(e) => e.stopPropagation()} title="Select for bulk actions">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select ${identity} for bulk actions`}
          />
        </span>

        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          {/* A decided update keeps its card, so the resolved tick has to live
              in the header instead of on a collapsed summary line. */}
          {isUpdate && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
          {/* The key values ARE the row's identity — the operator recognises
              "Series A SPA · Acme Ltd", not a uuid. */}
          <h3 className="text-base font-semibold text-slate-900">{identity}</h3>
          {isUpdate ? (
            <span className="truncate text-xs text-emerald-800">{summary}</span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {row.candidate_count} matches
            </span>
          )}
          {row.row_index !== null && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
              Row {row.row_index}
            </span>
          )}
          {row.platform_doc_id && (
            <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700">
              <FileText className="h-3 w-3" />
              {row.platform_doc_id}
            </span>
          )}
          {/* Enough to triage without opening: whether the safest option is
              still destructive. Suppressed once decided — the summary has
              replaced it, and a "closest would clear 5" hint beside a resolved
              row describes an option no longer being taken. */}
          {!expanded && !isUpdate && closest && (
            <span
              className={cn(
                "ml-auto text-xs",
                closest.clears_count > 0 ? "font-medium text-red-600" : "text-slate-500"
              )}
            >
              {closest.clears_count > 0
                ? `closest would clear ${closest.clears_count}`
                : `closest changes ${closest.changed_count}`}
            </span>
          )}
          {row.apply_error && !expanded && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" /> changed in destination
            </span>
          )}
        </button>

        {/* Undo used to live on the collapsed summary. A decided update no
            longer has one, so it belongs here — and it must sit OUTSIDE the
            collapse toggle, or undoing would also toggle the card. */}
        {isUpdate && (
          <button
            type="button"
            onClick={onUndo}
            disabled={busy}
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" /> Undo
          </button>
        )}
      </div>

      {expanded && (
      <div className="border-t border-slate-100 p-4">
      {row.apply_error && <StaleBanner message={row.apply_error} />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <IncomingRow record={row.incoming_record} />

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Which record should this update?
          </p>
          <div className="space-y-2">
            {row.candidates.map((c, i) => {
              const isChosen = row.decision_record_id === c.record_id;
              // Passed for EVERY candidate, not just the chosen one. `active`
              // is what gates the checkboxes; an inactive selection still lets
              // the diff say that per-field control exists and what unlocks it,
              // which is the difference between a discoverable feature and one
              // nobody finds.
              const selection: FieldSelection = {
                active: isChosen,
                excluded: isChosen ? excluded : new Set<string>(),
                locked,
                disabled: busy,
                onToggle: (fieldName, write) => {
                  const next = new Set(excluded);
                  if (write) next.delete(fieldName);
                  else next.add(fieldName);
                  onDecide("update", c.record_id, Array.from(next));
                },
                onSetAll: (write) =>
                  onDecide(
                    "update",
                    c.record_id,
                    write
                      ? []
                      : c.diff.map((d) => d.field).filter((f) => !locked.has(f)),
                  ),
              };

              return (
                <CandidateCard
                  key={c.record_id}
                  candidate={c}
                  selected={isChosen}
                  isClosest={i === 0 && row.candidates.length > 1}
                  baseId={baseId}
                  tableId={tableId}
                  disabled={busy}
                  selection={selection}
                  // Picking a record seeds the exclusions rather than sending
                  // []: the destructive fields start off, so the safe outcome
                  // is the one you get by clicking once and reading nothing.
                  // Re-picking the SAME record must not reseed, or every
                  // deliberate re-tick would be undone by a stray click on the
                  // radio that is already chosen.
                  onSelect={() =>
                    onDecide(
                      "update",
                      c.record_id,
                      isChosen ? undefined : defaultExclusions(c, locked),
                    )
                  }
                />
              );
            })}
          </div>

          {hidden > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {hidden} further match{hidden === 1 ? "" : "es"} are not shown. A key matching this
              many records usually means the key needs another column.
            </p>
          )}

          <div className="my-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <CreateNewCard
            selected={row.decision === "create"}
            disabled={busy}
            onSelect={() => onDecide("create")}
          />

          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => onDecide("skip")}
              disabled={busy}
              className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline disabled:opacity-50"
              title="Don't write this row at all."
            >
              Skip this row
            </button>
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}
