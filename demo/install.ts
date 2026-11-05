import axios, { type CreateAxiosDefaults } from "axios";
import { DEMO_API_ORIGIN } from "@/demo/config";
import { handleRequest } from "@/demo/server";
import { demoAxiosAdapter } from "@/demo/transport/axios-adapter";

/**
 * Routes all API traffic to the in-browser demo server. Import this module
 * first in any file that creates an axios instance: `axios.create` copies the
 * defaults at creation time, so the adapter has to be in place before that.
 */

declare global {
  // eslint-disable-next-line no-var
  var __ENTRECORE_DEMO_INSTALLED__: boolean | undefined;
}

if (!globalThis.__ENTRECORE_DEMO_INSTALLED__) {
  globalThis.__ENTRECORE_DEMO_INSTALLED__ = true;

  // Bare `axios.get(...)` and every instance created after this point.
  axios.defaults.adapter = demoAxiosAdapter;
  const create = axios.create.bind(axios);
  axios.create = (config?: CreateAxiosDefaults) => create({ ...config, adapter: demoAxiosAdapter });

  // fetch() to the API goes to the demo server too; anything else (fonts, static
  // demo documents) is fetched normally.
  if (typeof window !== "undefined") {
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (!url.startsWith(DEMO_API_ORIGIN)) return realFetch(input, init);
      const result = await handleRequest({
        method: init?.method ?? (input instanceof Request ? input.method : "GET"),
        url,
        body: init?.body,
      });
      return new Response(JSON.stringify(result.data), {
        status: result.status,
        headers: { "Content-Type": "application/json", ...result.headers },
      });
    };
  }
}

export {};
