import { DEMO_DEBUG, DEMO_LATENCY_MS } from "@/demo/config";
import { registerHandlers } from "./handlers";
import { findRecording } from "./recorded";
import { PASS, Router, isResponse, normalisePath } from "./router";
import type { DemoRequest, DemoResponse, HttpMethod } from "./types";

/**
 * The demo backend: answers every API request in the browser.
 *
 *   1. a hand-written handler (demo/server/handlers), which may read and write
 *      the in-memory database, so created agents etc. persist until reload;
 *   2. otherwise a response recorded from staging (demo/fixtures/recorded);
 *   3. otherwise an empty 200, logged as unhandled so gaps are easy to find.
 */

const router = new Router();
registerHandlers(router);

export interface ServerResult {
  status: number;
  data: unknown;
  headers: Record<string, string>;
  /** "handler" | "recording" | "unhandled": shown in the roadmap overlay. */
  source: "handler" | "recording" | "unhandled";
}

export interface UnhandledRequest {
  method: HttpMethod;
  path: string;
  page: string;
}

const unhandled = new Map<string, UnhandledRequest>();
const listeners = new Set<() => void>();
// A stable snapshot (useSyncExternalStore needs the same array until something changes).
let unhandledSnapshot: UnhandledRequest[] = [];

/** Requests nothing answered, de-duplicated by page + method + path. For the roadmap overlay and crawls. */
export function getUnhandledRequests(): UnhandledRequest[] {
  return unhandledSnapshot;
}

export function onUnhandledChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const API_PREFIX = /^\/api\/v1(?=\/|$)/;

/** `https://host/api/v1/data/x?y=1` or `/data/x?y=1` → path `/data/x` + query. */
export function parseApiUrl(url: string): { path: string; query: URLSearchParams } {
  const parsed = new URL(url, "http://demo.local");
  return {
    path: normalisePath(parsed.pathname.replace(API_PREFIX, "")),
    query: parsed.searchParams,
  };
}

function parseBody(body: unknown): unknown {
  if (typeof body !== "string") return body ?? null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function handleRequest(input: {
  method: string;
  url: string;
  body?: unknown;
}): Promise<ServerResult> {
  const method = input.method.toUpperCase() as HttpMethod;
  const { path, query } = parseApiUrl(input.url);
  const body = parseBody(input.body);

  const match = router.match(method, path);
  if (match) {
    const req: DemoRequest = { method, path, query, params: match.params, body };
    const result = await match.route.handler(req);
    if (result !== PASS) return answer(isResponse(result) ? result : { data: result }, method, path);
  }
  return fallback(method, path, query);
}

async function answer(res: DemoResponse, method: HttpMethod, path: string): Promise<ServerResult> {
  await sleep(DEMO_LATENCY_MS + (res.delayMs ?? 0));
  if (DEMO_DEBUG) console.debug(`[demo] ${method} ${path} → handler`, res.data);
  return {
    status: res.status ?? 200,
    data: res.data ?? null,
    headers: res.headers ?? {},
    source: "handler",
  };
}

async function fallback(method: HttpMethod, path: string, query: URLSearchParams): Promise<ServerResult> {
  const recording = findRecording(method, path, query);
  if (recording) {
    await sleep(DEMO_LATENCY_MS);
    if (DEMO_DEBUG) console.debug(`[demo] ${method} ${path} → recording`);
    // Clone so callers that mutate the response can't change the next replay.
    return {
      status: recording.status,
      data: structuredClone(recording.data),
      headers: {},
      source: "recording",
    };
  }

  const page = typeof window !== "undefined" ? window.location.pathname : "";
  const key = `${page} ${method} ${path}`;
  if (!unhandled.has(key)) {
    unhandled.set(key, { method, path, page });
    unhandledSnapshot = Array.from(unhandled.values());
    console.warn(`[demo] unhandled ${method} ${path} (on ${page}) — returning an empty response`);
    listeners.forEach((listener) => listener());
  }
  await sleep(DEMO_LATENCY_MS);
  // An empty list is the safest default: list screens render "empty", and
  // property reads on it are undefined, like on an empty object.
  return { status: 200, data: method === "GET" ? [] : { success: true }, headers: {}, source: "unhandled" };
}
