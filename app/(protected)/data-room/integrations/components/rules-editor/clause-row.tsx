"use client";

import { Trash2 } from "lucide-react";
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
import {
  DEFAULT_SIMILARITY_THRESHOLD,
  OPERATOR_LABELS,
  SIMILARITY_OPS,
} from "../../services/rules-api";
import type { RuleSchemaResponse } from "../../services/rules-api";
import type { EditorClause } from "./editor-model";

/**
 * One clause inside a condition's expression.
 *
 * Reads as a sentence: "<table>.<column> <operator> <the record's field | a
 * fixed value | another column>". The right-hand side is a mode switch rather
 * than three boxes, because the backend accepts exactly one of them and
 * offering all three invites filling two.
 *
 * The table picker is what lets a clause reach a NEIGHBOUR — `Clients.domain is
 * record's domain` while the case writes to `Engagements`. A clause naming
 * another table is an existence test over it, so it behaves as a gate; the hint
 * under the row says so, because that is not guessable from the controls.
 */

type RightMode = "field" | "value" | "column";

interface Props {
  clause: EditorClause;
  index: number;
  /**
   * "candidate" — the clause tests a destination row, so the left side is a
   *   table column and a neighbouring table may be named.
   * "record" — the clause tests the ARRIVING record, which is what a case's
   *   `when` does. There is no table to pick and the left side is a mapped
   *   field, because the executor passes the record as both sides there.
   */
  mode: "candidate" | "record";
  targetTable: string;
  schema?: RuleSchemaResponse;
  error?: string;
  disabled?: boolean;
  canRemove: boolean;
  onChange: (next: EditorClause) => void;
  onRemove: () => void;
}

const NORMALISER_LABELS: Record<string, string> = {
  trim: "Ignore surrounding spaces",
  lower: "Ignore capitalisation",
  upper: "Force uppercase",
  strip_punct: "Ignore punctuation",
  digits_only: "Digits only",
  email_domain: "Compare email domain only",
};

const UNARY = new Set(["is_empty", "is_not_empty", "is_true", "is_false"]);
/** Operators whose right-hand side is a list of values, not a single one. */
const LIST_OPS = new Set(["in", "not_in", "has_any", "has_all"]);

export function ClauseRow({
  clause,
  index,
  mode: clauseMode,
  targetTable,
  schema,
  error,
  disabled,
  canRemove,
  onChange,
  onRemove,
}: Props) {
  const testsRecord = clauseMode === "record";
  const unaryOps = new Set(schema?.unary_operators ?? Array.from(UNARY));
  const isUnary = unaryOps.has(clause.op);
  const isList = LIST_OPS.has(clause.op);
  const isSimilarity = SIMILARITY_OPS.includes(clause.op);

  const leftTable = clause.left.table || targetTable;
  const isForeign = !testsRecord && leftTable !== targetTable;
  const columnsFor = (table: string) =>
    schema?.tables?.find((t) => t.name === table)?.columns ?? schema?.destination_columns ?? [];
  // Testing the record means the left side is one of its fields, not a column
  // on any table.
  const leftOptions = testsRecord ? schema?.incoming_fields ?? [] : columnsFor(leftTable);

  // The right-hand "the record's…" list, and the boundary the backend enforces:
  // check-only columns are SOURCE names that classify a record in the switch.
  // Once a case is chosen a condition compares against a destination table, so
  // offering them here would put a rejected save one click away — and the
  // clause would look perfectly reasonable on screen.
  const carried = new Set((schema?.check_only ?? []).map((c) => c.toLowerCase()));
  const allowedFields = testsRecord
    ? schema?.incoming_fields ?? []
    : (schema?.incoming_fields ?? []).filter((f) => !carried.has(f.toLowerCase()));
  // Whatever the clause already holds stays in the list even when it is no
  // longer allowed. A document written before this boundary existed would
  // otherwise render with an empty picker — the value is still in the clause
  // and still sent on save, so the row would look blank while behaving as
  // though it were not. Showing it lets the validator's message be about the
  // thing on screen.
  const fieldOptions =
    clause.field && !allowedFields.includes(clause.field)
      ? [clause.field, ...allowedFields]
      : allowedFields;

  const mode: RightMode =
    clause.column != null ? "column" : clause.field != null ? "field" : "value";

  function setOperator(op: string) {
    // A threshold on anything but a similarity operator is rejected by the
    // backend, so it has to be cleared in the same move rather than lingering.
    const threshold = SIMILARITY_OPS.includes(op)
      ? clause.threshold ?? DEFAULT_SIMILARITY_THRESHOLD
      : null;

    if (unaryOps.has(op)) {
      onChange({ ...clause, op, field: null, value: undefined, column: null, threshold });
      return;
    }
    if (isUnary) {
      // Leaving a unary operator needs a right-hand side to exist again.
      onChange({
        ...clause, op, field: clause.left.column, value: undefined, column: null, threshold,
      });
      return;
    }
    onChange({ ...clause, op, threshold });
  }

  function setMode(next: RightMode) {
    // Exactly one right-hand side survives — the backend rejects two, and
    // clearing the others here is what stops a stale one riding along.
    const cleared: EditorClause = {
      ...clause,
      field: null,
      value: undefined,
      column: null,
    };
    if (next === "field") return onChange({ ...cleared, field: clause.left.column });
    if (next === "value") return onChange({ ...cleared, value: "" });
    onChange({ ...cleared, column: { column: columnsFor(targetTable)[0] ?? "" } });
  }

  function toggleNormaliser(name: string, on: boolean) {
    const current = clause.normalise ?? [];
    onChange({
      ...clause,
      normalise: on ? [...current, name] : current.filter((n) => n !== name),
    });
  }

  const active = clause.normalise ?? [];
  const tables = schema?.tables ?? [];

  return (
    <div
      className={`rounded-xl border p-2 ${
        error ? "border-red-300 bg-red-50/40" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Which table this column is on. Never offered when the clause tests
            the arriving record — there is no table involved — and pointless
            when the connector has only one. */}
        {!testsRecord && tables.length > 1 && (
          <Select
            value={leftTable}
            onValueChange={(table) =>
              onChange({
                ...clause,
                left: {
                  table: table === targetTable ? null : table,
                  // The old column almost certainly does not exist on the new
                  // table, so start from that table's first column instead of
                  // leaving a reference that will fail validation.
                  column: columnsFor(table)[0] ?? "",
                },
              })
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[150px] font-mono text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tables.map((t) => (
                <SelectItem key={t.name} value={t.name} className="font-mono text-xs">
                  {t.name}
                  {t.is_destination && " (this job)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={clause.left.column || undefined}
          onValueChange={(column) => onChange({ ...clause, left: { ...clause.left, column } })}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-[170px] font-mono text-[11px]">
            <SelectValue placeholder={testsRecord ? "Record field…" : "Column…"} />
          </SelectTrigger>
          <SelectContent>
            {leftOptions.map((column) => (
              <SelectItem key={column} value={column} className="font-mono text-xs">
                {column}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clause.op} onValueChange={setOperator} disabled={disabled}>
          <SelectTrigger className="h-8 w-[145px] text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(schema?.operators ?? Object.keys(OPERATOR_LABELS)).map((op) => (
              <SelectItem key={op} value={op} className="text-xs">
                {OPERATOR_LABELS[op] ?? op}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!isUnary && (
          <>
            <Select
              value={mode}
              onValueChange={(m) => setMode(m as RightMode)}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-[145px] text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="field" className="text-xs">the record&apos;s…</SelectItem>
                <SelectItem value="value" className="text-xs">a fixed value</SelectItem>
                {/* Column-to-column only makes sense against a real row. */}
                {!testsRecord && (
                  <SelectItem value="column" className="text-xs">another column</SelectItem>
                )}
              </SelectContent>
            </Select>

            {mode === "field" && (
              <Select
                value={clause.field ?? undefined}
                onValueChange={(field) => onChange({ ...clause, field })}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 w-[170px] font-mono text-[11px]">
                  <SelectValue placeholder="Field…" />
                </SelectTrigger>
                <SelectContent>
                  {fieldOptions.map((f) => (
                    <SelectItem key={f} value={f} className="font-mono text-xs">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {mode === "column" && (
              <Select
                value={clause.column?.column ?? undefined}
                onValueChange={(column) => onChange({ ...clause, column: { column } })}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 w-[170px] font-mono text-[11px]">
                  <SelectValue placeholder="Column…" />
                </SelectTrigger>
                <SelectContent>
                  {columnsFor(targetTable).map((column) => (
                    <SelectItem key={column} value={column} className="font-mono text-xs">
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {mode === "value" && (
              <Input
                className="h-8 w-[170px] font-mono text-[11px]"
                placeholder={isList ? "Active, Pending" : "Active"}
                value={
                  Array.isArray(clause.value)
                    ? (clause.value as string[]).join(", ")
                    : String(clause.value ?? "")
                }
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    ...clause,
                    // `in` / `not_in` take a list. Splitting here keeps the
                    // input a plain text box rather than a tag editor.
                    value: isList
                      ? e.target.value.split(",").map((v) => v.trim()).filter(Boolean)
                      : e.target.value,
                  })
                }
              />
            )}
          </>
        )}

        {/* Confidence bar, shown only for a similarity operator. Typed rather
            than a slider: authors think in round numbers here ("85%"), and a
            slider makes an exact value fiddly to land on. */}
        {isSimilarity && (
          <span className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              at least
            </span>
            <Input
              type="number"
              min={1}
              max={100}
              className="h-6 w-14 bg-white px-1 text-center font-mono text-[11px]"
              value={clause.threshold ?? DEFAULT_SIMILARITY_THRESHOLD}
              disabled={disabled}
              onChange={(e) => {
                const n = Number(e.target.value);
                onChange({
                  ...clause,
                  threshold: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null,
                });
              }}
            />
            <span className="text-[11px] font-bold text-indigo-700">%</span>
          </span>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-[11px]"
              disabled={disabled}
            >
              Matching
              {active.length > 0 && (
                <span className="ml-1 rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700">
                  {active.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <p className="mb-2 text-xs text-slate-500">
              Applied to <strong>both</strong> sides before comparing. Normalising only one
              side is how a rule silently stops matching.
            </p>
            <div className="space-y-2">
              {(schema?.normalisers ?? []).map((name) => (
                <label key={name} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={active.includes(name)}
                    onCheckedChange={(on) => toggleNormaliser(name, on === true)}
                  />
                  {NORMALISER_LABELS[name] ?? name}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8 text-slate-400 hover:text-red-600"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Remove clause ${index + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {isForeign && (
        <p className="mt-1.5 text-[11px] text-indigo-700">
          Checks whether <span className="font-mono">{leftTable}</span> has any such row.
          It does not narrow which <span className="font-mono">{targetTable}</span> row
          matches — it either lets them all through or none.
        </p>
      )}

      {error && <p className="mt-1.5 text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  );
}
