"use client";

import { useMemo, useState } from "react";
import { Eye, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RuleSchemaResponse } from "../../services/rules-api";

/**
 * Columns the rules read but never write.
 *
 * A column mapping means "write this to the destination", and until this
 * existed it was also the only way a value reached the rules — so "visible to a
 * condition" and "written to Airtable" were one list. A routing fact like
 * `isCsv` belongs in the first and not the second, and there was no way to say
 * so: mapping it meant inventing a destination column to hold something the
 * destination should never store.
 *
 * The picker offers UNMAPPED SOURCE columns, and both words are load-bearing.
 * Source, because a check-only column is named by its source name — there is no
 * destination name, that being the whole point — so a destination list would
 * offer the one vocabulary that cannot work. Unmapped, because a mapped column
 * is already written and already readable by the rules, so listing it here too
 * would be a second instruction about the same column.
 */

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  schema?: RuleSchemaResponse;
  disabled?: boolean;
}

export function CheckOnlyBar({ value, onChange, schema, disabled }: Props) {
  const [typed, setTyped] = useState("");

  const chosen = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value]
  );
  const mapped = useMemo(
    () => new Set((schema?.mapped_source_columns ?? []).map((v) => v.toLowerCase())),
    [schema]
  );

  // UNMAPPED source columns only. A mapped column is already written and
  // already readable by the rules, so carrying it as well is a second
  // instruction about the same column — offering it at all invites the
  // question of what listing it in both places would mean.
  const options = (schema?.source_columns ?? []).filter(
    (c) => !chosen.has(c.toLowerCase()) && !mapped.has(c.toLowerCase())
  );
  const catalogued = (schema?.source_columns ?? []).length > 0;

  function add(name: string) {
    const cleaned = name.trim();
    if (!cleaned) return;
    // Case-insensitive, matching the backend: BigQuery lowercases column names
    // on read-back, so "isCsv" and "iscsv" are one column that would look like
    // two in this list.
    if (chosen.has(cleaned.toLowerCase())) return;
    onChange([...value, cleaned]);
    setTyped("");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Eye className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-bold text-slate-700">Columns for deciding only</span>
        <span className="text-xs text-slate-500">
          read by the rules, never written to the destination — for flags like{" "}
          <code className="rounded bg-slate-100 px-1 text-[11px]">isCsv</code> that say
          where a record came from.
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {value.map((name) => (
          <Badge
            key={name}
            variant="outline"
            className="gap-1 bg-slate-50 font-mono text-[11px] font-normal"
          >
            {name}
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== name))}
                className="text-slate-400 hover:text-slate-700"
                title={`Stop carrying ${name}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}

        {!disabled && catalogued && (
          <Select value="" onValueChange={add}>
            <SelectTrigger className="h-7 w-56 text-xs">
              <SelectValue placeholder="Add a source column…" />
            </SelectTrigger>
            <SelectContent>
              {options.length === 0 && (
                <div className="px-2 py-3 text-center text-[11px] text-slate-500">
                  Every source column is already mapped or already carried.
                </div>
              )}
              {options.map((column) => (
                <SelectItem key={column} value={column} className="text-xs">
                  <span className="font-mono">{column}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Typing is the fallback, not the default. It appears only when the
            source table has not been catalogued — a text box someone can get
            wrong beats a dropdown that is confidently empty. */}
        {!disabled && !catalogued && (
          <div className="flex items-center gap-1">
            <Input
              className="h-7 w-44 text-xs"
              placeholder="Source column name"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // The editor sits inside a form elsewhere on the page;
                  // without this, Enter submits it and the name is lost.
                  e.preventDefault();
                  add(typed);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => add(typed)}
              disabled={!typed.trim()}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}

        {disabled && !value.length && (
          <span className="text-[11px] text-slate-400">None.</span>
        )}
      </div>

      {!disabled && !catalogued && (
        <p className="mt-2 text-[11px] text-amber-700">
          This job&apos;s source table isn&apos;t in the catalog, so there is no list to
          pick from. Type the column name exactly as it appears in the source.
        </p>
      )}

      {!!value.length && (
        <p className="mt-2 text-[11px] text-slate-500">
          Use these in a case&apos;s <strong>when</strong> exactly like a mapped column.
        </p>
      )}
    </div>
  );
}
