import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTraceStats,
  fetchTraces,
  submitReward,
  triggerTraining,
  exportTraces,
  resetTraces,
  fetchRuns,
  fetchLatestRun,
} from "../services/training-api";

// ---------- Query Keys ----------

export const trainingKeys = {
  all: ["training"] as const,
  stats: () => [...trainingKeys.all, "stats"] as const,
  traces: () => [...trainingKeys.all, "traces"] as const,
  traceList: (page: number, pageSize: number, unlabelledOnly: boolean) =>
    [...trainingKeys.traces(), { page, pageSize, unlabelledOnly }] as const,
  runs: () => [...trainingKeys.all, "runs"] as const,
  latestRun: () => [...trainingKeys.all, "latestRun"] as const,
};

// ---------- Queries ----------

/**
 * Fetch aggregate stats for the dashboard.
 * Auto-refreshes every 30 seconds.
 */
export const useTraceStats = () => {
  return useQuery({
    queryKey: trainingKeys.stats(),
    queryFn: fetchTraceStats,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
};

/**
 * Fetch paginated traces for the trace review list.
 */
export const useTraces = (
  page: number = 1,
  pageSize: number = 20,
  unlabelledOnly: boolean = false
) => {
  return useQuery({
    queryKey: trainingKeys.traceList(page, pageSize, unlabelledOnly),
    queryFn: () => fetchTraces(page, pageSize, unlabelledOnly),
    staleTime: 15_000,
  });
};

/**
 * Fetch past training runs
 */
export const useRuns = (limit: number = 10) => {
  return useQuery({
    queryKey: [...trainingKeys.runs(), limit],
    queryFn: () => fetchRuns(limit),
    staleTime: 15_000,
  });
};

/**
 * Fetch latest training run live state
 */
export const useLatestRun = (isPolling: boolean = false) => {
  return useQuery({
    queryKey: trainingKeys.latestRun(),
    queryFn: fetchLatestRun,
    refetchInterval: isPolling ? 3000 : false,
    staleTime: 0,
  });
};

// ---------- Mutations ----------

/**
 * Submit a reward (thumbs up / down) for a trace.
 * Invalidates both trace list and stats caches on success.
 */
export const useSubmitReward = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      traceId,
      reward,
      reasoning,
    }: {
      traceId: number;
      reward: number;
      reasoning?: string;
    }) => submitReward(traceId, reward, reasoning),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.traces() });
      queryClient.invalidateQueries({ queryKey: trainingKeys.stats() });
    },
  });
};

/**
 * Trigger an RL training run on W&B cloud GPUs.
 */
export const useTriggerTraining = () => {
  return useMutation({
    mutationFn: (steps: number = 50) => triggerTraining(steps),
  });
};

/**
 * Export traces as a downloadable JSON file.
 */
export const useExportTraces = () => {
  return useMutation({
    mutationFn: ({
      limit = 2000,
      unusedOnly = true,
    }: {
      limit?: number;
      unusedOnly?: boolean;
    } = {}) => exportTraces(limit, unusedOnly),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `training-traces-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
};

/**
 * Reset used_for_training flags so traces can be re-used.
 * Invalidates trace caches on success.
 */
export const useResetTraces = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetTraces,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.traces() });
      queryClient.invalidateQueries({ queryKey: trainingKeys.stats() });
    },
  });
};
