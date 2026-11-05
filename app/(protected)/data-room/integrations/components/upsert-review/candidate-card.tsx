"use client";

import { ExternalLink, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UpsertCandidate } from "../../services/data-integration-api";
import { FieldDiff, diffSummary, type FieldSelection } from "./field-diff";

/**
 * One existing record the incoming row could update.
 *
 * Never pre-selected, even the closest match. A pre-selection in a destructive
 * review is how people click through without reading, which is the exact
 * behaviour this whole feature exists to stop.
 */

function airtableUrl(baseId: string | null, tableId: string | null, recordId: string): string | null {
  if (!baseId || !tableId) return null;
  return `https://airtable.com/${baseId}/${tableId}/${recordId}`;
}

interface CandidateCardProps {
  candidate: UpsertCandidate;
  selected: boolean;
  isClosest: boolean;
  baseId: string | null;
  tableId: string | null;
  disabled?: boolean;
  onSelect: () => void;
  /**
   * Per-field control over what this update writes. Only supplied for the
   * chosen candidate — the others render their diffs read-only, which is what
   * keeps "compare the options" and "edit the write" from being the same
   * gesture.
   */
  selection?: FieldSelection;
}

export function CandidateCard({
  candidate,
  selected,
  isClosest,
  baseId,
  tableId,
  disabled,
  onSelect,
  selection,
}: CandidateCardProps) {
  const url = airtableUrl(baseId, tableId, candidate.record_id);

  // Recounted against the exclusions rather than read off the candidate. The
  // stored counts describe writing the row WHOLE, so a user who has just ticked
  // off the only destructive field would otherwise still be told this record
  // "clears 1" — the summary contradicting the diff directly beneath it.
  const effective = selection?.active
    ? candidate.diff.reduce(
        (acc, d) => {
          if (selection.excluded.has(d.field)) return acc;
          if (d.state === "would_clear") acc.clears += 1;
          else if (d.state === "changed" || d.state === "fills") acc.changed += 1;
          return acc;
        },
        { changed: 0, clears: 0 }
      )
    : { changed: candidate.changed_count, clears: candidate.clears_count };

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition",
        selected
          ? "border-blue-400 bg-blue-50/60 ring-1 ring-blue-200"
          : "border-slate-200 bg-white hover:border-slate-300",
        disabled && "opacity-60"
      )}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="radio"
          className="mt-1 h-4 w-4 accent-blue-600"
          checked={selected}
          disabled={disabled}
          onChange={onSelect}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
              {candidate.record_id}
            </code>
            {isClosest && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                Closest match
              </span>
            )}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
              >
                Open in Airtable <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <p
            className={cn(
              "mt-1 text-xs",
              effective.clears > 0 ? "font-medium text-red-600" : "text-slate-500"
            )}
          >
            {diffSummary(effective.changed, effective.clears)}
          </p>
        </div>
      </label>

      <div className="mt-3">
        <FieldDiff diff={candidate.diff} selection={selection} />
      </div>
    </div>
  );
}

/**
 * "Create a new record instead" — deliberately NOT shaped like a candidate, so
 * it does not read as a fifth record to choose between.
 */
export function CreateNewCard({
  selected,
  disabled,
  onSelect,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 transition",
        selected
          ? "border-emerald-400 bg-emerald-50/60 ring-1 ring-emerald-200"
          : "border-slate-300 bg-slate-50/50 hover:border-slate-400",
        disabled && "opacity-60"
      )}
    >
      <input
        type="radio"
        className="h-4 w-4 accent-emerald-600"
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
      />
      <Plus className="h-4 w-4 text-slate-500" />
      <div>
        <p className="text-sm font-medium text-slate-800">Create a new record instead</p>
        <p className="text-xs text-slate-500">
          None of these is the right one — add this as a separate record.
        </p>
      </div>
    </label>
  );
}
