import { Axios } from "@/app/config/axios";

export interface DratReviewTask {
  id: string;
  company_id: string;
  workflow_run_id: string;
  doc_id: string;
  status: string;
  reason: string;
  classify_needs_hitl: boolean;
  route_needs_hitl: boolean;
  original_filename?: string | null;
  gcs_staging_path?: string | null;
  entity_id?: string | null;
  entity_name?: string | null;
  suggested_filename?: string | null;
  document_type?: string | null;
  confidence?: number | null;
  target_folder?: string | null;
  rule_matched?: string | null;
  route_reason?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface DratReviewTaskListResponse {
  items: DratReviewTask[];
  total: number;
  skip: number;
  limit: number;
}

export type DratReviewDecision = "approved" | "rejected" | "skipped";

export interface DratReviewDecisionRequest {
  decision: DratReviewDecision;
  entity_id?: string;
  entity_name?: string;
  suggested_filename?: string;
  target_folder?: string;
  notes?: string;
}

export const fetchPendingReviewTasks = async (params?: {
  skip?: number;
  limit?: number;
}): Promise<DratReviewTaskListResponse> => {
  const response = await Axios.get<DratReviewTaskListResponse>("/data/drat-review/pending", {
    params: {
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 50,
    },
  });
  return response.data;
};

export const fetchReviewTask = async (taskId: string): Promise<DratReviewTask> => {
  const response = await Axios.get<DratReviewTask>(`/data/drat-review/${taskId}`);
  return response.data;
};

export const decideReviewTask = async (
  taskId: string,
  payload: DratReviewDecisionRequest
): Promise<DratReviewTask> => {
  const response = await Axios.patch<DratReviewTask>(
    `/data/drat-review/${taskId}/decide`,
    payload
  );
  return response.data;
};

export interface DratReviewPreview {
  task_id: string;
  preview_url?: string | null;
  mime_type?: string | null;
  filename?: string | null;
  original_filename?: string | null;
  document_type?: string | null;
  document_text_excerpt?: string | null;
  char_count?: number | null;
  excerpt_truncated: boolean;
}

export const fetchReviewPreview = async (taskId: string): Promise<DratReviewPreview> => {
  const response = await Axios.get<DratReviewPreview>(`/data/drat-review/${taskId}/preview`);
  return response.data;
};

export const REASON_LABELS: Record<string, string> = {
  classify_and_route: "Classify & routing need review",
  classify_no_entity: "Unknown entity",
  classify_low_confidence: "Low classify confidence",
  classify_needs_review_filename: "Filename flagged for review",
  classify_uncertain: "Uncertain classification",
  route_no_match: "No routing rule matched",
  no_matching_rule: "No routing rule matched",
  no_rules_configured: "No routing rules configured",
  drive_mapping_missing: "Google Drive folder not mapped",
  drive_not_found: "Google Drive folder not found",
  drive_invalid_request: "Google Drive request failed",
  drive_storage_quota_exceeded: "Google Drive storage full",
  drive_missing_target: "No target folder for Drive filing",
  drive_missing_entity: "Entity missing for Drive filing",
  drive_missing_connector: "Google Drive connector not configured",
  drive_exception: "Google Drive filing failed",
  drive_unknown: "Google Drive filing failed",
  unknown: "Needs review",
};

export function reasonLabel(reason: string): string {
  if (REASON_LABELS[reason]) return REASON_LABELS[reason];
  if (reason.startsWith("drive_")) {
    const suffix = reason.replace(/^drive_/, "");
    return REASON_LABELS[`drive_${suffix}`] ?? `Drive filing: ${suffix.replace(/_/g, " ")}`;
  }
  return reason.replace(/_/g, " ");
}

/** Human-readable explanation for why a document landed in review. */
export function getReviewFailureDetail(task: DratReviewTask): string {
  if (task.reason.startsWith("drive_")) {
    return task.notes?.trim() || reasonLabel(task.reason);
  }

  const parts: string[] = [];

  switch (task.reason) {
    case "classify_no_entity":
      parts.push(
        "The classifier could not match this document to any entity in your entity list."
      );
      break;
    case "classify_low_confidence":
      parts.push(
        task.confidence != null
          ? `Classification confidence was ${task.confidence.toFixed(1)}% (below the 90% threshold).`
          : "Classification confidence was below the 90% threshold."
      );
      break;
    case "classify_needs_review_filename":
      parts.push(
        'The suggested filename contains "[NEEDS REVIEW]" and requires a human check before filing.'
      );
      break;
    case "classify_uncertain":
      parts.push("The classifier could not confidently determine entity or document metadata.");
      break;
    case "classify_and_route":
      parts.push("Both classification and routing flagged this document for human review.");
      break;
    case "route_no_match":
    case "no_matching_rule":
      parts.push("No routing rule matched this document's filename or conditions.");
      break;
    case "no_rules_configured":
      parts.push("No routing rules are configured for this company.");
      break;
    default:
      parts.push(reasonLabel(task.reason));
  }

  if (task.route_needs_hitl && task.route_reason && task.route_reason !== task.reason) {
    parts.push(`Routing detail: ${reasonLabel(task.route_reason)}.`);
  }

  if (task.classify_needs_hitl && !task.entity_name) {
    parts.push("Assign an entity before approving so naming and routing can run.");
  }

  if (task.rule_matched) {
    parts.push(`Closest rule attempted: ${task.rule_matched}.`);
  }

  return parts.join(" ");
}
