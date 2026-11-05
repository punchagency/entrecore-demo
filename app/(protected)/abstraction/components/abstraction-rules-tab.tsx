"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  GripVertical,
  Info,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Route,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  RoutingRuleConditionBuilder,
  describeConditions,
  emptyLeafCondition,
  pruneConditions,
  countLeafConditions,
} from "@/app/(protected)/drat/components/routing-rule-condition-builder";
import type { RoutingRuleCondition } from "@/app/(protected)/drat/hooks/use-routing-rules";
import { isConditionGroup } from "@/app/(protected)/drat/services/routing-rules-api";
import { useKnownDocumentTypes } from "@/app/(protected)/drat/hooks/use-known-document-types";
import type { AbstractionRule } from "../services/abstraction-api";
import {
  useAbstractionDestinations,
  useAbstractionPipelines,
  useAbstractionRules,
  useCreateAbstractionRule,
  useDeleteAbstractionRule,
  useReorderAbstractionRules,
  useUpdateAbstractionRule,
} from "../hooks/use-abstraction";
import { QueryErrorState } from "@/components/query-error-state";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RuleFormState {
  id: string | null;
  rule_id: string;
  name: string;
  description: string;
  match_mode: "all" | "any";
  conditions: RoutingRuleCondition[];
  pipeline_id: string;
  is_active: boolean;
  isCatchAll: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeEmptyForm = (pipelineId = ""): RuleFormState => ({
  id: null,
  rule_id: "",
  name: "",
  description: "",
  match_mode: "all",
  conditions: [emptyLeafCondition()],
  pipeline_id: pipelineId,
  is_active: true,
  isCatchAll: false,
});

const ruleToForm = (rule: AbstractionRule): RuleFormState => {
  const hasConds = Boolean(rule.conditions && rule.conditions.length > 0);
  return {
    id: rule.id,
    rule_id: rule.rule_id,
    name: rule.name ?? "",
    description: rule.description ?? "",
    match_mode: rule.match_mode ?? "any",
    conditions: hasConds ? rule.conditions! : [emptyLeafCondition()],
    pipeline_id: rule.pipeline_id,
    is_active: rule.is_active ?? true,
    isCatchAll: !hasConds,
  };
};

const slugify = (value: string) => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `abs-${slug}` : "";
};

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ onCreateRule }: { onCreateRule: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="rounded-full bg-violet-50 p-4">
        <Route className="h-8 w-8 text-violet-400" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-slate-800">No abstraction routing rules yet</p>
        <p className="text-sm text-slate-500 max-w-sm">
          Rules decide which pipeline processes each incoming document. The last rule is
          always the catch-all default — documents that match nothing are not abstracted.
        </p>
      </div>
      <Button
        onClick={onCreateRule}
        className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create first rule
      </Button>
    </div>
  );
}

// ─── RuleRow ──────────────────────────────────────────────────────────────────

interface RuleRowProps {
  rule: AbstractionRule;
  pipelineName: string;
  dragIndex: number | null;
  overIndex: number | null;
  index: number;
  reorderPending: boolean;
  onDragStart: (index: number, e: React.DragEvent) => void;
  onDragOver: (index: number, e: React.DragEvent) => void;
  onDragLeave: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  onEdit: (rule: AbstractionRule) => void;
  onDelete: (rule: AbstractionRule) => void;
}

function RuleRow({
  rule,
  pipelineName,
  dragIndex,
  overIndex,
  index,
  reorderPending,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onEdit,
  onDelete,
}: RuleRowProps) {
  const isCatchAll = !rule.conditions || rule.conditions.length === 0;
  const condCount = countLeafConditions(rule.conditions ?? []);
  const hasGroups = (rule.conditions ?? []).some(isConditionGroup);

  const rowClass = [
    "group flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition-all",
    dragIndex === index ? "opacity-40" : "",
    overIndex === index && dragIndex !== index
      ? "border-violet-300 ring-2 ring-violet-200 bg-violet-50/40"
      : "border-slate-200 hover:border-slate-300",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      draggable={!reorderPending}
      onDragStart={(e) => onDragStart(index, e)}
      onDragOver={(e) => onDragOver(index, e)}
      onDragLeave={() => onDragLeave(index)}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
      className={rowClass}
    >
      <button
        type="button"
        disabled={reorderPending}
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-500 p-1 rounded-md touch-none shrink-0"
        aria-label={`Drag to reorder ${rule.rule_id}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="text-xs font-bold text-slate-400 w-5 shrink-0 tabular-nums">
        {(rule.priority ?? index) + 1}
      </span>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm text-slate-800">{rule.rule_id}</span>
          {rule.name && <span className="text-xs text-slate-500">· {rule.name}</span>}
          {!rule.is_active && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-slate-50 text-slate-400 border-slate-200"
            >
              Inactive
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isCatchAll ? (
            <Badge
              variant="outline"
              className="bg-amber-50/60 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1"
            >
              <ShieldOff className="h-2.5 w-2.5" />
              Catch-all — always matches
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-violet-50/50 text-violet-700 border-violet-100 text-[10px] px-1.5 py-0.5 rounded-md"
            >
              {rule.match_mode === "all" ? "ALL" : "ANY"} · {condCount} condition
              {condCount !== 1 ? "s" : ""}
              {hasGroups ? " · nested" : ""}
            </Badge>
          )}

          <Badge
            variant="outline"
            className="bg-violet-50/80 text-violet-700 border-violet-100 text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1 max-w-[200px]"
          >
            <Route className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{pipelineName}</span>
          </Badge>

          {!isCatchAll && rule.conditions && rule.conditions.length > 0 && (
            <span className="font-mono text-[10px] text-slate-400 truncate max-w-[260px]">
              {describeConditions(rule.conditions, rule.match_mode)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(rule)}
          aria-label={`Edit ${rule.rule_id}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
          onClick={() => onDelete(rule)}
          aria-label={`Delete ${rule.rule_id}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── AbstractionRulesTab ──────────────────────────────────────────────────────

export function AbstractionRulesTab() {
  const [form, setForm] = useState<RuleFormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AbstractionRule | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const knownDocumentTypesQuery = useKnownDocumentTypes();
  const knownDocumentTypes = knownDocumentTypesQuery.data ?? [];

  const rulesQuery = useAbstractionRules();
  const pipelinesQuery = useAbstractionPipelines();
  const destinationsQuery = useAbstractionDestinations();

  const rules = useMemo(
    () =>
      [...(rulesQuery.data ?? [])].sort(
        (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
      ),
    [rulesQuery.data]
  );

  const pipelines = useMemo(() => pipelinesQuery.data ?? [], [pipelinesQuery.data]);

  const pipelineById = useMemo(
    () => new Map(pipelines.map((p) => [p.id, p])),
    [pipelines]
  );

  const destinations = useMemo(() => destinationsQuery.data ?? [], [destinationsQuery.data]);
  const destinationsError = destinationsQuery.isError;
  const noDestinations =
    !destinationsQuery.isLoading && !destinationsError && destinations.length === 0;

  const createRule = useCreateAbstractionRule();
  const updateRule = useUpdateAbstractionRule();
  const deleteRule = useDeleteAbstractionRule();
  const reorderRules = useReorderAbstractionRules();

  const isMutating =
    createRule.isPending ||
    updateRule.isPending ||
    deleteRule.isPending ||
    reorderRules.isPending;

  // ── Form ──────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(makeEmptyForm());
    setNameTouched(false);
  };

  const openEdit = (rule: AbstractionRule) => {
    setForm(ruleToForm(rule));
    setNameTouched(true);
  };

  const closeForm = () => setForm(null);

  function setField<K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  const handleNameChange = (value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, name: value };
      if (!prev.id && !nameTouched) {
        next.rule_id = slugify(value);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!form) return;

    const ruleId = form.rule_id.trim();
    if (!ruleId) {
      toast.error("Rule ID is required.");
      return;
    }
    if (!form.pipeline_id) {
      toast.error("Select the pipeline this rule routes documents into.");
      return;
    }
    if (noDestinations) {
      toast.error(
        "Saving is blocked: no abstraction-eligible destinations exist. A destination must point at an integration job whose source type is OCR document or connector, and a connector job must name the staging table it reads."
      );
      return;
    }
    if (destinationsError) {
      showApiErrorToast(destinationsQuery.error, "Could not verify abstraction destinations", {
        onRetry: () => destinationsQuery.refetch(),
      });
      return;
    }

    const conditions = form.isCatchAll ? [] : pruneConditions(form.conditions);

    const payload = {
      rule_id: ruleId,
      ...(form.name.trim() ? { name: form.name.trim() } : {}),
      match_mode: form.match_mode,
      conditions,
      pipeline_id: form.pipeline_id,
      is_active: form.is_active,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    };

    if (form.id) {
      updateRule.mutate(
        { id: form.id, payload },
        {
          onSuccess: () => {
            toast.success("Rule updated");
            closeForm();
          },
          onError: (err) => showApiErrorToast(err, "Could not update the rule."),
        }
      );
    } else {
      createRule.mutate(payload, {
        onSuccess: () => {
          toast.success("Rule created");
          closeForm();
        },
        onError: (err) => showApiErrorToast(err, "Could not create the rule."),
      });
    }
  };

  // ── Drag-and-drop ─────────────────────────────────────────────────────────

  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIndex(index);
  };

  const handleDragLeave = (index: number) => {
    setOverIndex((current) => (current === index ? null : current));
  };

  const handleDrop = (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const reordered = [...rules];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setDragIndex(null);
    setOverIndex(null);
    reorderRules.mutate(
      reordered.map((r) => r.id),
      {
        onSuccess: () => toast.success("Rule order saved"),
        onError: (err) => showApiErrorToast(err, "Could not reorder rules."),
      }
    );
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = (rule: AbstractionRule) => setDeleteTarget(rule);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteRule.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Rule deleted");
        setDeleteTarget(null);
      },
      onError: (err) => {
        showApiErrorToast(err, "Could not delete the rule.");
        setDeleteTarget(null);
      },
    });
  };

  // ── Loading / error ───────────────────────────────────────────────────────

  const isLoading = rulesQuery.isLoading || pipelinesQuery.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (rulesQuery.isError) {
    return (
      <QueryErrorState
        variant="inline"
        className="m-6"
        error={rulesQuery.error}
        title="Couldn't load abstraction rules"
        onRetry={() => rulesQuery.refetch()}
        isRetrying={rulesQuery.isFetching}
      />
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Destination eligibility banner */}
        {destinationsError ? (
          <QueryErrorState
            variant="inline"
            error={destinationsQuery.error}
            title="Couldn't load integration destinations. Saving is blocked until they load."
            onRetry={() => destinationsQuery.refetch()}
            isRetrying={destinationsQuery.isFetching}
          />
        ) : noDestinations ? (
          <div className="flex items-start gap-3 rounded-2xl px-4 py-3 text-sm bg-amber-50 text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              No abstraction-eligible destinations found. A destination must point at an integration job whose source type is OCR document or connector, and a connector job must name the staging table it reads. Saving is blocked until at least one exists.
            </span>
          </div>
        ) : null}

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Abstraction Routing Rules</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Rules are evaluated top-to-bottom. First match wins. A rule without conditions
              is a catch-all.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={() => rulesQuery.refetch()}
              disabled={rulesQuery.isFetching}
              aria-label="Refresh rules"
            >
              <RefreshCw
                className={["h-4 w-4", rulesQuery.isFetching ? "animate-spin" : ""].join(" ")}
              />
            </Button>
            <Button
              onClick={openCreate}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New rule
            </Button>
          </div>
        </div>

        {/* Rules list */}
        {rules.length === 0 ? (
          <EmptyState onCreateRule={openCreate} />
        ) : (
          <div className="space-y-2">
            {rules.map((rule, index) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                pipelineName={pipelineById.get(rule.pipeline_id)?.name ?? "Unknown pipeline"}
                dragIndex={dragIndex}
                overIndex={overIndex}
                index={index}
                reorderPending={reorderRules.isPending}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
            <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500 border border-slate-100">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
              <span>
                Documents that match no rule are <strong>not abstracted</strong> (implicit
                catch-all). Add a rule without conditions to route unmatched documents
                explicitly.
              </span>
            </div>
          </div>
        )}

        {/* Pipelines reference card */}
        {pipelines.length > 0 && (
          <Card className="border border-slate-100 bg-slate-50/60 rounded-2xl shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Available pipelines
              </p>
              <div className="flex flex-wrap gap-2">
                {pipelines.map((pipeline) => (
                  <Badge
                    key={pipeline.id}
                    variant="outline"
                    className="text-xs bg-white border-slate-200 text-slate-700 rounded-lg"
                  >
                    {pipeline.name}
                    {pipeline.is_active === false && (
                      <span className="ml-1 text-slate-400">(inactive)</span>
                    )}
                  </Badge>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Pipelines are managed on the Routing tab. Rules reference them as destinations.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rule editor dialog */}
      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form?.id ? "Edit rule" : "New abstraction routing rule"}
            </DialogTitle>
            <DialogDescription>
              Rules decide which pipeline processes each document. A rule without conditions is
              a catch-all — it always matches.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="space-y-5 py-1">
              {/* Name / rule ID */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Rule name{" "}
                    <span className="text-slate-400 font-normal">(optional label)</span>
                  </Label>
                  <Input
                    value={form.name}
                    placeholder="e.g. NDA documents"
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    Rule ID
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Stable slug used in API responses and exports. Auto-generated from the
                        name if left untouched.
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    value={form.rule_id}
                    placeholder="abs-nda-documents"
                    onChange={(e) => {
                      setNameTouched(true);
                      setField("rule_id", e.target.value);
                    }}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              {/* Pipeline destination */}
              <div className="space-y-1.5">
                <Label>
                  Pipeline (destination) <span className="text-rose-500">*</span>
                </Label>
                {pipelines.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    No pipelines found. Create a pipeline on the Routing tab first.
                  </div>
                ) : (
                  <Select
                    value={form.pipeline_id}
                    onValueChange={(value) => setField("pipeline_id", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines.map((pipeline) => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                          {pipeline.is_active === false ? " (inactive)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Catch-all toggle */}
              <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
                <ShieldOff className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="font-semibold text-amber-900">
                      Catch-all (no conditions)
                    </Label>
                    <Switch
                      checked={form.isCatchAll}
                      onCheckedChange={(checked) => setField("isCatchAll", checked)}
                      aria-label="Toggle catch-all mode"
                    />
                  </div>
                  <p className="text-xs text-amber-700">
                    When enabled, this rule matches every document regardless of its content.
                    Place it last in the list to act as the default fallback.
                  </p>
                </div>
              </div>

              {/* Condition builder */}
              {!form.isCatchAll && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Conditions</p>
                  <RoutingRuleConditionBuilder
                    conditions={form.conditions}
                    matchMode={form.match_mode}
                    onMatchModeChange={(mode) => setField("match_mode", mode)}
                    onChange={(next) => setField("conditions", next)}
                    allowEntityField={true}
                    documentTypeSuggestions={knownDocumentTypes}
                  />
                </div>
              )}

              {/* Description + active */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Description{" "}
                    <span className="text-slate-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    value={form.description}
                    placeholder="What this rule is for…"
                    onChange={(e) => setField("description", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Active</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(checked) => setField("is_active", checked)}
                      id="rule-active-switch"
                    />
                    <label
                      htmlFor="rule-active-switch"
                      className="text-sm text-slate-600 cursor-pointer"
                    >
                      {form.is_active ? "Rule is active" : "Rule is disabled"}
                    </label>
                  </div>
                </div>
              </div>

              {/* Destination eligibility warning */}
              {(destinationsError || noDestinations) && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Saving is blocked:{" "}
                    {destinationsError
                      ? "could not verify abstraction destinations."
                      : "no abstraction-eligible destinations exist. Check the pipeline configuration."}
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeForm} className="rounded-xl">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isMutating ||
                Boolean(destinationsError) ||
                noDestinations ||
                !form?.pipeline_id
              }
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isMutating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {form?.id ? "Save changes" : "Create rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete rule?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.rule_id}</strong> will be permanently removed. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteRule.isPending}
              className="rounded-xl"
            >
              {deleteRule.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
