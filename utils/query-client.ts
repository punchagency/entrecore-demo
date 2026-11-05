import {
  MutationCache,
  QueryCache,
  QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { getApiError, hasShownApiErrorToast, showApiErrorToast } from "@/utils/api-error";
import { shouldRetryRequest } from "@/utils/query-retry";

// Every failed query/mutation is logged once (after retries) with the backend's correlation ID,
// so a report from the console can be matched to the server logs. Screens show the error.
function logRequestFailure(kind: "query" | "mutation", key: QueryKey | undefined, error: unknown) {
  const { status, correlationId, message } = getApiError(error, "Request failed");
  console.error(`[${kind}] failed`, { key, status, correlationId, message });
}

// Error handling defaults (EP-1004). `meta` switches are typed in types/react-query.d.ts.
export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        logRequestFailure("query", query.queryKey, error);
        // Load failures belong in the screen's QueryErrorState; toast only screens without one.
        if (query.meta?.skipErrorToast || !query.meta?.toastOnError) return;
        showApiErrorToast(error, query.meta.errorMessage ?? "Failed to load data");
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        logRequestFailure("mutation", mutation.options.mutationKey, error);
        if (mutation.meta?.skipErrorToast) return;
        // A hook-level onError owns the copy.
        if (mutation.options.onError) return;
        // Callers also handle errors in mutate(vars, { onError }) or a catch around
        // mutateAsync(), which this cache can't see. Those run after this callback, so wait a
        // tick and only toast if none of them did: no duplicates, and no silent failures.
        setTimeout(() => {
          if (hasShownApiErrorToast(error)) return;
          showApiErrorToast(error, mutation.meta?.errorMessage ?? "Request failed");
        }, 0);
      },
    }),
    defaultOptions: {
      queries: {
        // No retry on 4xx; at most two on 5xx, network errors and timeouts (utils/query-retry.ts).
        retry: shouldRetryRequest,
        refetchOnWindowFocus: false,
      },
      // Mutations aren't safe to repeat automatically.
      mutations: { retry: false },
    },
  });
}

// One client per browser session, but a fresh one per server render so cached data can't
// leak between requests (TanStack Query's recommended setup for the Next.js App Router).
let browserQueryClient: QueryClient | undefined;
export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
