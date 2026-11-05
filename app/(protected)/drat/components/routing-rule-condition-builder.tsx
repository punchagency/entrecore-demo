"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Layers, Plus, X } from "lucide-react";
import {
  MAX_CONDITION_GROUP_NESTING,
  VALUELESS_OPERATORS,
  RoutingRuleCondition,
  RoutingRuleConditionField,
  RoutingRuleConditionGroup,
  RoutingRuleConditionOperator,
  RoutingRuleGroupLogic,
  RoutingRuleLeafCondition,
  isConditionGroup,
} from "../services/routing-rules-api";
import { DratEntityCombobox } from "./drat-entity-combobox";

const FIELD_LABELS: Record<RoutingRuleConditionField, string> = {
  filename: "Filename",
  original_filename: "Original filename",
  document_type: "Document type",
  document_text: "Document text",
  extension: "File extension",
  kind: "File kind",
  source_email: "Source email",
  // Server-side aliases of "filename".
  name: "Name (same as filename)",
  suggested_filename: "Suggested filename (same as filename)",
  // Not offered for new conditions, but imported rules can use them.
  size: "File size",
  subfolder_depth: "Subfolder depth",
  date_added: "Date added",
  entity: "Client entity",
};

/**
 * Deterministic fields are offered first because they route the same way every
 * time. The AI-derived fields (document_type, document_text) come last and carry
 * a warning, since their values can vary run to run.
 */
const DETERMINISTIC_FIELDS: RoutingRuleConditionField[] = [
  "filename",
  "original_filename",
  "extension",
  "kind",
  "source_email",
];

const AI_DERIVED_FIELDS: RoutingRuleConditionField[] = ["document_type", "document_text"];

/** Fields the builder flags as AI-generated (value may vary run to run). */
const AI_DERIVED_FIELD_SET: ReadonlySet<RoutingRuleConditionField> = new Set(AI_DERIVED_FIELDS);

/**
 * The field list offered for new conditions. `entity` is only offered when the
 * caller opts in (integration routing), since Drive-filing rules scope to an
 * entity's own folder and don't match on it.
 */
const offeredFieldsFor = (allowEntityField: boolean): RoutingRuleConditionField[] => [
  ...DETERMINISTIC_FIELDS,
  ...(allowEntityField ? (["entity"] as RoutingRuleConditionField[]) : []),
  ...AI_DERIVED_FIELDS,
];

const OPERATOR_LABELS: Record<RoutingRuleConditionOperator, string> = {
  contains: "Contains",
  not_contains: "Does not contain",
  exact: "Exact match",
  regex: "Regex",
  glob: "Glob pattern",
  eq: "Equals",
  gt: "Greater than",
  gte: "At least",
  lt: "Less than",
  lte: "At most",
  before: "Before",
  after: "After",
  within_days: "Within days",
  in_list: "In client list",
  not_in_list: "Not in client list",
};

const OFFERED_OPERATORS: RoutingRuleConditionOperator[] = [
  "contains",
  "not_contains",
  "exact",
  "regex",
  "glob",
];

/**
 * Imported rules can use fields and operators the editor doesn't offer. Keep the
 * current one selectable so opening and saving such a rule can't silently
 * rewrite it to something else.
 */
const selectableOptions = <T extends string>(
  offered: T[],
  current: T,
  labels: Record<T, string>
): { value: T; label: string }[] => {
  const options = offered.map((value) => ({ value, label: labels[value] }));
  if (!offered.includes(current)) {
    options.push({ value: current, label: `${labels[current] ?? current} (from import)` });
  }
  return options;
};

/** Values can arrive as numbers (size, within_days) or be absent entirely. */
const conditionText = (value: string | number | null | undefined): string =>
  value === null || value === undefined ? "" : String(value);

const GROUP_LOGICS: { value: RoutingRuleGroupLogic; label: string; hint: string }[] = [
  { value: "and", label: "ALL of these", hint: "every condition inside must match" },
  { value: "or", label: "ANY of these", hint: "at least one condition inside must match" },
  { value: "not", label: "NONE of these", hint: "matches only when nothing inside matches" },
];

// Buckets derived from the extension by the backend's _KIND_BY_EXTENSION.
const KIND_OPTIONS = ["pdf", "word", "spreadsheet", "image", "text"];

export const emptyLeafCondition = (): RoutingRuleLeafCondition => ({
  field: "filename",
  operator: "contains",
  value: "",
});

export const emptyConditionGroup = (): RoutingRuleConditionGroup => ({
  logic: "or",
  conditions: [emptyLeafCondition()],
});

type ConditionPath = number[];

type NodeUpdater = (node: RoutingRuleCondition) => RoutingRuleCondition | null;

/** Applies `fn` to the node at `path`; returning null removes it. */
const mapAtPath = (
  nodes: RoutingRuleCondition[],
  path: ConditionPath,
  fn: NodeUpdater
): RoutingRuleCondition[] => {
  const [index, ...rest] = path;
  return (nodes ?? []).flatMap((node, i) => {
    if (i !== index) return [node];
    if (rest.length === 0) {
      const next = fn(node);
      return next ? [next] : [];
    }
    if (!isConditionGroup(node)) return [node];
    return [{ ...node, conditions: mapAtPath(node.conditions, rest, fn) }];
  });
};

/**
 * Drops leaves with no value and any group left empty by that pruning, since the
 * backend rejects a group whose conditions list is empty. Operators that take no
 * value are kept as-is, otherwise saving an imported entity rule would delete it.
 */
export const pruneConditions = (nodes: RoutingRuleCondition[]): RoutingRuleCondition[] =>
  (nodes ?? []).flatMap<RoutingRuleCondition>((node) => {
    if (!isConditionGroup(node)) {
      if (VALUELESS_OPERATORS.has(node.operator)) return [node];
      const value = conditionText(node.value).trim();
      return value ? [{ ...node, value }] : [];
    }
    const conditions = pruneConditions(node.conditions);
    return conditions.length ? [{ ...node, conditions }] : [];
  });

export const countLeafConditions = (nodes: RoutingRuleCondition[]): number =>
  (nodes ?? []).reduce(
    (total, node) =>
      total + (isConditionGroup(node) ? countLeafConditions(node.conditions) : 1),
    0
  );

const describeNode = (node: RoutingRuleCondition): string => {
  if (!isConditionGroup(node)) {
    if (VALUELESS_OPERATORS.has(node.operator)) return `${node.field} ${node.operator}`;
    return `${node.field} ${node.operator} "${conditionText(node.value)}"`;
  }
  const inner = (node.conditions ?? []).map(describeNode);
  if (node.logic === "not") return `NONE(${inner.join(", ")})`;
  return `(${inner.join(node.logic === "and" ? " AND " : " OR ")})`;
};

export const describeConditions = (
  nodes: RoutingRuleCondition[],
  matchMode: "all" | "any" | undefined
): string => (nodes ?? []).map(describeNode).join(matchMode === "all" ? " AND " : " OR ");

const isMultilineValue = (condition: RoutingRuleLeafCondition) =>
  condition.operator === "regex" ||
  condition.field === "document_text" ||
  conditionText(condition.value).length > 80;

const valueRows = (condition: RoutingRuleLeafCondition) => {
  const length = conditionText(condition.value).length;
  if (condition.operator === "regex") {
    return Math.min(14, Math.max(5, Math.ceil(length / 72) + 1));
  }
  return Math.min(8, Math.max(3, Math.ceil(length / 90) + 1));
};

const valuePlaceholder = (condition: RoutingRuleLeafCondition) => {
  if (condition.operator === "regex") return "(NDA|Confidentiality\\ Agreement)";
  if (condition.operator === "glob") return "*-executed.pdf";
  if (condition.field === "extension") return "pdf";
  if (condition.field === "source_email") return "deals@virgil.com";
  return "Board Consent";
};

interface NodeEditorProps {
  node: RoutingRuleCondition;
  path: ConditionPath;
  depth: number;
  canRemove: boolean;
  allowEntityField: boolean;
  documentTypeSuggestions: string[];
  onUpdate: (path: ConditionPath, fn: NodeUpdater) => void;
  onAddChild: (path: ConditionPath, child: RoutingRuleCondition) => void;
}

function LeafEditor({
  node,
  path,
  canRemove,
  allowEntityField,
  documentTypeSuggestions,
  onUpdate,
}: NodeEditorProps & { node: RoutingRuleLeafCondition }) {
  const setLeaf = (patch: Partial<RoutingRuleLeafCondition>) =>
    onUpdate(path, (current) => ({ ...(current as RoutingRuleLeafCondition), ...patch }));

  const fieldOptions = selectableOptions(
    offeredFieldsFor(allowEntityField),
    node.field,
    FIELD_LABELS
  );
  const operatorOptions = selectableOptions(OFFERED_OPERATORS, node.operator, OPERATOR_LABELS);
  const takesNoValue = VALUELESS_OPERATORS.has(node.operator);
  const isAiDerivedField = AI_DERIVED_FIELD_SET.has(node.field);

  return (
    <div className="space-y-3 bg-white rounded-xl p-3 border border-slate-200">
      <div className="flex flex-wrap gap-2 items-center">
        <Select
          value={node.field}
          onValueChange={(value: RoutingRuleConditionField) => setLeaf({ field: value })}
        >
          <SelectTrigger className="rounded-lg w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fieldOptions.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={node.operator}
          onValueChange={(value: RoutingRuleConditionOperator) => setLeaf({ operator: value })}
        >
          <SelectTrigger className="rounded-lg w-full sm:w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operatorOptions.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-500 sm:ml-auto"
          disabled={!canRemove}
          onClick={() => onUpdate(path, () => null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {takesNoValue ? (
        <p className="text-[11px] text-slate-500">
          This operator matches against your client list and takes no value.
        </p>
      ) : node.field === "entity" ? (
        <DratEntityCombobox
          value={conditionText(node.value)}
          onValueChange={(value) => setLeaf({ value })}
          placeholder="Select a client entity"
        />
      ) : node.field === "kind" ? (
        <Select value={conditionText(node.value)} onValueChange={(value) => setLeaf({ value })}>
          <SelectTrigger className="rounded-lg w-full sm:w-[220px]">
            <SelectValue placeholder="Select a file kind" />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {kind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : isMultilineValue(node) ? (
        <div className="space-y-1.5">
          <Label className="text-[11px] text-slate-500">
            {node.operator === "regex" ? "Regex pattern" : "Value"}
          </Label>
          <Textarea
            value={conditionText(node.value)}
            onChange={(e) => setLeaf({ value: e.target.value })}
            rows={valueRows(node)}
            spellCheck={false}
            placeholder={valuePlaceholder(node)}
            className="rounded-lg font-mono text-xs leading-relaxed min-h-[120px] resize-y bg-slate-50/60"
          />
          <p className="text-[10px] text-slate-400 text-right tabular-nums">
            {conditionText(node.value).length} characters
          </p>
        </div>
      ) : node.field === "document_type" && documentTypeSuggestions.length > 0 ? (
        <>
          <Input
            value={conditionText(node.value)}
            onChange={(e) => setLeaf({ value: e.target.value })}
            placeholder={valuePlaceholder(node)}
            list="drat-known-document-types"
            className="rounded-lg font-mono text-sm"
          />
          <datalist id="drat-known-document-types">
            {documentTypeSuggestions.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        </>
      ) : (
        <Input
          value={conditionText(node.value)}
          onChange={(e) => setLeaf({ value: e.target.value })}
          placeholder={valuePlaceholder(node)}
          className="rounded-lg font-mono text-sm"
        />
      )}

      {isAiDerivedField && (
        <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
          <span>
            AI-generated — may vary between runs; prefer filename, extension or entity for stable
            routing.
          </span>
        </div>
      )}
    </div>
  );
}

function GroupEditor({
  node,
  path,
  depth,
  canRemove,
  allowEntityField,
  documentTypeSuggestions,
  onUpdate,
  onAddChild,
}: NodeEditorProps & {
  node: RoutingRuleConditionGroup;
}) {
  const logic = GROUP_LOGICS.find((entry) => entry.value === node.logic);
  const canNestDeeper = depth + 2 <= MAX_CONDITION_GROUP_NESTING;

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
        <Select
          value={node.logic}
          onValueChange={(value: RoutingRuleGroupLogic) =>
            onUpdate(path, (current) => ({
              ...(current as RoutingRuleConditionGroup),
              logic: value,
            }))
          }
        >
          <SelectTrigger className="rounded-lg w-full sm:w-[160px] bg-white h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUP_LOGICS.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[11px] text-slate-500">{logic?.hint}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 sm:ml-auto"
          disabled={!canRemove}
          onClick={() => onUpdate(path, () => null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 border-l-2 border-indigo-200 pl-3">
        {node.conditions.map((child, index) => (
          <ConditionNodeEditor
            key={index}
            node={child}
            path={[...path, index]}
            depth={depth + 1}
            canRemove={node.conditions.length > 1}
            allowEntityField={allowEntityField}
            documentTypeSuggestions={documentTypeSuggestions}
            onUpdate={onUpdate}
            onAddChild={onAddChild}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg h-8 text-xs bg-white"
          onClick={() => onAddChild(path, emptyLeafCondition())}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Condition
        </Button>
        {canNestDeeper && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg h-8 text-xs bg-white"
            onClick={() => onAddChild(path, emptyConditionGroup())}
          >
            <Layers className="h-3.5 w-3.5 mr-1" />
            Group
          </Button>
        )}
      </div>
    </div>
  );
}

function ConditionNodeEditor(props: NodeEditorProps) {
  if (isConditionGroup(props.node)) {
    return <GroupEditor {...props} node={props.node} />;
  }
  return <LeafEditor {...props} node={props.node} />;
}

interface RoutingRuleConditionBuilderProps {
  conditions: RoutingRuleCondition[];
  matchMode: "all" | "any";
  onMatchModeChange: (mode: "all" | "any") => void;
  onChange: (next: RoutingRuleCondition[]) => void;
  /**
   * Offer the `entity` field (value picked via the entity combobox). Used by the
   * integration routing editor; Drive-filing rules leave this off.
   */
  allowEntityField?: boolean;
  /**
   * Known document-type values to suggest (as a datalist) when editing a
   * `document_type` condition. Empty falls back to a plain free-text input.
   */
  documentTypeSuggestions?: string[];
}

export function RoutingRuleConditionBuilder({
  conditions,
  matchMode,
  onMatchModeChange,
  onChange,
  allowEntityField = false,
  documentTypeSuggestions = [],
}: RoutingRuleConditionBuilderProps) {
  const handleUpdate = (path: ConditionPath, fn: NodeUpdater) =>
    onChange(mapAtPath(conditions, path, fn));

  const handleAddChild = (path: ConditionPath, child: RoutingRuleCondition) =>
    onChange(
      mapAtPath(conditions, path, (node) =>
        isConditionGroup(node) ? { ...node, conditions: [...node.conditions, child] } : node
      )
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label>Combine top-level conditions with</Label>
        <Select value={matchMode} onValueChange={onMatchModeChange}>
          <SelectTrigger className="w-[160px] rounded-xl bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Match ALL (AND)</SelectItem>
            <SelectItem value="any">Match ANY (OR)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {conditions.map((node, index) => (
          <ConditionNodeEditor
            key={index}
            node={node}
            path={[index]}
            depth={0}
            canRemove={conditions.length > 1}
            allowEntityField={allowEntityField}
            documentTypeSuggestions={documentTypeSuggestions}
            onUpdate={handleUpdate}
            onAddChild={handleAddChild}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg bg-white"
          onClick={() => onChange([...conditions, emptyLeafCondition()])}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add condition
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg bg-white"
          onClick={() => onChange([...conditions, emptyConditionGroup()])}
        >
          <Layers className="h-4 w-4 mr-1" />
          Add group
        </Button>
      </div>

      <p className="text-[11px] text-slate-500">
        Groups can nest up to {MAX_CONDITION_GROUP_NESTING} levels deep. Use a group to mix
        AND and OR in one rule — for example filename contains &quot;NDA&quot; AND (text
        mentions &quot;mutual&quot; OR &quot;bilateral&quot;).
      </p>
    </div>
  );
}
