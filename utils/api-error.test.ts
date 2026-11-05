/**
 * Contract tests for the EP-1004 error helpers. Keep these green when touching api-error.ts.
 * Run with `npm test` (Node's built-in runner; Node 22.18+ runs TypeScript directly).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toast } from "sonner";

import {
  formatApiErrorMeta,
  getApiError,
  getApiErrorMessage,
  HIDDEN_LOG_LINE,
  hasShownApiErrorToast,
  isClientApiError,
  jobFailureMessage,
  looksLikeInternalText,
  readableDetailMessage,
  redactLogOutput,
  showApiErrorToast,
} from "./api-error";
import { MAX_TRANSIENT_RETRIES, shouldRetryRequest } from "./query-retry";

const CID = "b3c1e2a0-0000-4000-8000-000000000001";

function httpError(status: number, data: unknown, headers: Record<string, string> = {}) {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: { status, data, headers },
  };
}

describe("getApiError: platform error shape", () => {
  it("prefers message and reads status, correlation ID and error code", () => {
    const error = httpError(404, {
      error: "not_found",
      message: "Rule not found",
      correlation_id: CID,
      detail: "Rule not found",
    });
    assert.deepEqual(getApiError(error, "fallback"), {
      message: "Rule not found",
      status: 404,
      correlationId: CID,
      errorCode: "not_found",
    });
  });

  it("prefers message over a different detail", () => {
    const error = httpError(400, { message: "Use this", detail: "Not this" });
    assert.equal(getApiErrorMessage(error, "fallback"), "Use this");
  });

  it("shows the generic 5xx message, never internals", () => {
    const message =
      "An unexpected error occurred. Try again, or contact support with the correlation ID.";
    const error = httpError(500, { error: "internal_error", message, correlation_id: CID, detail: message });
    const info = getApiError(error, "Failed to fetch rules");
    assert.equal(info.message, message);
    assert.equal(info.errorCode, "internal_error");
    assert.equal(info.correlationId, CID);
  });

  it("keeps structured extras out of the message (support_access_ended)", () => {
    const error = httpError(401, {
      error: "support_access_ended",
      message: "Support access has ended. You are back in your own workspace.",
      access_token: "restored-token",
      detail: { error: "support_access_ended", message: "…", access_token: "restored-token" },
    });
    assert.equal(getApiError(error, "x").message, "Support access has ended. You are back in your own workspace.");
    assert.equal(getApiError(error, "x").errorCode, "support_access_ended");
  });
});

describe("getApiError: legacy detail", () => {
  it("reads a detail string", () => {
    assert.equal(getApiErrorMessage(httpError(409, { detail: "Rule exists" }), "x"), "Rule exists");
  });

  it("joins a 422 list instead of returning an object", () => {
    const error = httpError(422, {
      detail: [{ loc: ["body", "name"], msg: "Field required" }, { msg: "Invalid id" }],
    });
    assert.equal(getApiErrorMessage(error, "x"), "Field required; Invalid id");
  });

  it("reads a structured detail object", () => {
    const error = httpError(403, { detail: { error: "forbidden", message: "Admin role required" } });
    assert.equal(getApiErrorMessage(error, "x"), "Admin role required");
  });
});

describe("getApiError: correlation ID sources", () => {
  it("prefers the ID the interceptor attached", () => {
    const error = { ...httpError(500, { correlation_id: "body-id" }, { "x-correlation-id": "header-id" }), correlationId: "attached-id" };
    assert.equal(getApiError(error, "x").correlationId, "attached-id");
  });

  it("falls back to the header, then the body", () => {
    assert.equal(getApiError(httpError(500, { correlation_id: "body-id" }, { "x-correlation-id": "header-id" }), "x").correlationId, "header-id");
    assert.equal(getApiError(httpError(500, { correlation_id: "body-id" }), "x").correlationId, "body-id");
  });

  it("reads AxiosHeaders via get()", () => {
    const headers = { get: (name: string) => (name === "x-correlation-id" ? "via-get" : null) };
    const error = { isAxiosError: true, response: { status: 500, data: {}, headers } };
    assert.equal(getApiError(error, "x").correlationId, "via-get");
  });
});

describe("getApiError: no usable body", () => {
  it("uses the fallback, not axios' generic text", () => {
    assert.equal(getApiErrorMessage(httpError(500, {}), "Failed to fetch rules"), "Failed to fetch rules");
  });

  it("never shows an HTML proxy page", () => {
    const error = httpError(502, "<html><body>502 Bad Gateway</body></html>");
    assert.equal(getApiErrorMessage(error, "Failed to load"), "Failed to load");
  });

  it("explains network failures, timeouts and cancellations", () => {
    assert.match(getApiErrorMessage({ isAxiosError: true, code: "ERR_NETWORK", message: "Network Error" }, "x"), /Couldn't reach the server/);
    assert.match(getApiErrorMessage({ isAxiosError: true, code: "ECONNABORTED" }, "x"), /took too long/);
    assert.equal(getApiErrorMessage({ isAxiosError: true, code: "ERR_CANCELED", message: "canceled" }, "x"), "The request was cancelled.");
  });

  it("uses a thrown Error's own message, or the fallback for nothing", () => {
    assert.equal(getApiErrorMessage(new Error("Upload failed: file too large"), "x"), "Upload failed: file too large");
    assert.equal(getApiErrorMessage(null, "fallback"), "fallback");
    assert.equal(getApiErrorMessage(undefined, "fallback"), "fallback");
  });
});

describe("isClientApiError", () => {
  it("is true only for 4xx responses", () => {
    for (const status of [400, 401, 403, 404, 409, 422]) assert.equal(isClientApiError(httpError(status, {})), true);
    for (const status of [500, 502, 503]) assert.equal(isClientApiError(httpError(status, {})), false);
    assert.equal(isClientApiError({ isAxiosError: true, code: "ERR_NETWORK" }), false);
    assert.equal(isClientApiError(new Error("x")), false);
  });
});

describe("shouldRetryRequest (React Query retry policy)", () => {
  it("never retries 4xx", () => {
    for (const status of [400, 401, 403, 404, 422]) assert.equal(shouldRetryRequest(0, httpError(status, {})), false);
  });

  it("retries 5xx, network errors and timeouts at most twice", () => {
    for (const error of [httpError(500, {}), httpError(503, {}), { isAxiosError: true, code: "ERR_NETWORK" }, { isAxiosError: true, code: "ECONNABORTED" }]) {
      assert.equal(shouldRetryRequest(0, error), true);
      assert.equal(shouldRetryRequest(1, error), true);
      assert.equal(shouldRetryRequest(MAX_TRANSIENT_RETRIES, error), false);
    }
  });

  it("does not retry cancellations or errors that aren't HTTP failures", () => {
    assert.equal(shouldRetryRequest(0, { isAxiosError: true, code: "ERR_CANCELED" }), false);
    assert.equal(shouldRetryRequest(0, new TypeError("x is undefined")), false);
  });
});

describe("jobFailureMessage", () => {
  it("prefers error_message, then error, reason, message", () => {
    assert.equal(jobFailureMessage({ error_message: "A", error: "B", reason: "C", message: "D" }, "f"), "A");
    assert.equal(jobFailureMessage({ error: "B", reason: "C" }, "f"), "B");
    assert.equal(jobFailureMessage({ reason: "C", message: "D" }, "f"), "C");
    assert.equal(jobFailureMessage({ message: "D" }, "f"), "D");
    assert.equal(jobFailureMessage(null, "This job failed."), "This job failed.");
  });

  it("skips tracebacks from older records", () => {
    const job = { error_message: "Traceback (most recent call last):\n  File …", reason: "Timed out reading the source" };
    assert.equal(jobFailureMessage(job, "f"), "Timed out reading the source");
  });
});

describe("readableDetailMessage", () => {
  it("flattens RBAC-style objects but leaves recovery payloads and lists intact", () => {
    assert.equal(readableDetailMessage({ error: "forbidden", message: "Admin only" }), "Admin only");
    assert.equal(readableDetailMessage({ error: "support_access_ended", message: "…", access_token: "t" }), null);
    assert.equal(readableDetailMessage([{ msg: "x" }]), null);
    assert.equal(readableDetailMessage("plain"), null);
  });
});

describe("showApiErrorToast", () => {
  it("titles the toast with the API message and puts the correlation ID underneath", () => {
    const id = showApiErrorToast(httpError(404, { message: "Rule not found", correlation_id: CID }), "Failed to delete rule");
    const shown = toast.getHistory().find((t) => "id" in t && t.id === id) as { title?: unknown; description?: unknown; type?: unknown };
    assert.equal(shown.type, "error");
    assert.equal(shown.title, "Rule not found");
    assert.equal(shown.description, `Correlation ID: ${CID}`);
  });

  it("remembers which errors it toasted, so the global fallback can skip them", () => {
    const toasted = httpError(500, { message: "m" });
    const untouched = httpError(500, { message: "m" });
    showApiErrorToast(toasted, "f");
    assert.equal(hasShownApiErrorToast(toasted), true);
    assert.equal(hasShownApiErrorToast(untouched), false);
    assert.equal(hasShownApiErrorToast("not an object"), false);
  });

  it("uses the fallback and no description when the request never reached the API", () => {
    const id = showApiErrorToast(new Error(""), "Failed to delete rule");
    const shown = toast.getHistory().find((t) => "id" in t && t.id === id) as { title?: unknown; description?: unknown };
    assert.equal(shown.title, "Failed to delete rule");
    assert.equal(shown.description, undefined);
  });
});

describe("formatApiErrorMeta", () => {
  it("joins status and correlation ID", () => {
    assert.equal(formatApiErrorMeta({ message: "m", status: 500, correlationId: CID, errorCode: null }), `Status 500 · Correlation ID ${CID}`);
    assert.equal(formatApiErrorMeta({ message: "m", status: null, correlationId: null, errorCode: null }), null);
  });
});

describe("jobFailureMessage: never shows internals (readable job failures)", () => {
  const internal = [
    "Traceback (most recent call last):\n  File \"/app/services/integration_tasks.py\", line 388, in run",
    "(pymysql.err.OperationalError) (2013, 'Lost connection to MySQL server during query')",
    "(sqlalchemy.exc.IntegrityError) Duplicate entry 'abc' for key 'PRIMARY'",
    "psycopg2.errors.UndefinedTable: relation \"stg_vendors\" does not exist",
    "[Errno 2] No such file or directory: '/var/tmp/drat/abc.pdf'",
    "INSERT INTO int_vendors (id, name) VALUES (...) failed",
    "connect failed: host=db password=hunter2",
  ];

  it("flags stack traces, SQL, driver errors, paths and secrets", () => {
    for (const text of internal) assert.equal(looksLikeInternalText(text), true, text);
  });

  it("keeps plain reasons", () => {
    for (const text of [
      "Airtable rejected the record: field 'Vendor' is required",
      "Google Drive folder no longer exists",
      "Source table stg_vendors is empty",
      "The job failed unexpectedly (TimeoutError)",
    ]) {
      assert.equal(looksLikeInternalText(text), false, text);
    }
  });

  it("falls back instead of showing an internal reason", () => {
    for (const text of internal) assert.equal(jobFailureMessage({ error: text }, "This run failed."), "This run failed.");
  });

  it("uses the next readable field when the first is internal", () => {
    assert.equal(jobFailureMessage({ error_message: internal[1], reason: "Lost the database connection" }, "f"), "Lost the database connection");
  });

  it("caps long reasons at 500 characters", () => {
    const shown = jobFailureMessage({ error: "x".repeat(900) }, "f");
    assert.equal(shown.length, 500);
    assert.ok(shown.endsWith("…"));
  });
});

describe("redactLogOutput: node console output without stack traces", () => {
  const log = [
    "2026-10-27 10:00:00,101 [INFO] workflow_engine: Extracting invoices",
    "2026-10-27 10:00:02,442 [ERROR] workflow_engine: Workflow node failed run=r1 node=extract attempts=3",
    "Traceback (most recent call last):",
    '  File "/app/ingestion_service/services/workflow_engine.py", line 1240, in _execute_node',
    "    result = handler(node, inputs)",
    "sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedColumn) column \"amt\" does not exist",
    "LINE 1: INSERT INTO invoices (amt) VALUES (%s)",
    "        ^",
    "",
    "The above exception was the direct cause of the following exception:",
    "",
    "Traceback (most recent call last):",
    '  File "/app/x.py", line 9, in run',
    "RuntimeError: load failed",
    "2026-10-27 10:00:02,450 [INFO] workflow_engine: Node marked failed",
  ].join("\n");

  it("replaces each traceback with one placeholder and keeps the other records", () => {
    assert.deepEqual(redactLogOutput(log), [
      "2026-10-27 10:00:00,101 [INFO] workflow_engine: Extracting invoices",
      "2026-10-27 10:00:02,442 [ERROR] workflow_engine: Workflow node failed run=r1 node=extract attempts=3",
      HIDDEN_LOG_LINE,
      "2026-10-27 10:00:02,450 [INFO] workflow_engine: Node marked failed",
    ]);
  });

  it("hides single internal lines such as SQL or secrets", () => {
    assert.deepEqual(redactLogOutput("ok\nconnecting with password=hunter2\nINSERT INTO t VALUES (1)\ndone"), [
      "ok",
      HIDDEN_LOG_LINE,
      "done",
    ]);
  });

  it("leaves ordinary output untouched", () => {
    assert.deepEqual(redactLogOutput("Read 120 rows\nWrote 118 rows"), ["Read 120 rows", "Wrote 118 rows"]);
  });
});
