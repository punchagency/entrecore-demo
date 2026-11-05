/**
 * Retry policy for React Query (see app/providers.tsx).
 *
 * - 4xx: never retried. The request itself is wrong (401/403/404, validation), so repeating it
 *   gives the same answer and only delays the error state.
 * - 5xx, network errors and timeouts: retried at most twice, since these are often transient.
 * - Cancelled requests and errors that aren't HTTP failures (bugs in a query function): not
 *   retried.
 *
 * React Query calls `retry(failureCount, error)` with the number of retries already made, so
 * `failureCount < MAX_TRANSIENT_RETRIES` allows exactly that many retries.
 */
export const MAX_TRANSIENT_RETRIES = 2;

export function shouldRetryRequest(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_TRANSIENT_RETRIES) return false;

  const axiosLike = error as
    | { isAxiosError?: unknown; code?: unknown; response?: { status?: unknown } }
    | null
    | undefined;
  const status = axiosLike?.response?.status;

  if (typeof status === "number") return status >= 500;

  // No response: retry network failures and timeouts, but not a cancelled request.
  return axiosLike?.isAxiosError === true && axiosLike.code !== "ERR_CANCELED";
}
