import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAbstractionNotificationSettings,
  updateAbstractionNotificationSettings,
  OcrNotificationSettings,
  OcrNotificationSettingsUpdatePayload,
} from "../services/notification-settings-api";

export const NOTIFICATION_SETTINGS_QUERY_KEY = ["abstraction", "notification-settings"];

export function useAbstractionNotificationSettings() {
  return useQuery<OcrNotificationSettings, Error>({
    queryKey: NOTIFICATION_SETTINGS_QUERY_KEY,
    queryFn: fetchAbstractionNotificationSettings,
  });
}

export function useUpdateAbstractionNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation<
    OcrNotificationSettings,
    Error,
    OcrNotificationSettingsUpdatePayload
  >({
    mutationFn: updateAbstractionNotificationSettings,
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_SETTINGS_QUERY_KEY });
      // Optionally update the cache directly
      queryClient.setQueryData(NOTIFICATION_SETTINGS_QUERY_KEY, data);
    },
  });
}
