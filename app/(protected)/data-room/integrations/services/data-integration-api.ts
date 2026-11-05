import { Axios } from "@/app/config/axios";

// ----------------------------------------------------------------------
// DATA MODELS
// ----------------------------------------------------------------------

export interface IntegrationColumnMapping {
  id?: string;
  job_id?: string;
  source_column: string;
  destination_column: string;
  data_type: "string" | "integer" | "float" | "date" | "boolean";
  transformation?: string | null;
  is_required: boolean;
  default_value?: string | null;
  order_index: number;
  match_score?: number;
  match_confidence?: "auto" | "review_suggested" | "unmatched";
  created_at?: string;
  updated_at?: string;
}

const INTEGRATION_DATA_TYPES = new Set<IntegrationColumnMapping["data_type"]>([
  "string",
  "integer",
  "float",
  "date",
  "boolean",
]);

/** Normalize API payloads (snake_case or camelCase) for the mapping editor UI. */
export function normalizeIntegrationColumnMappings(
  mappings: unknown[] | null | undefined
): IntegrationColumnMapping[] {
  if (!mappings?.length) return [];

  return mappings.map((entry, index) => {
    const raw = (entry ?? {}) as Record<string, unknown>;
    const dataTypeRaw = raw.data_type ?? raw.dataType;
    const data_type = (
      typeof dataTypeRaw === "string" && INTEGRATION_DATA_TYPES.has(dataTypeRaw as IntegrationColumnMapping["data_type"])
        ? dataTypeRaw
        : "string"
    ) as IntegrationColumnMapping["data_type"];

    return {
      id: typeof raw.id === "string" ? raw.id : undefined,
      job_id:
        typeof raw.job_id === "string"
          ? raw.job_id
          : typeof raw.jobId === "string"
            ? raw.jobId
            : undefined,
      source_column: String(
        raw.source_column ?? raw.sourceColumn ?? raw.source_field ?? raw.source ?? ""
      ).trim(),
      destination_column: String(
        raw.destination_column ??
          raw.destinationColumn ??
          raw.target_column ??
          raw.targetColumn ??
          raw.target ??
          ""
      ).trim(),
      data_type,
      transformation: (raw.transformation as string | null | undefined) ?? null,
      is_required: Boolean(raw.is_required ?? raw.isRequired ?? false),
      default_value: (raw.default_value ?? raw.defaultValue ?? null) as string | null,
      order_index:
        typeof raw.order_index === "number"
          ? raw.order_index
          : typeof raw.orderIndex === "number"
            ? raw.orderIndex
            : index,
      match_score:
        typeof raw.match_score === "number"
          ? raw.match_score
          : typeof raw.matchScore === "number"
            ? raw.matchScore
            : undefined,
      match_confidence: (raw.match_confidence ?? raw.matchConfidence) as
        | IntegrationColumnMapping["match_confidence"]
        | undefined,
      created_at: typeof raw.created_at === "string" ? raw.created_at : undefined,
      updated_at: typeof raw.updated_at === "string" ? raw.updated_at : undefined,
    };
  });
}

/** PATCH replaces the entire array — send a clean payload without stale ids. */
export function serializeColumnMappingsForPatch(
  mappings: IntegrationColumnMapping[]
): IntegrationColumnMapping[] {
  return mappings.map((mapping, index) => ({
    source_column: mapping.source_column,
    destination_column: mapping.destination_column,
    data_type: mapping.data_type ?? "string",
    is_required: mapping.is_required ?? false,
    order_index: index,
    transformation: mapping.transformation ?? null,
    default_value: mapping.default_value ?? null,
  }));
}

export interface ValidationRuleConfig {
  min?: number;
  max?: number;
  pattern?: string;
  allowed_values?: string[];
  min_months?: number;
  [key: string]: any;
}

export interface IntegrationValidationRule {
  id?: string;
  job_id?: string;
  rule_name: string;
  rule_type: "not_null" | "range_check" | "regex" | "lookup" | "tenure_check";
  target_column: string;
  config: ValidationRuleConfig;
  on_failure: "flag" | "reject" | "review";
  created_at?: string;
  updated_at?: string;
}

/**
 * A stable, human-named pointer at "wherever this data should land" (EP-947).
 *
 * Needed because a job id is NOT durable: saving a job's mappings versions it and
 * mints a new id. A destination names the job family instead, and the backend
 * re-points it on every edit — so a DRAT pipeline step stores `id` from here and
 * keeps resolving months and several job edits later.
 */
export interface IntegrationDestination {
  /** What a pipeline step stores. Stable forever, including across renames. */
  id: string;
  /** What a person typed and later picks from a list. Editable. */
  reference_name: string;
  description?: string | null;
  destination_type: "job" | "bundle";
  current_job_id?: string | null;
  current_bundle_id?: string | null;
  /**
   * The underlying job or bundle's own name — NOT the reference_name, and often
   * different. Show both: two destinations can point at similarly-named jobs.
   */
  target_name?: string | null;
  destination_table?: string | null;
  source_type?: string | null;
  /** Which job version this resolves to today. Moves on every job edit; `id` does not. */
  version?: number | null;
}

export interface IntegrationJob {
  id: string;
  company_id: string;
  name: string;
  version: number;
  description?: string;
  integration_type: string;
  source_type: string;
  source_connector_config_id?: string | null;
  source_file_path?: string | null;
  source_table?: string | null;
  destination_connector_config_id?: string | null;
  destination_table: string;
  /**
   * Destination write mode. `upsert_fields` lists the destination columns a row
   * is matched on: several columns form a COMPOSITE key, and a row matches only
   * when EVERY one agrees. Null or [] means Append — nothing to match on, so
   * every run adds new rows.
   *
   * `upsert_field` is the legacy single-column form, kept because jobs created
   * before composite keys carry only that. Read them through
   * `resolveUpsertKeys()` rather than separately.
   */
  upsert_fields?: string[] | null;
  upsert_field?: string | null;
  bundle_id?: string | null;
  status: "draft" | "pending_mapping_approval" | "pending_review" | "active" | "archived";
  locked?: boolean;
  locked_at?: string | null;
  locked_by?: string | null;
  schedule_cron?: string | null;
  schedule_timezone?: string;
  schedule_enabled: boolean;
  schedule_next_run_at?: string | null;
  schedule_last_run_at?: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  column_mappings: IntegrationColumnMapping[];
  validation_rules: IntegrationValidationRule[];
}

/** PATCH may return a new job version/id — resolve the id the client should use next. */
export function resolveIntegrationJobId(
  raw: Record<string, unknown>,
  fallbackId?: string
): string {
  for (const key of ["id", "job_id", "jobId", "new_job_id", "newJobId"]) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallbackId?.trim() ?? "";
}

/**
 * The destination columns a job matches rows on, or [] for Append.
 *
 * Mirrors `_resolve_upsert_keys` in services/integration_tasks.py — composite
 * key first, legacy single column second, else Append. Keep the two in step: if
 * the UI resolves a job differently from the backend, it will show Append for a
 * job that is really upserting, or the reverse.
 *
 * Note the legacy fallback only applies when `upsert_fields` is empty AND
 * `upsert_field` is set, which is a job that predates composite keys. Saving
 * such a job through this UI clears the legacy column, so it only ever happens
 * once per job.
 */
export function resolveUpsertKeys(
  job: Pick<IntegrationJob, "upsert_fields" | "upsert_field"> | null | undefined
): string[] {
  const composite = (job?.upsert_fields ?? []).filter(
    (c): c is string => typeof c === "string" && c.trim().length > 0
  );
  if (composite.length > 0) return composite;
  const legacy = job?.upsert_field?.trim();
  return legacy ? [legacy] : [];
}

export function normalizeIntegrationJob(
  entry: unknown,
  fallbackId?: string
): IntegrationJob {
  const raw = (entry ?? {}) as Record<string, unknown>;
  const id = resolveIntegrationJobId(raw, fallbackId);
  const column_mappings = normalizeIntegrationColumnMappings(
    (raw.column_mappings ?? raw.columnMappings) as unknown[] | null | undefined
  );

  return {
    ...(raw as unknown as IntegrationJob),
    id,
    column_mappings,
    locked: Boolean(raw.locked),
    status: (raw.status as IntegrationJob["status"]) ?? "draft",
  };
}

export type IntegrationMappingReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested";

export interface IntegrationMappingReview {
  id: string;
  job_id: string;
  company_id: string;
  status: IntegrationMappingReviewStatus;
  notes?: string | null;
  reviewer_notes?: string | null;
  opened_by: string;
  reviewed_by?: string | null;
  opened_at: string;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  job_version?: number | null;
}

function readReviewString(
  raw: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

/** Normalize API payloads (snake_case, camelCase, or alternate timestamp fields). */
export function normalizeIntegrationMappingReview(entry: unknown): IntegrationMappingReview {
  const raw = (entry ?? {}) as Record<string, unknown>;
  const openedAt =
    readReviewString(raw, "opened_at", "openedAt", "created_at", "createdAt") ?? "";
  const reviewedAt =
    readReviewString(raw, "reviewed_at", "reviewedAt", "decided_at", "decidedAt") ?? null;
  const createdAt = readReviewString(raw, "created_at", "createdAt") ?? openedAt;
  const updatedAt = readReviewString(raw, "updated_at", "updatedAt") ?? createdAt;

  return {
    id: String(raw.id ?? ""),
    job_id: String(raw.job_id ?? raw.jobId ?? ""),
    company_id: String(raw.company_id ?? raw.companyId ?? ""),
    status: (raw.status as IntegrationMappingReviewStatus) ?? "pending",
    notes: (raw.notes as string | null | undefined) ?? null,
    reviewer_notes:
      (raw.reviewer_notes ?? raw.reviewerNotes ?? raw.decision_notes ?? raw.decisionNotes ?? null) as
        | string
        | null,
    opened_by: String(raw.opened_by ?? raw.openedBy ?? raw.reviewer_id ?? raw.reviewerId ?? ""),
    reviewed_by: (raw.reviewed_by ?? raw.reviewedBy ?? null) as string | null,
    opened_at: openedAt,
    reviewed_at: reviewedAt,
    created_at: createdAt,
    updated_at: updatedAt,
    job_version:
      typeof raw.job_version === "number"
        ? raw.job_version
        : typeof raw.jobVersion === "number"
          ? raw.jobVersion
          : null,
  };
}

export function normalizeIntegrationMappingReviews(
  reviews: unknown[] | null | undefined
): IntegrationMappingReview[] {
  if (!reviews?.length) return [];
  return reviews.map(normalizeIntegrationMappingReview).filter((review) => Boolean(review.id));
}

export function formatIntegrationReviewTimestamp(
  value: string | null | undefined,
  fallback = "Date unavailable"
): string {
  if (!value?.trim()) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString();
}

export function getIntegrationReviewSortTime(review: IntegrationMappingReview): number {
  const candidate = review.reviewed_at ?? review.opened_at ?? review.created_at;
  if (!candidate) return 0;
  const time = new Date(candidate).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export interface IntegrationMappingReviewOpenRequest {
  notes?: string;
}

export interface IntegrationMappingReviewDecisionRequest {
  decision: "approved" | "rejected" | "changes_requested";
  notes?: string;
}

export interface IntegrationJobCreateRequest {
  name: string;
  description?: string;
  integration_type?: string;
  source_type?: string;
  source_file_path?: string | null;
  source_connector_config_id?: string | null;
  source_connector_name?: string | null;
  source_table?: string | null;
  destination_connector_config_id?: string | null;
  destination_connector_name?: string | null;
  destination_table: string;
  /**
   * Destination columns to match rows on. Send [] to choose Append.
   *
   * On PATCH this field is honoured even when empty — the backend gates on
   * whether it was sent, not on whether it is truthy, which is what lets the UI
   * switch a job back to Append. Omit it entirely to leave the key unchanged.
   */
  upsert_fields?: string[] | null;
  column_mappings?: IntegrationColumnMapping[];
  validation_rules?: IntegrationValidationRule[];
  schedule_cron?: string | null;
  schedule_timezone?: string;
  schedule_enabled?: boolean;
}

export interface IntegrationJobUpdateRequest extends Partial<IntegrationJobCreateRequest> {}

export interface IntegrationRunStage {
  id: string;
  stage_name: "source" | "stage" | "int" | "target";
  order_index: number;
  status:
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "skipped"
    | "cancelled"
    // The target stage stopped because a row's upsert key matched more than
    // one destination record.
    | "awaiting_review";
  records_in: number | null;
  records_out: number | null;
  records_rejected: number | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  error: string | null;
}

export interface IntegrationRunResponse {
  id: string;
  job_id: string;
  company_id: string;
  task_id: string;
  batch_id: string;
  bundle_run_id?: string | null;
  process_timestamp: string;
  /**
   * Mirrors the backend's full vocabulary — the previous four-value union
   * omitted `cancelled` and `completed_with_errors`, which the backend has set
   * for some time, so those runs rendered with no status colour at all.
   *
   * `awaiting_review` and `applying` are the upsert match review detour:
   * running → awaiting_review → applying → completed. Both are non-terminal
   * and both count as active, so a parked run blocks the job's next scheduled
   * run until it is resolved or discarded.
   */
  status:
    | "pending"
    | "running"
    | "completed"
    | "completed_with_errors"
    | "failed"
    | "cancelled"
    | "awaiting_review"
    | "applying";
  triggered_by: string | null;
  total_records: number | null;
  processed_records: number | null;
  failed_records: number | null;
  review_records: number | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  resumed_from_run_id: string | null;
  created_at: string;
  stages: IntegrationRunStage[];
}

export interface IntegrationLineageRow {
  id: string;
  run_id: string;
  job_id: string;
  company_id: string;
  batch_id: string;
  source_row_key: string;
  target_row_key: string;
  destination_table: string;
  created_at: string;
}

export interface ValidationFailure {
  rule_name: string;
  rule_type: string;
  target_column: string;
  on_failure: string;
  value: any;
  message: string;
}

export interface IntegrationReviewRowResponse {
  id: string;
  run_id: string;
  job_id: string;
  company_id: string;
  row_data: Record<string, any>;
  validation_failures: ValidationFailure[];
  review_status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_note: string | null;
}

// ----------------------------------------------------------------------
// Upsert match review — picking which record an upsert should update
//
// A run parks when an outgoing row's composite upsert key matched MORE THAN
// ONE destination record. Rows matching zero or exactly one were already
// written, silently, before the park — only the ambiguous ones are here.
// ----------------------------------------------------------------------

/** "clear" is the absence of a decision — it returns a row to undecided (Undo). */
export type UpsertDecision = "update" | "create" | "skip" | "clear";

/**
 * What writing the incoming row over one candidate would do to one field.
 *
 * Computed backend-side and shipped whole. Do NOT derive these here — doing so
 * means re-implementing the connector's null-ish coercion, the singleSelect
 * omit rule and the empty-list rule, and a screen that gets one of those wrong
 * lies to the user about what is about to be overwritten.
 */
export interface UpsertFieldDiff {
  field: string;
  old: unknown;
  new: unknown;
  state: "unchanged" | "changed" | "would_clear" | "fills";
}

export interface UpsertCandidate {
  record_id: string;
  fields: Record<string, unknown>;
  fingerprint: string | null;
  diff: UpsertFieldDiff[];
  changed_count: number;
  clears_count: number;
}

export interface UpsertMatchRow {
  id: string;
  run_id: string;
  job_id: string;
  row_index: number | null;
  /** The row's identity on screen, e.g. { "Contract Name": "…", Client: "…" }. */
  key_values: Record<string, unknown>;
  incoming_record: Record<string, unknown>;
  platform_doc_id: string | null;
  candidates: UpsertCandidate[];
  /** The TRUE match count, which can exceed candidates.length when capped. */
  candidate_count: number;
  decision: UpsertDecision | null;
  decision_record_id: string | null;
  /**
   * Destination columns this update will NOT write, leaving the chosen record's
   * existing values in place. Empty means every mapped field is written, which
   * is what every row decided before per-field control existed does.
   *
   * Only ever populated for decision === "update".
   */
  excluded_fields: string[];
  decided_by: string | null;
  decided_at: string | null;
  apply_state: "applied" | "stale" | "target_missing" | "failed" | null;
  applied_record_id: string | null;
  apply_error: string | null;
}

export interface UpsertReviewRunSummary {
  run_id: string;
  job_id: string;
  job_name: string | null;
  company_id: string;
  status: string;
  destination_table: string | null;
  base_id: string | null;
  table_id: string | null;
  upsert_keys: string[];
  rows_total: number;
  rows_decided: number;
  rows_stale: number;
  /** Written before the run parked. Past tense on screen — it already happened. */
  records_written: number | null;
  parked_at: string | null;
  started_at: string | null;
}

export interface UpsertReviewListResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  rows?: T[];
  jobs?: T[];
  runs?: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface AISuggestMappingsRequest {
  job_name: string;
  source_table_name: string;
  destination_table: string;
  source_type?: string;
  source_connector_name?: string;
  source_connector_config_id?: string;
  destination_connector_name?: string;
  destination_connector_config_id?: string;
}

export interface AISuggestMappingsResponse {
  job_id: string;
  job_name: string;
  status: string;
  suggested_mappings: IntegrationColumnMapping[];
  source_table: string;
  destination_table: string;
  unmatched_source_columns?: string[];
  unmatched_target_columns?: string[];
  match_method?: "fuzzy" | "llm" | "fallback" | "catalog_aware";
  message: string;
}

export type IntegrationBundleStatus = "draft" | "active" | "archived";

export type IntegrationBundleRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "partial_success"
  | "failed";

export interface IntegrationBundleErrorSummary {
  stage?: string;
  message?: string;
}

export interface IntegrationBundle {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  source_type: "connector" | "csv" | "ocr_document";
  source_connector_config_id?: string | null;
  source_file_path?: string | null;
  source_table?: string | null;
  source_document_id?: string | null;
  status: IntegrationBundleStatus;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  jobs?: IntegrationJob[];
}

export interface IntegrationBundleRun {
  id: string;
  bundle_id: string;
  company_id: string;
  batch_id: string;
  status: IntegrationBundleRunStatus;
  triggered_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  total_children: number;
  succeeded_children: number;
  failed_children: number;
  error_summary: IntegrationBundleErrorSummary | null;
}

export interface IntegrationBundleCreateRequest {
  name: string;
  description?: string;
  source_type: "connector" | "csv" | "ocr_document";
  source_connector_config_id?: string;
  source_file_path?: string;
  source_table?: string;
  source_document_id?: string;
}

export interface IntegrationBundleUpdateRequest extends Partial<IntegrationBundleCreateRequest> {}

export interface IntegrationBundleListResponse {
  items: IntegrationBundle[];
  total: number;
  skip: number;
  limit: number;
}

export interface IntegrationBundleRunListResponse {
  items: IntegrationBundleRun[];
  total: number;
  skip: number;
  limit: number;
}

function normalizeIntegrationBundle(entry: unknown): IntegrationBundle {
  const raw = (entry ?? {}) as Record<string, unknown>;
  const jobsRaw = (raw.jobs ?? raw.child_jobs ?? raw.childJobs) as unknown[] | undefined;
  return {
    ...(raw as unknown as IntegrationBundle),
    id: String(raw.id ?? ""),
    jobs: jobsRaw?.map((job) => normalizeIntegrationJob(job)),
  };
}

function normalizeIntegrationBundleRun(entry: unknown): IntegrationBundleRun {
  const raw = (entry ?? {}) as Record<string, unknown>;
  return {
    id: String(raw.id ?? ""),
    bundle_id: String(raw.bundle_id ?? raw.bundleId ?? ""),
    company_id: String(raw.company_id ?? raw.companyId ?? ""),
    batch_id: String(raw.batch_id ?? raw.batchId ?? ""),
    status: (raw.status as IntegrationBundleRunStatus) ?? "pending",
    triggered_by: (raw.triggered_by ?? raw.triggeredBy ?? null) as string | null,
    started_at: (raw.started_at ?? raw.startedAt ?? null) as string | null,
    completed_at: (raw.completed_at ?? raw.completedAt ?? null) as string | null,
    duration_seconds:
      typeof raw.duration_seconds === "number"
        ? raw.duration_seconds
        : typeof raw.durationSeconds === "number"
          ? raw.durationSeconds
          : null,
    total_children:
      typeof raw.total_children === "number"
        ? raw.total_children
        : typeof raw.totalChildren === "number"
          ? raw.totalChildren
          : 0,
    succeeded_children:
      typeof raw.succeeded_children === "number"
        ? raw.succeeded_children
        : typeof raw.succeededChildren === "number"
          ? raw.succeededChildren
          : 0,
    failed_children:
      typeof raw.failed_children === "number"
        ? raw.failed_children
        : typeof raw.failedChildren === "number"
          ? raw.failedChildren
          : 0,
    error_summary: (raw.error_summary ?? raw.errorSummary ?? null) as IntegrationBundleErrorSummary | null,
  };
}

// ----------------------------------------------------------------------
// API CALLS
// ----------------------------------------------------------------------

const BASE_URL = "/data/integration";
const UPSERT_REVIEW_URL = "/data/integration/upsert-review";

export const IntegrationAPI = {
  // Jobs
  /**
   * One page of jobs, newest first.
   *
   * `search` is matched server-side across name, alias, source and destination
   * table. It has to be: filtering a page client-side would only ever search
   * the rows already fetched, while looking like it had searched everything.
   */
  getJobs: async (
    page = 1,
    page_size = 20,
    search?: string
  ): Promise<PaginatedResponse<IntegrationJob>> => {
    const res = await Axios.get(`${BASE_URL}/jobs`, {
      params: { page, page_size, ...(search?.trim() ? { search: search.trim() } : {}) },
    });
    return res.data;
  },

  getJob: async (job_id: string): Promise<IntegrationJob> => {
    const res = await Axios.get(`${BASE_URL}/jobs/${job_id}`);
    return normalizeIntegrationJob(res.data, job_id);
  },

  createJob: async (data: IntegrationJobCreateRequest): Promise<IntegrationJob> => {
    const res = await Axios.post(`${BASE_URL}/jobs`, data);
    return normalizeIntegrationJob(res.data);
  },

  updateJob: async (job_id: string, data: IntegrationJobUpdateRequest): Promise<IntegrationJob> => {
    const res = await Axios.patch(`${BASE_URL}/jobs/${job_id}`, data);
    return normalizeIntegrationJob(res.data, job_id);
  },

  deleteJob: async (job_id: string): Promise<void> => {
    await Axios.delete(`${BASE_URL}/jobs/${job_id}`);
  },

  /**
   * Approve the mapping and make the job runnable.
   *
   * `reference_name` (EP-947) optionally gives the job a stable, human-readable
   * handle so a DRAT abstraction pipeline step can point at it. Naming happens
   * HERE rather than at creation because a job from a template starts as an
   * unreviewed draft, and an unreviewed draft must not appear in the pipeline
   * picker as though it were ready.
   *
   * Omitted, the job activates exactly as before and simply is not offerable as
   * a pipeline destination. The body stays optional so nothing that already
   * calls this has to change.
   */
  activateJob: async (job_id: string, reference_name?: string): Promise<IntegrationJob> => {
    const trimmed = reference_name?.trim();
    const res = await Axios.post(
      `${BASE_URL}/jobs/${job_id}/activate`,
      trimmed ? { reference_name: trimmed } : {}
    );
    return normalizeIntegrationJob(res.data, job_id);
  },

  enableSchedule: async (job_id: string): Promise<IntegrationJob> => {
    const res = await Axios.post(`${BASE_URL}/jobs/${job_id}/schedule/enable`);
    return res.data;
  },

  disableSchedule: async (job_id: string): Promise<IntegrationJob> => {
    const res = await Axios.post(`${BASE_URL}/jobs/${job_id}/schedule/disable`);
    return res.data;
  },

  suggestMappings: async (data: AISuggestMappingsRequest): Promise<AISuggestMappingsResponse> => {
    const res = await Axios.post(`${BASE_URL}/jobs/suggest-mappings`, data);
    return res.data;
  },

  // Runs
  triggerRun: async (
    job_id: string,
    payload: { resume_from_run_id?: string; triggered_by?: string; idempotency_key?: string } = {}
  ): Promise<IntegrationRunResponse> => {
    const { idempotency_key, ...body } = payload;
    const headers = idempotency_key ? { "Idempotency-Key": idempotency_key } : undefined;
    const res = await Axios.post(`${BASE_URL}/jobs/${job_id}/runs`, body, { headers });
    return res.data;
  },

  getRunsForJob: async (job_id: string, page = 1, page_size = 20): Promise<PaginatedResponse<IntegrationRunResponse>> => {
    const res = await Axios.get(`${BASE_URL}/jobs/${job_id}/runs`, { params: { page, page_size } });
    return res.data;
  },

  getRun: async (run_id: string): Promise<IntegrationRunResponse> => {
    const res = await Axios.get(`${BASE_URL}/runs/${run_id}`);
    return res.data;
  },

  getRunLineage: async (run_id: string, page = 1, page_size = 100): Promise<PaginatedResponse<IntegrationLineageRow>> => {
    const res = await Axios.get(`${BASE_URL}/runs/${run_id}/lineage`, { params: { page, page_size } });
    return res.data;
  },

  // Review
  getReviewQueue: async (params: { job_id?: string; pending_only?: boolean; page?: number; page_size?: number } = {}): Promise<PaginatedResponse<IntegrationReviewRowResponse>> => {
    const res = await Axios.get(`${BASE_URL}/review`, { params });
    return res.data;
  },

  decideReviewRow: async (row_id: string, data: { decision: "approved" | "rejected"; reviewer_note?: string }): Promise<IntegrationReviewRowResponse> => {
    const res = await Axios.patch(`${BASE_URL}/review/${row_id}`, data);
    return res.data;
  },

  // Upsert match review — which record should this upsert update?
  getUpsertReviewRuns: async (
    params: { job_id?: string; skip?: number; limit?: number } = {}
  ): Promise<UpsertReviewListResponse<UpsertReviewRunSummary>> => {
    const res = await Axios.get(`${UPSERT_REVIEW_URL}/runs`, { params });
    return res.data;
  },

  getUpsertReview: async (run_id: string): Promise<UpsertReviewRunSummary> => {
    const res = await Axios.get(`${UPSERT_REVIEW_URL}/runs/${run_id}`);
    return res.data;
  },

  getUpsertReviewRows: async (
    run_id: string,
    params: { decided?: boolean; skip?: number; limit?: number } = {}
  ): Promise<UpsertReviewListResponse<UpsertMatchRow>> => {
    const res = await Axios.get(`${UPSERT_REVIEW_URL}/runs/${run_id}/rows`, { params });
    return res.data;
  },

  /** record_id is required when decision is "update", and must be one of that
   * row's own candidates — the backend 400s otherwise.
   *
   * excluded_fields is "update" only, and OMITTING it leaves the stored set
   * alone while sending [] clears it. Callers that mean "write everything" must
   * therefore send [] explicitly rather than dropping the key. */
  decideUpsertRow: async (
    row_id: string,
    data: { decision: UpsertDecision; record_id?: string; excluded_fields?: string[] }
  ): Promise<UpsertMatchRow> => {
    const res = await Axios.patch(`${UPSERT_REVIEW_URL}/rows/${row_id}`, data);
    return res.data;
  },

  /** Only "create" and "skip". Choosing WHICH record to update is per-row on
   * purpose — a bulk update-by-guess is the silent overwrite this exists to
   * prevent. */
  decideUpsertRowsBulk: async (
    run_id: string,
    data: { row_ids: string[]; decision: "create" | "skip" }
  ): Promise<{ run_id: string; rows_updated: number; decision: string }> => {
    const res = await Axios.post(`${UPSERT_REVIEW_URL}/runs/${run_id}/rows/bulk`, data);
    return res.data;
  },

  applyUpsertReview: async (
    run_id: string
  ): Promise<{ run_id: string; status: string; message: string; rows_to_apply: number }> => {
    const res = await Axios.post(`${UPSERT_REVIEW_URL}/runs/${run_id}/apply`);
    return res.data;
  },

  discardUpsertReview: async (
    run_id: string
  ): Promise<{ run_id: string; status: string; rows_discarded: number; message: string }> => {
    const res = await Axios.post(`${UPSERT_REVIEW_URL}/runs/${run_id}/discard`);
    return res.data;
  },

  refreshUpsertCandidates: async (
    run_id: string
  ): Promise<{ run_id: string; rows_refreshed: number; rows_stale: number; message: string }> => {
    const res = await Axios.post(`${UPSERT_REVIEW_URL}/runs/${run_id}/refresh`);
    return res.data;
  },

  // HITL mapping review (pre-activation schema verification)
  openMappingReview: async (
    job_id: string,
    data: IntegrationMappingReviewOpenRequest = {}
  ): Promise<IntegrationMappingReview> => {
    const res = await Axios.post(`${BASE_URL}/jobs/${job_id}/reviews`, data);
    return normalizeIntegrationMappingReview(res.data);
  },

  getMappingReviews: async (job_id: string): Promise<IntegrationMappingReview[]> => {
    const res = await Axios.get(`${BASE_URL}/jobs/${job_id}/reviews`);
    const rows = Array.isArray(res.data) ? res.data : res.data?.reviews ?? [];
    return normalizeIntegrationMappingReviews(rows);
  },

  decideMappingReview: async (
    review_id: string,
    data: IntegrationMappingReviewDecisionRequest
  ): Promise<IntegrationMappingReview> => {
    const res = await Axios.patch(`${BASE_URL}/reviews/${review_id}`, data);
    return normalizeIntegrationMappingReview(res.data);
  },

  unlockJob: async (job_id: string): Promise<IntegrationJob> => {
    const res = await Axios.post(`${BASE_URL}/jobs/${job_id}/unlock`);
    return normalizeIntegrationJob(res.data, job_id);
  },

  // Bundles — multi-target: one source read, parallel child runs
  createBundle: async (data: IntegrationBundleCreateRequest): Promise<IntegrationBundle> => {
    const res = await Axios.post(`${BASE_URL}/bundles`, data);
    return normalizeIntegrationBundle(res.data);
  },

  listBundles: async (skip = 0, limit = 20): Promise<IntegrationBundleListResponse> => {
    const res = await Axios.get(`${BASE_URL}/bundles`, { params: { skip, limit } });
    const items = (res.data?.items ?? []).map(normalizeIntegrationBundle);
    return {
      items,
      total: res.data?.total ?? items.length,
      skip: res.data?.skip ?? skip,
      limit: res.data?.limit ?? limit,
    };
  },

  getBundle: async (bundle_id: string): Promise<IntegrationBundle> => {
    const res = await Axios.get(`${BASE_URL}/bundles/${bundle_id}`);
    return normalizeIntegrationBundle(res.data);
  },

  updateBundle: async (
    bundle_id: string,
    data: IntegrationBundleUpdateRequest
  ): Promise<IntegrationBundle> => {
    const res = await Axios.patch(`${BASE_URL}/bundles/${bundle_id}`, data);
    return normalizeIntegrationBundle(res.data);
  },

  deleteBundle: async (bundle_id: string): Promise<void> => {
    await Axios.delete(`${BASE_URL}/bundles/${bundle_id}`);
  },

  // The backend returns the attached JOB (IntegrationJobResponse), not the
  // bundle — normalize it as a job. Callers that need the bundle's fresh
  // `jobs` list must re-fetch via getBundle() afterwards.
  attachJobToBundle: async (bundle_id: string, job_id: string): Promise<IntegrationJob> => {
    const res = await Axios.post(`${BASE_URL}/bundles/${bundle_id}/jobs/${job_id}`);
    return normalizeIntegrationJob(res.data);
  },

  detachJobFromBundle: async (bundle_id: string, job_id: string): Promise<IntegrationBundle> => {
    const res = await Axios.delete(`${BASE_URL}/bundles/${bundle_id}/jobs/${job_id}`);
    return normalizeIntegrationBundle(res.data);
  },

  triggerBundleRun: async (bundle_id: string): Promise<IntegrationBundleRun> => {
    const res = await Axios.post(`${BASE_URL}/bundles/${bundle_id}/runs`);
    return normalizeIntegrationBundleRun(res.data);
  },

  getBundleRun: async (bundle_run_id: string): Promise<IntegrationBundleRun> => {
    const res = await Axios.get(`${BASE_URL}/bundle-runs/${bundle_run_id}`);
    return normalizeIntegrationBundleRun(res.data);
  },

  listBundleRuns: async (
    bundle_id: string,
    skip = 0,
    limit = 20
  ): Promise<IntegrationBundleRunListResponse> => {
    const res = await Axios.get(`${BASE_URL}/bundles/${bundle_id}/runs`, {
      params: { skip, limit },
    });
    const items = (res.data?.items ?? []).map(normalizeIntegrationBundleRun);
    return {
      items,
      total: res.data?.total ?? items.length,
      skip: res.data?.skip ?? skip,
      limit: res.data?.limit ?? limit,
    };
  },

  // ---------------------------------------------------------------------------
  // Destinations — stable handles for a job or bundle (EP-947)
  //
  // WHY THESE EXIST AT ALL: a job id is not a durable reference. Saving a job's
  // mappings versions it and mints a NEW id, so anything that stored the old one
  // breaks on the next push. A destination names the job FAMILY, and the backend
  // re-points it whenever the job is edited.
  //
  // So a DRAT pipeline step stores `destination.id` — never `job.id`.
  // ---------------------------------------------------------------------------

  /**
   * Named destinations for this company, resolved to what they point at now.
   *
   * Pass `abstractionReadyOnly` for the DRAT pipeline step picker: it applies the
   * same rules the abstraction push enforces at dispatch (an active ocr_document
   * job or bundle with a resolvable write key), so the picker cannot offer a
   * destination that would only fail once a document arrives.
   */
  listDestinations: async (
    abstractionReadyOnly = false
  ): Promise<IntegrationDestination[]> => {
    const res = await Axios.get(`${BASE_URL}/destinations`, {
      params: abstractionReadyOnly ? { abstraction_ready_only: true } : {},
    });
    return res.data ?? [];
  },

  /** Rename a handle. Nothing pointing at it breaks — callers hold the id. */
  renameDestination: async (
    destination_id: string,
    reference_name: string
  ): Promise<IntegrationDestination> => {
    const res = await Axios.patch(`${BASE_URL}/destinations/${destination_id}`, {
      reference_name: reference_name.trim(),
    });
    return res.data;
  },

  /** Give a bundle a handle, so one picker can offer jobs and bundles together. */
  nameBundleDestination: async (
    bundle_id: string,
    reference_name: string
  ): Promise<IntegrationDestination> => {
    const res = await Axios.post(`${BASE_URL}/destinations/bundles/${bundle_id}`, {
      reference_name: reference_name.trim(),
    });
    return res.data;
  },

  /**
   * Release a handle so its name can be reused.
   *
   * Refused with a 409 while a pipeline step still points at it; the message names
   * the pipeline and step, so surface it rather than swallowing it.
   */
  deleteDestination: async (destination_id: string): Promise<void> => {
    await Axios.delete(`${BASE_URL}/destinations/${destination_id}`);
  },
};

/** After removing compile-blocked mappings (e.g. charter_id formula), open review if needed and decide. */
export async function finalizeMappingFixReviewFlow(
  jobId: string,
  notes: string,
  decision: IntegrationMappingReviewDecisionRequest["decision"] = "approved"
): Promise<{
  review: IntegrationMappingReview;
  openedNewReview: boolean;
  job: IntegrationJob;
  jobId: string;
}> {
  const reviews = await IntegrationAPI.getMappingReviews(jobId);
  let pending = reviews.find((review) => review.status === "pending") ?? null;
  let openedNewReview = false;

  if (!pending) {
    pending = await IntegrationAPI.openMappingReview(jobId, { notes });
    openedNewReview = true;
  }

  const review = await IntegrationAPI.decideMappingReview(pending.id, {
    decision,
    notes,
  });
  const effectiveJobId = review.job_id?.trim() || jobId;
  const job = await IntegrationAPI.getJob(effectiveJobId);
  return { review, openedNewReview, job, jobId: job.id || effectiveJobId };
}
