import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchReviewAlertSettings,
  updateReviewAlertSettings,
  ReviewAlertSettingsUpdatePayload,
} from "../services/review-alert-settings-api";

export const reviewAlertSettingsKeys = {
  all: ["drat", "review-alert-settings"] as const,
};

export const useReviewAlertSettings = () =>
  useQuery({
    queryKey: reviewAlertSettingsKeys.all,
    queryFn: fetchReviewAlertSettings,
  });

export const useUpdateReviewAlertSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReviewAlertSettingsUpdatePayload) =>
      updateReviewAlertSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewAlertSettingsKeys.all });
    },
  });
};
