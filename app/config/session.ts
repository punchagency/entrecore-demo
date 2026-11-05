// Demo: the refresh call below is answered by demo/server like every other request.
import "@/demo/install";
import axios from "axios";

/**
 * EP-1043: the access token lives in memory only.
 *
 * It used to sit in localStorage, where any script on the page — an XSS bug or a
 * compromised dependency — could read it and replay it for its lifetime. Now a
 * reload or a new tab starts with no token and gets a fresh one from the
 * httpOnly refresh cookie (which JavaScript can't read at all).
 *
 * The cookie reaches the API because the app and the API share entrecore.com
 * (app./staging. → api.). A frontend on another domain could not restore a
 * session on reload.
 */

let accessToken: string | null = null;
let refreshing: Promise<string> | null = null;

// Builds before EP-1043 left the token in localStorage: never leave it there.
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("access_token");
  } catch {
    /* storage unavailable: nothing was stored either */
  }
}

/**
 * Logging out in one tab logs out every tab. With the token in localStorage
 * that happened for free (all tabs read the same copy); with each tab holding
 * its own token in memory, another tab would otherwise keep working until its
 * token expired. Logout also cleared the cookie and revoked the refresh token
 * server-side, so the other tabs can't quietly restore a session either.
 */
const sessionChannel =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("entrecore-session")
    : null;

sessionChannel?.addEventListener("message", (event) => {
  if (event.data !== "logout") return;
  accessToken = null;
  if (!window.location.pathname.startsWith("/auth/")) {
    window.location.href = "/auth/login";
  }
});

/** Tell the app's other open tabs this session ended. */
export function announceLogout(): void {
  try {
    sessionChannel?.postMessage("logout");
  } catch {
    /* channel closed: the other tabs fail their next request instead */
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null | undefined): void {
  accessToken = token || null;
}

export function clearAccessToken(): void {
  accessToken = null;
}

/**
 * A fresh access token from the refresh cookie. Concurrent callers share one
 * request: the refresh token rotates on every use (EP-1034), so firing several
 * at once would only make the extra ones look like reuse.
 *
 * Uses bare axios, not the app's Axios instance, so it never passes through
 * that instance's interceptors. Throws the request's error (the caller may need
 * its detail, e.g. support_access_ended).
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh-token`,
        {},
        { withCredentials: true }
      )
      .then((response) => {
        const token = response.data?.access_token as string | undefined;
        if (!token) throw new Error("Refresh returned no access token");
        accessToken = token;
        return token;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/**
 * The current token, restoring it from the refresh cookie on a fresh page load
 * or new tab. Null when there is no session (not signed in, or it ended).
 */
export async function ensureAccessToken(): Promise<string | null> {
  if (accessToken) return accessToken;
  try {
    return await refreshAccessToken();
  } catch {
    return null;
  }
}
