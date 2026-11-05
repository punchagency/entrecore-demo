"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTION_LABELS } from "../../services/rules-api";
import type {
  FinalOutcomes,
  RuleAction,
  RuleActionName,
  RuleOutcomes,
  RuleSchemaResponse,
} from "../../services/rules-api";
import { FixedValues } from "./fixed-values";
import { SideWrites } from "./side-writes";

/**
 * What a condition — or the whole case — does about what it leaves behind.
 *
 * These are CONFIGURATION, not policy. Nothing about "nothing matched means
 * insert" is baked into the engine: a low-trust source can flag instead, and a
 * condition can stop the moment it finds a single row.
 *
 * `one` and `many` default to "keep going" on a condition, so an author only
 * fills a slot in when they want to peel off early. On the FINAL outcomes there
 * is nothing to continue to, so all three are real choices and "keep going" is
 * not offered.
 */

interface Props {
  outcomes: RuleOutcomes | FinalOutcomes;
  schema?: RuleSchemaResponse;
  disabled?: boolean;
  isFinal: boolean;
  onChange: (next: RuleOutcomes & FinalOutcomes) => void;
}

const SLOTS: Array<{ key: "none" | "one" | "many"; title: string; detail: string }> = [
  { key: "none", title: "No rows left", detail: "nothing satisfied this" },
  { key: "one", title: "Exactly one", detail: "a single row qualifies" },
  { key: "many", title: "Several", detail: "still ambiguous" },
];

const WRITES = new Set(["insert", "update", "merge"]);
const KEEP_GOING: RuleAction = { action: "continue" };

export function OutcomeSlots({ outcomes, schema, disabled, isFinal, onChange }: Props) {
  const actions = (schema?.actions ?? [
    "continue", "insert", "update", "merge", "human", "flag", "skip",
  ]).filter((a) => (isFinal ? a !== "continue" : true));

  const columns = schema?.destination_columns ?? [];

  function get(key: "none" | "one" | "many"): RuleAction {
    return (outcomes as RuleOutcomes)[key] ?? KEEP_GOING;
  }

  function setAction(key: "none" | "one" | "many", action: RuleActionName) {
    // Carry across whatever remains legal for the new action, and drop only
    // what does not.
    //
    // This used to replace the whole object. That was safe — `precedence` on
    // an update is a 422 — but far too broad: switching "fill its empty cells
    // only" to "update that row" silently discarded a twenty-column allowlist
    // and every side-write beneath it. The two actions differ in one flag, and
    // rebuilding the rest by hand is not a reasonable price for changing it.
    const prior = get(key);
    const writes = WRITES.has(action);
    const next: RuleAction = { action };

    if (writes) {
      if (prior.fields !== undefined) next.fields = prior.fields;
      if (prior.keep_existing_when_blank !== undefined) {
        next.keep_existing_when_blank = prior.keep_existing_when_blank;
      }
      if (prior.also?.length) next.also = prior.also;
      // Constants survive a move between writing actions for the same reason
      // the allowlist does: switching "fill its empty cells only" to "update
      // that row" should not silently discard what the author set.
      if (prior.fixed?.length) next.fixed = prior.fixed;
      // merge is the only action `precedence` is valid on.
      if (action === "merge" && prior.precedence != null) {
        next.precedence = prior.precedence;
      }
    } else if (prior.reason) {
      // A reason belongs to the actions that hold a record, so it survives a
      // move between them and is dropped on the way to a write.
      next.reason = prior.reason;
    }

    onChange({ ...(outcomes as FinalOutcomes), [key]: next });
  }

  function patch(key: "none" | "one" | "many", changes: Partial<RuleAction>) {
    onChange({
      ...(outcomes as FinalOutcomes),
      [key]: { ...get(key), ...changes },
    });
  }

  return (
    <div className="grid gap-2 md:grid-cols-3">
      {SLOTS.map(({ key, title, detail }) => {
        const action = get(key);
        const keepsGoing = action.action === "continue";
        const ambiguousUpdate = key === "many" && action.action === "update";

        return (
          <div
            key={key}
            className={`rounded-xl border px-2.5 py-2 ${
              keepsGoing ? "border-slate-200 bg-white/60" : "border-slate-300 bg-white"
            }`}
          >
            <p className="text-[11px] font-bold text-slate-800">
              {title}
              <span className="ml-1 font-normal text-slate-400">{detail}</span>
            </p>

            <Select
              value={action.action}
              onValueChange={(a) => setAction(key, a as RuleActionName)}
              disabled={disabled}
            >
              <SelectTrigger className="mt-1 h-8 bg-white text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actions.map((a) => (
                  <SelectItem key={a} value={a} className="text-xs">
                    {ACTION_LABELS[a] ?? a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {action.action === "merge" && (
              <Select
                value={action.precedence ?? "existing"}
                onValueChange={(p) => patch(key, { precedence: p as "existing" | "incoming" })}
                disabled={disabled}
              >
                <SelectTrigger className="mt-1 h-7 bg-white text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing" className="text-xs">
                    Never overwrite a filled cell
                  </SelectItem>
                  <SelectItem value="incoming" className="text-xs">
                    Incoming value wins
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {WRITES.has(action.action) && (
              <>
                {/* `fields: null` is "every mapped column"; an ARRAY means a
                    chosen subset — including an empty one while the user is
                    still picking. Deriving the mode from `length` made an empty
                    selection snap back to "all" the instant you switched. */}
                <Select
                  value={action.fields == null ? "all" : "some"}
                  onValueChange={(m) => patch(key, { fields: m === "all" ? null : [] })}
                  disabled={disabled}
                >
                  <SelectTrigger className="mt-1 h-7 bg-white text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Write every mapped column
                    </SelectItem>
                    <SelectItem value="some" className="text-xs">
                      Only chosen columns…
                    </SelectItem>
                  </SelectContent>
                </Select>

                {action.fields != null && (
                  <ColumnPicker
                    columns={columns}
                    selected={action.fields}
                    disabled={disabled}
                    onChange={(fields) => patch(key, { fields })}
                  />
                )}

                {/* The one people get bitten by: an empty incoming value
                    silently wiping a real one. Defaults to protected. */}
                <label className="mt-1.5 flex items-start gap-1.5 text-[10px] text-slate-600">
                  <Checkbox
                    className="mt-0.5"
                    checked={action.keep_existing_when_blank !== false}
                    disabled={disabled}
                    onCheckedChange={(on) =>
                      patch(key, { keep_existing_when_blank: on === true })
                    }
                  />
                  Leave a cell alone if the incoming value is blank
                </label>

                {/* Columns written with a constant. Deliberately BELOW the
                    allowlist and the blank guard: it reads as "and also always
                    set these", which is exactly what it does — a constant is
                    not part of the allowlist and is never blank. */}
                <FixedValues
                  fixed={action.fixed ?? []}
                  schema={schema}
                  action={action.action}
                  precedence={action.precedence}
                  disabled={disabled}
                  onChange={(fixed) => patch(key, { fixed })}
                />

                {/* Only offered on a writing action — a record being held or
                    dropped must not scatter rows into other tables, and the
                    backend rejects it. */}
                <SideWrites
                  also={action.also ?? []}
                  schema={schema}
                  disabled={disabled}
                  onChange={(also) => patch(key, { also })}
                />
              </>
            )}

            {(action.action === "human" ||
              action.action === "flag" ||
              action.action === "skip") && (
              <Input
                className="mt-1 h-7 bg-white text-[10px]"
                placeholder="Why — shown on the review screen"
                value={action.reason ?? ""}
                disabled={disabled}
                onChange={(e) => patch(key, { reason: e.target.value || null })}
              />
            )}

            {ambiguousUpdate && (
              <p className="mt-1.5 flex items-start gap-1 text-[10px] font-medium text-amber-700">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                With several rows qualifying there is no single row to update, so these
                records are held for a person anyway.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Which columns an action writes.
 *
 * A checkbox list rather than a comma-separated text box: the columns are a
 * known, finite set, and typing them by hand invites a misspelling that only
 * surfaces as a validation error later. Shows what is selected on the trigger
 * so the choice is readable without opening it.
 */
function ColumnPicker({
  columns,
  selected,
  disabled,
  onChange,
}: {
  columns: string[];
  selected: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
}) {
  const summary = selected.length
    ? selected.join(", ")
    : columns.length
      ? "Pick columns…"
      : "No columns available";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || columns.length === 0}
          className="mt-1 h-7 w-full justify-start bg-white px-2 font-mono text-[10px] font-normal"
        >
          <span className="truncate">{summary}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {columns.map((column) => (
            <label
              key={column}
              className="flex items-center gap-2 rounded px-1 py-0.5 font-mono text-[11px] hover:bg-slate-50"
            >
              <Checkbox
                checked={selected.includes(column)}
                onCheckedChange={(on) =>
                  onChange(
                    on === true
                      ? [...selected, column]
                      : selected.filter((c) => c !== column)
                  )
                }
              />
              {column}
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-6 w-full text-[10px]"
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function blankFinalOutcomes(): FinalOutcomes {
  return {
    none: { action: "insert" },
    one: { action: "update" },
    many: { action: "human" },
  };
}
