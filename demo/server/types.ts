export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface DemoRequest {
  method: HttpMethod;
  /** Path relative to `/api/v1`, without query string, e.g. `/data/guides/abc`. */
  path: string;
  query: URLSearchParams;
  params: Record<string, string>;
  body: unknown;
}

export interface DemoResponse {
  status?: number;
  data?: unknown;
  headers?: Record<string, string>;
  /** Extra delay for this response, on top of DEMO_LATENCY_MS. */
  delayMs?: number;
}

export type Handler = (req: DemoRequest) => DemoResponse | unknown;
