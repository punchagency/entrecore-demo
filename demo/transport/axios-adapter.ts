import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse } from "axios";
import { handleRequest } from "@/demo/server";

/**
 * Axios adapter that sends every request to the in-browser demo server instead
 * of the network. Error statuses reject with a real AxiosError, so the app's
 * error handling behaves exactly as it does against the API.
 */
export const demoAxiosAdapter: AxiosAdapter = async (config) => {
  const url = axiosUrl(config.baseURL, config.url, config.params);
  const result = await handleRequest({
    method: config.method ?? "get",
    url,
    body: config.data,
  });

  const response: AxiosResponse = {
    data: result.data,
    status: result.status,
    statusText: String(result.status),
    headers: new AxiosHeaders(result.headers),
    config,
    request: { demo: true, source: result.source },
  };

  const validate = config.validateStatus ?? ((status: number) => status >= 200 && status < 300);
  if (validate(result.status)) return response;

  throw new AxiosError(
    `Request failed with status code ${result.status}`,
    result.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    response.request,
    response
  );
};

function axiosUrl(baseURL: string | undefined, url: string | undefined, params: unknown): string {
  const path = url ?? "";
  const full = /^https?:\/\//.test(path) ? path : `${(baseURL ?? "").replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  if (!params || typeof params !== "object") return full;
  const parsed = new URL(full, "http://demo.local");
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) value.forEach((v) => parsed.searchParams.append(key, String(v)));
    else parsed.searchParams.set(key, String(value));
  }
  return /^https?:\/\//.test(full) ? parsed.toString() : `${parsed.pathname}${parsed.search}`;
}
