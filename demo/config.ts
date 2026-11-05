/**
 * Demo environment settings. The demo has no backend: every API call, socket
 * event and workflow run is answered by `demo/server` from fixed data, so the
 * same click always gives the same result.
 */

/** Where `/` and a completed login land. */
export const DEMO_HOME = "/guides";

/** Simulated network latency for every API call (ms). Fixed, so timing is repeatable. */
export const DEMO_LATENCY_MS = 150;

/** Base URL the app's API clients are built with. Requests to it never leave the browser. */
export const DEMO_API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "https://api.demo.invalid";

/** Log every request the demo server answers (unhandled requests are always logged). */
export const DEMO_DEBUG = process.env.NEXT_PUBLIC_DEMO_DEBUG === "true";
