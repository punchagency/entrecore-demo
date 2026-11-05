/** Mapping template persistence — saves mapping templates keyed by protocol/workflow. */

export interface MappingTemplateEntry {
  sourceColumn: string;
  targetColumn: string;
  transformation?: string;
  matchConfidence?: "auto" | "review_suggested" | "unmatched";
  matchScore?: number;
}

export interface MappingTemplate {
  id: string;
  name: string;
  /** Slugified protocol or workflow name this template was generated from */
  protocolKey: string;
  sourceConnector: string;
  destinationConnector: string;
  sourceTable: string;
  destinationTable: string;
  mappings: MappingTemplateEntry[];
  createdAt: string;
  updatedAt: string;
  version: number;
  /** Who approved the template (user identifier, optional) */
  approvedBy?: string;
}

const STORAGE_KEY = "abstraction:mapping-templates:v1";

function load(): Record<string, MappingTemplate[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, MappingTemplate[]>) : {};
  } catch {
    return {};
  }
}

function persist(data: Record<string, MappingTemplate[]>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage quota exceeded — silent
  }
}

/** Save or update a template for a given protocol key. */
export function saveMappingTemplate(template: Omit<MappingTemplate, "id" | "createdAt" | "updatedAt" | "version">): MappingTemplate {
  const all = load();
  const existing = (all[template.protocolKey] ?? []).find(
    (t) =>
      t.sourceConnector === template.sourceConnector &&
      t.destinationConnector === template.destinationConnector &&
      t.sourceTable === template.sourceTable &&
      t.destinationTable === template.destinationTable
  );

  const now = new Date().toISOString();

  if (existing) {
    const updated: MappingTemplate = {
      ...existing,
      ...template,
      updatedAt: now,
      version: existing.version + 1,
    };
    all[template.protocolKey] = (all[template.protocolKey] ?? []).map((t) =>
      t.id === existing.id ? updated : t
    );
    persist(all);
    return updated;
  }

  const created: MappingTemplate = {
    ...template,
    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  all[template.protocolKey] = [created, ...(all[template.protocolKey] ?? [])];
  persist(all);
  return created;
}

/** Get all templates for a protocol key, newest first. */
export function getMappingTemplates(protocolKey: string): MappingTemplate[] {
  const all = load();
  return (all[protocolKey] ?? []).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/** Find the best-matching template for a given connector+table combination. */
export function findBestTemplate(
  protocolKey: string,
  sourceConnector: string,
  destinationConnector: string,
  sourceTable?: string,
  destinationTable?: string
): MappingTemplate | null {
  const templates = getMappingTemplates(protocolKey);
  if (templates.length === 0) return null;

  // Exact match first
  const exact = templates.find(
    (t) =>
      t.sourceConnector === sourceConnector &&
      t.destinationConnector === destinationConnector &&
      (!sourceTable || t.sourceTable === sourceTable) &&
      (!destinationTable || t.destinationTable === destinationTable)
  );
  if (exact) return exact;

  // Connector-level match
  return (
    templates.find(
      (t) =>
        t.sourceConnector === sourceConnector &&
        t.destinationConnector === destinationConnector
    ) ?? null
  );
}

/** Delete a specific template by id under a protocol key. */
export function deleteMappingTemplate(protocolKey: string, templateId: string): void {
  const all = load();
  all[protocolKey] = (all[protocolKey] ?? []).filter((t) => t.id !== templateId);
  persist(all);
}

/** Get all protocol keys that have saved templates. */
export function getAllTemplateKeys(): string[] {
  return Object.keys(load());
}
