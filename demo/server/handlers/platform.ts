import { CONNECTOR_CATALOG } from "@/demo/data/platform";
import { now } from "@/demo/data/time";
import { db } from "../db";
import { PASS, type Router } from "../router";

/** App-shell endpoints every page calls (support access, notifications) and the connector catalog. */
export function registerPlatform(router: Router) {
  const unread = () => db.notifications.filter((n) => !n.is_read).length;

  router
    .get("/auth/support/grants/status", () => ({
      active: false,
      can_manage: true,
      scope: null,
      expires_at: null,
      granted_by_email: null,
      escalation_reason: null,
      company_id: db.company.id,
    }))

    .get("/data/notifications", (req) => {
      const skip = Number(req.query.get("skip") ?? 0);
      const limit = Number(req.query.get("limit") ?? 20);
      const isRead = req.query.get("is_read");
      const types = req.query.getAll("types");
      const filtered = db.notifications.filter(
        (n) => (isRead === null || String(n.is_read) === isRead) && (types.length === 0 || types.includes(n.type))
      );
      return { items: filtered.slice(skip, skip + limit), total: filtered.length, skip, limit, unread_count: unread() };
    })
    .get("/data/notifications/unread-count", () => ({ unread_count: unread() }))
    .post("/data/notifications/read-all", () => {
      let marked = 0;
      for (const n of db.notifications) {
        if (n.is_read) continue;
        Object.assign(n, { is_read: true, read_at: now() });
        marked += 1;
      }
      return { marked, unread_count: 0 };
    })
    .post("/data/notifications/:id/read", (req) => {
      const n = db.notifications.find((item) => item.id === req.params.id);
      if (n) Object.assign(n, { is_read: true, read_at: n.read_at ?? now() });
      return { id: req.params.id, is_read: true, read_at: n?.read_at ?? now() };
    })

    // The platform connector catalog exists on day one; the company has configured none of them.
    .get("/data/connectors", () => CONNECTOR_CATALOG)
    .get("/data/connectors/:id", (req) => CONNECTOR_CATALOG.find((c) => c.id === req.params.id) ?? PASS)
    .get("/data/connectors/:id/configs", () => [])
    .get("/data/connectors/company/:companyId/configs", () => []);
}
