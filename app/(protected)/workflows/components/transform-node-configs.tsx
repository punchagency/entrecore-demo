"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import type { Node } from "@xyflow/react";

// ─── Shared: editable list of string tags (columns, group-by keys, etc.) ───
function TagListEditor({
  values,
  placeholder,
  onChange,
}: {
  values: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      {values.map((val, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <Input
            value={val}
            placeholder={placeholder}
            onChange={e => {
              const next = [...values];
              next[idx] = e.target.value;
              onChange(next);
            }}
            className="h-8 text-xs"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
            onClick={() => onChange(values.filter((_, i) => i !== idx))}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-[11px] gap-1 w-full border-dashed"
        onClick={() => onChange([...values, ""])}
      >
        <Plus className="h-3 w-3" /> Add
      </Button>
    </div>
  );
}

// ─── Select Columns ─────────────────────────────────────
export function SelectNodeConfig({
  config,
  onUpdate,
  onUpdateRaw,
}: {
  config: { mode?: "include" | "exclude"; columns?: string[] };
  onUpdate: (key: string, value: string) => void;
  onUpdateRaw: (key: string, value: unknown) => void;
}) {
  const mode = config?.mode || "include";
  const columns = config?.columns || [];

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[11px] text-slate-400">Mode</Label>
        <Select value={mode} onValueChange={v => onUpdate("mode", v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="include">Keep only these columns</SelectItem>
            <SelectItem value="exclude">Drop these columns</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-slate-400">Columns</Label>
        <TagListEditor
          values={columns}
          placeholder="column_name"
          onChange={next => onUpdateRaw("columns", next)}
        />
      </div>
    </div>
  );
}

// ─── Filter Rows ────────────────────────────────────────
const FILTER_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not equals" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "contains", label: "Contains" },
  { value: "is_null", label: "Is null" },
  { value: "is_not_null", label: "Is not null" },
];

export function FilterNodeConfig({
  config,
  onUpdate,
}: {
  config: { field?: string; operator?: string; value?: string };
  onUpdate: (key: string, value: string) => void;
}) {
  const operator = config?.operator || "equals";
  const needsValue = operator !== "is_null" && operator !== "is_not_null";

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[11px] text-slate-400">Field</Label>
        <Input
          placeholder="column_name"
          value={config?.field || ""}
          onChange={e => onUpdate("field", e.target.value)}
          className="h-9 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-slate-400">Operator</Label>
        <Select value={operator} onValueChange={v => onUpdate("operator", v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPERATORS.map(op => (
              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {needsValue && (
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-400">Value</Label>
          <Input
            placeholder="comparison value"
            value={config?.value || ""}
            onChange={e => onUpdate("value", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      )}
    </div>
  );
}

// ─── Join ───────────────────────────────────────────────
const JOIN_TYPES = [
  { value: "inner", label: "Inner" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "full", label: "Full outer" },
];

export function JoinNodeConfig({
  config,
  nodeId,
  allNodes,
  onUpdate,
}: {
  config: { join_with_node_id?: string; join_type?: string; left_key?: string; right_key?: string };
  nodeId: string;
  allNodes: Node[];
  onUpdate: (key: string, value: string) => void;
}) {
  const candidates = allNodes.filter(n => n.id !== nodeId);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[11px] text-slate-400">Join With</Label>
        <Select
          value={config?.join_with_node_id || ""}
          onValueChange={v => onUpdate("join_with_node_id", v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select a node" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map(n => (
              <SelectItem key={n.id} value={n.id}>
                {(n.data?.nodeLabel as string) || n.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-slate-400">Join Type</Label>
        <Select
          value={config?.join_type || "inner"}
          onValueChange={v => onUpdate("join_type", v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOIN_TYPES.map(jt => (
              <SelectItem key={jt.value} value={jt.value}>{jt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-400">Left Key</Label>
          <Input
            placeholder="id"
            value={config?.left_key || ""}
            onChange={e => onUpdate("left_key", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-400">Right Key</Label>
          <Input
            placeholder="id"
            value={config?.right_key || ""}
            onChange={e => onUpdate("right_key", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Union ──────────────────────────────────────────────
export function UnionNodeConfig({
  config,
  onUpdate,
}: {
  config: { dedupe?: string; distinct_on?: string };
  onUpdate: (key: string, value: string) => void;
}) {
  const dedupe = config?.dedupe === "true";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-slate-400">Remove duplicate rows</Label>
        <Switch
          checked={dedupe}
          onCheckedChange={checked => onUpdate("dedupe", checked ? "true" : "false")}
        />
      </div>
      {dedupe && (
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-400">Distinct on columns (comma-separated, optional)</Label>
          <Input
            placeholder="id, email"
            value={config?.distinct_on || ""}
            onChange={e => onUpdate("distinct_on", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      )}
      <p className="text-[10px] text-slate-400">
        Combines all rows from every incoming edge into a single stream.
      </p>
    </div>
  );
}

// ─── Aggregate ──────────────────────────────────────────
const AGGREGATE_FUNCTIONS = ["sum", "avg", "min", "max", "count", "count_distinct"];

type Aggregation = { field: string; function: string; alias: string };

export function AggregateNodeConfig({
  config,
  onUpdateRaw,
}: {
  config: { group_by?: string[]; aggregations?: Aggregation[] };
  onUpdateRaw: (key: string, value: unknown) => void;
}) {
  const groupBy = config?.group_by || [];
  const aggregations = config?.aggregations || [];

  const updateAggregation = (idx: number, patch: Partial<Aggregation>) => {
    const next = aggregations.map((a, i) => (i === idx ? { ...a, ...patch } : a));
    onUpdateRaw("aggregations", next);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[11px] text-slate-400">Group By</Label>
        <TagListEditor
          values={groupBy}
          placeholder="column_name"
          onChange={next => onUpdateRaw("group_by", next)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-slate-400">Aggregations</Label>
        <div className="space-y-2">
          {aggregations.map((agg, idx) => (
            <div key={idx} className="p-2 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="field"
                  value={agg.field || ""}
                  onChange={e => updateAggregation(idx, { field: e.target.value })}
                  className="h-8 text-xs"
                />
                <Select
                  value={agg.function || "sum"}
                  onValueChange={v => updateAggregation(idx, { function: v })}
                >
                  <SelectTrigger className="h-8 text-xs w-28 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGGREGATE_FUNCTIONS.map(fn => (
                      <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  onClick={() => onUpdateRaw("aggregations", aggregations.filter((_, i) => i !== idx))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input
                placeholder="alias (output column name)"
                value={agg.alias || ""}
                onChange={e => updateAggregation(idx, { alias: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1 w-full border-dashed"
            onClick={() => onUpdateRaw("aggregations", [...aggregations, { field: "", function: "sum", alias: "" }])}
          >
            <Plus className="h-3 w-3" /> Add Aggregation
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Calculated Field ───────────────────────────────────
type CalculatedField = { name: string; expression: string };

export function CalculatedFieldNodeConfig({
  config,
  onUpdateRaw,
}: {
  config: { fields?: CalculatedField[] };
  onUpdateRaw: (key: string, value: unknown) => void;
}) {
  const fields = config?.fields || [];

  const updateField = (idx: number, patch: Partial<CalculatedField>) => {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    onUpdateRaw("fields", next);
  };

  return (
    <div className="space-y-2">
      {fields.map((f, idx) => (
        <div key={idx} className="p-2 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Input
              placeholder="new_column_name"
              value={f.name || ""}
              onChange={e => updateField(idx, { name: e.target.value })}
              className="h-8 text-xs font-mono"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
              onClick={() => onUpdateRaw("fields", fields.filter((_, i) => i !== idx))}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input
            placeholder="e.g. price * quantity"
            value={f.expression || ""}
            onChange={e => updateField(idx, { expression: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-[11px] gap-1 w-full border-dashed"
        onClick={() => onUpdateRaw("fields", [...fields, { name: "", expression: "" }])}
      >
        <Plus className="h-3 w-3" /> Add Calculated Field
      </Button>
    </div>
  );
}
