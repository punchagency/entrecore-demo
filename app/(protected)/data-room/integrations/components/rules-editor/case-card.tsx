"use client";

import { Reorder, useDragControls } from "framer-motion";
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from "lucide-react";
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
import type { RuleSchemaResponse, RuleValidationError } from "../../services/rules-api";
import { ConditionRow } from "./condition-row";
import type { EditorCase, EditorExpression } from "./editor-model";
import {
  addToGroup,
  blankCondition,
  blankGroup,
  blankRecordClause,
  clauseLeaf,
  flatClauseUids,
  newUid,
  removeClause,
  reorderByUid,
  replaceClause,
  setGroupOp,
} from "./editor-model";
import { ExpressionEditor } from "./expression-editor";
import { OutcomeSlots, blankFinalOutcomes } from "./outcome-picker";

/**
 * One branch of the switch: when to use it, and how it decides.
 *
 * A case is EITHER a funnel (conditions + outcomes) OR an unconditional
 * `always` write — never both. The second is Append expressed per case, which
 * is strictly more than the job-wide append/upsert flag can do: one job can
 * append a raw feed and match a curated one.
 */

interface Props {
  ruleCase: EditorCase;
  index: number;
  schema?: RuleSchemaResponse;
  errors: RuleValidationError[];
  collapsed: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onChange: (next: EditorCase) => void;
  onRemove: () => void;
}

export function CaseCard({
  ruleCase,
  index,
  schema,
  errors,
  collapsed,
  disabled,
  onToggle,
  onChange,
  onRemove,
}: Props) {
  const dragControls = useDragControls();
  const isAppend = ruleCase.always != null;
  const conditions = ruleCase.conditions ?? [];

  // Errors carrying a condition_index belong to a condition, which sorts its
  // own clause-level ones out from there; the rest belong to the case.
  const conditionErrors = new Map<number, RuleValidationError[]>();
  const caseErrors: string[] = [];
  for (const error of errors) {
    if (error.condition_index != null) {
      const list = conditionErrors.get(error.condition_index) ?? [];
      list.push(error);
      conditionErrors.set(error.condition_index, list);
    } else {
      caseErrors.push(error.message);
    }
  }

  // A case's `when` is a full expression, same as a condition's — so
  // "isCsv is true AND source is gusto" is buildable rather than needing two
  // cases that cannot express the combination anyway. Normalised to a group on
  // read so the editor never has to render a bare leaf at the top.
  const whenGroup: EditorExpression =
    ruleCase.when && ruleCase.when.op !== "clause"
      ? (ruleCase.when as EditorExpression)
      : {
          _uid: newUid("e"),
          op: "and",
          args: ruleCase.when
            ? [ruleCase.when as EditorExpression]
            : [clauseLeaf(blankRecordClause(schema))],
        };

  const whenUids = flatClauseUids(whenGroup);

  function setWhen(expression: EditorExpression) {
    onChange({ ...ruleCase, when: expression });
  }

  function setMode(mode: "funnel" | "append") {
    if (mode === "append") {
      onChange({
        ...ruleCase,
        conditions: [],
        outcomes: null,
        always: { action: "insert" },
      });
    } else {
      onChange({
        ...ruleCase,
        always: null,
        conditions: [blankCondition(schema)],
        outcomes: blankFinalOutcomes(),
      });
    }
  }

  return (
    <Reorder.Item
      as="div"
      value={ruleCase._uid}
      dragListener={false}
      dragControls={dragControls}
      className={`rounded-3xl border bg-white transition-colors ${
        errors.length ? "border-red-300" : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        <div
          className={`shrink-0 text-slate-300 ${
            disabled ? "" : "cursor-grab touch-none active:cursor-grabbing hover:text-slate-500"
          }`}
          onPointerDown={(event) => {
            if (!disabled) dragControls.start(event);
          }}
          role="button"
          tabIndex={-1}
          aria-label="Drag to reorder case"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-slate-400"
          onClick={onToggle}
          aria-label={collapsed ? "Expand case" : "Collapse case"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {/* Order is meaningful — cases are tried top to bottom, first match
            wins — so the position is worth showing rather than implying. */}
        <span
          className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400"
          title={
            ruleCase.default
              ? "The default is considered last, whatever its position"
              : `Tried ${ordinal(index + 1)}`
          }
        >
          {ruleCase.default ? "LAST" : `#${index + 1}`}
        </span>

        <Input
          className="h-9 max-w-xs border-transparent bg-slate-50 font-bold"
          value={ruleCase.name}
          placeholder="Case name"
          disabled={disabled}
          onChange={(e) => onChange({ ...ruleCase, name: e.target.value })}
        />

        {ruleCase.default && (
          <Badge variant="outline" className="bg-slate-50 text-[10px] font-bold">
            DEFAULT
          </Badge>
        )}
        {isAppend && (
          <Badge variant="outline" className="bg-emerald-50 text-[10px] font-bold text-emerald-700">
            APPEND — READS NOTHING
          </Badge>
        )}
        {!isAppend && (
          <span className="text-[11px] text-slate-500">
            {conditions.length} condition{conditions.length === 1 ? "" : "s"}
          </span>
        )}
        {errors.length > 0 && (
          <Badge variant="outline" className="bg-red-50 text-[10px] font-bold text-red-700">
            {errors.length} problem{errors.length === 1 ? "" : "s"}
          </Badge>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 text-slate-400 hover:text-red-600"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove case ${ruleCase.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {!collapsed && (
        <div className="space-y-4 border-t border-slate-100 p-4">
          {caseErrors.map((message, i) => (
            <p key={i} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {message}
            </p>
          ))}

          {/* -- when this case applies -- */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Applies when
            </span>
            {ruleCase.default ? (
              <span className="text-xs text-slate-500">
                nothing else matched — this is the fallback, and it is considered last
                whatever its position in the list
              </span>
            ) : (
              /* A switch tests the ARRIVING record, so `mode="record"` swaps the
                 table picker for the job's mapped fields — the executor passes
                 the record as both sides for exactly this. */
              <ExpressionEditor
                expression={whenGroup}
                errorFor={() => undefined}
                mode="record"
                targetTable={ruleCase.target_table}
                schema={schema}
                disabled={disabled}
                totalClauses={whenUids.length}
                onChangeClause={(uid, next) => setWhen(replaceClause(whenGroup, uid, next))}
                onRemoveClause={(uid) => {
                  const next = removeClause(whenGroup, uid);
                  if (next) setWhen(next);
                }}
                onAddClause={(groupUid) =>
                  setWhen(addToGroup(whenGroup, groupUid, clauseLeaf(blankRecordClause(schema))))
                }
                onAddGroup={(groupUid) =>
                  setWhen(addToGroup(whenGroup, groupUid, blankGroup("or", schema)))
                }
                onSetOp={(groupUid, op) => setWhen(setGroupOp(whenGroup, groupUid, op))}
              />
            )}
          </div>

          {/* -- which table, and funnel vs append -- */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Against
            </span>
            <Input
              className="h-9 w-[220px] font-mono text-xs"
              value={ruleCase.target_table}
              placeholder="Target table"
              disabled={disabled}
              onChange={(e) => onChange({ ...ruleCase, target_table: e.target.value })}
            />
            <Select
              value={isAppend ? "append" : "funnel"}
              onValueChange={(m) => setMode(m as "funnel" | "append")}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 w-[230px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="funnel" className="text-xs">
                  Narrow with conditions
                </SelectItem>
                <SelectItem value="append" className="text-xs">
                  Always write — don&apos;t look
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isAppend ? (
            <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Every record matching this case is written as new, with no lookup. This case
              reads no table at all, so it costs nothing.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {/* Conditions run in order, each narrowing what the next one
                    sees, so the sequence is part of the meaning — not just
                    presentation. Reordered by uid rather than by object, so a
                    mid-drag edit cannot change identity underneath the drag. */}
                <Reorder.Group
                  as="div"
                  axis="y"
                  values={conditions.map((c) => c._uid)}
                  onReorder={(uids) =>
                    onChange({
                      ...ruleCase,
                      conditions: reorderByUid(conditions, uids as string[]),
                    })
                  }
                  className="space-y-2"
                >
                  {conditions.map((condition, i) => (
                    <ConditionRow
                      key={condition._uid}
                      condition={condition}
                      index={i}
                      targetTable={ruleCase.target_table}
                      schema={schema}
                      errors={conditionErrors.get(i) ?? []}
                      disabled={disabled}
                      onChange={(next) => {
                        const copy = [...conditions];
                        copy[i] = next;
                        onChange({ ...ruleCase, conditions: copy });
                      }}
                      onRemove={() =>
                        onChange({
                          ...ruleCase,
                          conditions: conditions.filter((_, j) => j !== i),
                        })
                      }
                    />
                  ))}
                </Reorder.Group>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      ...ruleCase,
                      conditions: [...conditions, blankCondition(schema)],
                    })
                  }
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add condition
                </Button>

                {conditions.length === 0 && (
                  <p className="text-xs text-amber-700">
                    With no conditions every row in the table survives, so every record
                    would be ambiguous. Add one, or switch this case to “Always write”.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Finally — whatever survived every condition
                </p>
                <OutcomeSlots
                  outcomes={ruleCase.outcomes ?? blankFinalOutcomes()}
                  schema={schema}
                  disabled={disabled}
                  isFinal
                  onChange={(outcomes) => onChange({ ...ruleCase, outcomes })}
                />
              </div>
            </>
          )}
        </div>
      )}
    </Reorder.Item>
  );
}

function ordinal(n: number): string {
  const suffix = ["th", "st", "nd", "rd"][(n % 100 - 20) % 10] ?? ["th", "st", "nd", "rd"][n % 100] ?? "th";
  return `${n}${suffix}`;
}

export function blankCase(schema: RuleSchemaResponse | undefined, isDefault: boolean): EditorCase {
  return {
    _uid: newUid("k"),
    name: isDefault ? "Everything else" : "New case",
    default: isDefault,
    ...(isDefault
      ? {}
      : { when: { op: "and" as const, args: [clauseLeaf(blankRecordClause(schema))] } }),
    target_table: "",
    conditions: [blankCondition(schema)],
    outcomes: blankFinalOutcomes(),
  };
}
