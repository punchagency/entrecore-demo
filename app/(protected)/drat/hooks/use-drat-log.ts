import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DratFailedRun,
  DratFailedRunListResponse,
  DratLogListParams,
  DratLogStats,
  DratRuleLogEntry,
  DratRuleLogRunDetail,
  DratRuleLogRunListResponse,
  DratRuleLogRunSummary,
  fetchFailedDratRuns,
  fetchRuleLogRun,
  fetchRuleLogRuns,
  fetchRuleLogStats,
  rejectFailedDratRun,
  rerunFailedDratRun,
} from "../services/log-api";

export type {
  DratFailedRun,
  DratFailedRunListResponse,
  DratLogStats,
  DratRuleLogEntry,
  DratRuleLogRunDetail,
  DratRuleLogRunListResponse,
  DratRuleLogRunSummary,
  DratLogListParams,
};

export const logKeys = {
  all: ["drat", "rule-log"] as const,
  runs: (params?: DratLogListParams) => [...logKeys.all, "runs", params] as const,
  runDetail: (runKey: string) => [...logKeys.all, "run", runKey] as const,
  failedRuns: ["drat", "rule-log", "failed-runs"] as const,
};

export const useRuleLogRuns = (params?: DratLogListParams) => {
  return useQuery({
    queryKey: logKeys.runs(params),
    queryFn: () => fetchRuleLogRuns(params),
    refetchInterval: 30_000,
  });
};

export const useRuleLogRun = (runKey: string | null) => {
  return useQuery({
    queryKey: logKeys.runDetail(runKey ?? ""),
    queryFn: () => fetchRuleLogRun(runKey!),
    enabled: !!runKey,
  });
};

export const useFailedDratRuns = () => {
  return useQuery({
    queryKey: logKeys.failedRuns,
    queryFn: () => fetchFailedDratRuns(),
    refetchInterval: 30_000,
  });
};

export const useRuleLogStats = (
  params?: Pick<
    DratLogListParams,
    "date_from" | "date_to" | "rule_name" | "entity_name" | "workflow_run_id" | "doc_id" | "step"
  >
) => {
  return useQuery({
    queryKey: [...logKeys.all, "stats", params] as const,
    queryFn: () => fetchRuleLogStats(params),
    enabled: true,
  });
};

export const useRerunFailedDratRun = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => rerunFailedDratRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logKeys.failedRuns });
      queryClient.invalidateQueries({ queryKey: logKeys.runs() });
    },
  });
};

export const useRejectFailedDratRun = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => rejectFailedDratRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logKeys.failedRuns });
    },
  });
};
