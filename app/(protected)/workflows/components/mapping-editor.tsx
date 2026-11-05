"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Pencil,
  Key,
  Link2,
  ShieldAlert,
  Fingerprint,
  X,
  Code2,
  Bot,
  UserCheck,
} from "lucide-react";
import { useIntegrationStore } from "@/app/store/integrationStore";
import type {
  ColumnMapping,
  SourceColumn,
  TargetColumn,
  TransformationType,
  DataType,
} from "../services/integration-api";

// ─── Confidence badge ───────────────────────────────────
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : pct >= 50
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-red-100 text-red-700 border-red-200";
  const icon =
    pct >= 80 ? (
      <CheckCircle2 className="h-3 w-3" />
    ) : pct >= 50 ? (
      <AlertTriangle className="h-3 w-3" />
    ) : (
      <AlertCircle className="h-3 w-3" />
    );

  return (
    <Badge
      variant="outline"
      className={`${color} text-[10px] font-bold px-1.5 py-0 gap-1 border`}
    >
      {icon} {pct}%
    </Badge>
  );
}

// ─── Target column constraint badges ────────────────────
function ConstraintBadges({ col }: { col: TargetColumn }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {col.is_primary_key && (
        <Badge
          variant="outline"
          className="bg-violet-50 text-violet-700 border-violet-200 text-[9px] px-1 py-0 gap-0.5"
        >
          <Key className="h-2.5 w-2.5" /> PK
        </Badge>
      )}
      {col.is_foreign_key && (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] px-1 py-0 gap-0.5"
        >
          <Link2 className="h-2.5 w-2.5" /> FK
        </Badge>
      )}
      {col.is_unique && (
        <Badge
          variant="outline"
          className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[9px] px-1 py-0 gap-0.5"
        >
          <Fingerprint className="h-2.5 w-2.5" /> UQ
        </Badge>
      )}
      {!col.nullable && (
        <Badge
          variant="outline"
          className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] px-1 py-0 gap-0.5"
        >
          <ShieldAlert className="h-2.5 w-2.5" /> REQ
        </Badge>
      )}
    </div>
  );
}

// ─── Single Mapping Row ─────────────────────────────────
function MappingRow({
  mapping,
  sourceColumns,
  isSelected,
  onSelect,
  onRemove,
  onChangeSource,
}: {
  mapping: ColumnMapping;
  sourceColumns: SourceColumn[];
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onChangeSource: (val: string | null) => void;
}) {
  const hasErrors = mapping.validation_issues.some(
    (i) => i.severity === "error"
  );
  const hasWarnings = mapping.validation_issues.some(
    (i) => i.severity === "warning"
  );

  return (
    <div
      id={`mapping-row-${mapping.id}`}
      onClick={onSelect}
      className={`
        group relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200
        ${
          isSelected
            ? "border-indigo-400 bg-indigo-50/30 shadow-lg shadow-indigo-100/50 ring-1 ring-indigo-200"
            : hasErrors
              ? "border-red-200 bg-red-50/20 hover:border-red-300"
              : hasWarnings
                ? "border-amber-200 bg-amber-50/10 hover:border-amber-300"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
        }
      `}
    >
      {/* Top row: badges */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence={mapping.confidence} />
          {mapping.ai_generated && !mapping.human_modified && (
            <Badge
              variant="outline"
              className="bg-violet-50 text-violet-700 border-violet-200 text-[9px] px-1.5 py-0 gap-0.5"
            >
              <Bot className="h-2.5 w-2.5" /> AI
            </Badge>
          )}
          {mapping.human_modified && (
            <Badge
              variant="outline"
              className="bg-sky-50 text-sky-700 border-sky-200 text-[9px] px-1.5 py-0 gap-0.5"
            >
              <UserCheck className="h-2.5 w-2.5" /> Modified
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Source → Transform → Target */}
      <div className="flex items-center gap-3">
        {/* Source Column Selector */}
        <div className="flex-1 min-w-0">
          <Select
            value={mapping.source_column || "__none__"}
            onValueChange={(val) => {
              onChangeSource(val === "__none__" ? null : val);
            }}
          >
            <SelectTrigger
              id={`source-select-${mapping.id}`}
              className="h-9 text-sm rounded-xl bg-white border-slate-200 shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue placeholder="Select source..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-slate-400 italic">No source</span>
              </SelectItem>
              {sourceColumns.map((col) => (
                <SelectItem key={col.name} value={col.name}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{col.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase">
                      {col.data_type}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Arrow + Transform indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
              mapping.transformation.type === "direct"
                ? "bg-slate-100 text-slate-500"
                : mapping.transformation.type === "cast"
                  ? "bg-violet-100 text-violet-700"
                  : mapping.transformation.type === "expression"
                    ? "bg-indigo-100 text-indigo-700"
                    : mapping.transformation.type === "lookup"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
            }`}
          >
            <Code2 className="h-3 w-3" />
            {mapping.transformation.type}
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300" />
        </div>

        {/* Target Column (fixed) */}
        <div className="flex-1 min-w-0">
          <div className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 shadow-sm">
            <span className="font-mono text-sm text-slate-800 truncate">
              {mapping.target_column}
            </span>
          </div>
        </div>
      </div>

      {/* Transformation expression */}
      {mapping.transformation.expression && (
        <div className="mt-2 px-3 py-1.5 bg-slate-900/5 rounded-lg border border-slate-200/60">
          <code className="text-[11px] text-indigo-700 font-mono">
            {mapping.transformation.expression}
          </code>
        </div>
      )}

      {/* Validation issues */}
      {mapping.validation_issues.length > 0 && (
        <div className="mt-2 space-y-1">
          {mapping.validation_issues.map((issue, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg ${
                issue.severity === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {issue.severity === "error" ? (
                <AlertCircle className="h-3 w-3 shrink-0" />
              ) : (
                <AlertTriangle className="h-3 w-3 shrink-0" />
              )}
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Transformation Editor (sidebar) ────────────────────
function TransformationEditor({
  mapping,
  onClose,
}: {
  mapping: ColumnMapping;
  onClose: () => void;
}) {
  const updateTransformation = useIntegrationStore(
    (s) => s.updateMappingTransformation
  );
  const [type, setType] = useState<TransformationType>(
    mapping.transformation.type
  );
  const [expression, setExpression] = useState(
    mapping.transformation.expression || ""
  );
  const [castTo, setCastTo] = useState<DataType>(
    mapping.transformation.cast_to || "string"
  );

  const handleApply = () => {
    updateTransformation(mapping.id, {
      type,
      expression: type === "expression" || type === "cast" ? expression : undefined,
      cast_to: type === "cast" ? castTo : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Pencil className="h-4 w-4 text-indigo-500" />
          Edit Transformation
        </h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase text-slate-500">
            Mapping
          </Label>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
              {mapping.source_column || "—"}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono bg-indigo-50 px-2 py-0.5 rounded text-indigo-700">
              {mapping.target_column}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase text-slate-500">
            Type
          </Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as TransformationType)}
          >
            <SelectTrigger className="h-9 text-sm rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="direct">Direct Copy</SelectItem>
              <SelectItem value="cast">Type Cast</SelectItem>
              <SelectItem value="expression">Expression</SelectItem>
              <SelectItem value="constant">Constant Value</SelectItem>
              <SelectItem value="lookup">Lookup</SelectItem>
              <SelectItem value="derive">Derived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {type === "cast" && (
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase text-slate-500">
              Cast To
            </Label>
            <Select
              value={castTo}
              onValueChange={(v) => setCastTo(v as DataType)}
            >
              <SelectTrigger className="h-9 text-sm rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "string",
                  "integer",
                  "float",
                  "boolean",
                  "date",
                  "datetime",
                  "decimal",
                  "uuid",
                  "json",
                  "text",
                ].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {(type === "expression" || type === "cast") && (
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase text-slate-500">
              Expression
            </Label>
            <Input
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="e.g. CAST(col AS INTEGER)"
              className="h-9 text-sm font-mono rounded-xl"
            />
          </div>
        )}

        <Button
          onClick={handleApply}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-200 h-10"
        >
          Apply Transformation
        </Button>
      </div>
    </div>
  );
}

// ─── Main Mapping Editor ────────────────────────────────
export function MappingEditor() {
  const {
    mappings,
    sourceColumns,
    targetColumns,
    selectedMappingId,
    setSelectedMapping,
    updateMappingSource,
    addMapping,
    removeMapping,
    getUnmappedTargetColumns,
    getValidationSummary,
  } = useIntegrationStore();

  const [showAddMenu, setShowAddMenu] = useState(false);
  const unmappedTargets = getUnmappedTargetColumns();
  const validation = getValidationSummary();
  const selectedMapping = mappings.find((m) => m.id === selectedMappingId);

  return (
    <div className="flex gap-6 h-full">
      {/* Main mapping list */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
        {/* Validation Summary Bar */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">
              {mappings.length} mappings configured
            </p>
            <p className="text-[11px] text-slate-500">
              {mappings.filter((m) => m.ai_generated && !m.human_modified).length}{" "}
              AI-generated •{" "}
              {mappings.filter((m) => m.human_modified).length} modified •{" "}
              {mappings.filter((m) => !m.ai_generated).length} manual
            </p>
          </div>
          <div className="flex items-center gap-2">
            {validation.errors > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs font-bold gap-1">
                <AlertCircle className="h-3 w-3" /> {validation.errors}
              </Badge>
            )}
            {validation.warnings > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs font-bold gap-1">
                <AlertTriangle className="h-3 w-3" /> {validation.warnings}
              </Badge>
            )}
            {validation.errors === 0 && validation.warnings === 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-bold gap-1">
                <CheckCircle2 className="h-3 w-3" /> Valid
              </Badge>
            )}
          </div>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="flex-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Source Column
          </div>
          <div className="w-24 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Transform
          </div>
          <div className="flex-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Target Column
          </div>
        </div>

        {/* Mappings */}
        <div className="space-y-3">
          {mappings.map((mapping) => (
            <MappingRow
              key={mapping.id}
              mapping={mapping}
              sourceColumns={sourceColumns}
              isSelected={mapping.id === selectedMappingId}
              onSelect={() =>
                setSelectedMapping(
                  mapping.id === selectedMappingId ? null : mapping.id
                )
              }
              onRemove={() => removeMapping(mapping.id)}
              onChangeSource={(val) => updateMappingSource(mapping.id, val)}
            />
          ))}
        </div>

        {/* Unmapped Required Target Fields */}
        {unmappedTargets.filter((c) => !c.nullable).length > 0 && (
          <Card className="border-2 border-dashed border-red-200 bg-red-50/30 rounded-2xl shadow-none">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-bold text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Unmapped Required Fields
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {unmappedTargets
                  .filter((c) => !c.nullable)
                  .map((col) => (
                    <Button
                      key={col.name}
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-700 hover:bg-red-100 rounded-lg text-xs font-mono gap-1.5 h-8"
                      onClick={() => addMapping(col.name)}
                    >
                      <Plus className="h-3 w-3" />
                      {col.name}
                      <ConstraintBadges col={col} />
                    </Button>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Mapping Button */}
        {unmappedTargets.length > 0 && (
          <div className="relative">
            <Button
              variant="outline"
              className="w-full border-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 rounded-2xl h-12 transition-all"
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping ({unmappedTargets.length} unmapped targets)
            </Button>

            {showAddMenu && (
              <div className="absolute z-20 top-14 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-1 max-h-60 overflow-y-auto">
                {unmappedTargets.map((col) => (
                  <button
                    key={col.name}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-between text-sm"
                    onClick={() => {
                      addMapping(col.name);
                      setShowAddMenu(false);
                    }}
                  >
                    <span className="font-mono text-slate-700">{col.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 uppercase">
                        {col.data_type}
                      </span>
                      <ConstraintBadges col={col} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right sidebar: selected mapping editor */}
      {selectedMapping && (
        <div className="w-80 shrink-0 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 overflow-y-auto">
          <TransformationEditor
            mapping={selectedMapping}
            onClose={() => setSelectedMapping(null)}
          />
        </div>
      )}
    </div>
  );
}
