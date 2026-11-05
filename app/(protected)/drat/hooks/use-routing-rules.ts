import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRoutingRules,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  deleteAllRoutingRules,
  duplicateRoutingRule,
  reorderRoutingRules,
  importRoutingRules,
  RoutingRule,
  RoutingRuleCondition,
  RoutingRuleListResponse,
  RoutingRuleCreatePayload,
  RoutingRuleUpdatePayload,
  RoutingRuleImportResponse,
  RoutingRuleBulkDeleteResponse,
} from "../services/routing-rules-api";

export type {
  RoutingRule,
  RoutingRuleCondition,
  RoutingRuleListResponse,
  RoutingRuleCreatePayload,
  RoutingRuleUpdatePayload,
  RoutingRuleImportResponse,
  RoutingRuleBulkDeleteResponse,
};

export const routingRuleKeys = {
  all: ["drat", "routing-rules"] as const,
  list: (params?: { search?: string; page?: number; limit?: number; source?: string }) =>
    [...routingRuleKeys.all, "list", params] as const,
};

export const useRoutingRules = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  source?: string;
}) => {
  return useQuery({
    queryKey: routingRuleKeys.list(params),
    queryFn: () => fetchRoutingRules(params),
    placeholderData: (previousData) => previousData,
  });
};

export const useCreateRoutingRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RoutingRuleCreatePayload) => createRoutingRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routingRuleKeys.all });
    },
  });
};

export const useUpdateRoutingRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RoutingRuleUpdatePayload }) =>
      updateRoutingRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routingRuleKeys.all });
    },
  });
};

export const useDeleteRoutingRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRoutingRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routingRuleKeys.all });
    },
  });
};

export const useDeleteAllRoutingRules = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAllRoutingRules(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routingRuleKeys.all });
    },
  });
};

export const useDuplicateRoutingRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duplicateRoutingRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routingRuleKeys.all });
    },
  });
};

export const useReorderRoutingRules = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderRoutingRules(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routingRuleKeys.all });
    },
  });
};

export const useImportRoutingRules = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, clearExisting }: { file: File; clearExisting?: boolean }) =>
      importRoutingRules(file, clearExisting),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routingRuleKeys.all });
    },
  });
};
