import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearIntegrationRoutingMap,
  getIntegrationRoutingMap,
  listIntegrationBundles,
  listIntegrationJobs,
  setIntegrationRoutingMap,
  type IntegrationRouteEntry,
} from "../services/integration-settings-api";

const integrationSettingsKeys = {
  routingMap: ["drat", "integration-settings", "routing-map"] as const,
  jobs: ["drat", "integration-settings", "jobs"] as const,
  bundles: ["drat", "integration-settings", "bundles"] as const,
};

export function useIntegrationRoutingMap() {
  return useQuery({
    queryKey: integrationSettingsKeys.routingMap,
    queryFn: getIntegrationRoutingMap,
  });
}

export function useSetIntegrationRoutingMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entries: IntegrationRouteEntry[]) => setIntegrationRoutingMap(entries),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: integrationSettingsKeys.routingMap }),
  });
}

export function useClearIntegrationRoutingMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearIntegrationRoutingMap,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: integrationSettingsKeys.routingMap }),
  });
}

export function useIntegrationJobs() {
  return useQuery({
    queryKey: integrationSettingsKeys.jobs,
    queryFn: listIntegrationJobs,
  });
}

export function useIntegrationBundles() {
  return useQuery({
    queryKey: integrationSettingsKeys.bundles,
    queryFn: listIntegrationBundles,
  });
}

export type { IntegrationRouteEntry };