"use client";

import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RuleSchemaResponse, RuleValidationError } from "../../services/rules-api";
import type { EditorCondition, EditorExpression } from "./editor-model";
import {
  addToGroup,
  blankClause,
  blankGroup,
  clauseLeaf,
  flatClauseUids,
  removeClause,
  replaceClause,
  setGroupOp,
} from "./editor-model";
import { ExpressionEditor } from "./expression-editor";
import { OutcomeSlots } from "./outcome-picker";

/** The joiner of the group with this uid, so a new sub-group can invert it. */
function findOp(expression: EditorExpression, uid: string): "and" | "or" {
  if (expression.op === "clause") return "and";
  if (expression._uid === uid) return expression.op === "or" ? "or" : "and";
  for (const arg of expression.args ?? []) {
    if (arg.op !== "clause") {
      const found = findOp(arg, uid);
      if (found) return found;
    }
  }
  return "and";
}

/**
 * One narrowing step: an expression, and what it does about what it leaves.
 *
 * The expression is always an `and`/`or` group even with a single clause, so
 * adding a second never has to restructure the tree and the editor never
 * renders two layouts for the same thing.
 *
 * Only flat groups are editable here — every clause joined by one AND, or one
 * OR. Nested groups round-trip correctly if a document contains them, but the
 * controls do not build them: a boolean tree editor is a large amount of UI for
 * a shape almost no rule set needs, and getting it wrong silently changes what
 * a rule matches.
 */

interface Props {
  condition: EditorCondition;
  index: number;
  targetTable: string;
  schema?: RuleSchemaResponse;
  errors: RuleValidationError[];
  disabled?: boolean;
  onChange: (next: EditorCondition) => void;
  onRemove: () => void;
}

export function ConditionRow({
  condition,
  index,
  targetTable,
  schema,
  errors,
  disabled,
  onChange,
  onRemove,
}: Props) {
  const dragControls = useDragControls();

  const group = condition.expression;

  // Errors arrive located by DEPTH-FIRST clause index, which is how the backend
  // numbers them. Mapping index -> uid here is what lets a nested clause light
  // up the right row instead of the top of the condition.
  const uids = flatClauseUids(group);
  const clauseErrors = new Map<string, string>();
  const conditionErrors: string[] = [];
  for (const error of errors) {
    const match = /\.clauses\.(\d+)\./.exec(error.location ?? "");
    const uid = match ? uids[Number(match[1])] : undefined;
    if (uid) clauseErrors.set(uid, error.message);
    else conditionErrors.push(error.message);
  }

  function edit(expression: typeof group) {
    onChange({ ...condition, expression });
  }

  return (
    <Reorder.Item
      as="div"
      value={condition._uid}
      dragListener={false}
      dragControls={dragControls}
      className={`rounded-2xl border p-3 ${
        errors.length ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-slate-50/40"
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`mt-1.5 shrink-0 text-slate-300 ${
            disabled ? "" : "cursor-grab touch-none active:cursor-grabbing hover:text-slate-500"
          }`}
          onPointerDown={(event) => {
            if (!disabled) dragControls.start(event);
          }}
          role="button"
          tabIndex={-1}
          aria-label="Drag to reorder condition"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {index + 1}
            </span>
            <Input
              className="h-8 max-w-xs border-dashed text-xs"
              placeholder="Optional label — shown in the funnel and on the review screen"
              value={condition.label ?? ""}
              disabled={disabled}
              onChange={(e) => onChange({ ...condition, label: e.target.value || null })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 text-slate-400 hover:text-red-600"
              onClick={onRemove}
              disabled={disabled}
              aria-label={`Remove condition ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {conditionErrors.map((message, i) => (
            <p key={i} className="text-[11px] font-medium text-red-600">
              {message}
            </p>
          ))}

          <ExpressionEditor
            expression={group}
            errorFor={(uid) => clauseErrors.get(uid)}
            mode="candidate"
            targetTable={targetTable}
            schema={schema}
            disabled={disabled}
            totalClauses={uids.length}
            onChangeClause={(uid, next) => edit(replaceClause(group, uid, next))}
            onRemoveClause={(uid) => {
              const next = removeClause(group, uid);
              // The last clause cannot go: an expression with nothing in it is
              // rejected by the backend and shows as an error with no row to
              // point at.
              if (next) edit(next);
            }}
            onAddClause={(groupUid) =>
              edit(addToGroup(group, groupUid, clauseLeaf(blankClause(schema))))
            }
            onAddGroup={(groupUid) => {
              // A group added under AND is an OR alternative, and vice versa —
              // that is what makes ( A AND B ) OR ( C AND D ) reachable in two
              // clicks rather than requiring anyone to think about nesting.
              const parentOp = findOp(group, groupUid);
              edit(
                addToGroup(
                  group,
                  groupUid,
                  blankGroup(parentOp === "or" ? "and" : "or", schema)
                )
              );
            }}
            onSetOp={(groupUid, op) => edit(setGroupOp(group, groupUid, op))}
          />

          <OutcomeSlots
            outcomes={condition.outcomes}
            schema={schema}
            disabled={disabled}
            isFinal={false}
            onChange={(outcomes) => onChange({ ...condition, outcomes })}
          />
        </div>
      </div>
    </Reorder.Item>
  );
}
