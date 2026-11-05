import { GUIDE_ALWAYS_ON_TOOLS, GUIDE_STEPS, GUIDE_TOOLKITS } from "@/demo/data/platform";
import { now, possessive } from "@/demo/data/time";
import { pushSocketIO } from "@/demo/realtime/bus";
import { db, newId, type GuideRecord } from "../db";
import { PASS, respond, type Router } from "../router";

/** How long a guide "thinks" before its reply arrives over Socket.IO. */
const REPLY_DELAY_MS = 1800;

const notFound = () => respond({ status: 404, data: { detail: "Guide not found" } });

function findGuide(id: string): GuideRecord | undefined {
  return db.guides.find((guide) => guide.id === id);
}

/** Guides (agents): list, detail, architecture, create/edit/delete, datasets, verticals, chat. */
export function registerGuides(router: Router) {
  router
    .get("/data/guides", () => db.guides)
    // Unknown ids fall through, so sub-resources like /data/guides/company-knowledge-docs
    // reach their own handler, a recording, or the unhandled list instead of a 404.
    .get("/data/guides/:id", (req) => findGuide(req.params.id) ?? PASS)
    .get("/data/guides/:id/architecture", (req) => {
      const guide = findGuide(req.params.id);
      return guide ? architecture(guide) : notFound();
    })

    .post("/data/guides", (req) => createGuide(req.body))
    .post("/data/guides/with-config", (req) => createGuide(req.body))
    .post("/data/guides/from-prompt", (req) => {
      const body = (req.body ?? {}) as { prompt?: string; agent_name?: string; agent_persona?: string };
      const guide = createGuide({
        ...body,
        name: body.agent_name || titleFromPrompt(body.prompt ?? ""),
        description: body.prompt || "",
      });
      return respond({ data: { success: true, agent: guide }, delayMs: 1200 });
    })
    .put("/data/guides/:id", (req) => {
      const guide = findGuide(req.params.id);
      if (!guide) return notFound();
      Object.assign(guide, req.body as object, { updated_at: now() });
      return guide;
    })
    .delete("/data/guides/:id", (req) => {
      db.guides = db.guides.filter((guide) => guide.id !== req.params.id);
      delete db.guideVerticals[req.params.id];
      return { success: true };
    })

    .post("/data/guides/:id/datasets/assign", (req) => {
      const guide = findGuide(req.params.id);
      if (!guide) return notFound();
      for (const id of datasetIds(req.body)) {
        if (guide.datasets.some((ds) => ds.id === id)) continue;
        const dataset = db.datasets.find((ds) => ds.id === id);
        guide.datasets.push({ id, name: dataset?.dataset_name ?? id });
      }
      return { success: true };
    })
    .post("/data/guides/:id/datasets/remove", (req) => {
      const guide = findGuide(req.params.id);
      const remove = new Set(datasetIds(req.body));
      if (guide) guide.datasets = guide.datasets.filter((ds) => !remove.has(ds.id));
      return { success: true };
    })
    .post("/data/guides/:id/verticals", (req) => {
      if (!findGuide(req.params.id)) return notFound();
      const keys = verticalKeys(req.body);
      db.guideVerticals[req.params.id] = keys;
      return { guide_id: req.params.id, tagged_verticals: keys };
    })

    // Chat: the API acknowledges, and the answer arrives later as a Socket.IO
    // `agent_response` (see hooks/use-guide-chat.ts and guide-chat-dialog.tsx).
    .post("/data/guides/:id/execute", (req) => {
      const { conversation_id } = (req.body ?? {}) as { conversation_id?: string };
      const guide = findGuide(req.params.id);
      const conversationId = conversation_id || newId("conv");
      pushSocketIO(
        "agent_response",
        { message_id: newId("msg"), conversation_id: conversationId, response: reply(guide), success: true },
        REPLY_DELAY_MS
      );
      return { status: "processing", conversation_id: conversationId };
    });
}

/**
 * What a guide can honestly say on day one. A real run only has knowledge
 * search over uploaded documents and the toolkits of its datasets, and a new
 * company has neither yet.
 */
function reply(guide: GuideRecord | undefined): string {
  const name = guide?.name ?? "This guide";
  if (guide?.datasets.length) {
    return `${name} is connected to ${guide.datasets.map((d) => d.name).join(", ")}. Ask about what's in it and I'll query it for you.`;
  }
  if (db.knowledgeDocs.length) {
    return `I can search the ${db.knowledgeDocs.length} document(s) uploaded to ${possessive(db.company.company_name)} knowledge base, but no datasets are assigned to me yet. Connect a source under Connectors and assign its datasets to me to ask about your data.`;
  }
  return `I don't have any of ${possessive(db.company.company_name)} data yet. To get answers from me:\n\n1. Connect a source (NetSuite, BigQuery, Airtable, Notion or Google Drive) under Connectors.\n2. Assign its datasets to me from my card.\n3. Optionally upload documents (policies, contracts, reports) with Upload Document, and I'll search them too.`;
}

/** GET /data/guides/{id}/architecture, built the way agent/guide_architecture.py builds it. */
function architecture(guide: GuideRecord) {
  const isConnector = guide.model_type === "connector" && Boolean(guide.model_version);
  const tools: Array<{ id: string; name: string; description: string; data_products: string[]; always_on: boolean }> = [];

  if (isConnector) {
    const entry = GUIDE_TOOLKITS[guide.model_version];
    if (entry) tools.push({ id: guide.model_version, ...entry, data_products: [], always_on: false });
  } else {
    // One toolkit per distinct data source among the guide's datasets.
    const bySource = new Map<string, string[]>();
    for (const assigned of guide.datasets) {
      const dataset = db.datasets.find((ds) => ds.id === assigned.id);
      if (!dataset || !GUIDE_TOOLKITS[dataset.data_source]) continue;
      bySource.set(dataset.data_source, [...(bySource.get(dataset.data_source) ?? []), dataset.dataset_name]);
    }
    for (const [source, names] of Array.from(bySource)) {
      tools.push({ id: source, ...GUIDE_TOOLKITS[source], data_products: names, always_on: false });
    }
  }

  const hasDatasets = !isConnector && guide.datasets.length > 0;
  for (const tool of GUIDE_ALWAYS_ON_TOOLS) {
    if (tool.datasetGuidesOnly && !hasDatasets) continue;
    tools.push({ id: tool.id, name: tool.name, description: tool.description, data_products: [], always_on: true });
  }

  let memoryEnabled = true;
  try {
    memoryEnabled = JSON.parse(guide.model_metadata)?.memory_enabled ?? true;
  } catch {
    /* unreadable metadata means the default, as on the backend */
  }

  return {
    guide_type: isConnector ? "connector" : "dataset",
    model_type: guide.model_type,
    model_version: guide.model_version,
    steps: GUIDE_STEPS.map((step, index) => ({ ...step, order: index + 1 })),
    tools,
    memory: { enabled: memoryEnabled },
  };
}

function createGuide(body: unknown): GuideRecord {
  const input = (body ?? {}) as Partial<GuideRecord> & { vertical_keys?: unknown };
  const guide: GuideRecord = {
    id: newId("guide"),
    name: input.name || "New guide",
    description: input.description || "",
    model_type: input.model_type || "custom",
    model_version: input.model_version || "1.0.0",
    model_metadata:
      typeof input.model_metadata === "string"
        ? input.model_metadata
        : JSON.stringify({ memory_enabled: true, chat_enabled: true, use_tools: true }),
    status: "inactive",
    agent_persona: input.agent_persona || "general_assistant",
    specialization: input.specialization || "general",
    technical_level: input.technical_level || "intermediate",
    created_at: now(),
    updated_at: now(),
    datasets: [],
    actions: Array.isArray(input.actions) ? input.actions : [],
  };
  db.guides.unshift(guide);
  const keys = verticalKeys(input);
  if (keys.length) db.guideVerticals[guide.id] = keys;
  return guide;
}

/** Request body `{ dataset_ids: [...] }` (aiAgentsStore assign/unassign). */
function datasetIds(body: unknown): string[] {
  const ids = (body as { dataset_ids?: unknown })?.dataset_ids;
  return Array.isArray(ids) ? ids.map(String) : [];
}

/** Request body `{ vertical_keys: [...] }` (utils/vertical-tagging-api.ts). */
function verticalKeys(body: unknown): string[] {
  const keys = (body as { vertical_keys?: unknown })?.vertical_keys;
  return Array.isArray(keys) ? keys.map(String) : [];
}

function titleFromPrompt(prompt: string): string {
  const words = prompt.replace(/[^\w\s-]/g, "").split(/\s+/).filter(Boolean).slice(0, 4);
  if (!words.length) return "New guide";
  const title = words.join(" ");
  return title.charAt(0).toUpperCase() + title.slice(1);
}
