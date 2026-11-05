import { Axios } from "@/app/config/axios";

export interface OcrNotificationSettings {
  enabled: boolean;
  default_discord_webhook_url: string | null;
  discord_user_id: string | null;
  protocol_discord_webhooks: { ocr_config_id: string; webhook_url: string }[];
}

export interface OcrNotificationSettingsUpdatePayload {
  enabled?: boolean | null;
  default_discord_webhook_url?: string | null;
  discord_user_id?: string | null;
  protocol_discord_webhooks?: { ocr_config_id: string; webhook_url: string }[] | null;
}

export const fetchAbstractionNotificationSettings = async (): Promise<OcrNotificationSettings> => {
  const response = await Axios.get<OcrNotificationSettings>("/data/ocr/notification-settings");
  return response.data;
};

export const updateAbstractionNotificationSettings = async (
  payload: OcrNotificationSettingsUpdatePayload
): Promise<OcrNotificationSettings> => {
  const response = await Axios.put<OcrNotificationSettings>(
    "/data/ocr/notification-settings",
    payload
  );
  return response.data;
};

/** Validate a Discord webhook URL (must be a discord.com/api/webhooks/... URL or empty). */
export function validateDiscordWebhookUrl(url: string): string | null {
  if (!url.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith("discord.com") ||
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
  if (!id.trim()) return null;
  if (!/^\d{17,19}$/.test(id.trim())) {
    return "Must be a valid Discord user ID (17-19 digits)";
  }
  return null;
}
