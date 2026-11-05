import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAbstractionPipeline,
  createAbstractionRule,
  createAbstractionStep,
  deleteAbstractionPipeline,
  deleteAbstractionRule,
  deleteAbstractionStep,
  getAbstractionPipeline,
  getAbstractionRule,
  getAbstractionRun,
  importAbstractionRules,
  listAbstractionDestinations,
  listAbstractionPipelines,
  listAbstractionRules,
  listAbstractionRuns,
  listAbstractionSteps,
  listOcrConfigs,
  reorderAbstractionRules,
  reorderAbstractionSteps,
  updateAbstractionPipeline,
  updateAbstractionRule,
  updateAbstractionStep,
  type AbstractionPipelineCreate,
  type AbstractionPipelineStepCreate,
  type AbstractionPipelineStepUpdate,
  type AbstractionPipelineUpdate,
  type AbstractionRuleCreate,
  type AbstractionRuleImportRequest,
  type AbstractionRuleUpdate,
} from "../services/abstraction-api";

export const abstractionKeys = {
  all: ["abstraction"] as const,
  pipelines: ["abstraction", "pipelines"] as const,
  pipeline: (id: string) => [...abstractionKeys.pipelines, id] as const,
  steps: (pipelineId: string) => [...abstractionKeys.all, "steps", pipelineId] as const,
  rules: ["abstraction", "rules"] as const,
  rule: (id: string) => [...abstractionKeys.rules, id] as const,
  runs: ["abstraction", "runs"] as const,
  run: (id: string) => [...abstractionKeys.runs, id] as const,
  destinations: ["abstraction", "destinations"] as const,
  ocrConfigs: ["abstraction", "ocr-configurations"] as const,
};

// ---------- Pipelines ----------

export function useAbstractionPipelines() {
  return useQuery({ queryKey: abstractionKeys.pipelines, queryFn: listAbstractionPipelines });
}

export function useAbstractionPipeline(id: string | null) {
  return useQuery({
    queryKey: abstractionKeys.pipeline(id ?? ""),
    queryFn: () => getAbstractionPipeline(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useCreateAbstractionPipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AbstractionPipelineCreate) => createAbstractionPipeline(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: abstractionKeys.pipelines });
    },
  });
}

export function useUpdateAbstractionPipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AbstractionPipelineUpdate }) =>
      updateAbstractionPipeline(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: abstractionKeys.pipelines });
    },
  });
}

export function useDeleteAbstractionPipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAbstractionPipeline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: abstractionKeys.all });
    },
  });
}

// ---------- Steps ----------

export function useAbstractionSteps(pipelineId: string | null) {
  return useQuery({
    queryKey: abstractionKeys.steps(pipelineId ?? ""),
    queryFn: () => listAbstractionSteps(pipelineId ?? ""),
    enabled: Boolean(pipelineId),
  });
}

export function useCreateAbstractionStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pipelineId,
      payload,
    }: {
      pipelineId: string;
      payload: AbstractionPipelineStepCreate;
    }) => createAbstractionStep(pipelineId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: abstractionKeys.steps(variables.pipelineId) });
      queryClient.invalidateQueries({ queryKey: abstractionKeys.pipelines });
    },
  });
}

export function useUpdateAbstractionStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pipelineId,
      stepId,
      payload,
    }: {
      pipelineId: string;
      stepId: string;
      payload: AbstractionPipelineStepUpdate;
    }) => updateAbstractionStep(pipelineId, stepId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: abstractionKeys.all });
    },
  });
}

export function useDeleteAbstractionStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pipelineId, stepId }: { pipelineId: string; stepId: string }) =>
      deleteAbstractionStep(pipelineId, stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: abstractionKeys.all });
    },
  });
}

export function useReorderAbstractionSteps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pipelineId, orderedIds }: { pipelineId: string; orderedIds: string[] }) =>
      reorderAbstractionSteps(pipelineId, orderedIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: abstractionKeys.steps(variables.pipelineId) });
    },
  });
}

// ---------- Rules ----------

export function useAbstractionRules() {
  return useQuery({ queryKey: abstractionKeys.rules, queryFn: () => listAbstractionRules() });
}

export function useAbstractionRule(id: string | null) {
  return useQuery({
    queryKey: abstractionKeys.rule(id ?? ""),
    queryFn: () => getAbstractionRule(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useCreateAbstractionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AbstractionRuleCreate) => createAbstractionRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: abstractionKeys.rules });
    },
  });
}

export function useUpdateAbstractionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AbstractionRuleUpdate }) =>
      updateAbstractionRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: abstractionKeys.rules });
    },
  });
}

export function useDeleteAbstractionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAbstractionRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: abstractionKeys.rules });
    },
  });
}

export function useReorderAbstractionRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderAbstractionRules(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: abstractionKeys.rules });
    },
  });
}

export function useImportAbstractionRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AbstractionRuleImportRequest) => importAbstractionRules(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: abstractionKeys.rules });
    },
  });
}

// ---------- Runs (read-only) ----------

export function useAbstractionRuns() {
  return useQuery({ queryKey: abstractionKeys.runs, queryFn: () => listAbstractionRuns() });
}

export function useAbstractionRun(runId: string | null) {
  return useQuery({
    queryKey: abstractionKeys.run(runId ?? ""),
    queryFn: () => getAbstractionRun(runId ?? ""),
    enabled: Boolean(runId),
  });
}

// ---------- Pickers ----------

export function useAbstractionDestinations() {
  return useQuery({
    queryKey: abstractionKeys.destinations,
    queryFn: () => listAbstractionDestinations(true),
  });
}

export function useAbstractionOcrConfigs() {
  return useQuery({ queryKey: abstractionKeys.ocrConfigs, queryFn: listOcrConfigs });
}
