import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearOcrConfigId,
  getAbstractionEnabled,
  getExtractionProtocolMap,
  getOcrConfigId,
  setAbstractionEnabled,
  setExtractionProtocolMap,
  setOcrConfigId,
  type ExtractionProtocolEntry,
} from "../services/extraction-settings-api";

const extractionSettingsKeys = {
  abstractionEnabled: ["drat", "extraction-settings", "abstraction-enabled"] as const,
  ocrConfigId: ["drat", "extraction-settings", "ocr-config-id"] as const,
  protocolMap: ["drat", "extraction-settings", "protocol-map"] as const,
};

export function useAbstractionEnabled() {
  return useQuery({
    queryKey: extractionSettingsKeys.abstractionEnabled,
    queryFn: getAbstractionEnabled,
  });
}

export function useSetAbstractionEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setAbstractionEnabled,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: extractionSettingsKeys.abstractionEnabled }),
  });
}

export function useOcrConfigId() {
  return useQuery({
    queryKey: extractionSettingsKeys.ocrConfigId,
    queryFn: getOcrConfigId,
  });
}

export function useSetOcrConfigId() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setOcrConfigId,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: extractionSettingsKeys.ocrConfigId }),
  });
}

export function useClearOcrConfigId() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearOcrConfigId,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: extractionSettingsKeys.ocrConfigId }),
  });
}

export function useExtractionProtocolMap() {
  return useQuery({
    queryKey: extractionSettingsKeys.protocolMap,
    queryFn: getExtractionProtocolMap,
  });
}

export function useSetExtractionProtocolMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entries: ExtractionProtocolEntry[]) => setExtractionProtocolMap(entries),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: extractionSettingsKeys.protocolMap }),
  });
}

export type { ExtractionProtocolEntry };
