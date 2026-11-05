import { db } from "../db";
import type { Router } from "../router";

/** Login, session and company endpoints. Any credentials sign in as the demo user. */
export function registerAuth(router: Router) {
  const token = { access_token: "demo-access-token", token_type: "bearer" };

  router
    .post("/auth/token", () => token)
    .post("/auth/refresh-token", () => token)
    .post("/auth/logout", () => ({ success: true }))
    .get("/auth/me", () => db.user)
    .put("/auth/me", (req) => Object.assign(db.user, req.body as object))

    .get("/auth/company/companies", () => [db.company])
    .get("/auth/company/profile/:id", () => db.company)
    .put("/auth/onboarding/company", (req) => Object.assign(db.company, req.body as object))
    .get("/auth/company/:id/llm-config", () => ({
      llm_provider: db.company.llm_provider,
      llm_configurations: db.company.llm_configurations,
    }))
    .put("/auth/company/:id/llm-config", (req) => {
      const body = req.body as { llm_provider?: string; llm_model?: string };
      if (body.llm_provider) db.company.llm_provider = body.llm_provider;
      return { success: true, ...body };
    })
    .put("/auth/company/:id/llm-api-key", () => ({ success: true }));
}
