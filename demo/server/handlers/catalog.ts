import { AGENT_VERTICALS, DATASET_VERTICALS, datasets, knowledgeDocs as seedDocs, verticals } from "@/demo/data/catalog";
import { COMPANY_ID } from "@/demo/data/tenant";
import { ago } from "@/demo/data/time";
import { db } from "../db";
import { PASS, type Router } from "../router";

/** Datasets, verticals and company knowledge documents. */
export function registerCatalog(router: Router) {
  let knowledgeDocs = structuredClone(seedDocs);

  router
    .get("/data/metadata/datasets", (req) => {
      const skip = Number(req.query.get("skip") ?? 0);
      const limit = Number(req.query.get("limit") ?? 100);
      return { items: datasets.slice(skip, skip + limit), total: datasets.length, skip, limit };
    })
    .get("/data/metadata/datasets/:id", (req) => datasets.find((ds) => ds.id === req.params.id) ?? PASS)

    .get("/data/knowledge-graph/verticals", () => ({ verticals }))
    .get("/data/guides/:id/verticals", (req) => {
      const guide = db.guides.find((g) => g.id === req.params.id);
      const keys = AGENT_VERTICALS[req.params.id] ?? [];
      return {
        verticals: keys.map((key, index) => {
          const vertical = verticals.find((v) => v.key === key)!;
          return {
            id: `${req.params.id}-${key}`,
            entity_type: "guide",
            entity_id: req.params.id,
            guide_id: req.params.id,
            guide_name: guide?.name ?? "",
            vertical_key: key,
            vertical_name: vertical.name,
            vertical_description: vertical.description,
            company_id: COMPANY_ID,
            tag_source: index === 0 ? "manual" : "automated",
            created_at: ago({ days: 30 }),
            is_active: true,
          };
        }),
      };
    })

    // Datasets sharing a vertical with the agent ("Suggested data assets").
    .get("/data/guides/:id/verticals/entities", (req) => {
      const keys = AGENT_VERTICALS[req.params.id] ?? [];
      const entities = datasets.flatMap((ds) =>
        (DATASET_VERTICALS[ds.id] ?? [])
          .filter((key) => keys.includes(key))
          .map((key) => {
            const vertical = verticals.find((v) => v.key === key)!;
            return {
              id: `${ds.id}-${key}`,
              entity_type: "dataset",
              entity_id: ds.id,
              vertical_key: key,
              vertical_name: vertical.name,
              vertical_description: vertical.description,
              company_id: COMPANY_ID,
              tag_source: "automated" as const,
              created_at: ago({ days: 21 }),
            };
          })
      );
      return { guide_id: req.params.id, verticals: keys, count: entities.length, entities };
    })

    .get("/data/guides/company-knowledge-docs", () => knowledgeDocs)
    .put("/data/guides/company-knowledge-docs/:id", (req) => {
      const doc = knowledgeDocs.find((d) => d.knowledge_id === req.params.id);
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
      knowledgeDocs = knowledgeDocs.filter((doc) => doc.knowledge_id !== req.params.id);
      return { success: true };
    });
}
