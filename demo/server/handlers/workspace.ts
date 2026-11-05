import { TRIGGER_TYPES } from "@/demo/data/platform";
import { db } from "../db";
import { respond, type Router } from "../router";

/**
 * Workflows, triggers, training, Abstraction (OCR) settings and team. Day one:
 * nothing built or run yet; platform lists (trigger types) and defaults come
 * from the backend (routers/triggers.py, training.py, ocr.py, company_routes.py).
 */
export function registerWorkspace(router: Router) {
  router
    .get("/data/workflows", () => ({ count: 0, workflows: [] }))
    .get("/data/triggers", () => [])
    .get("/data/triggers/types", () => TRIGGER_TYPES)

    // Training (routers/training.py). No traces until people use the platform.
    .get("/data/training/traces", (req) => ({
      traces: [],
      total: 0,
      page: Number(req.query.get("page") ?? 1),
      page_size: Number(req.query.get("page_size") ?? 20),
    }))
    .get("/data/training/traces/stats", () => ({
      total_traces: 0,
      unused_traces: 0,
      labelled_traces: 0,
      positive_traces: 0,
      negative_traces: 0,
      eligible_traces: 0,
      trainable_traces: 0,
      trainable_backlog: 0,
      trace_load_limit: 200, // agent/art_training.py TRACE_LOAD_LIMIT
    }))
    .get("/data/training/runs", () => [])
    .get("/data/training/runs/latest", () => respond({ status: 404, data: { detail: "No training runs found" } }))

    // Abstraction (OCR): no extraction configurations; alerts on with no recipients (AbstractionNotificationSettingsResponse defaults).
    .get("/data/ocr/configurations", () => [])
    .get("/data/ocr/notification-settings", () => ({
      enabled: true,
      discord_mentions: [],
      discord_user_id: null,
      discord_webhooks: [],
      email_recipients: [],
      default_discord_webhook_url: null,
      protocol_discord_webhooks: [],
    }))

    // Team: only the person who signed up (CompanyMembersResponse), no invites sent.
    .get("/auth/company/:companyId/members", () => ({
      caller_is_owner: true,
      members: [
        {
          id: db.user.id,
          email: db.user.email,
          full_name: db.user.full_name,
          first_name: db.user.first_name,
          last_name: db.user.last_name,
          company_role: "admin",
          is_owner: true,
          profile_image: null,
        },
      ],
    }))
    .get("/auth/companies/invites", () => [])
    .get("/auth/support/companies", () => []);
}
