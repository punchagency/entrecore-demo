import { Axios } from "@/app/config/axios";

// ---------- Types ----------

export interface TraceStats {
  total_traces: number;
  unused_traces: number;
  labelled_traces: number;
  positive_traces: number;
  negative_traces: number;
}

export interface Trace {
  id: number;
  user_message: string;
  agent_response: string;
  tool_used: string | null;
  reward: number | null;
  conversation_id: string | null;
  page: string | null;
  used_for_training: boolean;
  created_at: string;
}

export interface TracesResponse {
  traces: Trace[];
  total: number;
  page: number;
  page_size: number;
}

export interface TrainingRun {
  id: number;
  task_id: string;
  status: "pending" | "training" | "completed" | "failed";
  steps_completed: number;
  total_steps: number;
  percent_complete: number;
  scenarios_used: number;
  model_name: string;
  project: string;
  base_model: string;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

export interface RewardResponse {
  success: boolean;
  trace_id: number;
  reward: number;
  label: string;
}

export interface TriggerResponse {
  task_id?: string;
  status?: string;
  message?: string;
  error?: string;
}

// ---------- API Functions ----------

/**
 * GET /data/training/traces/stats
 * Returns aggregate dashboard counts.
 */
export const fetchTraceStats = async (): Promise<TraceStats> => {
  const response = await Axios.get("/data/training/traces/stats");
  return response.data;
};

/**
 * GET /data/training/traces
 * Paginated list of orchestrator interactions.
 */
export const fetchTraces = async (
  page: number = 1,
  pageSize: number = 20,
  unlabelledOnly: boolean = false
): Promise<TracesResponse> => {
  const response = await Axios.get("/data/training/traces", {
    params: {
      page,
      page_size: pageSize,
      unlabelled_only: unlabelledOnly,
    },
  });
  return response.data;
};

/**
 * POST /data/training/traces/{traceId}/reward
 * Submit a reward signal for a specific trace.
 */
export const submitReward = async (
  traceId: number,
  reward: number,
  reasoning?: string
): Promise<RewardResponse> => {
  const response = await Axios.post(`/data/training/traces/${traceId}/reward`, {
    reward,
    reasoning,
  });
  return response.data;
};

/**
 * POST /data/training/trigger
 * Queue a Celery training run on W&B cloud GPUs.
 */
export const triggerTraining = async (
  steps: number = 50
): Promise<TriggerResponse> => {
  const response = await Axios.post("/data/training/trigger", { steps });
  return response.data;
};

/**
 * GET /data/training/traces/export
 * Export traces as a JSON list.
 */
export const exportTraces = async (
  limit: number = 2000,
  unusedOnly: boolean = true
): Promise<Trace[]> => {
  const response = await Axios.get("/data/training/traces/export", {
    params: {
      limit,
      unused_only: unusedOnly,
    },
  });
  return response.data;
};

/**
 * GET /data/training/runs/latest
 * Get live status of most recent run.
 */
export const fetchLatestRun = async (): Promise<TrainingRun> => {
  const response = await Axios.get("/data/training/runs/latest");
  return response.data;
};

/**
 * GET /data/training/runs
 * Get history of past training runs.
 */
export const fetchRuns = async (limit: number = 10): Promise<TrainingRun[]> => {
  const response = await Axios.get("/data/training/runs", { params: { limit } });
  return response.data;
};

/**
 * DELETE /data/training/traces/reset
 * Reset used_for_training flags on all traces.
 */
export const resetTraces = async (): Promise<{ success: boolean; message: string }> => {
  const response = await Axios.delete("/data/training/traces/reset");
  return response.data;
};
