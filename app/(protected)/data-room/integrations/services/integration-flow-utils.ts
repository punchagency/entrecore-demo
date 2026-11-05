import type { IntegrationMappingReview } from "./data-integration-api";
import { getIntegrationReviewSortTime } from "./data-integration-api";

export type IntegrationJobStatusValue =
  | "draft"
  | "pending_mapping_approval"
  | "pending_review"
  | "active"
  | "archived"
  | "running"
  | "completed"
  | "failed";

export type IntegrationFlowStepId =
  | "suggest"
  | "patch"
  | "submit_review"
  | "review"
  | "activate"
  | "run";

export interface IntegrationFlowStep {
  id: IntegrationFlowStepId;
  label: string;
}

export const INTEGRATION_FLOW_STEPS: IntegrationFlowStep[] = [
  { id: "suggest", label: "Suggest" },
  { id: "patch", label: "Edit mappings" },
  { id: "submit_review", label: "Submit review" },
  { id: "review", label: "HITL review" },
  { id: "activate", label: "Activate" },
  { id: "run", label: "Run" },
];

interface JobStatusLabelOptions {
  locked?: boolean;
  pendingReview?: boolean;
}

export function getIntegrationJobStatusLabel(
  status: string | null | undefined,
  options: JobStatusLabelOptions = {}
): string {
  if (options.pendingReview || status === "pending_review") {
    return "Awaiting Review";
  }

  if (options.locked && status !== "active") {
    return "Approved — ready to activate";
  }

  switch (status) {
    case "pending_mapping_approval":
      return "Draft — mappings being set up";
    case "pending_review":
      return "Awaiting Review";
    case "active":
      return "Active — can be run";
    case "archived":
      return "Archived";
    case "running":
      return "Running…";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed — see run details";
    case "draft":
      return "Draft";
    default:
      return status || "Unknown";
  }
}

interface ActivateBlockedOptions {
  hasJob: boolean;
  jobLocked: boolean;
  hasPendingReview: boolean;
  compileErrorCount: number;
  jobStatus: string | null;
}

export function getActivateBlockedReason(options: ActivateBlockedOptions): string | null {
  const { hasJob, jobLocked, hasPendingReview, compileErrorCount, jobStatus } = options;

  if (!hasJob) return "Suggest mappings to create a job first.";
  if (jobStatus === "active") return "Job is already active — use Run.";
  if (hasPendingReview) return "Awaiting HITL review — activate is available after approval.";
  if (!jobLocked) {
    return "Submit mappings for review and wait for approval before activating.";
  }
  if (compileErrorCount > 0) {
    return "Fix compile errors below, then activate (admin may need to unlock first).";
  }
  return null;
}

export function getCurrentFlowStepId(options: {
  hasJob: boolean;
  hasPendingReview: boolean;
  jobLocked: boolean;
  jobStatus: string | null;
  hasRun: boolean;
}): IntegrationFlowStepId {
  if (options.jobStatus === "active" || options.hasRun) return "run";
  if (options.jobLocked) return "activate";
  if (options.hasPendingReview) return "review";
  if (options.hasJob) return "submit_review";
  return "suggest";
}

export function getLatestActionableReview(
  reviews: IntegrationMappingReview[]
): IntegrationMappingReview | null {
  if (reviews.length === 0) return null;
  return [...reviews].sort(
    (a, b) => getIntegrationReviewSortTime(b) - getIntegrationReviewSortTime(a)
  )[0];
}
