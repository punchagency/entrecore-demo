// Demo: every request is answered in the browser by demo/server (must load before axios.create).
import "@/demo/install";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

import { readableDetailMessage } from "@/utils/api-error";

import {
  announceLogout,
  clearAccessToken,
  ensureAccessToken,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "./session";

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/**
 * Requests that never need a signed-in user. Everything else waits for an
 * access token, which on a fresh page load comes from the refresh cookie
 * (EP-1043: the token is no longer persisted in the browser).
 */
const PUBLIC_AUTH_PATH =
  /\/auth\/(token|signup|forgot-password|reset-password|refresh-token|google|verify-email\/|companies\/invites\/preview|logout)/;

/** EP-1004 error body; `detail` is the legacy alias (string, 422 list or object). */
interface ApiErrorBody {
  error?: unknown;
  message?: unknown;
  correlation_id?: unknown;
  access_token?: unknown;
  detail?: unknown;
}

/** Failed requests carry the backend correlation ID here, for toasts and error states. */
export type ApiAxiosError = AxiosError & { correlationId?: string };

function newCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Non-secure contexts lack randomUUID; any unique-enough value works as a correlation ID.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

/** The support-session token from a refresh failure: top-level now, under `detail` before. */
function supportAccessEndedToken(body: ApiErrorBody | undefined): string | null {
  const detail = (body?.detail && typeof body.detail === "object" ? body.detail : {}) as ApiErrorBody;
  const code = body?.error ?? detail.error;
  const token = body?.access_token ?? detail.access_token;
  return code === "support_access_ended" && typeof token === "string" && token ? token : null;
}

export const Axios = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

/** Suppresses refresh/redirect while logout clears the session. */
let isLoggingOut = false;

export function setLoggingOut(value: boolean) {
  isLoggingOut = value;
}

/**
 * EP-1037: logout leaves nothing behind for the next person on this browser.
 * Removing only the token and the user left the selected company's profile,
 * per-company connector configs (NetSuite secrets among them), favourites and
 * workflow state in storage. Everything the app stores is per-user, so clear
 * it all; losing a UI preference on logout is the right trade.
 */
export function clearClientSession() {
  clearAccessToken();
  announceLogout();
  try {
    localStorage.clear();
  } catch {
    localStorage.removeItem("user-storage");
  }
  try {
    sessionStorage.clear();
  } catch {
    /* nothing per-user to protect if storage is unavailable */
  }
}

const isAuthLogoutRequest = (url?: string) => Boolean(url?.includes("/auth/logout"));

Axios.interceptors.request.use(async (config) => {
  // Public endpoints go as they are (logout still carries a token if it has
  // one, so the server can revoke it). Everything else gets a token, restoring
  // it from the refresh cookie first if this page load has none yet.
  const accessToken = PUBLIC_AUTH_PATH.test(config.url ?? "")
    ? getAccessToken()
    : await ensureAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  // The backend echoes this ID on the response and in its logs, so browser and server share
  // one correlation ID from the first hop. Retries keep the ID of the original request.
  if (!config.headers["X-Correlation-ID"]) {
    config.headers["X-Correlation-ID"] = newCorrelationId();
  }
  return config;
});

Axios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;
    const data = error.response?.data as ApiErrorBody | undefined;
    const body = data && typeof data === "object" ? data : undefined;

    // Attach the correlation ID so every toast and error state can show it.
    const headerId = error.response?.headers?.["x-correlation-id"];
    const correlationId =
      (typeof headerId === "string" && headerId) ||
      (typeof body?.correlation_id === "string" && body.correlation_id) ||
      undefined;
    if (correlationId) (error as ApiAxiosError).correlationId = correlationId;

    if (body) {
      // During the migration, code that still reads `detail` gets the platform message.
      if (body.detail === undefined && typeof body.message === "string") {
        body.detail = body.message;
      }
      // Structured RBAC details become their message; recovery payloads stay intact.
      const readable = readableDetailMessage(body.detail);
      if (readable) body.detail = readable;
    }

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Logout is idempotent — never try to refresh a session we're tearing down
    if (isAuthLogoutRequest(originalRequest.url) || isLoggingOut) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes("/auth/refresh-token")) {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Concurrent 401s share one refresh (see session.refreshAccessToken).
      const accessToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return Axios(originalRequest);
    } catch (refreshError) {
      // Ending a support session: the backend returns the user's own token in the error body.
      const restoredToken = supportAccessEndedToken(
        (refreshError as AxiosError<ApiErrorBody>)?.response?.data
      );
      if (restoredToken) {
        setAccessToken(restoredToken);
        originalRequest.headers.Authorization = `Bearer ${restoredToken}`;
        toast.message("Support access ended. You're back in your own workspace.");
        const { useUserStore } = await import("../store/userStore");
        await useUserStore.getState().fetchUser();
        return Axios(originalRequest);
      }

      console.error("Refresh token failed:", refreshError);
      clearAccessToken();

      // Avoid redirect loops when already on an auth page or mid-logout
      const onAuthPage = window.location.pathname.startsWith("/auth/");
      if (!isLoggingOut && !onAuthPage) {
        window.location.href =
          "/auth/login?redirectTo=" +
          encodeURIComponent(window.location.pathname + window.location.search);
      }
      return Promise.reject(refreshError);
    }
  }
);
