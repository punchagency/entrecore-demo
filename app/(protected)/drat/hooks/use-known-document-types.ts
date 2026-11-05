import { useQuery } from "@tanstack/react-query";
import { getKnownDocumentTypes } from "../services/known-document-types-api";

/**
 * Loads the backend's known document-type values for the routing condition
 * editor. Never throws for the UI: the service swallows a missing endpoint and
 * returns [], so callers can treat `data ?? []` as "no suggestions".
 *
 * Disabled until the backend ships the endpoint: there is no
 * `known-document-types` route yet, so even attempting the request only
 * produces 404 noise. The condition editor's free-text `document_type` input
 * keeps working meanwhile.
 */
export function useKnownDocumentTypes() {
  return useQuery({
    queryKey: ["drat", "known-document-types"],
    queryFn: getKnownDocumentTypes,
    enabled: false,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
