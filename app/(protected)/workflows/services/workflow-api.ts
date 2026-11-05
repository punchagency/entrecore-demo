import { Axios } from "@/app/config/axios";

// ---------- Types ----------

export interface WorkflowNode {
  node_key: string;
  node_type:
    | "extract"
    | "transform"
    | "load"
    | "integration"
    | "dq_check"
    | "dbt"
    | "notification"
    | "custom"
    | "drat_classify"
    | "drat_route"
    | "drat_approval"
    | "if_else"
    | "switch_case"
    | "loop"
    // Transformer nodes (EP-183 / EP-188)
    | "select"
    | "filter"
    | "join"
    | "union"
    | "aggregate"
    | "calculated_field";
  label: string;
  config: Record<string, any>;
}

export interface WorkflowEdge {
  source_node_key: string;
  target_node_key: string;
}

export interface WorkflowCreateRequest {
  company_id: string; // The user prompt included company_id
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow extends WorkflowCreateRequest {
  id: string;
  created_at?: string;
}

export interface WorkflowNodeRun {
  id: string;
  node_key: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  started_at?: string;
  completed_at?: string;
  logs?: string;
  /** Readable failure reason (the backend's NodeRunResponse field). */
  error_message?: string | null;
  /** Older payloads; prefer error_message. */
  error?: string;
  output_params?: Record<string, any>;
  node_metadata?: Record<string, any>;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  started_at: string;
  completed_at?: string;
  /** Readable reason a failed run stopped; the run ID finds the full error in the logs. */
  error_message?: string | null;
  failed_nodes?: number;
  node_runs?: WorkflowNodeRun[];
}

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  node_key: string | null;
  field: string | null;
}

export interface WorkflowValidationResponse {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface WorkflowValidateRequest {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface RerunRequest {
  input_params?: Record<string, any>;
  triggered_by?: string;
}

export interface NodeRunLogsResponse {
  log_output: string;
  error_message?: string;
  error_details?: any;
  node_metadata?: any;
}

export interface RunSummary {
  id: string;
  status: string;
  started_at: string;
  duration_seconds: number;
}

export interface RunMetricsResponse {
  workflow_id: string;
  total_runs: number;
  by_status: Record<string, number>;
  success_rate_pct: number;
  avg_duration_seconds: number;
  min_duration_seconds: number;
  max_duration_seconds: number;
  total_rows_processed: number;
  total_failed_nodes: number;
  recent_runs: RunSummary[];
}

export interface VersionSummary {
  id: string;
  version: string;
  is_active: boolean;
  created_at: string;
  nodes_count: number;
}

export interface NodeDiff {
  node_key: string;
  change: "added" | "removed" | "modified";
  changed_fields?: Record<string, { from: any; to: any }>;
}

export interface EdgeDiff {
  source_node_key: string;
  target_node_key: string;
  change: "added" | "removed" | "branch_changed";
  branch_from?: string;
  branch_to?: string;
}

export interface VersionCompareResponse {
  version_a: Partial<VersionSummary>;
  version_b: Partial<VersionSummary>;
  field_changes: Record<string, { from: any; to: any }>;
  node_diffs: NodeDiff[];
  edge_diffs: EdgeDiff[];
  identical: boolean;
}

export type AuditAction = 
  | "created" 
  | "updated" 
  | "deleted" 
  | "restored" 
  | "run_started" 
  | "run_completed" 
  | "run_failed" 
  | "node_failed";

export interface AuditLogEntry {
  id: string;
  workflow_id: string;
  workflow_name: string;
  action: AuditAction;
  changed_by: string | null;
  version_from?: string;
  version_to?: string;
  changed_fields: Record<string, any>;
  created_at: string;
}

export interface AuditLogResponse {
  total: number;
  count: number;
  offset: number;
  entries: AuditLogEntry[];
}

export interface AuditLogSearchParams {
  limit?: number;
  offset?: number;
  action?: AuditAction;
  changed_by?: string;
  date_from?: string;
  date_to?: string;
}

// ---------- API Functions ----------

export const fetchWorkflows = async (companyId?: string): Promise<Workflow[]> => {
  const url = companyId ? `/data/workflows/?company_id=${companyId}` : "/data/workflows/";
  const response = await Axios.get(url);
  
  // Handle potentially wrapped responses from standard API patterns
  if (Array.isArray(response.data)) return response.data;
  if (response.data?.workflows && Array.isArray(response.data.workflows)) return response.data.workflows;
  if (response.data?.data && Array.isArray(response.data.data)) return response.data.data;
  if (response.data?.results && Array.isArray(response.data.results)) return response.data.results;
  
  return [];
};

export const fetchWorkflow = async (id: string): Promise<Workflow> => {
  const response = await Axios.get(`/data/workflows/${id}`);
  return response.data;
};

export const createWorkflow = async (data: WorkflowCreateRequest): Promise<Workflow> => {
  const response = await Axios.post("/data/workflows/", data);
  return response.data;
};

export const deleteWorkflow = async (id: string): Promise<void> => {
  await Axios.delete(`/data/workflows/${id}`);
};

export const validateWorkflow = async (data: WorkflowValidateRequest): Promise<WorkflowValidationResponse> => {
  const response = await Axios.post("/data/workflows/validate", data);
  return response.data;
};

export const fetchSavedWorkflowValidation = async (id: string): Promise<WorkflowValidationResponse> => {
  const response = await Axios.get(`/data/workflows/${id}/validate`);
  return response.data;
};

export const triggerWorkflowRun = async (id: string): Promise<WorkflowRun> => {
  const response = await Axios.post(`/data/workflows/${id}/runs`, {});
  return response.data;
};

export const fetchWorkflowRuns = async (id: string, status?: string): Promise<WorkflowRun[]> => {
  const url = status ? `/data/workflows/${id}/runs?status=${status}` : `/data/workflows/${id}/runs`;
  const response = await Axios.get(url);
  
  if (Array.isArray(response.data)) return response.data;
  if (response.data?.runs && Array.isArray(response.data.runs)) return response.data.runs;
  if (response.data?.data && Array.isArray(response.data.data)) return response.data.data;
  if (response.data?.results && Array.isArray(response.data.results)) return response.data.results;

  return [];
};

export const fetchRunStatus = async (runId: string): Promise<WorkflowRun> => {
  const response = await Axios.get(`/data/workflows/runs/${runId}`);
  return response.data;
};

export const rerunWorkflow = async (runId: string, data: RerunRequest): Promise<WorkflowRun> => {
  const response = await Axios.post(`/data/workflows/runs/${runId}/rerun`, data);
  return response.data;
};

export const fetchNodeLogs = async (nodeRunId: string): Promise<NodeRunLogsResponse> => {
  const response = await Axios.get(`/data/workflows/node-runs/${nodeRunId}/logs`);
  return response.data;
};

export const fetchWorkflowMetrics = async (id: string): Promise<RunMetricsResponse> => {
  const response = await Axios.get(`/data/workflows/${id}/metrics`);
  return response.data;
};

export const fetchWorkflowVersions = async (id: string): Promise<VersionSummary[]> => {
  const response = await Axios.get(`/data/workflows/${id}/versions`);
  if (Array.isArray(response.data)) return response.data;
  if (response.data?.versions && Array.isArray(response.data.versions)) return response.data.versions;
  return [];
};

export const fetchWorkflowVersion = async (workflowId: string, versionId: string): Promise<Workflow> => {
  const response = await Axios.get(`/data/workflows/${workflowId}/versions/${versionId}`);
  return response.data;
};

export const compareWorkflowVersions = async (id: string, versionA: string, versionB: string): Promise<VersionCompareResponse> => {
  const response = await Axios.get(`/data/workflows/${id}/versions/${versionA}/compare/${versionB}`);
  return response.data;
};

export const restoreWorkflowVersion = async (id: string, versionId: string, restoredBy?: string): Promise<Workflow> => {
  const response = await Axios.post(`/data/workflows/${id}/versions/${versionId}/restore`, { restored_by: restoredBy });
  return response.data;
};

export const fetchWorkflowAuditLog = async (id: string, params: AuditLogSearchParams = {}): Promise<AuditLogResponse> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.append(key, value.toString());
    }
  });

  const response = await Axios.get(`/data/workflows/${id}/audit-log?${query.toString()}`);
  return response.data;
};

export const exportWorkflowAuditLog = async (id: string, params: Omit<AuditLogSearchParams, "limit" | "offset"> = {}): Promise<void> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.append(key, value.toString());
    }
  });

  // Since this returns a CSV file, we can trigger a browser download
  const url = `${process.env.NEXT_PUBLIC_API_URL || ""}/data/workflows/${id}/audit-log/export?${query.toString()}`;
  window.open(url, "_blank");
};

export const cancelRun = async (runId: string): Promise<void> => {
  await Axios.post(`/data/workflows/runs/${runId}/cancel`, {});
};
