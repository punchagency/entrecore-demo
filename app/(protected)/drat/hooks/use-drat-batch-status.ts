/**
 * Hook for polling the DRAT batch status endpoint.
 *
 * - Polls every 4 s while the batch is active (not all items terminal).
 * - Stops polling once all items are in a terminal state or the batch
 *   status is "complete" / "failed".
 * - Exposes `retryItem` and `retryFailed` mutations that call the per-item retry endpoint
 *   and immediately invalidate the status query.
 */

import { useMutation, useQuery, useQueryClient, type Query } from "@tanstack/react-query";

import {
  fetchDratBatchStatus,
  isDratBatchActive,
  isDratItemTerminal,
  retryDratBatchAllFailed,
  retryDratBatchItem,
  type DratBatchStatusResponse,
} from "../services/batch-status-api";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const batchStatusKeys = {
  all: ["drat", "batch-status"] as const,
  batch: (id: string) => ["drat", "batch-status", id] as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute the appropriate refetch interval for the given batch snapshot.
 * TanStack Query v5 passes the full Query object to refetchInterval.
 * Returns `false` when no more polling is needed.
 */
function computeRefetchInterval(
  query: Query<DratBatchStatusResponse, Error, DratBatchStatusResponse>
): number | false {
  const data = query.state.data;
  if (!data) return 4_000; // haven't loaded yet — keep polling
  if (isDratBatchActive(data.status)) return 4_000;
  // Batch is complete/failed but items may still be moving
  const allTerminal = data.items.every((item) =>
    isDratItemTerminal(item.status)
  );
  return allTerminal ? false : 4_000;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Poll GET /drat/upload/batches/{id} while the batch is active. */
export function useDratBatchStatus(batchId: string | null) {
  return useQuery({
    queryKey: batchStatusKeys.batch(batchId ?? ""),
    queryFn: () => fetchDratBatchStatus(batchId!),
    enabled: !!batchId,
    refetchInterval: computeRefetchInterval,
    // Don't throw away a good snapshot while a refetch is in-flight.
    placeholderData: (prev: DratBatchStatusResponse | undefined) => prev,
  });
}

/** Retry a single failed item. Invalidates the status query on success. */
export function useRetryDratBatchItem(batchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => {
      if (!batchId) return Promise.reject(new Error("No batch ID"));
      return retryDratBatchItem(batchId, itemId);
    },
    onSuccess: () => {
      if (batchId) {
        queryClient.invalidateQueries({
          queryKey: batchStatusKeys.batch(batchId),
        });
      }
    },
  });
}

/** Retry-failed mutation for all failed items. Invalidates the status query on success. */
export function useRetryDratBatchFailed(batchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (failedItemIds: string[]) => {
      if (!batchId) return Promise.reject(new Error("No batch ID"));
      return retryDratBatchAllFailed(batchId, failedItemIds);
    },
    onSuccess: () => {
      if (batchId) {
        queryClient.invalidateQueries({
          queryKey: batchStatusKeys.batch(batchId),
        });
      }
    },
  });
}
