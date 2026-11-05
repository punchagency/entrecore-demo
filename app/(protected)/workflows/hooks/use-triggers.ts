import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTrigger,
  deleteTrigger,
  disableTrigger,
  enableTrigger,
  fetchTrigger,
  fetchTriggerHistory,
  fetchTriggers,
  fetchTriggerTypes,
  testFireTrigger,
  updateTrigger,
  CreateTriggerRequest,
  TriggerHistoryItem,
  TriggerHistoryParams,
  TriggerListParams,
  TriggerResponse,
  TriggerTypeCatalog,
  UpdateTriggerRequest,
  TestFireTriggerRequest,
  TestFireTriggerResponse,
} from "../services/trigger-api";

export type {
  CreateTriggerRequest,
  TriggerHistoryItem,
  TriggerHistoryParams,
  TriggerListParams,
  TriggerResponse,
  TriggerTypeCatalog,
  UpdateTriggerRequest,
  TestFireTriggerRequest,
  TestFireTriggerResponse,
};

export const triggerKeys = {
  all: ["workflow-triggers"] as const,
  types: () => [...triggerKeys.all, "types"] as const,
  lists: () => [...triggerKeys.all, "list"] as const,
  list: (params: TriggerListParams = {}) => [...triggerKeys.lists(), params] as const,
  details: () => [...triggerKeys.all, "detail"] as const,
  detail: (triggerId: string) => [...triggerKeys.details(), triggerId] as const,
  history: (triggerId: string, params: TriggerHistoryParams = {}) =>
    [...triggerKeys.all, "history", triggerId, params] as const,
};

export function useTriggerTypes() {
  return useQuery({
    queryKey: triggerKeys.types(),
    queryFn: fetchTriggerTypes,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTriggers(params: TriggerListParams = {}) {
  return useQuery({
    queryKey: triggerKeys.list(params),
    queryFn: () => fetchTriggers(params),
  });
}

export function useTrigger(triggerId: string) {
  return useQuery({
    queryKey: triggerKeys.detail(triggerId),
    queryFn: () => fetchTrigger(triggerId),
    enabled: Boolean(triggerId),
  });
}

export function useTriggerHistory(triggerId: string, params: TriggerHistoryParams = {}) {
  return useQuery({
    queryKey: triggerKeys.history(triggerId, params),
    queryFn: () => fetchTriggerHistory(triggerId, params),
    enabled: Boolean(triggerId),
  });
}

export function useCreateTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTriggerRequest) => createTrigger(data),
    onSuccess: (createdTrigger) => {
      queryClient.invalidateQueries({ queryKey: triggerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: triggerKeys.detail(createdTrigger.id) });
    },
  });
}

export function useUpdateTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      triggerId,
      data,
    }: {
      triggerId: string;
      data: UpdateTriggerRequest;
    }): Promise<TriggerResponse> => updateTrigger(triggerId, data),
    onSuccess: (updatedTrigger) => {
      queryClient.invalidateQueries({ queryKey: triggerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: triggerKeys.detail(updatedTrigger.id) });
    },
  });
}

export function useDeleteTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (triggerId: string) => deleteTrigger(triggerId),
    onSuccess: (_, triggerId) => {
      queryClient.invalidateQueries({ queryKey: triggerKeys.lists() });
      queryClient.removeQueries({ queryKey: triggerKeys.detail(triggerId) });
      queryClient.removeQueries({ queryKey: triggerKeys.history(triggerId) });
    },
  });
}

export function useEnableTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (triggerId: string) => enableTrigger(triggerId),
    onSuccess: (updatedTrigger) => {
      queryClient.invalidateQueries({ queryKey: triggerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: triggerKeys.detail(updatedTrigger.id) });
    },
  });
}

export function useDisableTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (triggerId: string) => disableTrigger(triggerId),
    onSuccess: (updatedTrigger) => {
      queryClient.invalidateQueries({ queryKey: triggerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: triggerKeys.detail(updatedTrigger.id) });
    },
  });
}

export function useTestFireTrigger() {
  return useMutation({
    mutationFn: ({
      triggerId,
      data,
    }: {
      triggerId: string;
      data?: TestFireTriggerRequest;
    }): Promise<TestFireTriggerResponse> => testFireTrigger(triggerId, data),
  });
}
