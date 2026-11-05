"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  GitBranch,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { jobFailureMessage, showApiErrorToast } from "@/utils/api-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RoutingRuleConditionBuilder,
  describeConditions,
  emptyLeafCondition,
  pruneConditions,
} from "@/app/(protected)/drat/components/routing-rule-condition-builder";
import { RoutingRulesSortableTable } from "@/app/(protected)/drat/components/routing-rules-sortable-table";
import type {
  RoutingRule,
  RoutingRuleCondition,
} from "@/app/(protected)/drat/hooks/use-routing-rules";
import { useKnownDocumentTypes } from "@/app/(protected)/drat/hooks/use-known-document-types";
import { PipelineEditor } from "./pipeline-editor";
import type {
  AbstractionPipelineRun,
  AbstractionPipelineStepRun,
  AbstractionRule,
} from "../services/abstraction-api";
import {
  useAbstractionPipelines,
  useAbstractionRules,
  useAbstractionRuns,
  useCreateAbstractionPipeline,
  useCreateAbstractionRule,
  useDeleteAbstractionPipeline,
  useDeleteAbstractionRule,
  useImportAbstractionRules,
  useReorderAbstractionRules,
  useUpdateAbstractionRule,
} from "../hooks/use-abstraction";
import {
  exportAbstractionRoutingRules,
  parseAbstractionRoutingImport,
  toRuleImportRequest,
  type ImportValidationReport,
} from "../services/abstraction-routing-io";
import { QueryErrorState } from "@/components/query-error-state";
import { CopyableId } from "@/components/copyable-id";
import { JobFailureReason } from "@/components/job-failure-reason";

interface RuleFormState {
  /** Backend rule id when editing, null when creating. */
  id: string | null;
  rule_id: string;
  name: string;
  description: string;
  match_mode: "all" | "any";
  conditions: RoutingRuleCondition[];
  pipeline_id: string;
  priority: string;
  is_active: boolean;
}

const emptyRuleForm = (pipelineId = ""): RuleFormState => ({
  id: null,
  rule_id: "",
  name: "",
  description: "",
  match_mode: "all",
  conditions: [emptyLeafCondition()],
  pipeline_id: pipelineId,
  priority: "",
  is_active: true,
});

const ruleToForm = (rule: AbstractionRule): RuleFormState => ({
  id: rule.id,
  rule_id: rule.rule_id,
  name: rule.name ?? "",
  description: rule.description ?? "",
  match_mode: rule.match_mode ?? "any",
  conditions:
    rule.conditions && rule.conditions.length > 0 ? rule.conditions : [],
  pipeline_id: rule.pipeline_id,
  priority: rule.priority !== undefined && rule.priority !== null ? String(rule.priority) : "",
  is_active: rule.is_active ?? true,
});

const RUN_STATUS_STYLES: Record<string, string> = {
  queued: "bg-slate-100 text-slate-700 border-slate-200",
  chain_running: "bg-blue-50 text-blue-700 border-blue-200",
  chain_review: "bg-amber-50 text-amber-800 border-amber-200",
  chain_completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  aborted: "bg-rose-50 text-rose-700 border-rose-200",
};

/** Why a run stopped or failed, readable (never raw exception text), or "" when it didn't. */
function runFailureReason(run: AbstractionPipelineRun): string {
  if (run.status === "aborted") {
    return jobFailureMessage(
      { error_message: run.abort_reason },
      "This abstraction run stopped. Share the run ID with support to find the full error."
    );
  }
  const failedStep = run.step_runs.find((step) => step.status === "failed" || step.error);
  return failedStep ? jobFailureMessage(failedStep, "A step in this run failed.") : "";
}

/** The run a step dispatched: the backend logs the step's full error under this ID. */
function stepRunLogId(stepRun: AbstractionPipelineStepRun): { runId?: string; runIdLabel?: string } {
  if (stepRun.integration_run_id) return { runId: stepRun.integration_run_id, runIdLabel: "Integration run ID" };
  if (stepRun.integration_bundle_run_id) return { runId: stepRun.integration_bundle_run_id, runIdLabel: "Bundle run ID" };
  if (stepRun.workflow_run_id) return { runId: stepRun.workflow_run_id, runIdLabel: "Workflow run ID" };
  return {};
}

const runStatusStyle = (status: string): string =>
  RUN_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700 border-slate-200";

export function AbstractionRoutingSection() {
  const [form, setForm] = useState<RuleFormState | null>(null);
  const [report, setReport] = useState<ImportValidationReport | null>(null);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [runRuleFilter, setRunRuleFilter] = useState<string>("all");
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const knownDocumentTypes = useKnownDocumentTypes();

  const pipelinesQuery = useAbstractionPipelines();
  const rulesQuery = useAbstractionRules();
  const runsQuery = useAbstractionRuns();

  const createPipeline = useCreateAbstractionPipeline();
  const deletePipeline = useDeleteAbstractionPipeline();
  const createRule = useCreateAbstractionRule();
  const updateRule = useUpdateAbstractionRule();
  const deleteRule = useDeleteAbstractionRule();
  const reorderRules = useReorderAbstractionRules();
  const importRules = useImportAbstractionRules();

  const pipelines = useMemo(() => pipelinesQuery.data ?? [], [pipelinesQuery.data]);
  const rules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data]);
  const runs = useMemo(() => runsQuery.data ?? [], [runsQuery.data]);

  const pipelineById = useMemo(
    () => new Map(pipelines.map((pipeline) => [pipeline.id, pipeline])),
    [pipelines]
  );

  const pipelineIds = useMemo(() => new Set(pipelines.map((pipeline) => pipeline.id)), [pipelines]);

  const activePipeline = activePipelineId ? pipelineById.get(activePipelineId) : undefined;
  const formPipeline = form ? pipelineById.get(form.pipeline_id) : undefined;

  const displayRules = useMemo<RoutingRule[]>(
    () =>
      rules.map((rule) => ({
        id: rule.id,
        rule_id: rule.rule_id,
        pattern: "",
        target_folder: "",
        priority: rule.priority ?? 0,
        match_mode: rule.match_mode,
        conditions: rule.conditions ?? [],
        description: rule.description ?? null,
        source: rule.source ?? "abstraction",
      })),
    [rules]
  );

  const filteredRuns = useMemo(() => {
    if (runRuleFilter === "all") return runs;
    return runs.filter((run) => run.rule_id === runRuleFilter);
  }, [runs, runRuleFilter]);

  const startCreate = () => setForm(emptyRuleForm(activePipelineId ?? ""));

  const startEdit = (displayRule: RoutingRule) => {
    const existing = rules.find((rule) => rule.id === displayRule.id);
    if (existing) setForm(ruleToForm(existing));
  };

  const duplicateRule = (displayRule: RoutingRule) => {
    const existing = rules.find((rule) => rule.id === displayRule.id);
    if (!existing) return;
    createRule.mutate(
      {
        rule_id: `${existing.rule_id}-copy`,
        name: existing.name ?? undefined,
        match_mode: existing.match_mode,
        conditions: existing.conditions ?? [],
        pipeline_id: existing.pipeline_id,
        priority: existing.priority,
        is_active: existing.is_active,
        description: existing.description ?? undefined,
      },
      {
        onSuccess: () => toast.success("Rule duplicated"),
        onError: (error) => showApiErrorToast(error, "Could not duplicate the rule."),
      }
    );
  };

  const handleDeleteRule = (displayRule: RoutingRule) => {
    deleteRule.mutate(displayRule.id, {
      onSuccess: () => toast.success("Rule deleted"),
      onError: (error) => showApiErrorToast(error, "Could not delete the rule."),
    });
  };

  const handleReorderRules = (orderedIds: string[]) => {
    reorderRules.mutate(orderedIds, {
      onError: (error) => showApiErrorToast(error, "Could not reorder the rules."),
    });
  };

  const closeForm = () => setForm(null);

  const saveForm = () => {
    if (!form) return;
    const ruleId = form.rule_id.trim();
    if (!ruleId) {
      toast.error("Give the rule a name (rule ID).");
      return;
    }
    if (!form.pipeline_id) {
      toast.error("Pick the pipeline this rule routes matched documents into.");
      return;
    }
    // Empty conditions are a valid catch-all: the rule always matches.
    const conditions = pruneConditions(form.conditions);
    const priority = form.priority.trim() ? Number(form.priority.trim()) : undefined;
    if (priority !== undefined && !Number.isFinite(priority)) {
      toast.error("Priority must be a number.");
      return;
    }
    const payload = {
      rule_id: ruleId,
      ...(form.name.trim() ? { name: form.name.trim() } : {}),
      match_mode: form.match_mode,
      conditions,
      pipeline_id: form.pipeline_id,
      ...(priority !== undefined ? { priority } : {}),
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
          onError: (error) =>
            showApiErrorToast(error, "Could not update the rule."),
        }
      );
    } else {
      createRule.mutate(payload, {
        onSuccess: () => {
          toast.success("Rule created");
          closeForm();
        },
        onError: (error) => showApiErrorToast(error, "Could not create the rule."),
      });
    }
  };

  const handleCreatePipeline = () => {
    const name = newPipelineName.trim();
    if (!name) {
      toast.error("Give the pipeline a name.");
      return;
    }
    createPipeline.mutate(
      { name },
      {
        onSuccess: (pipeline) => {
          setNewPipelineName("");
          setActivePipelineId(pipeline.id);
          toast.success("Pipeline created — add its steps below.");
        },
        onError: (error) =>
          showApiErrorToast(error, "Could not create the pipeline."),
      }
    );
  };

  const handleDeletePipeline = (id: string) => {
    deletePipeline.mutate(id, {
      onSuccess: () => {
        if (activePipelineId === id) setActivePipelineId(null);
        toast.success("Pipeline deleted");
      },
      onError: (error) =>
        showApiErrorToast(error, "Could not delete the pipeline."),
    });
  };

  const handleExport = () => {
    if (rules.length === 0) {
      toast.message("No rules to export yet.");
      return;
    }
    const blob = new Blob(
      [
        exportAbstractionRoutingRules(
          rules.map((rule) => ({
            id: rule.id,
            rule_id: rule.rule_id,
            ...(rule.name ? { name: rule.name } : {}),
            match_mode: rule.match_mode ?? "any",
            conditions: rule.conditions ?? [],
            pipeline_id: rule.pipeline_id,
            ...(rule.priority !== undefined ? { priority: rule.priority } : {}),
            ...(rule.is_active !== undefined ? { is_active: rule.is_active } : {}),
            ...(rule.description ? { description: rule.description } : {}),
            ...(rule.source ? { source: rule.source } : {}),
          }))
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "abstraction-routing-rules.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rules.length} rule${rules.length === 1 ? "" : "s"}`);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    const { rules: imported, report: result } = parseAbstractionRoutingImport(text, {
      pipelineIds,
    });
    if (imported.length === 0) {
      setReport(result);
      toast.error("No rules imported — see the validation report.");
      return;
    }
    importRules.mutate(toRuleImportRequest(imported), {
      onSuccess: (response) => {
        setReport({
          imported: response.imported_count,
          skipped: imported.length - response.imported_count,
          errors: [...result.errors, ...response.errors],
          warnings: result.warnings,
        });
        if (response.imported_count > 0) {
          toast.success(`Imported ${response.imported_count} rule(s)`);
        } else {
          toast.error("No rules imported — see the validation report.");
        }
      },
      onError: (error) => {
        setReport(result);
        showApiErrorToast(error, "Could not import the rules.");
      },
    });
  };

  const formatRuleMatchSummary = (rule: RoutingRule) =>
    rule.conditions && rule.conditions.length > 0
      ? describeConditions(rule.conditions, rule.match_mode)
      : "Always matches";

  const renderDestination = (rule: RoutingRule) => {
    const backendRule = rules.find((entry) => entry.id === rule.id);
    const pipeline = backendRule ? pipelineById.get(backendRule.pipeline_id) : undefined;
    return (
      <Badge
        variant="outline"
        className="bg-violet-50/60 text-violet-700 border-violet-100 text-[10px] px-1.5 py-0.5 rounded-md"
      >
        <GitBranch className="h-3 w-3 mr-1" />
        {pipeline ? pipeline.name : "Unknown pipeline"}
      </Badge>
    );
  };

  const renderRunRow = (run: AbstractionPipelineRun) => {
    const expanded = expandedRunId === run.id;
    const pipeline = run.pipeline_id ? pipelineById.get(String(run.pipeline_id)) : undefined;
    const rule = run.rule_id ? rules.find((entry) => entry.id === run.rule_id) : undefined;
    return (
      <div key={run.id} className="rounded-2xl border border-slate-200 bg-white">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          onClick={() => setExpandedRunId(expanded ? null : run.id)}
          aria-expanded={expanded}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {rule ? rule.rule_id : String(run.rule_id ?? run.id)}
            </p>
            <p className="truncate text-xs text-slate-500">
              {pipeline ? pipeline.name : "Unknown pipeline"} · {run.step_runs.length} step
              {run.step_runs.length === 1 ? "" : "s"}
            </p>
            {runFailureReason(run) && (
              <p className="truncate text-xs text-rose-700">{runFailureReason(run)}</p>
            )}
          </div>
          <Badge variant="outline" className={`${runStatusStyle(run.status)} shrink-0`}>
            {run.status}
          </Badge>
        </button>
        {expanded && (
          <div className="space-y-2 border-t border-slate-100 px-4 py-3">
            {runFailureReason(run) && (
              <JobFailureReason
                title={run.status === "aborted" ? "Why this run stopped" : "Why this run failed"}
                reason={runFailureReason(run)}
                runId={run.id}
              />
            )}
            {run.platform_doc_id && (
              <CopyableId label="Document" value={run.platform_doc_id} className="text-xs text-slate-500" />
            )}
            {run.step_runs.length === 0 ? (
              <p className="text-sm text-slate-500">No step runs recorded yet.</p>
            ) : (
              [...run.step_runs]
                .sort((a, b) => a.order_index - b.order_index)
                .map((stepRun, index) => (
                  <div
                    key={`${run.id}-step-${stepRun.order_index}-${index}`}
                    className="rounded-xl bg-slate-50/70 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-700">
                        Step {stepRun.order_index + 1}
                      </span>
                      <Badge
                        variant="outline"
                        className={`${runStatusStyle(stepRun.status)} text-[10px]`}
                      >
                        {stepRun.status}
                      </Badge>
                    </div>
                    {stepRun.error || stepRun.status === "failed" ? (
                      <JobFailureReason
                        className="mt-2 text-xs"
                        reason={jobFailureMessage(stepRun, "This step failed.")}
                        {...stepRunLogId(stepRun)}
                      />
                    ) : null}
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-8">
      {/* Pipelines */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pipelines</h2>
            <p className="text-sm text-slate-500">
              A pipeline is an ordered list of steps. Rules route matched documents into one
              pipeline.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newPipelineName}
              onChange={(event) => setNewPipelineName(event.target.value)}
              placeholder="New pipeline name, e.g. charter-pipeline"
              className="bg-white"
            />
            <Button
              className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white shrink-0"
              disabled={createPipeline.isPending}
              onClick={handleCreatePipeline}
            >
              <Plus className="h-4 w-4 mr-2" /> Create pipeline
            </Button>
          </div>

          {pipelinesQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading pipelines…</p>
          ) : pipelinesQuery.isError ? (
            <QueryErrorState
              variant="inline"
              error={pipelinesQuery.error}
              title="Couldn't load the pipelines"
              onRetry={() => pipelinesQuery.refetch()}
              isRetrying={pipelinesQuery.isFetching}
            />
          ) : pipelines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
              <p className="font-medium text-slate-700">No pipelines yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Create a pipeline, then add its ordered steps.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {pipelines.map((pipeline) => {
                const isActive = pipeline.id === activePipelineId;
                return (
                  <div
                    key={pipeline.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 ${
                      isActive ? "border-violet-300 ring-1 ring-violet-200" : "border-slate-200"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setActivePipelineId(isActive ? null : pipeline.id)}
                      aria-pressed={isActive}
                    >
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {pipeline.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {pipeline.steps ? `${pipeline.steps.length} steps` : "Select to manage steps"}
                      </p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-600 hover:text-rose-700 shrink-0"
                      disabled={deletePipeline.isPending}
                      onClick={() => handleDeletePipeline(pipeline.id)}
                      aria-label={`Delete pipeline ${pipeline.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {activePipeline && (
            <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <PipelineEditor pipelineId={activePipeline.id} />
              </CardContent>
            </Card>
          )}
        </section>

        {/* Routing rules */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Routing rules</h2>
              <p className="text-sm text-slate-500">
                When a document matches a rule&apos;s conditions, it runs through that rule&apos;s
                pipeline. Rules are tried top to bottom — the first match wins. A rule with no
                conditions always matches.
              </p>
            </div>
            {!form && (
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={handleImportFile}
                />
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={importRules.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" /> Import
                </Button>
                {rules.length > 0 && (
                  <Button variant="outline" className="rounded-xl" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" /> Export
                  </Button>
                )}
                <Button
                  className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white"
                  onClick={startCreate}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add rule
                </Button>
              </div>
            )}
          </div>

          {report && (
            <div
              className={`rounded-2xl border p-4 ${
                report.errors.length
                  ? "border-rose-200 bg-rose-50/60"
                  : "border-emerald-200 bg-emerald-50/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {report.errors.length ? (
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">
                      Import report — {report.imported} imported
                      {report.skipped > 0 ? `, ${report.skipped} skipped` : ""}
                    </p>
                    {report.errors.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 text-sm text-rose-800">
                        {report.errors.map((error, index) => (
                          <li key={`err-${index}`}>• {error}</li>
                        ))}
                      </ul>
                    )}
                    {report.warnings.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 text-sm text-amber-800">
                        {report.warnings.map((warning, index) => (
                          <li key={`warn-${index}`}>⚠ {warning}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500"
                  onClick={() => setReport(null)}
                  aria-label="Dismiss import report"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {rulesQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading rules…</p>
          ) : rulesQuery.isError ? (
            <QueryErrorState
              variant="inline"
              error={rulesQuery.error}
              title="Couldn't load the routing rules"
              onRetry={() => rulesQuery.refetch()}
              isRetrying={rulesQuery.isFetching}
            />
          ) : rules.length === 0 && !form ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
              <p className="font-medium text-slate-700">No routing rules yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Add a rule to route matched documents into a pipeline.
              </p>
            </div>
          ) : rules.length > 0 ? (
            <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl overflow-hidden">
              <CardContent className="p-0">
                <RoutingRulesSortableTable
                  rules={displayRules}
                  reorderPending={reorderRules.isPending}
                  duplicatePending={createRule.isPending}
                  deletePending={deleteRule.isPending}
                  formatRuleMatchSummary={formatRuleMatchSummary}
                  onReorder={handleReorderRules}
                  onEdit={startEdit}
                  onDuplicate={duplicateRule}
                  onDelete={handleDeleteRule}
                  destinationHeader="Pipeline"
                  renderDestination={renderDestination}
                />
              </CardContent>
            </Card>
          ) : null}

          {form && (
            <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                    <Pencil className="h-4 w-4 text-violet-600" />
                    {form.id ? "Edit rule" : "New rule"}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500"
                    onClick={closeForm}
                    aria-label="Close editor"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="abstraction-rule-id">Rule name</Label>
                    <Input
                      id="abstraction-rule-id"
                      value={form.rule_id}
                      onChange={(event) =>
                        setForm((prev) => prev && { ...prev, rule_id: event.target.value })
                      }
                      placeholder="e.g. contracts-to-charter-pipeline"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="abstraction-rule-description">Description (optional)</Label>
                    <Input
                      id="abstraction-rule-description"
                      value={form.description}
                      onChange={(event) =>
                        setForm((prev) => prev && { ...prev, description: event.target.value })
                      }
                      placeholder="What this rule is for"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="abstraction-rule-pipeline">Pipeline</Label>
                    <Select
                      value={form.pipeline_id}
                      onValueChange={(pipeline_id) =>
                        setForm((prev) => prev && { ...prev, pipeline_id })
                      }
                    >
                      <SelectTrigger id="abstraction-rule-pipeline" className="w-full bg-white">
                        <SelectValue placeholder="Choose a pipeline" />
                      </SelectTrigger>
                      <SelectContent>
                        {pipelines.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-slate-400">
                            No pipelines yet — create one above
                          </div>
                        ) : (
                          pipelines.map((pipeline) => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {formPipeline?.steps && formPipeline.steps.length > 0 && (
                      <p className="text-xs text-slate-500">
                        {formPipeline.steps.length} step{formPipeline.steps.length === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="abstraction-rule-priority">Priority (optional)</Label>
                    <Input
                      id="abstraction-rule-priority"
                      value={form.priority}
                      inputMode="numeric"
                      onChange={(event) =>
                        setForm((prev) => prev && { ...prev, priority: event.target.value })
                      }
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    When — leave empty and the rule always matches
                  </Label>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <RoutingRuleConditionBuilder
                      conditions={form.conditions}
                      matchMode={form.match_mode}
                      allowEntityField
                      documentTypeSuggestions={knownDocumentTypes.data ?? []}
                      onMatchModeChange={(match_mode) =>
                        setForm((prev) => prev && { ...prev, match_mode })
                      }
                      onChange={(conditions) => setForm((prev) => prev && { ...prev, conditions })}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      setForm((prev) => prev && { ...prev, is_active: event.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Rule is active
                </label>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <Button variant="outline" className="rounded-xl" onClick={closeForm}>
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white"
                    disabled={createRule.isPending || updateRule.isPending}
                    onClick={saveForm}
                  >
                    {form.id ? "Save rule" : "Create rule"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Runs (read-only) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Pipeline runs</h2>
              <p className="text-sm text-slate-500">
                What ran through each rule&apos;s pipeline, with per-step status.
              </p>
            </div>
            {rules.length > 0 && (
              <Select value={runRuleFilter} onValueChange={setRunRuleFilter}>
                <SelectTrigger className="w-full sm:w-64 bg-white">
                  <SelectValue placeholder="Filter by rule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rules</SelectItem>
                  {rules.map((rule) => (
                    <SelectItem key={rule.id} value={rule.id}>
                      {rule.rule_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {runsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading runs…</p>
          ) : runsQuery.isError ? (
            <QueryErrorState
              variant="inline"
              error={runsQuery.error}
              title="Couldn't load the runs"
              onRetry={() => runsQuery.refetch()}
              isRetrying={runsQuery.isFetching}
            />
          ) : filteredRuns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
              <p className="font-medium text-slate-700">No runs yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Runs appear here once documents flow through a rule&apos;s pipeline.
              </p>
            </div>
          ) : (
            <div className="space-y-2">{filteredRuns.map(renderRunRow)}</div>
          )}
        </section>
    </div>
  );
}
