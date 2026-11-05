/**
 * Behaviour of the app's QueryClient defaults (EP-1004), exercised through React Query itself.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { MutationObserver, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { showApiErrorToast } from "./api-error";
import { makeQueryClient } from "./query-client";

const http = (status: number, message = "Server said no") => ({
  isAxiosError: true,
  response: { status, data: { message, correlation_id: `cid-${status}` }, headers: {} },
});

let client: QueryClient;
let errorToasts: string[];

beforeEach(() => {
  client = makeQueryClient();
  // Keep the policy, drop the exponential backoff so the tests run instantly.
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retryDelay: 0 } });
  errorToasts = [];
  mock.method(toast, "error", (title: string) => {
    errorToasts.push(title);
    return title;
  });
  // The cache logs every failure; keep test output readable.
  mock.method(console, "error", () => {});
});

afterEach(() => mock.restoreAll());

// Lets the cache's deferred fallback toast (setTimeout 0) run.
const nextTick = () => new Promise((resolve) => setTimeout(resolve, 5));

async function attempts(error: unknown) {
  let calls = 0;
  await client
    .fetchQuery({
      queryKey: ["q", Math.random()],
      queryFn: async () => {
        calls += 1;
        throw error;
      },
    })
    .catch(() => {});
  return calls;
}

function observer(options: Record<string, unknown> = {}) {
  const obs = new MutationObserver(client, {
    mutationFn: async () => {
      throw http(500, "Failed to save rule (server)");
    },
    ...options,
  });
  obs.subscribe(() => {}); // per-call callbacks only fire while observed, as in a mounted component
  return obs;
}

describe("query retries", () => {
  it("never retries 401, 403, 404 or 422", async () => {
    for (const status of [401, 403, 404, 422]) assert.equal(await attempts(http(status)), 1, `status ${status}`);
  });

  it("retries 5xx and network errors at most twice", async () => {
    assert.equal(await attempts(http(500)), 3);
    assert.equal(await attempts(http(503)), 3);
    assert.equal(await attempts({ isAxiosError: true, code: "ERR_NETWORK" }), 3);
  });

  it("does not refetch on window focus", () => {
    assert.equal(client.getDefaultOptions().queries?.refetchOnWindowFocus, false);
  });
});

describe("query failure toasts", () => {
  it("does not toast a load failure by default (the screen shows QueryErrorState)", async () => {
    await attempts(http(404));
    await nextTick();
    assert.deepEqual(errorToasts, []);
  });

  it("toasts when meta.toastOnError is set, using the API message", async () => {
    await client
      .fetchQuery({ queryKey: ["toast"], queryFn: async () => { throw http(404, "Rule not found"); }, meta: { toastOnError: true } })
      .catch(() => {});
    assert.deepEqual(errorToasts, ["Rule not found"]);
  });
});

describe("mutation failure toasts", () => {
  it("toasts once when nobody handles the error", async () => {
    await observer().mutate().catch(() => {});
    await nextTick();
    assert.deepEqual(errorToasts, ["Failed to save rule (server)"]);
  });

  it("uses meta.errorMessage when the API gives no message", async () => {
    const obs = observer({
      mutationFn: async () => { throw { isAxiosError: true, response: { status: 500, data: {}, headers: {} } }; },
      meta: { errorMessage: "Failed to delete rule" },
    });
    await obs.mutate().catch(() => {});
    await nextTick();
    assert.deepEqual(errorToasts, ["Failed to delete rule"]);
  });

  it("does not double-toast when mutate()'s onError already toasted", async () => {
    const obs = observer();
    await obs.mutate(undefined, { onError: (error) => showApiErrorToast(error, "Failed to save rule") }).catch(() => {});
    await nextTick();
    assert.equal(errorToasts.length, 1);
  });

  it("does not double-toast when a catch around mutateAsync already toasted", async () => {
    const obs = observer();
    try {
      await obs.mutate();
    } catch (error) {
      showApiErrorToast(error, "Failed to save rule");
    }
    await nextTick();
    assert.equal(errorToasts.length, 1);
  });

  it("leaves the copy to a hook-level onError", async () => {
    await observer({ onError: () => {} }).mutate().catch(() => {});
    await nextTick();
    assert.deepEqual(errorToasts, []);
  });

  it("respects meta.skipErrorToast (screen shows a field error)", async () => {
    await observer({ meta: { skipErrorToast: true } }).mutate().catch(() => {});
    await nextTick();
    assert.deepEqual(errorToasts, []);
  });

  it("never retries a mutation", async () => {
    let calls = 0;
    const obs = observer({ mutationFn: async () => { calls += 1; throw http(503); } });
    await obs.mutate().catch(() => {});
    assert.equal(calls, 1);
  });
});
