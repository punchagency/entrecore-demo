import { toast } from "sonner";

/**
 * Frontend side of the EP-1004 error contract. Every error from /api/v1/auth/* and
 * /api/v1/data/* looks like:
 *
 *   { error: "not_found", message: "Rule not found", correlation_id: "…", detail: "Rule not found" }
 *
 * - `message` is what the user sees (always a string, never internals on 5xx).
 * - `error` is a machine code for branching; never shown to users.
 * - `correlation_id` (also the X-Correlation-ID header) is what support searches the logs for.
 * - `detail` is a compatibility alias: the same string, a 422 list or a structured object.
 *
 * Route every API failure through these helpers instead of reading `response.data` directly:
 * rendering `detail` as a React child crashes on the 422 list.
 */

export interface ApiErrorInfo {
  /** What to show the user: the API message, a network/timeout message, or `fallback`. */
  message: string;
  /** HTTP status, or null when the request never got a response. */
  status: number | null;
  /** Correlation ID for support; null when the request never reached the API. */
  correlationId: string | null;
  /** Machine code such as "unauthorized" or "validation_error"; for branching only. */
  errorCode: string | null;
}

// Requests that never got a response, keyed by axios error code.
const NO_RESPONSE_MESSAGES: Record<string, string> = {
  ERR_CANCELED: "The request was cancelled.",
  ECONNABORTED: "The server took too long to respond. Try again.",
  ETIMEDOUT: "The server took too long to respond. Try again.",
};
const NETWORK_ERROR_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

// axios' own texts carry no information beyond the status we already show.
const GENERIC_ERROR_MESSAGE = /^(Request failed with status code \d+|Network Error|canceled)$/i;

// Longer plain-text bodies are stack traces or proxy pages, not messages for users.
const MAX_TEXT_BODY_LENGTH = 300;

type ErrorLike = {
  isAxiosError?: unknown;
  code?: unknown;
  message?: unknown;
  correlationId?: unknown;
  response?: { status?: unknown; data?: unknown; headers?: unknown };
} | null | undefined;

/**
 * Normalizes any thrown value into what error states and toasts show.
 *
 * Message priority: `data.message` → `data.detail` (string, 422 list or `{ message }`) →
 * a network/timeout message → the error's own non-generic message → `fallback`.
 */
export function getApiError(error: unknown, fallback: string): ApiErrorInfo {
  const err = error as ErrorLike;
  const response = err?.response;
  const data = response?.data;
  const body = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;

  const correlationId =
    nonEmpty(err?.correlationId) ??
    readCorrelationHeader(response?.headers) ??
    nonEmpty(body?.correlation_id);

  const message =
    nonEmpty(body?.message) ??
    stringifyDetail(body?.detail) ??
    plainTextBody(data) ??
    (!response && err?.isAxiosError === true
      ? (NO_RESPONSE_MESSAGES[String(err.code ?? "")] ?? NETWORK_ERROR_MESSAGE)
      : null) ??
    ownMessage(err) ??
    fallback;

  return {
    message,
    status: typeof response?.status === "number" ? response.status : null,
    correlationId,
    errorCode: nonEmpty(body?.error),
  };
}

/** The user-facing message for an API failure. See `getApiError` for the priority. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  return getApiError(error, fallback).message;
}

/** True for a 4xx response: the request itself is wrong, so retrying it won't help. */
export function isClientApiError(error: unknown): boolean {
  const status = (error as ErrorLike)?.response?.status;
  return typeof status === "number" && status >= 400 && status < 500;
}

export interface ShowApiErrorToastOptions {
  /** Adds a Retry action. Only pass it when repeating the request makes sense. */
  onRetry?: () => void;
  /** Replaces the derived message, for screens that build a richer one from the same error. */
  message?: string;
  /** Reuses a toast, e.g. to replace a loading toast or dedupe repeated failures. */
  id?: string | number;
  duration?: number;
}

// Errors already toasted, so the global mutation fallback (app/providers.tsx) doesn't toast
// them a second time after a screen's own handler did.
const toastedErrors = new WeakSet<object>();

/** True once `showApiErrorToast` has shown this error. */
export function hasShownApiErrorToast(error: unknown): boolean {
  return typeof error === "object" && error !== null && toastedErrors.has(error);
}

/**
 * Error toast for a failed API call (mutations, or loads on screens with no error slot):
 * the API message as the title and "Correlation ID: …" underneath. `fallback` is used only
 * when the response says nothing useful. Client-side validation should stay a literal toast.
 */
export function showApiErrorToast(
  error: unknown,
  fallback: string,
  options: ShowApiErrorToastOptions = {}
) {
  const info = getApiError(error, fallback);
  if (typeof error === "object" && error !== null) toastedErrors.add(error);
  return toast.error(options.message ?? info.message, {
    id: options.id,
    duration: options.duration,
    description: info.correlationId ? `Correlation ID: ${info.correlationId}` : undefined,
    action: options.onRetry ? { label: "Retry", onClick: options.onRetry } : undefined,
  });
}

/** "Status 500 · Correlation ID …", for compact places such as a dropdown. */
export function formatApiErrorMeta({ status, correlationId }: ApiErrorInfo): string | null {
  const parts = [
    status != null ? `Status ${status}` : null,
    correlationId ? `Correlation ID ${correlationId}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

// Text that gives away internals: mirrors `_INTERNAL_MARKERS` in the backend's http_errors.py,
// so a raw exception stored by a job the backend hasn't cleaned up yet never reaches users.
const INTERNAL_MARKERS = [
  "traceback (most recent call last)",
  'file "',
  '.py", line',
  "sqlalchemy",
  "psycopg",
  "pymysql",
  "sqlite3",
  "cx_oracle",
  "pyodbc",
  "operationalerror",
  "integrityerror",
  "programmingerror",
  "interfaceerror",
  "mysql.connector",
  "select *",
  "insert into",
  "delete from",
  "/home/",
  "/usr/",
  "/var/",
  "/app/",
  "/opt/",
  "c:\\",
  "\\users\\",
  "password=",
  "secret=",
  "secret_key",
  "api_key=",
  "exc_info",
];

// The backend caps operator-facing reasons at 500 characters too.
const MAX_JOB_REASON_LENGTH = 500;

/** True when text looks like a stack trace, SQL error, file path or secret. */
export function looksLikeInternalText(text: string): boolean {
  const lowered = text.toLowerCase();
  if (INTERNAL_MARKERS.some((marker) => lowered.includes(marker))) return true;
  // Multi-line text that cites line numbers is a stack trace.
  return text.includes("\n") && lowered.includes("line ");
}

/**
 * A background job's or node run's failure reason for operators. Prefers `error_message`,
 * then `error`, `reason`, `message`. Skips anything that looks internal (tracebacks, SQL,
 * paths); the run ID shown next to it finds the full error in the logs instead.
 */
export function jobFailureMessage(
  job: { error_message?: unknown; error?: unknown; reason?: unknown; message?: unknown } | null | undefined,
  fallback: string
): string {
  for (const value of [job?.error_message, job?.error, job?.reason, job?.message]) {
    const text = nonEmpty(value);
    if (!text || looksLikeInternalText(text)) continue;
    return text.length > MAX_JOB_REASON_LENGTH ? `${text.slice(0, MAX_JOB_REASON_LENGTH - 1)}…` : text;
  }
  return fallback;
}

// The backend's node log formatter starts every record with "YYYY-MM-DD HH:MM:SS".
const LOG_RECORD_START = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/;

/** Stands in for a traceback or internal line removed from a job's console output. */
export const HIDDEN_LOG_LINE = "[Error details hidden. Find them in the logs by run ID.]";

/**
 * A job's console output as lines, without stack traces or internal lines. Node runs capture
 * every log record, including the `logger.error(..., exc_info=...)` traceback, so a traceback
 * (from "Traceback (most recent call last):" up to the next log record) becomes one
 * `HIDDEN_LOG_LINE`.
 */
export function redactLogOutput(logOutput: string): string[] {
  const lines: string[] = [];
  const hide = () => {
    if (lines[lines.length - 1] !== HIDDEN_LOG_LINE) lines.push(HIDDEN_LOG_LINE);
  };
  let inTraceback = false;
  for (const line of logOutput.split("\n")) {
    if (inTraceback && !LOG_RECORD_START.test(line)) continue;
    inTraceback = false;
    if (line.trim().toLowerCase().startsWith("traceback (most recent call last)")) {
      inTraceback = true;
      hide();
    } else if (looksLikeInternalText(line)) {
      hide();
    } else {
      lines.push(line);
    }
  }
  return lines;
}

/**
 * FastAPI `detail` is sometimes a structured object, for example an RBAC denial
 * `{ error, message, required_role, your_role }`. Returns its message, or null when the
 * object must stay intact (validation lists, support-session recovery).
 */
export function readableDetailMessage(detail: unknown): string | null {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;
  const record = detail as {
    message?: unknown;
    error?: unknown;
    access_token?: unknown;
    errors?: unknown;
  };
  if (record.error === "support_access_ended" || typeof record.access_token === "string") {
    return null;
  }
  if (Array.isArray(record.errors)) return null;
  return nonEmpty(record.message);
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readCorrelationHeader(headers: unknown): string | null {
  if (!headers || typeof headers !== "object") return null;
  // AxiosHeaders exposes get(); plain objects (and mocked responses) use lowercase keys.
  const viaGetter = (headers as { get?: (name: string) => unknown }).get?.("x-correlation-id");
  return nonEmpty(viaGetter ?? (headers as Record<string, unknown>)["x-correlation-id"]);
}

// A non-JSON body: keep short plain text, never an HTML error page.
function plainTextBody(data: unknown): string | null {
  const text = nonEmpty(data);
  if (!text || text.startsWith("<") || text.length > MAX_TEXT_BODY_LENGTH) return null;
  return text;
}

function ownMessage(err: ErrorLike): string | null {
  const text = nonEmpty(err?.message);
  return text && !GENERIC_ERROR_MESSAGE.test(text) ? text : null;
}

function stringifyDetail(detail: unknown): string | null {
  if (typeof detail === "string") return nonEmpty(detail);

  // FastAPI 422: an array of { loc, msg, type } validation entries.
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === "string") return item.trim();
        const msg = (item as { msg?: unknown } | null | undefined)?.msg;
        return typeof msg === "string" ? msg.trim() : "";
      })
      .filter(Boolean);
    return parts.length ? parts.join("; ") : null;
  }

  // Some endpoints nest the message one level deeper.
  if (detail && typeof detail === "object") {
    const record = detail as { msg?: unknown; message?: unknown };
    return nonEmpty(record.message) ?? nonEmpty(record.msg);
  }

  return null;
}
