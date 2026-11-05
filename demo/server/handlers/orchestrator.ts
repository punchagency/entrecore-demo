import { possessive } from "@/demo/data/time";
import { CONNECTOR_CATALOG, VERTICALS } from "@/demo/data/platform";
import { pushSocketIO } from "@/demo/realtime/bus";
import { db, newId } from "../db";
import type { Router } from "../router";

/**
 * The orchestrator (POST /data/guides/orchestrator/observe). In production it
 * runs an LLM over the page the user is on and replies over Socket.IO as
 * `agent_response`. In the demo the replies are scripted from what is true for
 * the company right now: on day one, a provisioned knowledge graph and no data.
 */

const REPLY_DELAY_MS = 1400;

/** Finance sub-domains the company's knowledge graph is provisioned with (models/vertical_tag_models.py). */
const FINANCE_AREAS = ["Treasury", "Financial Planning & Analysis", "Accounting & Reporting", "Tax", "Internal Audit"];

const sources = () => CONNECTOR_CATALOG.map((c) => c.name).join(", ").replace(/, ([^,]*)$/, " or $1");

function vertical() {
  return VERTICALS.find((v) => v.key === db.company.vertical_key)?.name ?? "your";
}

function hasData() {
  return db.datasets.length > 0;
}

/** First message when a page opens. */
function greeting(page: string): string | null {
  const firstName = db.user.first_name;
  const company = db.company.company_name;
  if (page === "coreos" && !hasData()) {
    return (
      `Welcome to Entrecore, ${firstName}. ${company} is set up on the ${vertical()} vertical, so your knowledge graph ` +
      `already knows the language of ${FINANCE_AREAS.slice(0, 4).join(", ")} and ${FINANCE_AREAS[4]}.\n\n` +
      `There's no data connected yet. Start by connecting a source (${sources()}). Once it's connected I'll catalog ` +
      `every table, profile its quality and map how it flows, and your guides and workflows can start using it.`
    );
  }
  if (page === "catalog" && !hasData()) {
    return `Your catalog is empty because no source is connected yet. Connect ${sources()} and I'll crawl it and list every table here with its columns, owners and quality score.`;
  }
  return null;
}

/** Replies to a question typed to the orchestrator. */
function answer(message: string): string {
  const text = message.toLowerCase();
  if (/connect|source|integrat|data|import|upload/.test(text)) {
    return (
      `To bring ${possessive(db.company.company_name)} data in:\n\n` +
      `1. Open Connectors and pick a source: ${sources()}.\n` +
      `2. Enter its credentials. Nothing is copied until you start a crawl.\n` +
      `3. I'll crawl it, catalog the tables, profile data quality and map lineage. You'll get a notification when it's done.`
    );
  }
  if (/audit|performance|quality/.test(text)) {
    return "There's nothing to audit yet: no source is connected. Once data is in, I'll check every table against its business rules and flag freshness, completeness and duplicate issues.";
  }
  if (/workflow|automat|optimi/.test(text)) {
    return "You haven't built any workflows yet. In Workflows you can describe one in plain English or assemble it from the skill library (extract, classify, reconcile, notify and more). Most teams start with document intake or a month-end reconciliation.";
  }
  if (/what can you|help|how does|what is/.test(text)) {
    return `I coordinate Entrecore's specialists: catalog, data quality, lineage, integration and document abstraction. Tell me what you want to do with ${possessive(db.company.company_name)} data and I'll route it to the right one. Right now the first step is connecting a source.`;
  }
  return `I can't answer that from ${possessive(db.company.company_name)} data yet, because no source is connected. Connect ${sources()} under Connectors and ask me again.`;
}

/** When each page was last greeted, so a page that calls observe twice on open greets once. */
const greetedAt = new Map<string, number>();
const GREETING_DEDUPE_MS = 5000;

function greetOnce(page: string): string | null {
  const last = greetedAt.get(page) ?? 0;
  if (Date.now() - last < GREETING_DEDUPE_MS) return null;
  greetedAt.set(page, Date.now());
  return greeting(page);
}

export function registerOrchestrator(router: Router) {
  router.post("/data/guides/orchestrator/observe", (req) => {
    const body = (req.body ?? {}) as { message?: string; current_page?: string; just_opened?: boolean };
    const page = body.current_page ?? "coreos";
    const reply = body.message?.trim() ? answer(body.message) : body.just_opened ? greetOnce(page) : null;
    if (reply) {
      pushSocketIO(
        "agent_response",
        { message_id: newId("msg"), response: reply, current_page: page, success: true },
        REPLY_DELAY_MS
      );
    }
    return { success: true, message: null };
  });
}
