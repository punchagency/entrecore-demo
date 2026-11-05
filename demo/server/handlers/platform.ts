import { notifications as seedNotifications } from "@/demo/data/notifications";
import { now } from "@/demo/data/time";
import { COMPANY_ID } from "@/demo/data/tenant";
import type { Router } from "../router";

/** App-shell endpoints every page calls: support access status and notifications. */
export function registerPlatform(router: Router) {
  const notifications = structuredClone(seedNotifications);
  const unread = () => notifications.filter((n) => !n.is_read).length;

  router
    .get("/auth/support/grants/status", () => ({
      active: false,
      can_manage: true,
      scope: null,
      expires_at: null,
      granted_by_email: null,
      escalation_reason: null,
      company_id: COMPANY_ID,
    }))

    .get("/data/notifications", (req) => {
      const skip = Number(req.query.get("skip") ?? 0);
      const limit = Number(req.query.get("limit") ?? 20);
      const isRead = req.query.get("is_read");
      const types = req.query.getAll("types");
      const filtered = notifications.filter(
        (n) =>
          (isRead === null || String(n.is_read) === isRead) && (types.length === 0 || types.includes(n.type))
      );
      return { items: filtered.slice(skip, skip + limit), total: filtered.length, skip, limit, unread_count: unread() };
    })
    .get("/data/notifications/unread-count", () => ({ unread_count: unread() }))
    .post("/data/notifications/read-all", () => {
      let marked = 0;
      for (const n of notifications) {
        if (n.is_read) continue;
        Object.assign(n, { is_read: true, read_at: now() });
        marked += 1;
      }
      return { marked, unread_count: 0 };
    })
    .post("/data/notifications/:id/read", (req) => {
      const n = notifications.find((item) => item.id === req.params.id);
      if (n) Object.assign(n, { is_read: true, read_at: n.read_at ?? now() });
      return { id: req.params.id, is_read: true, read_at: n?.read_at ?? now() };
    });
}
