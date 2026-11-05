import { Axios } from "@/app/config/axios";

/** The alerts a channel can subscribe to. Same strings the backend dispatches on. */
export const DRAT_ALERT_EVENTS = [
  "drat_review_task_created",
  "drat_file_filed",
  "drat_file_unprocessable",
] as const;

export type DratAlertEvent = (typeof DRAT_ALERT_EVENTS)[number];

export interface DratAlertEventConfig {
  key: DratAlertEvent;
  label: string;
  description: string;
}

export const DRAT_ALERT_EVENT_CONFIGS: readonly DratAlertEventConfig[] = [
  {
    key: "drat_review_task_created",
    label: "Needs review",
    description:
      "A document lands in the human review queue — entity unmatched, low confidence, no routing rule matched, or Drive folder missing",
  },
  {
    key: "drat_file_filed",
    label: "Filed successfully",
    description: "A document is filed to Google Drive",
  },
  {
    key: "drat_file_unprocessable",
    label: "Couldn't be processed",
    description:
      "A file never entered the workflow at all (unsupported type, unreadable)",
  },
] as const;

export interface DiscordWebhook {
  /** Server-assigned. Omit when adding; echo back unchanged when editing. */
  id?: string | null;
  name: string;
  url: string;
  events: DratAlertEvent[];
  /** Defaults to true when omitted. */
  enabled?: boolean;
}

export interface ReviewAlertSettings {
  review_alert_emails: string[];
  /** Email-only. See the gotcha in §9 — it does NOT mean "alerts are on". */
  notifications_enabled: boolean;
  discord_webhooks: DiscordWebhook[];
  review_alert_discord_user_id?: string | null;
  /** @deprecated EP-1055 — derived, read-only. Do not render or send. */
  review_alert_discord_webhook_url?: string | null;
  /** @deprecated EP-1055 — derived, read-only. Do not render or send. */
  drive_filing_discord_webhook_url?: string | null;
}

export interface ReviewAlertSettingsUpdatePayload {
  review_alert_emails: string[];
  /**
   * EP-1055 whole-list replace semantics.
   * Omit to leave channels unchanged (e.g. when only editing emails).
   * Send [] to remove every channel.
   */
  discord_webhooks?: DiscordWebhook[];
  review_alert_discord_user_id?: string | null;
}

export const MAX_DISCORD_WEBHOOKS = 10;
export const MAX_WEBHOOK_NAME_LENGTH = 100;

export const fetchReviewAlertSettings = async (): Promise<ReviewAlertSettings> => {
  const response = await Axios.get<ReviewAlertSettings>(
    "/data/drat-entities/settings/review-alerts"
  );
  // Guard: backend always returns discord_webhooks, but default to [] if absent.
  return {
    ...response.data,
    discord_webhooks: response.data.discord_webhooks ?? [],
  };
};

export const updateReviewAlertSettings = async (
  payload: ReviewAlertSettingsUpdatePayload
): Promise<ReviewAlertSettings> => {
  const response = await Axios.put<ReviewAlertSettings>(
    "/data/drat-entities/settings/review-alerts",
    payload
  );
  return {
    ...response.data,
    discord_webhooks: response.data.discord_webhooks ?? [],
  };
};

/** Parse comma/newline-separated emails into a normalized list for the API. */
export function parseReviewAlertEmailsInput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function formatReviewAlertEmailsInput(emails: string[]): string {
  return emails.join("\n");
}

export function validateReviewAlertEmailsInput(raw: string): string[] {
  const emails = parseReviewAlertEmailsInput(raw);
  const invalid = emails.filter((email) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
  if (invalid.length > 0) {
    return [`Invalid email address(es): ${invalid.join(", ")}`];
  }
  if (emails.length > 20) {
    return ["At most 20 email addresses are allowed"];
  }
  return [];
}

/** Validate a Discord webhook URL (must be a discord.com/api/webhooks/... URL). */
export function validateDiscordWebhookUrl(url: string): string | null {
  if (!url || !url.trim()) return "Webhook URL is required";
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.toLowerCase();
    const validHost =
      hostname === "discord.com" ||
      hostname.endsWith(".discord.com") ||
      hostname === "discordapp.com" ||
      hostname.endsWith(".discordapp.com");
    if (
      parsed.protocol !== "https:" ||
      !validHost ||
      !parsed.pathname.startsWith("/api/webhooks/")
    ) {
      return "Must be a valid Discord webhook URL (https://discord.com/api/webhooks/...)";
    }
    return null;
  } catch {
    return "Must be a valid Discord webhook URL (https://discord.com/api/webhooks/...)";
  }
}

export function validateDiscordUserId(id: string): string | null {
  if (!id || !id.trim()) return null;
  if (!/^\d{17,19}$/.test(id.trim())) {
    return "Must be a valid Discord user ID (17-19 digits)";
  }
  return null;
}

export interface DiscordChannelRowErrors {
  name?: string;
  url?: string;
  events?: string;
  general?: string;
}

export interface ReviewAlertParsedError {
  message: string;
  rowErrors: Record<number, DiscordChannelRowErrors>;
}

export function parseReviewAlertApiError(
  err: unknown,
  fallback = "Failed to save settings"
): ReviewAlertParsedError {
  const data = (err as { response?: { data?: unknown } })?.response?.data as
    | { detail?: unknown; message?: string }
    | undefined;

  const rowErrors: Record<number, DiscordChannelRowErrors> = {};

  if (!data) {
    return { message: fallback, rowErrors };
  }

  const detail = data.detail;

  // 400 detail is string: e.g. "discord_webhooks[1].url must be a Discord webhook URL (...)"
  if (typeof detail === "string") {
    const match = detail.match(/discord_webhooks\[(\d+)\](?:\.([a-zA-Z_]+))?/);
    if (match) {
      const index = parseInt(match[1], 10);
      const field = match[2];
      rowErrors[index] = rowErrors[index] || {};
      if (field === "name") {
        rowErrors[index].name = detail;
      } else if (field === "url") {
        rowErrors[index].url = detail;
      } else if (field === "events") {
        rowErrors[index].events = detail;
      } else {
        rowErrors[index].general = detail;
      }
      return { message: detail, rowErrors };
    }
    return { message: detail, rowErrors };
  }

  // 422 detail is array of pydantic errors: e.g. [{ loc: ["discord_webhooks", 0, "name"], msg: "..." }]
  if (Array.isArray(detail)) {
    let firstMsg = "";
    for (const item of detail) {
      const msg = item.msg || item.message || "Invalid input";
      if (!firstMsg) firstMsg = msg;
      const loc = Array.isArray(item.loc) ? item.loc : [];
      const hookIdxInLoc = loc.indexOf("discord_webhooks");
      if (hookIdxInLoc !== -1 && typeof loc[hookIdxInLoc + 1] === "number") {
        const index = loc[hookIdxInLoc + 1] as number;
        const field = loc[hookIdxInLoc + 2] as string | undefined;
        rowErrors[index] = rowErrors[index] || {};
        if (field === "name") rowErrors[index].name = msg;
        else if (field === "url") rowErrors[index].url = msg;
        else if (field === "events") rowErrors[index].events = msg;
        else rowErrors[index].general = msg;
      }
    }
    return { message: firstMsg || fallback, rowErrors };
  }

  if (typeof data.message === "string") {
    return { message: data.message, rowErrors };
  }

  return { message: fallback, rowErrors };
}
