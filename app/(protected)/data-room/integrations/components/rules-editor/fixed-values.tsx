"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FixedField, RuleSchemaResponse } from "../../services/rules-api";

/**
 * Columns this action fills with a constant, regardless of the incoming record.
 *
 * The same idea `also write to` already offers for a secondary table, finally
 * available on the table the action is acting on — until now a rule could stamp
 * a constant into a side row but not into the row it was writing.
 *
 * Two things the copy here has to carry, because both surprise people:
 *
 *   * a constant is NOT part of the column allowlist above. That list chooses
 *     which MAPPED columns to write; a constant declares its own column and
 *     writes regardless. Making the author name it twice would mean forgetting
 *     the second mention fails silently.
 *
 *   * on `merge` set to never overwrite, the EXISTING value still wins. The
 *     constant fills an empty cell and stands down against a real differing
 *     one — otherwise that setting would mean "never overwrite, except for the
 *     things I forgot to mention".
 *
 * A select column offers its real options rather than a text box. That matters
 * more here than anywhere else in this editor: these writes run with typecast
 * on, so a typed-in value that is not a real option does not fail — it creates
 * a NEW option in the destination, on every row the rule touches.
 */

interface Props {
  fixed: FixedField[];
  schema?: RuleSchemaResponse;
  action: string;
  precedence?: "existing" | "incoming" | null;
  disabled?: boolean;
  onChange: (next: FixedField[]) => void;
}

export function FixedValues({
  fixed,
  schema,
  action,
  precedence,
  disabled,
  onChange,
}: Props) {
  const columns = schema?.destination_columns ?? [];
  const options = schema?.column_options ?? {};
  const used = new Set(fixed.map((f) => f.column.trim().toLowerCase()));

  function patch(index: number, changes: Partial<FixedField>) {
    onChange(fixed.map((f, i) => (i === index ? { ...f, ...changes } : f)));
  }

  function add() {
    onChange([...fixed, { column: "", value: "" }]);
  }

  function remove(index: number) {
    onChange(fixed.filter((_, i) => i !== index));
  }

  /** A select column's options, or null when the column is free text. */
  function choicesFor(column: string): string[] | null {
    const key = Object.keys(options).find(
      (c) => c.toLowerCase() === column.trim().toLowerCase(),
    );
    if (key === undefined) return null;
    const choices = options[key] ?? [];
    // A select whose options are not defined yet: fall back to a text box
    // rather than an empty dropdown nobody can pick from.
    return choices.length ? choices : null;
  }

  const standsDown = action === "merge" && (precedence ?? "existing") === "existing";

  return (
    <div className="mt-1.5">
      {fixed.length > 0 && (
        <div className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            always set
          </span>

          {fixed.map((entry, i) => {
            const choices = choicesFor(entry.column);
            const text = entry.value == null ? "" : String(entry.value);

            return (
              <div key={i} className="flex flex-wrap items-center gap-1">
                <Select
                  value={entry.column || undefined}
                  onValueChange={(column) => patch(i, { column })}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-7 w-[38%] min-w-[110px] bg-white text-[10px]">
                    <SelectValue placeholder="Column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem
                        key={c}
                        value={c}
                        className="font-mono text-xs"
                        // Already set elsewhere in this action — the backend
                        // rejects a column set twice, so it is not offered.
                        disabled={
                          used.has(c.toLowerCase()) &&
                          c.toLowerCase() !== entry.column.trim().toLowerCase()
                        }
                      >
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-[10px] text-slate-500">to</span>

                {choices ? (
                  <Select
                    value={text || undefined}
                    onValueChange={(value) => patch(i, { value })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-7 flex-1 bg-white text-[10px]">
                      <SelectValue placeholder="Value" />
                    </SelectTrigger>
                    <SelectContent>
                      {choices.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-7 flex-1 bg-white text-[10px]"
                    placeholder="Value"
                    value={text}
                    disabled={disabled}
                    onChange={(e) => patch(i, { value: e.target.value })}
                  />
                )}

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-slate-400 hover:text-rose-600"
                  disabled={disabled}
                  onClick={() => remove(i)}
                  aria-label="Remove this fixed value"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}

          <p className="pt-0.5 text-[10px] leading-snug text-emerald-800">
            Written on every row, whatever the source says — and regardless of the
            column list above. A blank value sets nothing.
            {standsDown && (
              <>
                {" "}
                <span className="font-medium">
                  This action never overwrites a filled cell, so these only fill
                  empty ones.
                </span>
              </>
            )}
          </p>
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="mt-1 h-6 px-1.5 text-[10px] text-emerald-700 hover:bg-emerald-50"
        disabled={disabled}
        onClick={add}
      >
        <Plus className="mr-1 h-3 w-3" />
        Set a fixed value
      </Button>
    </div>
  );
}
