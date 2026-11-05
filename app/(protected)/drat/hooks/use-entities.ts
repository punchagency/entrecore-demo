import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEntities,
  importEntities,
  createEntity,
  updateEntity,
  deleteEntity,
  syncFromAirtable,
  getAirtableSyncConfig,
  setAirtableSyncConfig,
  clearAirtableSyncConfig,
  fetchAirtableBases,
  fetchAirtableTables,
  getDriveAutoProvisionConfig,
  setDriveAutoProvisionConfig,
  clearDriveAutoProvisionConfig,
  provisionDriveFolders,
  AirtableBase,
  AirtableTable,
  DriveAutoProvisionConfig,
  DriveAutoProvisionConfigResponse,
  DriveProvisionResult,
  Entity,
  EntityListResponse,
  ImportResponse,
  SyncAirtableResponse,
  AirtableSyncConfig,
  AirtableSyncConfigResponse,
  CreateEntityPayload,
  UpdateEntityPayload,
} from "../services/entities-api";

export type {
  Entity,
  EntityListResponse,
  ImportResponse,
  SyncAirtableResponse,
  AirtableSyncConfig,
  AirtableSyncConfigResponse,
  AirtableBase,
  AirtableTable,
  DriveAutoProvisionConfig,
  DriveAutoProvisionConfigResponse,
  DriveProvisionResult,
  CreateEntityPayload,
  UpdateEntityPayload,
};

export const entityKeys = {
  all: ["drat", "entities"] as const,
  list: (params?: { search?: string; page?: number; limit?: number; enabled?: boolean }) =>
    [...entityKeys.all, "list", params] as const,
  airtableConfig: ["drat", "entities", "airtable-sync-config"] as const,
  driveAutoProvision: ["drat", "entities", "drive-auto-provision"] as const,
};

export const useEntities = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: entityKeys.list(params),
    queryFn: () => fetchEntities(params),
    placeholderData: (previousData) => previousData,
  });
};

export const useImportEntities = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importEntities(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.all });
    },
  });
};

export const useCreateEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEntityPayload) => createEntity(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.all });
    },
  });
};

export const useUpdateEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEntityPayload }) =>
      updateEntity(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.all });
    },
  });
};

export const useDeleteEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEntity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.all });
      queryClient.invalidateQueries({ queryKey: ["drat", "entity-drive-map"] });
    },
  });
};

export const useSyncFromAirtable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncFromAirtable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.all });
      queryClient.invalidateQueries({ queryKey: ["drat", "entity-drive-map"] });
    },
  });
};

export const useAirtableSyncConfig = () => {
  return useQuery({
    queryKey: entityKeys.airtableConfig,
    queryFn: getAirtableSyncConfig,
  });
};

export const useSetAirtableSyncConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: AirtableSyncConfig) => setAirtableSyncConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.airtableConfig });
    },
  });
};

/** Each call hits the Airtable API, so only fetch while the settings dialog is open. */
export const useAirtableBases = (enabled: boolean) => {
  return useQuery({
    queryKey: [...entityKeys.airtableConfig, "bases"],
    queryFn: fetchAirtableBases,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAirtableTables = (baseId: string | null, enabled: boolean) => {
  return useQuery({
    queryKey: [...entityKeys.airtableConfig, "tables", baseId],
    queryFn: () => fetchAirtableTables(baseId as string),
    enabled: enabled && !!baseId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useClearAirtableSyncConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearAirtableSyncConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.airtableConfig });
    },
  });
};

export const useDriveAutoProvisionConfig = () => {
  return useQuery({
    queryKey: entityKeys.driveAutoProvision,
    queryFn: getDriveAutoProvisionConfig,
  });
};

export const useSetDriveAutoProvisionConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: DriveAutoProvisionConfig) => setDriveAutoProvisionConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.driveAutoProvision });
    },
  });
};

export const useClearDriveAutoProvisionConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearDriveAutoProvisionConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.driveAutoProvision });
    },
  });
};

export const useProvisionDriveFolders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: provisionDriveFolders,
    onSuccess: () => {
      // Provisioning writes drive maps, which the entities table renders.
      queryClient.invalidateQueries({ queryKey: ["drat", "entity-drive-map"] });
      queryClient.invalidateQueries({ queryKey: entityKeys.all });
    },
  });
};
