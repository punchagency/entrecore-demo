import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchWorkflows,
  fetchWorkflow,
  createWorkflow,
  deleteWorkflow,
  triggerWorkflowRun,
  fetchWorkflowRuns,
  fetchRunStatus,
  cancelRun,
  validateWorkflow,
  fetchSavedWorkflowValidation,
  rerunWorkflow,
  fetchNodeLogs,
  fetchWorkflowMetrics,
  fetchWorkflowVersions,
  fetchWorkflowVersion,
  compareWorkflowVersions,
  restoreWorkflowVersion,
  fetchWorkflowAuditLog,
  exportWorkflowAuditLog,
  WorkflowCreateRequest,
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowRun,
  WorkflowNodeRun,
  WorkflowValidateRequest,
  WorkflowValidationResponse,
  RerunRequest,
  NodeRunLogsResponse,
  RunMetricsResponse,
  VersionSummary,
  VersionCompareResponse,
  AuditLogResponse,
  AuditLogSearchParams,
  AuditAction
} from "../services/workflow-api";

export type {
  WorkflowCreateRequest,
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowRun,
  WorkflowNodeRun,
  WorkflowValidateRequest,
  WorkflowValidationResponse,
  RerunRequest,
  NodeRunLogsResponse,
  RunMetricsResponse,
  VersionSummary,
  VersionCompareResponse,
  AuditLogResponse
};

export const workflowKeys = {
  all: ["workflows"] as const,
  lists: () => [...workflowKeys.all, "list"] as const,
  list: (companyId?: string) => [...workflowKeys.lists(), { companyId }] as const,
  details: () => [...workflowKeys.all, "detail"] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
  runs: (workflowId: string, status?: string) => [...workflowKeys.all, "runs", workflowId, { status }] as const,
  runStatus: (runId: string) => [...workflowKeys.all, "runStatus", runId] as const,
  metrics: (id: string) => [...workflowKeys.all, "metrics", id] as const,
  logs: (nodeRunId: string) => [...workflowKeys.all, "logs", nodeRunId] as const,
  versions: (id: string) => [...workflowKeys.all, "versions", id] as const,
  version: (id: string, versionId: string) => [...workflowKeys.all, "version", id, versionId] as const,
  diff: (id: string, vA: string, vB: string) => [...workflowKeys.all, "diff", id, vA, vB] as const,
  audit: (id: string, params: AuditLogSearchParams) => [...workflowKeys.all, "audit", id, params] as const,
  validation: (id: string) => [...workflowKeys.all, "validation", id] as const,
};

export const useWorkflows = (companyId?: string) => {
  return useQuery({
    queryKey: workflowKeys.list(companyId),
    queryFn: () => fetchWorkflows(companyId),
  });
};

export const useWorkflow = (id: string) => {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: () => fetchWorkflow(id),
    enabled: !!id,
  });
};

export const useWorkflowRuns = (workflowId: string, status?: string) => {
  return useQuery({
    queryKey: workflowKeys.runs(workflowId, status),
    queryFn: () => fetchWorkflowRuns(workflowId, status),
    enabled: !!workflowId,
    refetchInterval: (query) => {
       const runs = query.state.data as WorkflowRun[] | undefined;
       return runs?.some(r => r.status === 'running' || r.status === 'pending') ? 3000 : 15000;
    },
  });
};

export const useRunStatus = (runId: string) => {
  return useQuery({
    queryKey: workflowKeys.runStatus(runId),
    queryFn: () => fetchRunStatus(runId),
    enabled: !!runId,
  });
};

export const useWorkflowMetrics = (id: string) => {
  return useQuery({
    queryKey: workflowKeys.metrics(id),
    queryFn: () => fetchWorkflowMetrics(id),
    enabled: !!id,
  });
};

export const useNodeLogs = (nodeRunId: string) => {
  return useQuery({
    queryKey: workflowKeys.logs(nodeRunId),
    queryFn: () => fetchNodeLogs(nodeRunId),
    enabled: !!nodeRunId,
  });
};

export const useWorkflowVersions = (id: string) => {
  return useQuery({
    queryKey: workflowKeys.versions(id),
    queryFn: () => fetchWorkflowVersions(id),
    enabled: !!id,
  });
};

export const useVersionCompare = (id: string, vA: string, vB: string) => {
  return useQuery({
    queryKey: workflowKeys.diff(id, vA, vB),
    queryFn: () => compareWorkflowVersions(id, vA, vB),
    enabled: !!id && !!vA && !!vB,
  });
};

export const useWorkflowAuditLog = (id: string, params: AuditLogSearchParams = {}) => {
  return useQuery({
    queryKey: workflowKeys.audit(id, params),
    queryFn: () => fetchWorkflowAuditLog(id, params),
    enabled: !!id,
  });
};

export const useExportAuditLog = () => {
  return useMutation({
    mutationFn: ({ id, params }: { id: string; params: Omit<AuditLogSearchParams, "limit" | "offset"> }) => 
      exportWorkflowAuditLog(id, params),
  });
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WorkflowCreateRequest) => createWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
};

export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(deletedId) });
    },
  });
};

export const useTriggerRun = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workflowId: string) => triggerWorkflowRun(workflowId),
    onSuccess: (_, workflowId) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.runs(workflowId) });
    },
  });
};

export const useRerunWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, data }: { runId: string; data: RerunRequest }) => rerunWorkflow(runId, data),
    onSuccess: (newRun) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.runs(newRun.workflow_id) });
    },
  });
};

export const useRestoreVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, versionId }: { id: string; versionId: string }) => restoreWorkflowVersion(id, versionId),
    onSuccess: (wf) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(wf.id) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.versions(wf.id) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.audit(wf.id, {}) });
    },
  });
};

export const useWorkflowValidation = () => {
  return useMutation({
    mutationFn: (data: WorkflowValidateRequest) => validateWorkflow(data),
  });
};

export const useCancelRun = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => cancelRun(runId),
    onSuccess: (_, runId) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.runStatus(runId) });
      queryClient.invalidateQueries({ queryKey: ["workflows", "runs"] });
    },
  });
};
