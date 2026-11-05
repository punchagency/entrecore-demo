import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearClassifyPrompt,
  clearFilenameTemplates,
  fetchClassifyPrompt,
  fetchFilenameTemplates,
  updateClassifyPrompt,
  updateFilenameTemplates,
  ClassifyPromptUpdatePayload,
  FilenameTemplateUpdatePayload,
} from "../services/classify-settings-api";

export const classifySettingsKeys = {
  all: ["drat", "classify-settings"] as const,
  prompt: () => [...classifySettingsKeys.all, "prompt"] as const,
  templates: () => [...classifySettingsKeys.all, "templates"] as const,
};

export const useClassifyPrompt = () =>
  useQuery({
    queryKey: classifySettingsKeys.prompt(),
    queryFn: fetchClassifyPrompt,
  });

export const useFilenameTemplates = () =>
  useQuery({
    queryKey: classifySettingsKeys.templates(),
    queryFn: fetchFilenameTemplates,
  });

export const useUpdateClassifyPrompt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClassifyPromptUpdatePayload) => updateClassifyPrompt(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classifySettingsKeys.prompt() });
    },
  });
};

export const useClearClassifyPrompt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearClassifyPrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classifySettingsKeys.prompt() });
    },
  });
};

export const useUpdateFilenameTemplates = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FilenameTemplateUpdatePayload) => updateFilenameTemplates(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classifySettingsKeys.templates() });
    },
  });
};

export const useClearFilenameTemplates = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearFilenameTemplates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classifySettingsKeys.templates() });
    },
  });
};
