import type { NotificationSeverity, ResolvedLink } from "./types";

/**
 * Both backend timestamp shapes → a correct UTC Date.
 * Backend timestamps are UTC but carry no timezone marker:
 * - REST: "2026-10-23T09:14:02"
 * - Socket: "2026-10-23 09:14:02.511233"
 */
export function parseBackendUtc(value: string): Date {
  if (!value) return new Date();
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const withZone = /(Z|[+-]\d{2}:?\d{2})$/.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(withZone);
  return isNaN(date.getTime()) ? new Date(value) : date;
}

/**
 * Formats a notification timestamp to a human-friendly relative label.
 */
export function formatNotificationTime(value: string | Date | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? parseBackendUtc(value) : value;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return "just now";

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return "just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  const isSameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: isSameYear ? undefined : "numeric",
  });
}

/**
 * Same-origin → relative path for next/navigation (client routing);
 * otherwise an external target (e.g. Google Drive URL).
 */
export function resolveNotificationLink(linkUrl: string | null): ResolvedLink {
  if (!linkUrl) return null;

  // Already relative path
  if (linkUrl.startsWith("/")) {
    return { kind: "internal", href: linkUrl };
  }

  try {
    const url = new URL(linkUrl);
    const windowOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : windowOrigin;

    // Direct origin match with current window origin or configured NEXT_PUBLIC_APP_URL
    if (
      (windowOrigin && url.origin === windowOrigin) ||
      (appOrigin && url.origin === appOrigin)
    ) {
      return { kind: "internal", href: `${url.pathname}${url.search}${url.hash}` };
    }

    // Dev convenience: if running locally and backend returns link to app.entrecore.com
    if (
      url.origin === "https://app.entrecore.com" &&
      (windowOrigin.includes("localhost") || windowOrigin.includes("127.0.0.1"))
    ) {
      return { kind: "internal", href: `${url.pathname}${url.search}${url.hash}` };
    }

    return { kind: "external", href: url.toString() };
  } catch {
    return null;
  }
}

export interface NotificationTypeMeta {
  label: string;
  category: "review" | "failure" | "done" | "general";
  defaultSeverity: NotificationSeverity;
}

const TYPE_CONFIGS: Record<string, NotificationTypeMeta> = {
  drat_review_task_created: {
    label: "Review Task Created",
    category: "review",
    defaultSeverity: "warning",
  },
  drat_file_filed: {
    label: "File Filed",
    category: "done",
    defaultSeverity: "info",
  },
  drat_file_unprocessable: {
    label: "Unprocessable File",
    category: "failure",
    defaultSeverity: "error",
  },
  needs_review: {
    label: "Needs Review",
    category: "review",
    defaultSeverity: "warning",
  },
  push_failed: {
    label: "Push Failed",
    category: "failure",
    defaultSeverity: "error",
  },
  awaiting_onboarding: {
    label: "Awaiting Onboarding",
    category: "review",
    defaultSeverity: "warning",
  },
  upsert_review_parked: {
    label: "Upsert Review Parked",
    category: "review",
    defaultSeverity: "warning",
  },
  dq_rules_failed: {
    label: "DQ Rules Failed",
    category: "failure",
    defaultSeverity: "error",
  },
};

/**
 * Returns descriptive metadata for known and unknown notification types.
 * Safely handles new/unrecognised types without breaking.
 */
export function getNotificationTypeMeta(type: string): NotificationTypeMeta {
  if (TYPE_CONFIGS[type]) {
    return TYPE_CONFIGS[type];
  }

  // Graceful fallback for unknown types:
  const humanized = type
    ? type
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Notification";

  return {
    label: humanized,
    category: "general",
    defaultSeverity: "info",
  };
}
