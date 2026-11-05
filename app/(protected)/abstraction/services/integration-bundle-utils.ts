import type { ConnectorConfig } from "@/app/(protected)/workflows/services/integration-api";
import {
  IntegrationAPI,
  type IntegrationBundleRunStatus,
  type IntegrationJob,
  type IntegrationRunResponse,
} from "@/app/(protected)/data-room/integrations/services/data-integration-api";
import type { IntegrationTargetLink } from "./integration-targets";
import { jobFailureMessage } from "@/utils/api-error";

export interface BundleRunStatusConfig {
  label: string;
  className: string;
}

export function getBundleRunStatusConfig(status: IntegrationBundleRunStatus): BundleRunStatusConfig {
  switch (status) {
    case "pending":
      return { label: "Queued", className: "bg-slate-100 text-slate-700 border-slate-200" };
    case "running":
      return { label: "Running", className: "bg-blue-100 text-blue-800 border-blue-200" };
    case "completed":
      return { label: "Completed", className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    case "partial_success":
      return { label: "Partial success", className: "bg-amber-100 text-amber-900 border-amber-200" };
    case "failed":
      return { label: "Failed", className: "bg-rose-100 text-rose-800 border-rose-200" };
    default:
      return { label: status, className: "bg-slate-100 text-slate-700 border-slate-200" };
  }
}

export function getChildRunStatusConfig(status: IntegrationRunResponse["status"]): BundleRunStatusConfig {
  switch (status) {
    case "pending":
      return { label: "Queued", className: "bg-slate-100 text-slate-600" };
    case "running":
      return { label: "Running", className: "bg-blue-100 text-blue-700" };
    case "completed":
      return { label: "Completed", className: "bg-emerald-100 text-emerald-700" };
    case "failed":
      return { label: "Failed", className: "bg-rose-100 text-rose-700" };
    default:
      return { label: status, className: "bg-slate-100 text-slate-600" };
  }
}

export function resolveConnectorConfigId(
  connectorName: string,
  configs: ConnectorConfig[]
): string | null {
  const normalized = connectorName.trim().toLowerCase();
  const match = configs.find((config) => {
    if (!config.is_active) return false;
    const erp = config.erp_type?.toLowerCase() ?? "";
    const name = config.connector_name?.toLowerCase() ?? "";
    return erp === normalized || name.includes(normalized);
  });
  return match?.id ?? null;
}

export function formatBundleRunSummary(run: {
  status: IntegrationBundleRunStatus;
  succeeded_children: number;
  total_children: number;
  duration_seconds: number | null;
}): string {
  const duration =
    run.duration_seconds != null ? `${Math.round(run.duration_seconds)}s` : null;
  if (run.status === "partial_success") {
    return `${run.succeeded_children} of ${run.total_children} succeeded${duration ? ` · ${duration}` : ""}`;
  }
  if (run.status === "completed" && duration) {
    return `All ${run.total_children} succeeded · ${duration}`;
  }
  if (run.status === "failed") {
    return `0 of ${run.total_children} succeeded`;
  }
  return duration ? `${run.total_children} targets · ${duration}` : `${run.total_children} targets`;
}

export interface ChildBundleRunRow {
  target: IntegrationTargetLink;
  job: IntegrationJob | null;
  run: IntegrationRunResponse | null;
  errorMessage: string | null;
}

export async function fetchChildRunsForBundleRun(
  targets: IntegrationTargetLink[],
  bundleRunId: string
): Promise<ChildBundleRunRow[]> {
  const targetsWithJobs = targets.filter((target) => target.jobId);

  const rows = await Promise.all(
    targetsWithJobs.map(async (target) => {
      const jobId = target.jobId!;
      try {
        const [job, runsResponse] = await Promise.all([
          IntegrationAPI.getJob(jobId),
          IntegrationAPI.getRunsForJob(jobId, 1, 50),
        ]);
        const run =
          runsResponse.runs?.find((entry) => entry.bundle_run_id === bundleRunId) ?? null;
        const failedStage = run?.stages?.find((stage) => stage.status === "failed");
        // Stored errors can still be raw exception text; show only a readable reason.
        const errorMessage =
          run?.error || failedStage?.error
            ? jobFailureMessage(run, "") || jobFailureMessage(failedStage, "This run failed.")
            : null;
        return {
          target,
          job,
          run,
          errorMessage,
        };
      } catch {
        return {
          target,
          job: null,
          run: null,
          errorMessage: "Could not load run details",
        };
      }
    })
  );

  return rows;
}

export function isBundleRunTerminal(status: IntegrationBundleRunStatus): boolean {
  return status === "completed" || status === "partial_success" || status === "failed";
}
