import { VERTICALS } from "@/demo/data/platform";
import { now } from "@/demo/data/time";
import { db, newId } from "../db";
import { PASS, type Router } from "../router";

/** Datasets, verticals and the company knowledge base. */
export function registerCatalog(router: Router) {
  router
    .get("/data/metadata/datasets", (req) => {
      const skip = Number(req.query.get("skip") ?? 0);
      const limit = Number(req.query.get("limit") ?? 100);
      return { items: db.datasets.slice(skip, skip + limit), total: db.datasets.length, skip, limit };
    })
    .get("/data/metadata/datasets/:id", (req) => db.datasets.find((ds) => ds.id === req.params.id) ?? PASS)

    // The 14 platform verticals exist from day one; the company's tags on them don't.
    .get("/data/knowledge-graph/verticals", () => ({ verticals: VERTICALS }))
    .get("/data/knowledge-graph/verticals/:key/entities", (req) => ({
      vertical_key: req.params.key,
      count: 0,
      entities: [],
    }))
    .get("/data/guides/:id/verticals", (req) => {
      const guide = db.guides.find((g) => g.id === req.params.id);
      if (!guide) return PASS;
      return {
        verticals: (db.guideVerticals[guide.id] ?? []).map((key) => {
          const vertical = VERTICALS.find((v) => v.key === key);
          return {
            id: `${guide.id}-${key}`,
            entity_type: "guide",
            entity_id: guide.id,
            guide_id: guide.id,
            guide_name: guide.name,
            vertical_key: key,
            vertical_name: vertical?.name ?? key,
            vertical_description: vertical?.description ?? "",
            company_id: db.company.id,
            tag_source: "manual",
            created_at: guide.created_at,
            is_active: true,
          };
        }),
      };
    })
    // Nothing in the company is tagged yet, so no guide has suggested data assets.
    .get("/data/guides/:id/verticals/entities", (req) => ({
      guide_id: req.params.id,
      verticals: db.guideVerticals[req.params.id] ?? [],
      count: 0,
      entities: [],
    }))

    .get("/data/guides/company-knowledge-docs", () => db.knowledgeDocs)
    .put("/data/guides/company-knowledge-docs/:id", (req) => {
      const doc = db.knowledgeDocs.find((d) => d.knowledge_id === req.params.id);
      if (!doc) return PASS;
      const { new_tags = [], append = true, remove_tags = [], new_name } = (req.body ?? {}) as {
        new_tags?: string[];
        append?: boolean;
        remove_tags?: string[];
        new_name?: string;
      };
      const kept = (append ? doc.tags : []).filter((tag) => !remove_tags.includes(tag));
      doc.tags = Array.from(new Set([...kept, ...new_tags]));
      if (new_name) doc.title = new_name;
      return doc;
    })
    .delete("/data/guides/company-knowledge-docs/:id", (req) => {
      db.knowledgeDocs = db.knowledgeDocs.filter((doc) => doc.knowledge_id !== req.params.id);
      return { success: true };
    });
}

/** Adds an uploaded document to the knowledge base (used by upload handlers). */
export function addKnowledgeDoc(fileName: string, tags: string[] = []) {
  const doc = {
    knowledge_id: newId("kd"),
    title: fileName.replace(/\.[^.]+$/, ""),
    file_name: fileName,
    tags,
    created_at: now(),
  };
  db.knowledgeDocs.unshift(doc);
  return doc;
}
