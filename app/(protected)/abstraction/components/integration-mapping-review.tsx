"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  CheckCircle2,
  XCircle,
  Pencil,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Sparkles,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type MappingReviewStatus = "pending" | "approved" | "corrected" | "rejected";

export interface MappingReviewItem {
  id: string;
  sourceColumn: string;
  targetColumn: string;
  /** Sample value from the staged source table */
  sourceValue?: string;
  /** Transformed/preview value for the target */
  transformedValue?: string;
  /** Transformation rule or formula applied */
  transformation?: string;
  /** Data type cast e.g. "STRING → DATE" */
  typeCast?: string;
  matchConfidence: "auto" | "review_suggested" | "unmatched";
  matchScore?: number;
  reviewStatus: MappingReviewStatus;
  reviewNote?: string;
  /** Corrected target value set by user */
  correctedValue?: string;
  /** Whether this field is required in the target schema */
  isRequired?: boolean;
  /** Whether source and target types match */
  hasTypeMismatch?: boolean;
  /** Whether this column has a constraint violation */
  hasConstraintViolation?: boolean;
  constraintNote?: string;
  /** Null handling rule */
  nullHandling?: "reject_row" | "use_default" | "skip" | "quarantine";
  defaultValue?: string;
}

type FilterState = "all" | MappingReviewStatus | MappingReviewItem["matchConfidence"];

interface IntegrationMappingReviewProps {
  items: MappingReviewItem[];
  isReadOnly?: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, note?: string) => void;
  onCorrect: (id: string, correctedValue: string, note?: string) => void;
  onUndo: (id: string) => void;
  onApproveAll: () => void;
  onExceptionRuleChange?: (id: string, rule: MappingReviewItem["nullHandling"], defaultValue?: string) => void;
  /** Scroll/highlight a mapping when drilling in from exceptions */
  highlightMappingId?: string | null;
  /** Show toggle to filter to failed validations only */
  showFailedOnlyToggle?: boolean;
}

function isFailedValidation(item: MappingReviewItem): boolean {
  return (
    item.reviewStatus === "rejected" ||
    item.hasTypeMismatch === true ||
    item.hasConstraintViolation === true ||
    item.matchConfidence === "unmatched"
  );
}

const CONFIDENCE_CONFIG = {
  auto: { label: "High confidence", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  review_suggested: { label: "Needs review", className: "bg-amber-50 text-amber-700 border-amber-200" },
  unmatched: { label: "Unmatched", className: "bg-slate-50 text-slate-500 border-slate-200" },
};

const REVIEW_STATUS_CONFIG = {
  pending: { label: "Pending", className: "bg-slate-100 text-slate-600 border-slate-200", icon: null },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  corrected: { label: "Corrected", className: "bg-blue-100 text-blue-700 border-blue-200", icon: Pencil },
  rejected: { label: "Rejected", className: "bg-rose-100 text-rose-700 border-rose-200", icon: XCircle },
};

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-slate-500">{pct}%</span>
    </div>
  );
}

function MappingReviewRow({
  item,
  isReadOnly,
  isHighlighted,
  onApprove,
  onReject,
  onCorrect,
  onUndo,
  onExceptionRuleChange,
}: {
  item: MappingReviewItem;
  isReadOnly?: boolean;
  isHighlighted?: boolean;
} & Pick<IntegrationMappingReviewProps, "onApprove" | "onReject" | "onCorrect" | "onUndo" | "onExceptionRuleChange">) {
  const [expanded, setExpanded] = useState(isHighlighted ?? false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.correctedValue ?? item.transformedValue ?? "");
  const [editNote, setEditNote] = useState(item.reviewNote ?? "");
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const reviewCfg = REVIEW_STATUS_CONFIG[item.reviewStatus];
  const confidenceCfg = CONFIDENCE_CONFIG[item.matchConfidence];
  const StatusIcon = reviewCfg.icon;

  const handleCorrect = useCallback(() => {
    onCorrect(item.id, editValue, editNote || undefined);
    setIsEditing(false);
    toast.success(`Mapping "${item.sourceColumn} → ${item.targetColumn}" corrected`);
  }, [editValue, editNote, item.id, item.sourceColumn, item.targetColumn, onCorrect]);

  const handleReject = useCallback(() => {
    onReject(item.id, rejectNote || undefined);
    setShowRejectInput(false);
    setRejectNote("");
    toast.info(`Mapping "${item.sourceColumn} → ${item.targetColumn}" rejected`);
  }, [item.id, item.sourceColumn, item.targetColumn, onReject, rejectNote]);

  const isDone = item.reviewStatus !== "pending";
  const hasIssue = isFailedValidation(item);

  return (
    <div
      id={`mapping-review-${item.id}`}
      className={cn(
        "rounded-xl border transition-all",
        isHighlighted && "ring-2 ring-indigo-400 ring-offset-1",
        item.reviewStatus === "approved" && "border-emerald-200 bg-emerald-50/30",
        item.reviewStatus === "corrected" && "border-blue-200 bg-blue-50/20",
        item.reviewStatus === "rejected" && "border-rose-300 bg-rose-50/40",
        item.reviewStatus === "pending" && hasIssue && "border-rose-200 bg-rose-50/20",
        item.reviewStatus === "pending" && !hasIssue && "border-slate-200 bg-white"
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Status indicator dot */}
        <div
          className={cn(
            "h-2 w-2 rounded-full flex-shrink-0",
            item.reviewStatus === "approved" && "bg-emerald-500",
            item.reviewStatus === "corrected" && "bg-blue-500",
            item.reviewStatus === "rejected" && "bg-rose-400",
            item.reviewStatus === "pending" && item.matchConfidence === "auto" && "bg-emerald-300",
            item.reviewStatus === "pending" && item.matchConfidence === "review_suggested" && "bg-amber-400",
            item.reviewStatus === "pending" && item.matchConfidence === "unmatched" && "bg-slate-300"
          )}
        />

        {/* Source → Target */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-slate-700 truncate max-w-[140px]">
              {item.sourceColumn}
            </span>
            <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
            <span className="font-mono text-xs font-semibold text-emerald-700 truncate max-w-[140px]">
              {item.targetColumn}
            </span>
            {item.isRequired && (
              <span className="text-rose-500 text-xs font-bold" title="Required field">❗</span>
            )}
            {item.hasTypeMismatch && (
              <span className="text-amber-500 text-xs font-bold" title="Type mismatch">⚠️</span>
            )}
          </div>

          {/* Sample value row */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {item.sourceValue && (
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]" title={item.sourceValue}>
                "{item.sourceValue}"
              </span>
            )}
            {item.transformation && (
              <>
                <ArrowRight className="h-2.5 w-2.5 text-slate-300 flex-shrink-0" />
                <span className="text-[10px] text-indigo-500 italic truncate max-w-[100px]">
                  {item.transformation}
                </span>
              </>
            )}
            {(item.correctedValue ?? item.transformedValue) && (
              <>
                <ArrowRight className="h-2.5 w-2.5 text-slate-300 flex-shrink-0" />
                <span
                  className={cn(
                    "text-[10px] font-mono truncate max-w-[120px]",
                    item.correctedValue ? "text-blue-600 font-semibold" : "text-slate-500"
                  )}
                  title={item.correctedValue ?? item.transformedValue}
                >
                  "{item.correctedValue ?? item.transformedValue}"
                </span>
              </>
            )}
            {item.matchScore !== undefined && (
              <ConfidenceBar score={item.matchScore} />
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge variant="outline" className={cn("text-[9px] rounded-full px-1.5 py-0.5", confidenceCfg.className)}>
            {confidenceCfg.label}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-[9px] rounded-full px-1.5 py-0.5 flex items-center gap-0.5", reviewCfg.className)}
          >
            {StatusIcon && <StatusIcon className="h-2.5 w-2.5" />}
            {reviewCfg.label}
          </Badge>
        </div>

        {/* Actions */}
        {!isReadOnly && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isDone ? (
              <>
                <button
                  type="button"
                  title="Approve this mapping"
                  onClick={() => {
                    onApprove(item.id);
                    toast.success(`Approved`);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Correct value"
                  onClick={() => { setIsEditing((v) => !v); setExpanded(true); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Reject this mapping"
                  onClick={() => { setShowRejectInput((v) => !v); setExpanded(true); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                title="Undo review"
                onClick={() => onUndo(item.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-dashed border-slate-200 px-4 py-3 space-y-3 bg-slate-50/60 rounded-b-xl">
          {/* Constraint warnings */}
          {(item.hasTypeMismatch || item.hasConstraintViolation) && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                {item.hasTypeMismatch && `Type mismatch detected${item.typeCast ? ` (${item.typeCast})` : ""}. `}
                {item.hasConstraintViolation && item.constraintNote}
              </span>
            </div>
          )}

          {/* Correction editor */}
          {isEditing && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-600">Correct target value</p>
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Enter corrected value or expression…"
                className="h-8 text-xs font-mono rounded-lg"
              />
              <Input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Optional note (e.g. business rule applied)"
                className="h-8 text-xs rounded-lg"
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs rounded-lg" onClick={handleCorrect}>
                  Save correction
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs rounded-lg"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Reject input */}
          {showRejectInput && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-600">Rejection reason (optional)</p>
              <Input
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. Column not needed in target schema"
                className="h-8 text-xs rounded-lg"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs rounded-lg"
                  onClick={handleReject}
                >
                  Confirm rejection
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs rounded-lg"
                  onClick={() => setShowRejectInput(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Exception handling config */}
          {onExceptionRuleChange && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Null handling
                </p>
                <Select
                  value={item.nullHandling ?? "skip"}
                  onValueChange={(v) =>
                    onExceptionRuleChange(
                      item.id,
                      v as MappingReviewItem["nullHandling"],
                      item.defaultValue
                    )
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip (leave null)</SelectItem>
                    <SelectItem value="use_default">Use default value</SelectItem>
                    <SelectItem value="reject_row">Reject row</SelectItem>
                    <SelectItem value="quarantine">Send to quarantine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {item.nullHandling === "use_default" && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Default value
                  </p>
                  <Input
                    value={item.defaultValue ?? ""}
                    onChange={(e) =>
                      onExceptionRuleChange?.(item.id, "use_default", e.target.value)
                    }
                    placeholder="e.g. N/A, 0, false"
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* Review note display */}
          {item.reviewNote && !isEditing && (
            <p className="text-[10px] text-slate-500 italic">Note: {item.reviewNote}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function IntegrationMappingReview({
  items,
  isReadOnly = false,
  onApprove,
  onReject,
  onCorrect,
  onUndo,
  onApproveAll,
  onExceptionRuleChange,
  highlightMappingId,
  showFailedOnlyToggle = false,
}: IntegrationMappingReviewProps) {
  const [filter, setFilter] = useState<FilterState>("all");
  const [search, setSearch] = useState("");
  const [failedOnly, setFailedOnly] = useState(false);

  useEffect(() => {
    if (!highlightMappingId) return;
    const el = document.getElementById(`mapping-review-${highlightMappingId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightMappingId]);

  const stats = useMemo(() => {
    const total = items.length;
    const approved = items.filter((i) => i.reviewStatus === "approved").length;
    const corrected = items.filter((i) => i.reviewStatus === "corrected").length;
    const rejected = items.filter((i) => i.reviewStatus === "rejected").length;
    const pending = items.filter((i) => i.reviewStatus === "pending").length;
    const needsReview = items.filter(
      (i) => i.matchConfidence === "review_suggested" && i.reviewStatus === "pending"
    ).length;
    return { total, approved, corrected, rejected, pending, needsReview };
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;

    if (filter === "pending") result = result.filter((i) => i.reviewStatus === "pending");
    else if (filter === "approved") result = result.filter((i) => i.reviewStatus === "approved");
    else if (filter === "corrected") result = result.filter((i) => i.reviewStatus === "corrected");
    else if (filter === "rejected") result = result.filter((i) => i.reviewStatus === "rejected");
    else if (filter === "review_suggested")
      result = result.filter((i) => i.matchConfidence === "review_suggested");
    else if (filter === "auto")
      result = result.filter((i) => i.matchConfidence === "auto");
    else if (filter === "unmatched")
      result = result.filter((i) => i.matchConfidence === "unmatched");

    if (failedOnly) {
      result = result.filter(isFailedValidation);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.sourceColumn.toLowerCase().includes(q) ||
          i.targetColumn.toLowerCase().includes(q) ||
          i.transformation?.toLowerCase().includes(q) ||
          i.sourceValue?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, filter, search, failedOnly]);

  const failedCount = items.filter(isFailedValidation).length;

  const allReviewed = stats.pending === 0;

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-slate-700" },
          { label: "Approved", value: stats.approved, color: "text-emerald-600" },
          { label: "Corrected", value: stats.corrected, color: "text-blue-600" },
          { label: "Pending", value: stats.pending, color: stats.pending > 0 ? "text-amber-600" : "text-slate-400" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm ring-1 ring-slate-200/60">
            <CardContent className="p-3 text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Batch approve + search + filter */}
      <div className="flex flex-wrap items-center gap-2">
        {!isReadOnly && !allReviewed && (
          <Button
            size="sm"
            className="h-8 rounded-xl text-xs gap-1"
            onClick={onApproveAll}
          >
            <Sparkles className="h-3 w-3" />
            Approve all high-confidence ({items.filter((i) => i.matchConfidence === "auto" && i.reviewStatus === "pending").length})
          </Button>
        )}
        {allReviewed && (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 rounded-full text-xs gap-1 flex items-center">
            <CheckCircle2 className="h-3 w-3" />
            All mappings reviewed
          </Badge>
        )}
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search columns…"
            className="h-8 pl-8 text-xs rounded-xl"
          />
        </div>
        {showFailedOnlyToggle && failedCount > 0 && (
          <button
            type="button"
            onClick={() => setFailedOnly((v) => !v)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors",
              failedOnly
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
            )}
          >
            Failed only ({failedCount})
          </button>
        )}
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          {(
            [
              ["all", "All"],
              ["pending", `Pending (${stats.pending})`],
              ["review_suggested", `Needs review (${stats.needsReview})`],
              ["approved", "Approved"],
              ["corrected", "Corrected"],
              ["rejected", "Rejected"],
            ] as [FilterState, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors",
                filter === key
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mapping rows */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-sm text-slate-400 rounded-xl border border-dashed border-slate-200">
          No mappings match the current filter.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <MappingReviewRow
              key={item.id}
              item={item}
              isReadOnly={isReadOnly}
              isHighlighted={highlightMappingId === item.id}
              onApprove={onApprove}
              onReject={onReject}
              onCorrect={onCorrect}
              onUndo={onUndo}
              onExceptionRuleChange={onExceptionRuleChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
