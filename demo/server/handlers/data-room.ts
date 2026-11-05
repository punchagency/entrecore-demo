import type { Router } from "../router";

/**
 * Data Intelligence Hub (data room) and integrations. Day one: nothing has
 * been connected or crawled, so every list is empty. Shapes follow the
 * backend routers (catalog_intelligence_service.fetch_catalogs,
 * company_docs.py, glossary.py, erd.py, lineage.py, integration*.py).
 */
export function registerDataRoom(router: Router) {
  const emptyGraph = { nodes: [], edges: [] };

  router
    .get("/data/catalog", (req) => {
      const skip = Number(req.query.get("skip") ?? 0);
      const limit = Number(req.query.get("limit") ?? 50);
      return { items: [], pagination: { total: 0, skip, limit, has_more: false } };
    })
    .post("/data/catalog/search", () => ({ items: [], total: 0 }))
    .get("/data/company-documents", (req) => ({
      items: [],
      total: 0,
      skip: Number(req.query.get("skip") ?? 0),
      limit: Number(req.query.get("limit") ?? 100),
    }))
    .get("/data/glossary", (req) => ({
      items: [],
      total: 0,
      skip: Number(req.query.get("skip") ?? 0),
      limit: Number(req.query.get("limit") ?? 100),
    }))
    .post("/data/erd/graph", () => emptyGraph)
    .post("/data/lineage/graph/reactflow", () => emptyGraph)

    // Integrations (routers/integration.py, integration_upsert_review.py).
    .get("/data/integration/jobs", (req) => ({
      jobs: [],
      total: 0,
      page: Number(req.query.get("page") ?? 1),
      page_size: Number(req.query.get("page_size") ?? 20),
    }))
    .get("/data/integration/review", (req) => ({
      rows: [],
      total: 0,
      page: Number(req.query.get("page") ?? 1),
      page_size: Number(req.query.get("page_size") ?? 20),
    }))
    .get("/data/integration/upsert-review/runs", () => ({ items: [], total: 0, skip: 0, limit: 50 }))

    // Older Data Room pages (Staff, Financials, 360 view) call endpoints no
    // backend router serves today; answer them as an empty company would.
    .get("/data/employees", () => [])
    .get("/data/financial-statements", () => [])
    .get("/data/view360/golden_records/stream", () => [])
    // No identity resolution has run, so there are no canonical (golden) records.
    .get("/data/view360/list", () => []);
}
