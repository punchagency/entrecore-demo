import { company, user } from "@/demo/data/tenant";

/**
 * In-memory state for one browser tab. The demo company starts on its first
 * day: every company-owned collection is empty. What a visitor creates (a
 * guide, a connector configuration…) lasts until the page is reloaded, then
 * everything is back to day one, so every visitor starts from the same place.
 */

export interface GuideRecord {
  id: string;
  name: string;
  description: string;
  model_type: string;
  model_version: string;
  model_metadata: string;
  status: string;
  agent_persona: string;
  specialization: string;
  technical_level: string;
  created_at: string;
  updated_at: string;
  datasets: Array<{ id: string; name: string }>;
  actions: Array<{ id: string; name: string; description: string }>;
}

export interface DatasetRecord {
  id: string;
  dataset_name: string;
  company_id: string;
  description?: string;
  connector?: string;
  /** Toolkit key (bigquery, netsuite…), as on the backend's dataset.data_source. */
  data_source: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDoc {
  knowledge_id: string;
  title: string;
  file_name: string;
  tags: string[];
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string | null;
  resource_name: string | null;
  source_type: string | null;
  source_id: string | null;
  link_url: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
}

function seed() {
  return {
    user: structuredClone(user),
    company: structuredClone(company),
    guides: [] as GuideRecord[],
    /** guide id → vertical keys tagged on it. */
    guideVerticals: {} as Record<string, string[]>,
    datasets: [] as DatasetRecord[],
    knowledgeDocs: [] as KnowledgeDoc[],
    notifications: [] as NotificationRecord[],
  };
}

export const db = seed();

let idCounter = 0;
/** Ids for things created during a visit. Sequential, so a scripted walkthrough gets the same ids. */
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-demo-${String(idCounter).padStart(4, "0")}`;
}
