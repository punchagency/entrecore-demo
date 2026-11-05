"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RuleSchemaResponse } from "../../services/rules-api";
import { ClauseRow } from "./clause-row";
import type { EditorClause, EditorExpression } from "./editor-model";
import { blankClause, blankGroup, clauseLeaf } from "./editor-model";

/**
 * A boolean expression, edited as nested groups of clauses.
 *
 * Two shapes matter and both are buildable here:
 *
 *   all-AND / all-OR    email is … AND title is … AND status is "Active"
 *   OR of AND groups    ( email is … AND client is … )
 *                       OR
 *                       ( name  is … AND client is … )
 *
 * The second is the fallback-key ladder — match on email + client, and when
 * there is no email fall back to name + client. It cannot be expressed as two
 * conditions, because consecutive conditions AND rather than OR, which is
 * exactly why the group control has to exist.
 *
 * Depth is capped at MAX_DEPTH. Past two levels the reading order stops being
 * obvious from the indentation, and a rule that matches something subtly
 * different from what its author pictured is worse than one they could not
 * write at all.
 */

const MAX_DEPTH = 2;

interface Props {
  expression: EditorExpression;
  /** Depth-first clause index -> message, numbered as the backend numbers them. */
  errorFor: (clauseUid: string) => string | undefined;
  /** "candidate" reads destination columns; "record" reads the arriving record. */
  mode: "candidate" | "record";
  targetTable: string;
  schema?: RuleSchemaResponse;
  disabled?: boolean;
  depth?: number;
  onChangeClause: (uid: string, next: EditorClause) => void;
  onRemoveClause: (uid: string) => void;
  onAddClause: (groupUid: string) => void;
  onAddGroup: (groupUid: string) => void;
  onSetOp: (groupUid: string, op: "and" | "or") => void;
  /** Total clauses in the whole expression — the last one may not be removed. */
  totalClauses: number;
}

export function ExpressionEditor({
  expression,
  errorFor,
  mode,
  targetTable,
  schema,
  disabled,
  depth = 0,
  onChangeClause,
  onRemoveClause,
  onAddClause,
  onAddGroup,
  onSetOp,
  totalClauses,
}: Props) {
  // A bare leaf at the top would have nowhere to hang a joiner; callers always
  // seed a group, so this is a defensive render rather than a normal path.
  if (expression.op === "clause") {
    if (!expression.clause) return null;
    return (
      <ClauseRow
        clause={expression.clause}
        index={0}
        mode={mode}
        targetTable={targetTable}
        schema={schema}
        error={errorFor(expression.clause._uid)}
        disabled={disabled}
        canRemove={totalClauses > 1}
        onChange={(next) => onChangeClause(expression.clause!._uid, next)}
        onRemove={() => onRemoveClause(expression.clause!._uid)}
      />
    );
  }

  const args = expression.args ?? [];
  const joiner = expression.op === "or" ? "or" : "and";

  return (
    <div
      className={
        depth > 0
          ? "rounded-xl border border-slate-300 border-dashed bg-white/70 p-2"
          : "space-y-1.5"
      }
    >
      {args.map((arg, i) => (
        <div key={arg._uid}>
          {i > 0 && (
            <div className="flex items-center gap-2 py-1">
              {/* The joiner is editable on the FIRST gap only. One control per
                  group, shown where the first join happens, so it reads as a
                  property of the group rather than of each gap. */}
              {i === 1 ? (
                <Select
                  value={joiner}
                  onValueChange={(op) => onSetOp(expression._uid, op as "and" | "or")}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-6 w-[120px] text-[10px] font-bold uppercase tracking-wider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and" className="text-xs">and</SelectItem>
                    <SelectItem value="or" className="text-xs">or</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {joiner}
                </span>
              )}
            </div>
          )}

          <ExpressionEditor
            expression={arg}
            errorFor={errorFor}
            mode={mode}
            targetTable={targetTable}
            schema={schema}
            disabled={disabled}
            depth={depth + 1}
            onChangeClause={onChangeClause}
            onRemoveClause={onRemoveClause}
            onAddClause={onAddClause}
            onAddGroup={onAddGroup}
            onSetOp={onSetOp}
            totalClauses={totalClauses}
          />
        </div>
      ))}

      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-[11px]"
          disabled={disabled}
          onClick={() => onAddClause(expression._uid)}
        >
          <Plus className="mr-1 h-3 w-3" />
          {joiner.toUpperCase()} clause
        </Button>

        {depth < MAX_DEPTH - 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            disabled={disabled}
            onClick={() => onAddGroup(expression._uid)}
            title={
              joiner === "or"
                ? "A bracketed set of clauses that must all hold"
                : "A bracketed alternative — use this for a fallback key"
            }
          >
            <Plus className="mr-1 h-3 w-3" />
            {joiner.toUpperCase()} group ( … )
          </Button>
        )}
      </div>
    </div>
  );
}

export { blankClause, blankGroup, clauseLeaf, MAX_DEPTH };
