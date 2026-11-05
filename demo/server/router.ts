import type { DemoRequest, DemoResponse, Handler, HttpMethod } from "./types";

const RESPONSE = Symbol("demo-response");

/**
 * Return this from a handler to decline a request it matched only by pattern
 * (e.g. `/data/guides/:id` catching `/data/guides/company-knowledge-docs`), so
 * a recording answers it or it shows up as unhandled.
 */
export const PASS = Symbol("demo-pass");

/** Wrap a handler result that needs a status code, headers or extra delay. */
export function respond(res: DemoResponse): DemoResponse {
  return Object.assign(res, { [RESPONSE]: true });
}

export function isResponse(value: unknown): value is DemoResponse {
  return typeof value === "object" && value !== null && RESPONSE in value;
}

interface Route {
  method: HttpMethod;
  pattern: string;
  segments: string[];
  handler: Handler;
}

/** Trailing slashes are ignored: the API is called both as `/data/guides` and `/data/guides/`. */
export function normalisePath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed || "/" : `/${trimmed}`;
}

export class Router {
  private routes: Route[] = [];

  on(method: HttpMethod, pattern: string, handler: Handler): this {
    const normalised = normalisePath(pattern);
    this.routes.push({ method, pattern: normalised, segments: normalised.split("/"), handler });
    return this;
  }

  get(pattern: string, handler: Handler) {
    return this.on("GET", pattern, handler);
  }
  post(pattern: string, handler: Handler) {
    return this.on("POST", pattern, handler);
  }
  put(pattern: string, handler: Handler) {
    return this.on("PUT", pattern, handler);
  }
  patch(pattern: string, handler: Handler) {
    return this.on("PATCH", pattern, handler);
  }
  delete(pattern: string, handler: Handler) {
    return this.on("DELETE", pattern, handler);
  }

  /**
   * The best route for a request. Literal segments beat `:params`, so
   * `/data/guides/from-prompt` wins over `/data/guides/:id`.
   */
  match(method: HttpMethod, path: string): { route: Route; params: Record<string, string> } | null {
    const segments = normalisePath(path).split("/");
    let best: { route: Route; params: Record<string, string>; score: number } | null = null;

    for (const route of this.routes) {
      if (route.method !== method || route.segments.length !== segments.length) continue;
      const params: Record<string, string> = {};
      let score = 0;
      let ok = true;
      for (let i = 0; i < segments.length; i++) {
        const want = route.segments[i];
        if (want.startsWith(":")) {
          params[want.slice(1)] = decodeURIComponent(segments[i]);
        } else if (want === segments[i]) {
          score += 1;
        } else {
          ok = false;
          break;
        }
      }
      if (ok && (!best || score > best.score)) best = { route, params, score };
    }
    return best ? { route: best.route, params: best.params } : null;
  }
}

export type { DemoRequest };
