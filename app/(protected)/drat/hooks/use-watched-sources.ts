import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchWatchedSources,
  createWatchedSource,
  updateWatchedSource,
  deleteWatchedSource,
  WatchedSource,
  WatchedSourceCreateRequest,
  WatchedSourceUpdateRequest,
  WatchedSourceType,
  WatchedSourceConfig,
  InboxSourceConfig,
  FolderSourceConfig,
  GoogleDriveSourceConfig,
  FolderLocationType,
  isInboxSource,
  isFolderSource,
  isGoogleDriveSource,
} from "../services/watched-sources-api";

export type {
  WatchedSource,
  WatchedSourceCreateRequest,
  WatchedSourceUpdateRequest,
  WatchedSourceType,
  WatchedSourceConfig,
  InboxSourceConfig,
  FolderSourceConfig,
  GoogleDriveSourceConfig,
  FolderLocationType,
};

export { isInboxSource, isFolderSource, isGoogleDriveSource };

export const watchedSourceKeys = {
  all: ["drat", "watched-sources"] as const,
  list: () => [...watchedSourceKeys.all, "list"] as const,
};

export const useWatchedSources = () => {
  return useQuery({
    queryKey: watchedSourceKeys.list(),
    queryFn: fetchWatchedSources,
  });
};

export const useCreateWatchedSource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WatchedSourceCreateRequest) => createWatchedSource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: watchedSourceKeys.list() });
    },
  });
};

export const useUpdateWatchedSource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WatchedSourceUpdateRequest }) =>
      updateWatchedSource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: watchedSourceKeys.list() });
    },
  });
};

export const useDeleteWatchedSource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWatchedSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: watchedSourceKeys.list() });
    },
  });
};
