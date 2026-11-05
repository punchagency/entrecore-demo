import { AGENTS, toGuide } from "@/demo/data/agents";
import { company, user } from "@/demo/data/tenant";

/**
 * In-memory state for one browser tab. Writes (create an agent, rename it,
 * switch it off) last until the page is reloaded, then everything is back to
 * the seeded demo state — every visitor starts from the same place.
 */
function seed() {
  return {
    user: structuredClone(user),
    company: structuredClone(company),
    guides: AGENTS.map(toGuide),
  };
}

export const db = seed();

export type Guide = (typeof db.guides)[number];

let idCounter = 0;
/** Ids for things created during a visit. Sequential, so a scripted walkthrough gets the same ids. */
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-demo-${String(idCounter).padStart(4, "0")}`;
}
