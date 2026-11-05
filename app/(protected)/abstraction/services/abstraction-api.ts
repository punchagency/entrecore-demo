import { Axios } from "@/app/config/axios";
import type { RoutingRuleCondition } from "@/app/(protected)/drat/hooks/use-routing-rules";
import { listOcrConfigurations } from "./ocr-api";

/**
 * Abstraction routing backend client.
 *
 * Base: `/api/v1/data/abstraction` (the shared Axios instance already carries
 * the `/api/v1` prefix, so paths below start at `/data/abstraction`).
 *
 * Mirrors the backend contract on `dev`: pipelines carry ordered steps, rules
 * point at a pipeline via `pipeline_id`, and runs expose per-step snapshots.
 * User-facing copy says "pipeline"/"step", never "chain".
 */

// ---------- Pipelines ----------

export interface AbstractionPipeline {
  id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  steps?: AbstractionPipelineStep[];
  created_at?: string;
  updated_at?: string;
}

export interface AbstractionPipelineCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface AbstractionPipelineUpdate {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface AbstractionPipelineStep {
  id: string;
  pipeline_id: string;
  order_index: number;
  /** OCR configuration this step extracts with. */
  ocr_config_id: string;
  /**
   * `integration_destinations` handle id (from `listAbstractionDestinations`),
   * never a raw job/bundle id.
   */
  destination_id: string;
  destination_type?: string | null;
  label?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Both fields required by the backend; `label` is display-only. */
export interface AbstractionPipelineStepCreate {
  ocr_config_id: string;
  destination_id: string;
  label?: string;
}

export interface AbstractionPipelineStepUpdate {
  ocr_config_id?: string;
  destination_id?: string;
  label?: string | null;
}

// ---------- Rules ----------

export type AbstractionRuleMatchMode = "all" | "any";

export interface AbstractionRule {
  id: string;
  rule_id: string;
  name?: string | null;
  priority?: number;
  match_mode?: AbstractionRuleMatchMode;
  /** Empty/null = catch-all, always matches. */
  conditions?: RoutingRuleCondition[] | null;
  /** Pipeline UUID this rule routes matched documents into. */
  pipeline_id: string;
  is_active?: boolean;
  description?: string | null;
  source?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** `rule_id` and `pipeline_id` required; empty/null conditions = catch-all. */
export interface AbstractionRuleCreate {
  rule_id: string;
  name?: string;
  priority?: number;
  match_mode?: AbstractionRuleMatchMode;
  conditions?: RoutingRuleCondition[] | null;
  pipeline_id: string;
  is_active?: boolean;
  description?: string;
  source?: string;
}

export interface AbstractionRuleUpdate {
  rule_id?: string;
  name?: string | null;
  priority?: number;
  match_mode?: AbstractionRuleMatchMode;
  conditions?: RoutingRuleCondition[] | null;
  pipeline_id?: string;
  is_active?: boolean;
  description?: string | null;
  source?: string | null;
}

/** Wire format for `POST /rules/import`: rules reference `pipeline_id` UUIDs. */
export interface AbstractionRuleImportRequest {
  rules: AbstractionRuleCreate[];
  clear_existing?: boolean;
}

export interface AbstractionRuleImportResponse {
  success: boolean;
  imported_count: number;
  errors: string[];
  validation_report?: Record<string, unknown>;
}

// ---------- Runs (read-only) ----------

export type AbstractionPipelineRunStatus =
  | "queued"
  | "chain_running"
  | "chain_review"
  | "chain_completed"
  | "completed"
  | "aborted";

export interface AbstractionPipelineStepRun {
  order_index: number;
  status: string;
  /** Why the step failed. May be raw exception text; render via jobFailureMessage. */
  error?: string | null;
  /** The run the step dispatched; the backend logs its full error under this ID. */
  integration_run_id?: string | null;
  integration_bundle_run_id?: string | null;
  workflow_run_id?: string | null;
  [key: string]: unknown;
}

export interface AbstractionPipelineRun {
  id: string;
  rule_id?: string | null;
  pipeline_id?: string | null;
  status: AbstractionPipelineRunStatus;
  /** Why an aborted run stopped. May be raw exception text; render via jobFailureMessage. */
  abort_reason?: string | null;
  /** The document this run abstracts. */
  platform_doc_id?: string | null;
  step_runs: AbstractionPipelineStepRun[];
  [key: string]: unknown;
}

// ---------- Destinations ----------

/**
 * Minimal `integration_destinations` handle shape: what the step picker needs.
 * The full type lives in the data-room integration service; this stays local
 * so abstraction does not couple to that module.
 */
export interface AbstractionDestination {
  id: string;
  reference_name: string;
  destination_type: string;
  target_name?: string | null;
  /** 'ocr_document' | 'connector' — what the underlying job reads. */
  source_type?: string | null;
  /**
   * The table the underlying job READS (as opposed to where it writes). Only
   * set for a connector-source job, where it names the OCR staging table — and
   * there it must agree with the step's protocol, or the chain pushes a
   * different protocol's rows. Null for an ocr_document job, which reads the
   * document's mapped_data directly and so has no table to match.
   */
  source_table?: string | null;
  [key: string]: unknown;
}

// ---------- Helpers ----------

const BASE = "/data/abstraction";

type ListParams = Record<string, string | number | boolean | undefined>;

const cleanParams = (params?: ListParams): ListParams | undefined => {
  if (!params) return undefined;
  const entries = Object.entries(params).filter(([, value]) => value !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const normalizeArray = <T>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["items", "rules", "pipelines", "runs", "steps", "data", "results"]) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
};

/** OCR configurations, reused from ocr-api (not duplicated here). */
export const listOcrConfigs = listOcrConfigurations;

// ---------- Pipelines ----------

export const listAbstractionPipelines = async (): Promise<AbstractionPipeline[]> => {
  const response = await Axios.get(`${BASE}/pipelines`);
  return normalizeArray<AbstractionPipeline>(response.data);
};

export const getAbstractionPipeline = async (id: string): Promise<AbstractionPipeline> => {
  const response = await Axios.get(`${BASE}/pipelines/${id}`);
  return response.data;
};

export const createAbstractionPipeline = async (
  payload: AbstractionPipelineCreate
): Promise<AbstractionPipeline> => {
  const response = await Axios.post(`${BASE}/pipelines`, payload);
  return response.data;
};

export const updateAbstractionPipeline = async (
  id: string,
  payload: AbstractionPipelineUpdate
): Promise<AbstractionPipeline> => {
  const response = await Axios.patch(`${BASE}/pipelines/${id}`, payload);
  return response.data;
};

export const deleteAbstractionPipeline = async (id: string): Promise<void> => {
  await Axios.delete(`${BASE}/pipelines/${id}`);
};

// ---------- Steps ----------

export const listAbstractionSteps = async (
  pipelineId: string
): Promise<AbstractionPipelineStep[]> => {
  const response = await Axios.get(`${BASE}/pipelines/${pipelineId}/steps`);
  return normalizeArray<AbstractionPipelineStep>(response.data);
};

export const createAbstractionStep = async (
  pipelineId: string,
  payload: AbstractionPipelineStepCreate
): Promise<AbstractionPipelineStep> => {
  const response = await Axios.post(`${BASE}/pipelines/${pipelineId}/steps`, payload);
  return response.data;
};

/**
 * Steps are addressed UNDER their pipeline — `/pipelines/{id}/steps/{stepId}`,
 * not `/steps/{stepId}`. The flat form these two used to call does not exist
 * on the backend and answered 404 for every edit and every delete.
 */
export const updateAbstractionStep = async (
  pipelineId: string,
  stepId: string,
  payload: AbstractionPipelineStepUpdate
): Promise<AbstractionPipelineStep> => {
  const response = await Axios.patch(
    `${BASE}/pipelines/${pipelineId}/steps/${stepId}`,
    payload
  );
  return response.data;
};

export const deleteAbstractionStep = async (
  pipelineId: string,
  stepId: string
): Promise<void> => {
  await Axios.delete(`${BASE}/pipelines/${pipelineId}/steps/${stepId}`);
};

/** Persists drag/up-down ordering. Backend PipelineStepReorderRequest takes { step_ids } (full list, partial rejected). */
export const reorderAbstractionSteps = async (
  pipelineId: string,
  orderedIds: string[]
): Promise<AbstractionPipelineStep[]> => {
  const response = await Axios.post(`${BASE}/pipelines/${pipelineId}/steps/reorder`, {
    step_ids: orderedIds,
  });
  return normalizeArray<AbstractionPipelineStep>(response.data);
};

// ---------- Rules ----------

export const listAbstractionRules = async (
  params?: ListParams
): Promise<AbstractionRule[]> => {
  const response = await Axios.get(`${BASE}/rules`, { params: cleanParams(params) });
  return normalizeArray<AbstractionRule>(response.data);
};

export const getAbstractionRule = async (id: string): Promise<AbstractionRule> => {
  const response = await Axios.get(`${BASE}/rules/${id}`);
  return response.data;
};

export const createAbstractionRule = async (
  payload: AbstractionRuleCreate
): Promise<AbstractionRule> => {
  const response = await Axios.post(`${BASE}/rules`, payload);
  return response.data;
};

export const updateAbstractionRule = async (
  id: string,
  payload: AbstractionRuleUpdate
): Promise<AbstractionRule> => {
  const response = await Axios.patch(`${BASE}/rules/${id}`, payload);
  return response.data;
};

export const deleteAbstractionRule = async (id: string): Promise<void> => {
  await Axios.delete(`${BASE}/rules/${id}`);
};

/** Persists drag ordering; same `ordered_ids` convention as DRAT rules. */
export const reorderAbstractionRules = async (
  orderedIds: string[]
): Promise<AbstractionRule[]> => {
  const response = await Axios.post(`${BASE}/rules/reorder`, { ordered_ids: orderedIds });
  return normalizeArray<AbstractionRule>(response.data);
};

export const importAbstractionRules = async (
  payload: AbstractionRuleImportRequest
): Promise<AbstractionRuleImportResponse> => {
  const response = await Axios.post(`${BASE}/rules/import`, payload);
  return response.data;
};

// ---------- Runs (read-only; the backend exposes no re-run/skip) ----------

export const listAbstractionRuns = async (
  params?: ListParams
): Promise<AbstractionPipelineRun[]> => {
  const response = await Axios.get(`${BASE}/pipeline-runs`, { params: cleanParams(params) });
  return normalizeArray<AbstractionPipelineRun>(response.data);
};

export const getAbstractionRun = async (runId: string): Promise<AbstractionPipelineRun> => {
  const response = await Axios.get(`${BASE}/pipeline-runs/${runId}`);
  return response.data;
};

// ---------- Destinations ----------

/**
 * `integration_destinations` handles filtered to abstraction-ready ones, so the
 * step picker cannot offer a destination the abstraction push would reject.
 */
export const listAbstractionDestinations = async (
  abstractionReadyOnly = true
): Promise<AbstractionDestination[]> => {
  const response = await Axios.get("/data/integration/destinations", {
    params: abstractionReadyOnly ? { abstraction_ready_only: true } : undefined,
  });
  return normalizeArray<AbstractionDestination>(response.data);
};

// ---------- Legacy migration ----------

export const runAbstractionLegacyMigration = async (
  payload?: Record<string, unknown>
): Promise<unknown> => {
  const response = await Axios.post(`${BASE}/legacy-migration/run`, payload ?? {});
  return response.data;
};
