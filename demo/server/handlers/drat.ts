import {
  DEFAULT_CLASSIFY_PROMPT,
  DEFAULT_FILENAME_TEMPLATE_DATED,
  DEFAULT_FILENAME_TEMPLATE_UNDATED,
} from "@/demo/data/drat-defaults";
import type { Router } from "../router";

/**
 * DRAT (document intake, classification and filing). On day one the company
 * has no entities, rules, watched sources or runs; settings return the
 * backend's defaults (routers/drat_*.py, services/drat_settings_service.py).
 */
export function registerDrat(router: Router) {
  const page = (limit = 50) => ({ items: [], total: 0, skip: 0, limit });

  // Settings the visitor changes persist until reload.
  const settings = {
    classifyPrompt: null as string | null,
    filenameDated: null as string | null,
    filenameUndated: null as string | null,
    abstractionEnabled: true,
  };

  router
    .get("/data/drat-entities", (req) => page(Number(req.query.get("limit") ?? 50)))
    .get("/data/drat-entity-drive-map", () => ({ items: [], total: 0 }))
    .get("/data/drat-watched-sources", () => ({ items: [], total: 0 }))
    .get("/data/drat-routing-rules", (req) => page(Number(req.query.get("limit") ?? 50)))
    .get("/data/drat-review/pending", (req) => page(Number(req.query.get("limit") ?? 50)))
    .get("/data/drat-rule-log/runs", (req) => page(Number(req.query.get("limit") ?? 50)))
    .get("/data/drat-rule-log/failed-runs", () => ({ items: [], total: 0 }))
    .get("/data/drat-rule-log/stats", () => ({ total: 0, success: 0, skipped: 0, manual: 0, error: 0 }))

    .get("/data/drat-entities/settings/classify-prompt", () => ({
      classify_prompt: settings.classifyPrompt ?? DEFAULT_CLASSIFY_PROMPT,
      is_default: settings.classifyPrompt === null,
    }))
    .put("/data/drat-entities/settings/classify-prompt", (req) => {
      settings.classifyPrompt = String((req.body as { classify_prompt?: string })?.classify_prompt ?? "");
      return { classify_prompt: settings.classifyPrompt, is_default: false };
    })
    .delete("/data/drat-entities/settings/classify-prompt", () => {
      settings.classifyPrompt = null;
      return null;
    })

    .get("/data/drat-entities/settings/filename-template", () => ({
      filename_template_dated: settings.filenameDated ?? DEFAULT_FILENAME_TEMPLATE_DATED,
      filename_template_undated: settings.filenameUndated ?? DEFAULT_FILENAME_TEMPLATE_UNDATED,
      is_default: settings.filenameDated === null && settings.filenameUndated === null,
    }))
    .put("/data/drat-entities/settings/filename-template", (req) => {
      const body = (req.body ?? {}) as { filename_template_dated?: string; filename_template_undated?: string };
      settings.filenameDated = body.filename_template_dated ?? settings.filenameDated;
      settings.filenameUndated = body.filename_template_undated ?? settings.filenameUndated;
      return {
        filename_template_dated: settings.filenameDated ?? DEFAULT_FILENAME_TEMPLATE_DATED,
        filename_template_undated: settings.filenameUndated ?? DEFAULT_FILENAME_TEMPLATE_UNDATED,
        is_default: false,
      };
    })
    .delete("/data/drat-entities/settings/filename-template", () => {
      settings.filenameDated = null;
      settings.filenameUndated = null;
      return null;
    })

    // No recipients or channels configured yet (DratReviewAlertSettingsResponse).
    .get("/data/drat-entities/settings/review-alerts", () => ({
      email_recipients: [],
      review_alert_emails: [],
      notifications_enabled: false,
      discord_webhooks: [],
      review_alert_discord_webhook_url: null,
      drive_filing_discord_webhook_url: null,
      discord_mentions: [],
      review_alert_discord_user_id: null,
    }))
    // Default on (DratSettingsService.get_abstraction_enabled).
    .get("/data/drat-entities/settings/abstraction-enabled", () => ({ abstraction_enabled: settings.abstractionEnabled }))
    .put("/data/drat-entities/settings/abstraction-enabled", (req) => {
      settings.abstractionEnabled = Boolean((req.body as { abstraction_enabled?: boolean })?.abstraction_enabled);
      return { abstraction_enabled: settings.abstractionEnabled };
    })
    .get("/data/drat-entities/settings/drive-auto-provision", () => ({ configured: false, config: null }))
    .get("/data/drat-entities/settings/airtable-sync", () => ({ configured: false, config: null }));
}
