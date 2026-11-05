import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPendingReviewTasks,
  fetchReviewTask,
  fetchReviewPreview,
  decideReviewTask,
  DratReviewTask,
  DratReviewTaskListResponse,
  DratReviewDecisionRequest,
  DratReviewPreview,
} from "../services/review-api";

export type {
  DratReviewTask,
  DratReviewTaskListResponse,
  DratReviewDecisionRequest,
  DratReviewPreview,
};

export const reviewKeys = {
  all: ["drat", "review"] as const,
  pending: (params?: { skip?: number; limit?: number }) =>
    [...reviewKeys.all, "pending", params] as const,
  detail: (taskId: string) => [...reviewKeys.all, "detail", taskId] as const,
  preview: (taskId: string) => [...reviewKeys.all, "preview", taskId] as const,
};

export const usePendingReviewTasks = (params?: { skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: reviewKeys.pending(params),
    queryFn: () => fetchPendingReviewTasks(params),
    refetchInterval: 30_000,
  });
};

export const useReviewTask = (taskId: string | null) => {
  return useQuery({
    queryKey: reviewKeys.detail(taskId ?? ""),
    queryFn: () => fetchReviewTask(taskId!),
    enabled: !!taskId,
  });
};

export const useReviewPreview = (taskId: string | null) => {
  return useQuery({
    queryKey: reviewKeys.preview(taskId ?? ""),
    queryFn: () => fetchReviewPreview(taskId!),
    enabled: !!taskId,
    staleTime: 5 * 60_000,
  });
};

export const useDecideReviewTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: string;
      payload: DratReviewDecisionRequest;
    }) => decideReviewTask(taskId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
};
