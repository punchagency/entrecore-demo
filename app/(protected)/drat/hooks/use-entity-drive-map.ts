import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  browseDriveFolders,
  fetchEntityDriveMaps,
  upsertEntityDriveMap,
  UpsertEntityDriveMapPayload,
} from "../services/drive-map-api";

export const driveMapKeys = {
  all: ["drat", "entity-drive-map"] as const,
  list: () => [...driveMapKeys.all, "list"] as const,
  browse: (folderId?: string) => [...driveMapKeys.all, "browse", folderId ?? "root"] as const,
};

export const useEntityDriveMaps = () => {
  return useQuery({
    queryKey: driveMapKeys.list(),
    queryFn: fetchEntityDriveMaps,
  });
};

export const useBrowseDriveFolders = (folderId?: string, enabled = false) => {
  return useQuery({
    queryKey: driveMapKeys.browse(folderId),
    queryFn: () => browseDriveFolders({ folderId }),
    enabled,
  });
};

export const useUpsertEntityDriveMap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertEntityDriveMapPayload) => upsertEntityDriveMap(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: driveMapKeys.all });
    },
  });
};
