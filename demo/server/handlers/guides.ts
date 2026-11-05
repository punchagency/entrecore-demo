import { AGENTS, DATASETS, scriptedReply, toArchitecture } from "@/demo/data/agents";
import { now } from "@/demo/data/time";
import { pushSocketIO } from "@/demo/realtime/bus";
import { db, newId, type Guide } from "../db";
import { PASS, respond, type Router } from "../router";

/** How long an agent "thinks" before its reply arrives over Socket.IO. */
const REPLY_DELAY_MS = 1800;

const notFound = () => respond({ status: 404, data: { detail: "Guide not found" } });

function findGuide(id: string): Guide | undefined {
  return db.guides.find((guide) => guide.id === id);
}

/** Agents ("Guides"): list, detail, architecture, create/edit/delete, datasets, chat. */
export function registerGuides(router: Router) {
  router
    .get("/data/guides", () => db.guides)
    // Unknown ids fall through, so sub-resources like /data/guides/company-knowledge-docs
    // reach their own handler, a recording, or the unhandled list instead of a 404.
    .get("/data/guides/:id", (req) => findGuide(req.params.id) ?? PASS)
    .get("/data/guides/:id/architecture", (req) => {
      const agent = AGENTS.find((a) => a.id === req.params.id);
      if (agent) return toArchitecture(agent);
      const guide = findGuide(req.params.id);
      // Agents created during the visit get the analyst architecture.
      return guide ? { ...toArchitecture(AGENTS[0]), model_type: guide.model_type } : notFound();
    })

    .post("/data/guides", (req) => createGuide(req.body))
    .post("/data/guides/with-config", (req) => createGuide(req.body))
    .post("/data/guides/from-prompt", (req) => {
      const { prompt = "", agent_name } = (req.body ?? {}) as { prompt?: string; agent_name?: string };
      const guide = createGuide({
        name: agent_name || titleFromPrompt(prompt),
        description: prompt || "Agent created from a description.",
        model_type: "custom",
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
      return { success: true };
    })

    .post("/data/guides/:id/datasets/assign", (req) => {
      const guide = findGuide(req.params.id);
      if (!guide) return notFound();
      for (const id of datasetIds(req.body)) {
        if (guide.datasets.some((ds) => ds.id === id)) continue;
        const known = Object.values(DATASETS).find((ds) => ds.id === id);
        guide.datasets.push({ id, name: known?.name ?? id });
      }
      return { success: true };
    })
    .post("/data/guides/:id/datasets/remove", (req) => {
      const guide = findGuide(req.params.id);
      const remove = new Set(datasetIds(req.body));
      if (guide) guide.datasets = guide.datasets.filter((ds) => !remove.has(ds.id));
      return { success: true };
    })

    // Chat: the API acknowledges, and the answer arrives later as a Socket.IO
    // `agent_response` (see hooks/use-guide-chat.ts and guide-chat-dialog.tsx).
    .post("/data/guides/:id/execute", (req) => {
      const { message = "", conversation_id } = (req.body ?? {}) as { message?: string; conversation_id?: string };
      const agent = AGENTS.find((a) => a.id === req.params.id);
      const guide = findGuide(req.params.id);
      const reply = agent
        ? scriptedReply(agent, message)
        : `I'm ${guide?.name ?? "your new agent"}. Once my datasets are connected I'll answer questions like this one from your data.`;
      const conversationId = conversation_id || newId("conv");
      pushSocketIO(
        "agent_response",
        { message_id: newId("msg"), conversation_id: conversationId, response: reply, success: true },
        REPLY_DELAY_MS
      );
      return { status: "processing", conversation_id: conversationId };
    });
}

function createGuide(body: unknown): Guide {
  const input = (body ?? {}) as Partial<Guide>;
  const guide: Guide = {
    id: newId("guide"),
    name: input.name || "New agent",
    description: input.description || "",
    model_type: input.model_type || "custom",
    model_version: input.model_version || "1.0.0",
    model_metadata: JSON.stringify({ memory_enabled: true, chat_enabled: true, use_tools: true }),
    status: "inactive",
    agent_persona: input.agent_persona || "general_assistant",
    specialization: input.specialization || "general",
    technical_level: input.technical_level || "intermediate",
    created_at: now(),
    updated_at: now(),
    datasets: [],
    actions: [],
  };
  db.guides.unshift(guide);
  return guide;
}

/** Request body `{ dataset_ids: [...] }` (aiAgentsStore assign/unassign). */
function datasetIds(body: unknown): string[] {
  const ids = (body as { dataset_ids?: unknown })?.dataset_ids;
  return Array.isArray(ids) ? ids.map(String) : [];
}

function titleFromPrompt(prompt: string): string {
  const words = prompt.replace(/[^\w\s-]/g, "").split(/\s+/).filter(Boolean).slice(0, 4);
  if (!words.length) return "New agent";
  const title = words.join(" ");
  return title.charAt(0).toUpperCase() + title.slice(1);
}
