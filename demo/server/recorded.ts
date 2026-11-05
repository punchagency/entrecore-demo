import { recordings } from "@/demo/fixtures/recorded";
import { normalisePath } from "./router";
import type { HttpMethod } from "./types";

/**
 * Responses captured from staging (scripts/import-har.mjs) and replayed as-is.
 * Hand-written handlers take precedence; a recording answers anything they don't.
 */
export interface RecordedEntry {
  method: HttpMethod;
  /** Path relative to `/api/v1`, no query string. */
  path: string;
  /** Query parameters that must be present with these values. Omitted = any query. */
  query?: Record<string, string>;
  status: number;
  data: unknown;
}

export function findRecording(
  method: HttpMethod,
  path: string,
  query: URLSearchParams
): RecordedEntry | undefined {
  const wanted = normalisePath(path);
  let best: RecordedEntry | undefined;
  let bestScore = -1;
  for (const entry of recordings) {
    if (entry.method !== method || normalisePath(entry.path) !== wanted) continue;
    const required = Object.entries(entry.query ?? {});
    if (!required.every(([key, value]) => query.get(key) === value)) continue;
    // The entry that pins down the most query parameters is the closest match.
    if (required.length > bestScore) {
      best = entry;
      bestScore = required.length;
    }
  }
  return best;
}
