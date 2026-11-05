import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchIntegrationPreview,
  saveMappings,
  fetchMappingVersions,
  fetchMappingVersion,
  runPreviewSample,
  fetchPostExecutionResult,
  IntegrationPreviewResponse,
  MappingSaveRequest,
  MappingVersion,
  TransformedPreviewResponse,
  PostExecutionResult,
  ColumnMapping,
  MappingVersionStatus,
} from "../services/integration-api";

export type {
  IntegrationPreviewResponse,
  MappingSaveRequest,
  MappingVersion,
  TransformedPreviewResponse,
  PostExecutionResult,
};

// ---------- Query Key Factory ----------

export const integrationKeys = {
  all: ["integration"] as const,
  preview: (workflowId: string) => [...integrationKeys.all, "preview", workflowId] as const,
  versions: (workflowId: string) => [...integrationKeys.all, "versions", workflowId] as const,
  version: (workflowId: string, versionId: string) =>
    [...integrationKeys.all, "version", workflowId, versionId] as const,
  postExecution: (workflowId: string) =>
    [...integrationKeys.all, "post-execution", workflowId] as const,
};

// ---------- Queries ----------

export const useIntegrationPreview = (workflowId: string) => {
  return useQuery({
    queryKey: integrationKeys.preview(workflowId),
    queryFn: () => fetchIntegrationPreview(workflowId),
    enabled: !!workflowId,
    staleTime: 30_000,
  });
};

export const useMappingVersions = (workflowId: string) => {
  return useQuery({
    queryKey: integrationKeys.versions(workflowId),
    queryFn: () => fetchMappingVersions(workflowId),
    enabled: !!workflowId,
  });
};

export const useMappingVersion = (workflowId: string, versionId: string) => {
  return useQuery({
    queryKey: integrationKeys.version(workflowId, versionId),
    queryFn: () => fetchMappingVersion(workflowId, versionId),
    enabled: !!workflowId && !!versionId,
  });
};

export const usePostExecution = (workflowId: string) => {
  return useQuery({
    queryKey: integrationKeys.postExecution(workflowId),
    queryFn: () => fetchPostExecutionResult(workflowId),
    enabled: !!workflowId,
  });
};

// ---------- Mutations ----------

export const useSaveMappings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workflowId,
      data,
    }: {
      workflowId: string;
      data: MappingSaveRequest;
    }): Promise<{ version_id: string; status: MappingVersionStatus }> =>
      saveMappings(workflowId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: integrationKeys.versions(variables.workflowId),
      });
      queryClient.invalidateQueries({
        queryKey: integrationKeys.preview(variables.workflowId),
      });
    },
  });
};

export const useRunPreviewSample = () => {
  return useMutation({
    mutationFn: ({
      workflowId,
      mappings,
    }: {
      workflowId: string;
      mappings: ColumnMapping[];
    }): Promise<TransformedPreviewResponse> => runPreviewSample(workflowId, mappings),
  });
};
