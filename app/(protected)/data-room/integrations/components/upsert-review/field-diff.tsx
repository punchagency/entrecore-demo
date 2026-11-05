"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, KeyRound, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { UpsertFieldDiff } from "../../services/data-integration-api";

/**
 * What writing the incoming row over one candidate would do, field by field —
 * and, once that candidate is chosen, which of those fields to actually write.
 *
 * Unchanged fields are hidden behind a disclosure by default. That single
 * decision is what makes this readable rather than a JSON dump — a typical row
 * has twelve mapped fields and three that actually differ, and showing all
 * twelve equally means the user scans past the one that clears a value.
 *
 * The states come from the backend. They are not derived here on purpose: the
 * rules for "is this value empty" live in the connector's serializer, and a
 * second implementation would eventually disagree with what actually gets
 * written.
 */

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const STATE_STYLES: Record<UpsertFieldDiff["state"], string> = {
  would_clear: "border-l-red-400 bg-red-50/50",
  changed: "border-l-amber-400 bg-amber-50/40",
  fills: "border-l-emerald-400 bg-emerald-50/40",
  unchanged: "border-l-slate-200",
};

const STATE_BADGE: Partial<Record<UpsertFieldDiff["state"], { label: string; className: string }>> = {
  would_clear: { label: "Clears", className: "bg-red-100 text-red-700" },
  fills: { label: "Fills", className: "bg-emerald-100 text-emerald-700" },
};

function Blank() {
  return <span className="italic text-slate-400">empty</span>;
}

/**
 * Which fields this write skips, and why one of them cannot be skipped.
 *
 * `active` is false on every candidate except the chosen one. The diffs stay
 * fully readable either way — comparing candidates is the whole point of the
 * screen — but only the chosen record's fields can be ticked, because
 * `excluded_fields` describes one write and there is only ever one.
 */
export interface FieldSelection {
  active: boolean;
  /** Destination columns NOT being written. */
  excluded: Set<string>;
  /** Write-key columns. Always written, so never ticked off. */
  locked: Set<string>;
  onToggle: (field: string, write: boolean) => void;
  onSetAll: (write: boolean) => void;
  disabled?: boolean;
}

function DiffRow({
  diff,
  selection,
}: {
  diff: UpsertFieldDiff;
  selection?: FieldSelection;
}) {
  const oldText = formatValue(diff.old);
  const newText = formatValue(diff.new);
  const badge = STATE_BADGE[diff.state];

  const locked = selection?.locked.has(diff.field) ?? false;
  const excluded = selection?.excluded.has(diff.field) ?? false;
  const write = !excluded;
  const showBox = !!selection?.active;

  return (
    <div
      className={cn(
        "border-l-2 px-3 py-2 transition",
        STATE_STYLES[diff.state],
        // Struck through rather than hidden: the user needs to see what they
        // chose NOT to write as much as what they did, or "keep existing" looks
        // identical to "this field was never in the run".
        showBox && excluded && "opacity-55"
      )}
    >
      <div className="flex items-center gap-2">
        {showBox && (
          <Checkbox
            checked={write}
            disabled={locked || selection?.disabled}
            onCheckedChange={(v) => selection?.onToggle(diff.field, v === true)}
            className="h-3.5 w-3.5"
            aria-label={
              locked
                ? `${diff.field} is part of the write key and is always written`
                : write
                ? `Stop writing ${diff.field}; keep the existing value`
                : `Write ${diff.field}`
            }
          />
        )}
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {diff.field}
        </span>
        {badge && (
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", badge.className)}>
            {badge.label}
          </span>
        )}
        {showBox && locked && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400"
            title="Part of the write key. It already matches the record you picked, so writing it changes nothing."
          >
            <KeyRound className="h-3 w-3" /> key
          </span>
        )}
        {showBox && excluded && !locked && (
          <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
            Keeping existing
          </span>
        )}
      </div>

      {diff.state === "unchanged" ? (
        <div className="mt-0.5 text-sm text-slate-500">{newText || <Blank />}</div>
      ) : (
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
          <span
            className={cn(
              // The old value stops being struck through the moment the field
              // is excluded — it is no longer being replaced, it is what stays.
              showBox && excluded
                ? "font-medium text-slate-700"
                : "text-slate-500 line-through decoration-slate-400"
            )}
          >
            {oldText || <Blank />}
          </span>
          {!(showBox && excluded) && (
            <>
              <span className="text-slate-400">&rarr;</span>
              <span
                className={cn(
                  "font-medium",
                  diff.state === "would_clear" ? "text-red-600" : "text-blue-700"
                )}
              >
                {newText || <Blank />}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function FieldDiff({
  diff,
  selection,
}: {
  diff: UpsertFieldDiff[];
  selection?: FieldSelection;
}) {
  const [showAll, setShowAll] = useState(false);

  const notable = diff.filter((d) => d.state !== "unchanged");
  const unchanged = diff.filter((d) => d.state === "unchanged");

  if (diff.length === 0) {
    return <p className="px-3 py-2 text-sm text-slate-500">No mapped fields to compare.</p>;
  }

  const excludedCount = selection?.active ? selection.excluded.size : 0;
  const clearsCount = notable.filter((d) => d.state === "would_clear").length;

  return (
    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
      {/* Unchosen candidate: say that the per-field control exists and what
          unlocks it. Without this the gate is invisible — the diff reads as a
          plain summary, so the checkboxes are never found. It sits in the same
          slot the real controls occupy once this record is chosen, so picking
          the record visibly turns the sentence into the toolbar it describes. */}
      {selection && !selection.active && (
        <div className="flex items-center gap-1.5 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-500">
          <SlidersHorizontal className="h-3 w-3 shrink-0 text-slate-400" />
          <span>
            Select this record to choose which fields to write
            {clearsCount > 0 && (
              <>
                {" "}— the {clearsCount} marked <span className="font-semibold text-red-600">Clears</span>{" "}
                start switched off
              </>
            )}
          </span>
        </div>
      )}

      {selection?.active && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 px-3 py-2">
          <p className="text-[11px] font-medium text-slate-600">
            {excludedCount === 0
              ? "Writing every field below"
              : `Keeping ${excludedCount} existing value${excludedCount === 1 ? "" : "s"}`}
          </p>
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => selection.onSetAll(true)}
              disabled={selection.disabled}
              className="text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline disabled:opacity-50"
            >
              Write all
            </button>
            <button
              type="button"
              onClick={() => selection.onSetAll(false)}
              disabled={selection.disabled}
              className="text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline disabled:opacity-50"
              title="Leave every non-key field as it is in the destination."
            >
              Keep all existing
            </button>
          </div>
        </div>
      )}

      {notable.length === 0 ? (
        <p className="px-3 py-2 text-sm text-slate-500">
          Nothing would change — this record already matches.
        </p>
      ) : (
        notable.map((d) => <DiffRow key={d.field} diff={d} selection={selection} />)
      )}

      {showAll && unchanged.map((d) => <DiffRow key={d.field} diff={d} selection={selection} />)}

      {unchanged.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex w-full items-center gap-1 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        >
          {showAll ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {showAll
            ? "Hide unchanged fields"
            : `Show all ${diff.length} fields (${unchanged.length} unchanged)`}
        </button>
      )}
    </div>
  );
}

/** "Would change 3 fields · clear 1" — the one-line version, for card headers. */
export function diffSummary(changed: number, clears: number): string {
  const parts: string[] = [];
  if (changed > 0) parts.push(`${changed} field${changed === 1 ? "" : "s"} change`);
  if (clears > 0) parts.push(`clears ${clears}`);
  return parts.length ? `Would ${parts.join(" · ")}` : "Nothing would change";
}
