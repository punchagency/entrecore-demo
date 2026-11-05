import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Public site origin for OAuth redirects (e.g. https://app.entrecore.com). */
export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

/**
 * Reduce a user-supplied `redirectTo` to a same-origin path (`/path?query#hash`),
 * or `null` when it points anywhere else.
 *
 * `redirectTo` arrives via query string, so it is attacker-controllable. Passing
 * it straight to `router.push` lets `?redirectTo=https://evil.com/...` bounce a
 * freshly authenticated user off-site. Absolute URLs are only accepted when they
 * match this app's own origin, and are returned as a path.
 */
export function safeRedirectPath(target?: string | null): string | null {
  const raw = target?.trim();
  if (!raw || raw.includes("\\")) return null;
  try {
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : getAppUrl();
    const url = new URL(raw, currentOrigin);
    if (url.origin !== currentOrigin && url.origin !== getAppUrl()) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** True when redirect target is the company invite accept page (same-origin only). */
export function isInviteJoinRedirect(target?: string | null): boolean {
  const path = safeRedirectPath(target);
  if (!path) return false;
  const url = new URL(path, "http://localhost");
  return url.pathname === "/join" && url.searchParams.has("token");
}

/** Build `/path?a=b` from only the params that have a value. */
export function buildAuthUrl(
  path: string,
  params: Record<string, string | null | undefined>
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Read the OAuth return URL (`/auth/success?redirectTo=…&code=…`).
 *
 * EP-1042: the backend now sends a one-time `code` (swapped for the token at
 * POST /auth/google/exchange) or `error`. `access_token` is still read so an
 * older backend keeps working during the rollout.
 *
 * Parses with URLSearchParams so an encoded `redirectTo` does not swallow the
 * trailing `access_token` (a greedy regex did, which leaked the JWT into the
 * next page's URL). Older backends appended the token with a second `?`, so
 * that shape is still understood and stripped from `redirectTo`.
 */
export function parseAuthSuccessUrl(href: string): {
  accessToken: string | null;
  code: string | null;
  error: string | null;
  redirectTo: string | null;
} {
  const url = new URL(href);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  let accessToken = url.searchParams.get("access_token");
  let redirectTo = url.searchParams.get("redirectTo");

  if (redirectTo) {
    // Older backends appended the token with a second "?": /join?token=abc?access_token=xyz
    const legacy = redirectTo.match(/^([^?#]*\?[^?#]*?)\?access_token=([^&#]+)(&[^#]*)?/);
    if (legacy) {
      accessToken = accessToken ?? decodeURIComponent(legacy[2]);
      redirectTo = legacy[1] + (legacy[3] ?? "");
    } else if (redirectTo.startsWith("/")) {
      // access_token may sit anywhere in the query (first, middle, last); remove it
      // as a parameter rather than by regex so the remaining path stays well-formed.
      try {
        const parsed = new URL(redirectTo, "http://localhost");
        if (parsed.searchParams.has("access_token")) {
          accessToken = accessToken ?? parsed.searchParams.get("access_token");
          parsed.searchParams.delete("access_token");
          redirectTo = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
      } catch {
        // Leave redirectTo as-is; safeRedirectPath() rejects anything unusable.
      }
    }
  }
  if (!accessToken && !code) {
    const fallback = href.match(/access_token=([^&]+)/);
    if (fallback) accessToken = decodeURIComponent(fallback[1]);
  }
  return { accessToken, code, error, redirectTo };
}

export function getProtectedRedirectRoute(targetRoute: string, isSuperadminCompany?: boolean | null): string {
  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === "production";

  const hiddenRoutes = [
    "/coreos",
    "/data-room",
    "/workflows",
    "/market",
    "/investor-access",
    "/guides",
    "/training",
    "/metrics",
    "/search",
    "/portfolio",
    "/diligence",
  ];

  let finalRoute = targetRoute;

  if (isProduction && !isSuperadminCompany) {
    const isHidden = hiddenRoutes.some((route) => targetRoute.startsWith(route));
    if (isHidden) {
      finalRoute = "/drat";
    }
  }

  return finalRoute;
}
