import { Axios } from "@/app/config/axios";

export const EVENT_TRIGGER_TYPES = [
  "dq_rule_failed",
  "file_landed",
  "lineage_changed",
  "model_refresh_completed",
  "pipeline_completed",
  "pipeline_failed",
  "rule_created",
  "rule_deleted",
  "rule_failed",
  "rule_updated",
] as const;

export const POLLING_TRIGGER_TYPES = [
  "db_query_result",
  "db_record_deleted",
  "db_record_inserted",
  "db_record_updated",
  "db_row_threshold",
  "file_modified",
  "file_pattern_match",
  "file_size_exceeded",
  "file_uploaded",
  "file_validation_failed",
] as const;

export type EventTriggerType = (typeof EVENT_TRIGGER_TYPES)[number];
export type PollingTriggerType = (typeof POLLING_TRIGGER_TYPES)[number];
export type TriggerType = EventTriggerType | PollingTriggerType;

export interface TriggerTypeCatalog {
  event_types: EventTriggerType[];
  polling_types: PollingTriggerType[];
  all_types: TriggerType[];
}

export interface TriggerResponse {
  id: string;
  workflow_id: string;
  company_id: string;
  trigger_type: TriggerType;
  enabled: boolean;
  description: string | null;
  config: Record<string, unknown>;
  filter_expr: Record<string, unknown> | null;
  input_params: Record<string, unknown> | null;
  last_triggered_at: string | null;
  trigger_count: number;
  created_by: string;
  is_active: boolean;
}

export interface TriggerHistoryItem {
  id: string;
  trigger_id: string;
  workflow_run_id: string;
  context: Record<string, unknown>;
  fired_at: string;
}

export interface CreateTriggerRequest {
  workflow_id: string;
  trigger_type: TriggerType;
  description?: string | null;
  enabled?: boolean;
  config?: Record<string, unknown>;
  filter_expr?: Record<string, unknown> | null;
  input_params?: Record<string, unknown> | null;
}

export interface UpdateTriggerRequest {
  trigger_type?: TriggerType;
  description?: string | null;
  enabled?: boolean;
  config?: Record<string, unknown>;
  filter_expr?: Record<string, unknown> | null;
  input_params?: Record<string, unknown> | null;
}

export interface TriggerListParams {
  workflow_id?: string;
  trigger_type?: TriggerType;
  enabled?: boolean;
}

export interface TriggerHistoryParams {
  limit?: number;
}

export interface TestFireTriggerRequest {
  context?: Record<string, unknown>;
}

export interface TestFireTriggerResponse {
  status: "dispatched";
  celery_task_id: string;
  trigger_id: string;
}

function buildQueryString(params: Record<string, string | boolean | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    searchParams.append(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchTriggerTypes(): Promise<TriggerTypeCatalog> {
  const response = await Axios.get("/data/triggers/types");
  return response.data;
}

export async function createTrigger(data: CreateTriggerRequest): Promise<TriggerResponse> {
  const response = await Axios.post("/data/triggers", data);
  return response.data;
}

export async function fetchTriggers(params: TriggerListParams = {}): Promise<TriggerResponse[]> {
  const query = buildQueryString({
    workflow_id: params.workflow_id,
    trigger_type: params.trigger_type,
    enabled: params.enabled,
  });
  const response = await Axios.get(`/data/triggers${query}`);
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.items)) return response.data.items;
  if (Array.isArray(response.data?.data)) return response.data.data;
  if (Array.isArray(response.data?.results)) return response.data.results;
  return [];
}

export async function fetchTrigger(triggerId: string): Promise<TriggerResponse> {
  const response = await Axios.get(`/data/triggers/${triggerId}`);
  return response.data;
}

export async function updateTrigger(triggerId: string, data: UpdateTriggerRequest): Promise<TriggerResponse> {
  const response = await Axios.put(`/data/triggers/${triggerId}`, data);
  return response.data;
}

export async function deleteTrigger(triggerId: string): Promise<void> {
  await Axios.delete(`/data/triggers/${triggerId}`);
}

export async function enableTrigger(triggerId: string): Promise<TriggerResponse> {
  const response = await Axios.post(`/data/triggers/${triggerId}/enable`, {});
  return response.data;
}

export async function disableTrigger(triggerId: string): Promise<TriggerResponse> {
  const response = await Axios.post(`/data/triggers/${triggerId}/disable`, {});
  return response.data;
}

export async function fetchTriggerHistory(
  triggerId: string,
  params: TriggerHistoryParams = {}
): Promise<TriggerHistoryItem[]> {
  const query = buildQueryString({
    limit: params.limit,
  });
  const response = await Axios.get(`/data/triggers/${triggerId}/history${query}`);
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.items)) return response.data.items;
  if (Array.isArray(response.data?.data)) return response.data.data;
  if (Array.isArray(response.data?.results)) return response.data.results;
  return [];
}

export async function testFireTrigger(
  triggerId: string,
  data: TestFireTriggerRequest = {}
): Promise<TestFireTriggerResponse> {
  const response = await Axios.post(`/data/triggers/${triggerId}/test-fire`, data);
  return response.data;
}
