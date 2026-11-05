"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IntegrationAPI,
  type IntegrationBundle,
  type IntegrationBundleRun,
  type IntegrationJob,
} from "@/app/(protected)/data-room/integrations/services/data-integration-api";
import { fetchCompanyConnectors } from "@/app/(protected)/workflows/services/integration-api";
import {
  getWorkflowIntegrationStage,
  setWorkflowIntegrationStage,
} from "../services/workflow-integration-context";
import type { IntegrationTargetLink } from "../services/integration-targets";
import {
  ChildBundleRunRow,
  fetchChildRunsForBundleRun,
  formatBundleRunSummary,
  getBundleRunStatusConfig,
  getChildRunStatusConfig,
  isBundleRunTerminal,
  resolveConnectorConfigId,
} from "../services/integration-bundle-utils";
import { AlertCircle, AlertTriangle, CheckCircle2, Layers, Play, RefreshCw, Trash2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import { JobFailureReason } from "@/components/job-failure-reason";

interface IntegrationBundlePanelProps {
  workflowId: string;
  workflowName: string;
  sourceTable: string;
  sourceConnectorName: string;
  targets: IntegrationTargetLink[];
  /** Increment after a child job is activated to re-sync bundle attachments. */
  jobActivatedNonce?: number;
}

export function IntegrationBundlePanel({
  workflowId,
  workflowName,
  sourceTable,
  sourceConnectorName,
  targets,
  jobActivatedNonce = 0,
}: IntegrationBundlePanelProps) {
  const [bundle, setBundle] = useState<IntegrationBundle | null>(null);
  const [bundleRun, setBundleRun] = useState<IntegrationBundleRun | null>(null);
  const [childRows, setChildRows] = useState<ChildBundleRunRow[]>([]);
  const [targetJobStatuses, setTargetJobStatuses] = useState<Record<string, IntegrationJob["status"]>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isRefreshingChildren, setIsRefreshingChildren] = useState(false);
  const [detachingJobId, setDetachingJobId] = useState<string | null>(null);
  const attachedJobIdsRef = useRef<Set<string>>(new Set());
  const syncInFlightRef = useRef(false);
  const bundleIdRef = useRef<string | null>(null);

  const targetsWithJobs = useMemo(
    () => targets.filter((target) => Boolean(target.jobId)),
    [targets]
  );

  const showPanel = targets.length >= 2;

  // Jobs actually attached to the bundle in the backend — this can include
  // stale/duplicate children left over from prior sessions that never show up
  // in `targets` (which only reflects this workflow session's local config).
  // Two active jobs writing the same destination_table duplicate every record
  // on each bundle run, so flag any destination_table shared by 2+ jobs.
  const duplicateDestinationTables = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of bundle?.jobs ?? []) {
      if (!job.destination_table) continue;
      counts.set(job.destination_table, (counts.get(job.destination_table) ?? 0) + 1);
    }
    return new Set(
      Array.from(counts.entries())
        .filter(([, n]) => n > 1)
        .map(([table]) => table)
    );
  }, [bundle?.jobs]);

  const refreshTargetJobStatuses = useCallback(async () => {
    const entries = await Promise.all(
      targetsWithJobs.map(async (target) => {
        if (!target.jobId) return [target.id, null] as const;
        try {
          const job = await IntegrationAPI.getJob(target.jobId);
          return [target.id, job.status] as const;
        } catch {
          return [target.id, null] as const;
        }
      })
    );
    setTargetJobStatuses(
      Object.fromEntries(
        entries.filter(([, status]) => status != null) as [string, IntegrationJob["status"]][]
      )
    );
  }, [targetsWithJobs]);

  const syncBundle = useCallback(async () => {
    if (!workflowId || !sourceTable.trim() || targetsWithJobs.length < 2) return;
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setIsSyncing(true);

    try {
      const companyId = localStorage.getItem("selectedCompanyId");
      if (!companyId) {
        toast.error("Select a company before creating an integration bundle.");
        return;
      }

      const connectorConfigs = await fetchCompanyConnectors(companyId);
      const sourceConnectorConfigId = resolveConnectorConfigId(sourceConnectorName, connectorConfigs);
      if (!sourceConnectorConfigId) {
        toast.error(`No active connector config found for "${sourceConnectorName}".`);
        return;
      }

      let activeBundleId =
        getWorkflowIntegrationStage(workflowId)?.bundleId ?? bundleIdRef.current ?? null;
      let activeBundle: IntegrationBundle | null = null;

      if (activeBundleId) {
        try {
          activeBundle = await IntegrationAPI.getBundle(activeBundleId);
          bundleIdRef.current = activeBundleId;
        } catch {
          activeBundleId = null;
          bundleIdRef.current = null;
        }
      }

      if (!activeBundleId) {
        activeBundle = await IntegrationAPI.createBundle({
          name: `${workflowName} Multi-target`,
          description: `Bundle for ${workflowName} — shared source ${sourceTable}`,
          source_type: "connector",
          source_connector_config_id: sourceConnectorConfigId,
          source_table: sourceTable,
        });
        activeBundleId = activeBundle.id;
        bundleIdRef.current = activeBundleId;
        setWorkflowIntegrationStage(workflowId, { bundleId: activeBundleId });
      } else if (
        activeBundle &&
        (activeBundle.source_table !== sourceTable ||
          activeBundle.source_connector_config_id !== sourceConnectorConfigId)
      ) {
        activeBundle = await IntegrationAPI.updateBundle(activeBundleId, {
          source_table: sourceTable,
          source_connector_config_id: sourceConnectorConfigId,
        });
      }

      const bundleJobIds = new Set(
        (activeBundle?.jobs ?? [])
          .map((job) => job.id)
          .filter(Boolean)
      );

      let attachedAny = false;
      for (const target of targetsWithJobs) {
        const jobId = target.jobId!;
        if (attachedJobIdsRef.current.has(jobId) || bundleJobIds.has(jobId)) {
          attachedJobIdsRef.current.add(jobId);
          continue;
        }
        try {
          // Returns the attached JOB, not the bundle — re-fetch the bundle
          // below to get its up-to-date `jobs` list instead of trying to
          // reconstruct it from job responses.
          await IntegrationAPI.attachJobToBundle(activeBundleId, jobId);
          attachedJobIdsRef.current.add(jobId);
          attachedAny = true;
        } catch (error: unknown) {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status !== 409) {
            console.error(`Failed to attach job ${jobId} to bundle`, error);
          } else {
            attachedJobIdsRef.current.add(jobId);
          }
        }
      }

      if (attachedAny) {
        activeBundle = await IntegrationAPI.getBundle(activeBundleId);
      }

      setBundle(activeBundle);
      await refreshTargetJobStatuses();
    } catch (error) {
      console.error("Bundle sync failed", error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      showApiErrorToast(error, "Failed to sync integration bundle.", {
        // A bare 404 means the bundle routes aren't deployed; say so instead of "Not Found".
        message:
          status === 404
            ? "Bundle API not found. Confirm the backend bundle routes are deployed under /data/integration/bundles."
            : undefined,
        onRetry: () => void syncBundle(),
      });
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [
    workflowId,
    workflowName,
    sourceTable,
    sourceConnectorName,
    targetsWithJobs,
    refreshTargetJobStatuses,
  ]);

  useEffect(() => {
    if (!showPanel) return;
    void syncBundle();
  }, [showPanel, syncBundle, jobActivatedNonce]);

  const refreshChildRows = useCallback(
    async (run: IntegrationBundleRun) => {
      setIsRefreshingChildren(true);
      try {
        const rows = await fetchChildRunsForBundleRun(targetsWithJobs, run.id);
        setChildRows(rows);
      } finally {
        setIsRefreshingChildren(false);
      }
    },
    [targetsWithJobs]
  );

  useEffect(() => {
    if (!bundleRun?.id) return;
    if (isBundleRunTerminal(bundleRun.status)) {
      void refreshChildRows(bundleRun);
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const latest = await IntegrationAPI.getBundleRun(bundleRun.id);
        setBundleRun(latest);
        if (isBundleRunTerminal(latest.status)) {
          void refreshChildRows(latest);
          window.clearInterval(interval);
        } else {
          void refreshChildRows(latest);
        }
      } catch {
        window.clearInterval(interval);
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [bundleRun?.id, bundleRun?.status, refreshChildRows]);

  const allTargetsActive = useMemo(() => {
    if (targetsWithJobs.length < 2) return false;
    return targetsWithJobs.every((target) => targetJobStatuses[target.id] === "active");
  }, [targetsWithJobs, targetJobStatuses]);

  const inactiveTargets = useMemo(
    () =>
      targetsWithJobs.filter((target) => targetJobStatuses[target.id] !== "active"),
    [targetsWithJobs, targetJobStatuses]
  );

  const handleRunBundle = useCallback(async () => {
    if (!bundle?.id) {
      toast.error("Bundle is not ready yet. Wait for sync to finish.");
      return;
    }
    if (!allTargetsActive) {
      toast.error("Activate all target jobs before running the bundle.");
      return;
    }

    setIsRunning(true);
    try {
      const run = await IntegrationAPI.triggerBundleRun(bundle.id);
      setBundleRun(run);
      setChildRows([]);
      toast.success("Bundle run started — source will be read once.");
      void refreshChildRows(run);
    } catch (error) {
      console.error("Failed to trigger bundle run", error);
      showApiErrorToast(error, "Failed to start bundle run.");
    } finally {
      setIsRunning(false);
    }
  }, [allTargetsActive, bundle?.id, refreshChildRows]);

  const handleRetryChild = useCallback(async (jobId: string) => {
    try {
      await IntegrationAPI.triggerRun(jobId, { triggered_by: "abstraction_ui" });
      toast.success("Standalone retry started for this target.");
    } catch (error) {
      showApiErrorToast(error, "Failed to retry this target job.");
    }
  }, []);

  const handleDetachJob = useCallback(
    async (jobId: string, jobName: string) => {
      if (!bundle?.id) return;
      const confirmed = window.confirm(
        `Detach "${jobName}" from this bundle? It will stop writing on future bundle runs. ` +
          `The job itself is not deleted — you can re-attach it later.`
      );
      if (!confirmed) return;

      setDetachingJobId(jobId);
      try {
        await IntegrationAPI.detachJobFromBundle(bundle.id, jobId);
        // The detach endpoint returns 204 No Content — refetch for the real state
        // rather than trusting detachJobFromBundle's (unreliable) return value.
        const refreshed = await IntegrationAPI.getBundle(bundle.id);
        setBundle(refreshed);
        attachedJobIdsRef.current.delete(jobId);
        toast.success(`Detached "${jobName}" from the bundle.`);
      } catch (error) {
        console.error(`Failed to detach job ${jobId} from bundle`, error);
        showApiErrorToast(error, `Failed to detach "${jobName}" from the bundle.`);
      } finally {
        setDetachingJobId(null);
      }
    },
    [bundle?.id]
  );

  if (!showPanel) return null;

  const runStatusConfig = bundleRun ? getBundleRunStatusConfig(bundleRun.status) : null;
  const runSummary = bundleRun ? formatBundleRunSummary(bundleRun) : null;

  return (
    <Card className="border-0 shadow-sm ring-1 ring-indigo-200/70 overflow-hidden bg-gradient-to-b from-indigo-50/40 to-white">
      <CardHeader className="border-b border-indigo-100/80 bg-white/70 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              Multi-target bundle
            </CardTitle>
            <p className="text-xs text-slate-500">
              Source <span className="font-mono text-slate-700">{sourceTable || "—"}</span> (
              {sourceConnectorName}) is read once, then{" "}
              {targetsWithJobs.length} target{targetsWithJobs.length === 1 ? "" : "s"} run in parallel.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl text-xs border-slate-200"
              onClick={() => void syncBundle()}
              disabled={isSyncing}
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing…" : "Sync bundle"}
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700"
              onClick={() => void handleRunBundle()}
              disabled={!bundle?.id || !allTargetsActive || isRunning || isSyncing}
              title={
                !allTargetsActive
                  ? `Activate jobs for: ${inactiveTargets.map((t) => t.label ?? t.destinationTable).join(", ")}`
                  : undefined
              }
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              {isRunning ? "Starting…" : "Run bundle"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {bundle?.id && (
            <Badge variant="outline" className="rounded-full font-mono">
              bundle: {bundle.id.slice(0, 8)}…
            </Badge>
          )}
          <Badge variant="outline" className="rounded-full">
            {targetsWithJobs.length} of {targets.length} targets linked
          </Badge>
          {allTargetsActive ? (
            <Badge className="rounded-full bg-emerald-100 text-emerald-800 border-emerald-200">
              All targets active
            </Badge>
          ) : (
            <Badge className="rounded-full bg-amber-100 text-amber-900 border-amber-200">
              {inactiveTargets.length} target{inactiveTargets.length === 1 ? "" : "s"} need activation
            </Badge>
          )}
          {bundleRun && runStatusConfig && (
            <>
              <Badge className={cn("rounded-full border", runStatusConfig.className)}>
                {runStatusConfig.label}
              </Badge>
              {runSummary && (
                <span className="text-slate-500">{runSummary}</span>
              )}
            </>
          )}
        </div>

        {bundleRun?.error_summary?.message && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-900 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Bundle error{bundleRun.error_summary.stage ? ` (${bundleRun.error_summary.stage})` : ""}
              </p>
              <p>{bundleRun.error_summary.message}</p>
            </div>
          </div>
        )}

        {!allTargetsActive && inactiveTargets.length > 0 && (
          <p className="text-xs text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            Switch to each target tab, complete mappings, and click <strong>Activate</strong> before
            running the bundle. Inactive:{" "}
            {inactiveTargets.map((t) => t.label ?? t.destinationTable).join(", ")}.
          </p>
        )}

        {duplicateDestinationTables.size > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Duplicate destination table(s) attached</p>
              <p>
                More than one active job writes to{" "}
                {Array.from(duplicateDestinationTables).map((t) => `"${t}"`).join(", ")} — every bundle run
                will create multiple records for the same source row. Detach the extra job(s) below.
              </p>
            </div>
          </div>
        )}

        {(bundle?.jobs?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Attached jobs ({bundle!.jobs!.length})
            </div>
            {bundle!.jobs!.map((job) => {
              const isDuplicate = duplicateDestinationTables.has(job.destination_table);
              return (
                <div
                  key={job.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs",
                    isDuplicate && "bg-rose-50/60"
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate flex items-center gap-1.5">
                      {job.name}
                      {isDuplicate && (
                        <Badge className="rounded-full text-[10px] bg-rose-100 text-rose-800 border-rose-200">
                          duplicate destination
                        </Badge>
                      )}
                    </p>
                    <p className="text-slate-500 truncate font-mono text-[10px]">
                      {job.destination_table} · updated{" "}
                      {new Date(job.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[10px] text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                    onClick={() => void handleDetachJob(job.id, job.name)}
                    disabled={detachingJobId === job.id}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {detachingJobId === job.id ? "Detaching…" : "Detach"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {(bundleRun || childRows.length > 0) && (
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Target outcomes
              {isRefreshingChildren && (
                <span className="ml-2 font-normal normal-case text-slate-400">Updating…</span>
              )}
            </div>
            {(childRows.length > 0 ? childRows : targetsWithJobs.map((target) => ({
              target,
              job: null,
              run: null,
              errorMessage: null,
            }))).map(({ target, run, errorMessage }) => {
              const label = target.label ?? target.destinationTable;
              const childStatus = run?.status;
              const childConfig = childStatus ? getChildRunStatusConfig(childStatus) : null;
              const isSuccess = run?.status === "completed";
              const isFailed = run?.status === "failed";

              return (
                <div
                  key={target.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                    {isFailed && <XCircle className="h-4 w-4 text-rose-600 shrink-0" />}
                    {!isSuccess && !isFailed && (
                      <span className="h-4 w-4 rounded-full border-2 border-slate-200 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{label}</p>
                      <p className="text-slate-500 truncate font-mono text-[10px]">
                        {target.destinationTable}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {run && (
                      <span className="text-slate-600 tabular-nums">
                        {run.processed_records ?? 0} records
                        {(run.failed_records ?? 0) > 0 && (
                          <span className="text-rose-600 ml-1">· {run.failed_records} failed</span>
                        )}
                      </span>
                    )}
                    {childConfig && (
                      <Badge className={cn("rounded-full text-[10px]", childConfig.className)}>
                        {childConfig.label}
                      </Badge>
                    )}
                    {!run && bundleRun && !isBundleRunTerminal(bundleRun.status) && (
                      <Badge className="rounded-full text-[10px] bg-blue-50 text-blue-700">
                        Waiting…
                      </Badge>
                    )}
                    {isFailed && target.jobId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[10px] text-indigo-700"
                        onClick={() => void handleRetryChild(target.jobId!)}
                      >
                        Retry alone
                      </Button>
                    )}
                  </div>
                  {isFailed && run && (
                    <div className="w-full pl-6">
                      <JobFailureReason
                        className="text-[11px]"
                        reason={errorMessage ?? "This run failed."}
                        runId={run.id}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
