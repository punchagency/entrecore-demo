import { Axios } from "@/app/config/axios";

export type DratLogOutcome = "success" | "skipped" | "error" | "manual";

export interface DratRuleLogEntry {
  id: string;
  company_id: string;
  workflow_run_id?: string | null;
  doc_id?: string | null;
  watched_source?: string | null;
  rule_name?: string | null;
  rule_match?: string | null;
  old_filename?: string | null;
  new_filename?: string | null;
  entity_id?: string | null;
  entity_name?: string | null;
  step: string;
  actions?: string[] | null;
  outcome: DratLogOutcome;
  message?: string | null;
  event_at: string;
  created_at: string;
  updated_at: string;
}

export interface DratRuleLogStepSummary {
  step: string;
  outcome: DratLogOutcome;
}

export interface DratRuleLogRunSummary {
  run_key: string;
  workflow_run_id?: string | null;
  doc_id?: string | null;
  entity_name?: string | null;
  filename?: string | null;
  watched_source?: string | null;
  drive_file_id?: string | null;
  started_at: string;
  last_event_at: string;
  final_outcome: DratLogOutcome;
  step_count: number;
  step_summary: DratRuleLogStepSummary[];
}

export interface DratRuleLogRunDetail extends DratRuleLogRunSummary {
  steps: DratRuleLogEntry[];
}

export interface DratRuleLogListResponse {
  items: DratRuleLogEntry[];
  total: number;
  skip: number;
  limit: number;
}

export interface DratFailedRun {
  run_id: string;
  workflow_id: string;
  filename?: string | null;
  entity_name?: string | null;
  failed_node?: string | null;
  error_message?: string | null;
  started_at?: string | null;
  created_at?: string | null;
}

export interface DratFailedRunListResponse {
  items: DratFailedRun[];
  total: number;
}

export interface DratRuleLogRunListResponse {
  items: DratRuleLogRunSummary[];
  total: number;
  skip: number;
  limit: number;
}

export interface DratLogStats {
  total: number;
  success: number;
  skipped: number;
  manual: number;
  error: number;
}

export interface DratLogListParams {
  skip?: number;
  limit?: number;
  date_from?: string;
  date_to?: string;
  rule_name?: string;
  outcome?: DratLogOutcome | "";
  entity_name?: string;
  workflow_run_id?: string;
  doc_id?: string;
  step?: string;
}

function buildQuery(params?: DratLogListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    skip: params?.skip ?? 0,
    limit: params?.limit ?? 50,
  };

  if (params?.date_from) query.date_from = params.date_from;
  if (params?.date_to) query.date_to = params.date_to;
  if (params?.rule_name?.trim()) query.rule_name = params.rule_name.trim();
  if (params?.outcome) query.outcome = params.outcome;
  if (params?.entity_name?.trim()) query.entity_name = params.entity_name.trim();
  if (params?.workflow_run_id?.trim()) query.workflow_run_id = params.workflow_run_id.trim();
  if (params?.doc_id?.trim()) query.doc_id = params.doc_id.trim();
  if (params?.step?.trim()) query.step = params.step.trim();

  return query;
}

/** Raw step-level log (debug/export). Prefer fetchRuleLogRuns for the UI table. */
export const fetchRuleLogEntries = async (
  params?: DratLogListParams
): Promise<DratRuleLogListResponse> => {
  const response = await Axios.get<DratRuleLogListResponse>("/data/drat-rule-log/", {
    params: buildQuery(params),
  });
  return response.data;
};

/** Aggregated run view — one row per workflow run. */
export const fetchRuleLogRuns = async (
  params?: DratLogListParams
): Promise<DratRuleLogRunListResponse> => {
  const response = await Axios.get<DratRuleLogRunListResponse>("/data/drat-rule-log/runs", {
    params: buildQuery(params),
  });
  return response.data;
};

export const fetchRuleLogRun = async (runKey: string): Promise<DratRuleLogRunDetail> => {
  const response = await Axios.get<DratRuleLogRunDetail>(`/data/drat-rule-log/runs/${runKey}`);
  return response.data;
};

/** Fetch a run's filed Drive document as a Blob (authenticated; do not use a plain <a href>). */
export const fetchRunFiledFile = async (
  runKey: string,
  disposition: "inline" | "attachment" = "inline"
): Promise<Blob> => {
  const response = await Axios.get(`/data/drat-rule-log/runs/${runKey}/file`, {
    params: { disposition },
    responseType: "blob",
  });
  return response.data as Blob;
};

/**
 * Build the Google Drive web link for a filed document.
 */
export const driveFileViewLink = (driveFileId: string): string =>
  `https://drive.google.com/file/d/${driveFileId}/view`;

/**
 * With `responseType: "blob"` the interceptor cannot read the JSON `detail`, so
 * error toasts fall back to a generic message. This reads the Blob body and
 * surfaces the backend's `detail.message` / `detail.actionable_fix` when present.
 * Returns null when the body carries no message, so callers can fall back to
 * `getApiError` (status, network and timeout messages) instead of axios' text.
 */
export const readApiErrorFromBlob = async (error: unknown): Promise<string | null> => {
  try {
    const data = (error as { response?: { data?: unknown } })?.response?.data;
    if (data instanceof Blob) {
      const parsed = JSON.parse(await data.text()) as {
        detail?: string | { message?: string; actionable_fix?: string };
      };
      const detail = parsed?.detail;
      if (typeof detail === "string") return detail;
      if (detail && typeof detail === "object") {
        const parts = [detail.message, detail.actionable_fix].filter(Boolean);
        if (parts.length) return parts.join(" ");
      }
    }
  } catch {
    // not JSON: no message to surface
  }
  return null;
};

/** Per-outcome run counts for the filing-log summary strip. */
export const fetchRuleLogStats = async (
  params?: Pick<
    DratLogListParams,
    "date_from" | "date_to" | "rule_name" | "entity_name" | "workflow_run_id" | "doc_id" | "step"
  >
): Promise<DratLogStats> => {
  const query: Record<string, string | number> = {};
  if (params?.date_from) query.date_from = params.date_from;
  if (params?.date_to) query.date_to = params.date_to;
  if (params?.rule_name?.trim()) query.rule_name = params.rule_name.trim();
  if (params?.entity_name?.trim()) query.entity_name = params.entity_name.trim();
  if (params?.workflow_run_id?.trim()) query.workflow_run_id = params.workflow_run_id.trim();
  if (params?.doc_id?.trim()) query.doc_id = params.doc_id.trim();
  if (params?.step?.trim()) query.step = params.step.trim();
  const response = await Axios.get<DratLogStats>("/data/drat-rule-log/stats", { params: query });
  return response.data;
};

export const fetchRuleLogEntry = async (entryId: string): Promise<DratRuleLogEntry> => {
  const response = await Axios.get<DratRuleLogEntry>(`/data/drat-rule-log/${entryId}`);
  return response.data;
};

/** Failed DRAT workflow runs (no filing-log entries) so operators can re-run them. */
export const fetchFailedDratRuns = async (
  limit = 50
): Promise<DratFailedRunListResponse> => {
  const response = await Axios.get<DratFailedRunListResponse>("/data/drat-rule-log/failed-runs", {
    params: { limit },
  });
  return response.data;
};

/** Re-run a failed workflow run with the same input params (fresh run, not resume). */
export const rerunFailedDratRun = async (runId: string): Promise<{ id: string }> => {
  const response = await Axios.post<{ id: string }>(
    `/data/workflows/runs/${runId}/rerun`,
    { resume_from_failed: false }
  );
  return response.data;
};

/** Reject a failed workflow run so it leaves the failed-runs queue (EP-869). */
export const rejectFailedDratRun = async (
  runId: string
): Promise<{ run_id: string }> => {
  const response = await Axios.post<{ run_id: string }>(
    `/data/drat-rule-log/failed-runs/${runId}/reject`
  );
  return response.data;
};

export const OUTCOME_LABELS: Record<DratLogOutcome, string> = {
  success: "Success",
  skipped: "Skipped",
  error: "Error",
  manual: "Manual review",
};

export const STEP_LABELS: Record<string, string> = {
  classify: "Classify",
  route: "Route",
  drive_file: "Drive filing",
  hitl: "Human review",
  intake: "Intake",
  validation: "Rule validation (admin)",
};
