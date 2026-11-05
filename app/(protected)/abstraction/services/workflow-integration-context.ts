import type { OcrFetchedDocument } from "./ocr-api";

export interface WorkflowIntegrationStage {
  sourceTable: string;
  destinationTable?: string;
  sourceConnector?: string;
  destinationConnector?: string;
  jobId?: string;
  jobName?: string;
  bundleId?: string;
  stagedAt: string;
  stagedFrom: "pipeline" | "integrate" | "manual";
}

function storageKey(workflowId: string) {
  return `abstraction:workflow-integration:${workflowId}`;
}

export function extractSourceTableFromOcrRaw(
  raw: Record<string, unknown> | undefined
): string | null {
  if (!raw || typeof raw !== "object") return null;
  const candidates = [
    raw.data_product_table_name,
    raw.source_table_name,
    raw.source_table,
    raw.staging_table_name,
    raw.staging_table,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

export function extractSourceTableFromDocuments(
  documents: OcrFetchedDocument[] | void
): string | null {
  if (!documents?.length) return null;
  const completed = documents.filter((doc) => doc.status === "completed");
  const pool = completed.length > 0 ? completed : documents;
  for (const doc of pool) {
    const table = extractSourceTableFromOcrRaw(doc.raw as Record<string, unknown>);
    if (table) return table;
  }
  return null;
}

export function getWorkflowIntegrationStage(
  workflowId: string
): WorkflowIntegrationStage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(workflowId));
    if (!raw) return null;
    return JSON.parse(raw) as WorkflowIntegrationStage;
  } catch {
    return null;
  }
}

export function setWorkflowIntegrationStage(
  workflowId: string,
  update: Partial<WorkflowIntegrationStage> & { sourceTable?: string }
): WorkflowIntegrationStage {
  const previous = getWorkflowIntegrationStage(workflowId);
  const next: WorkflowIntegrationStage = {
    sourceTable: update.sourceTable ?? previous?.sourceTable ?? "",
    destinationTable: update.destinationTable ?? previous?.destinationTable,
    sourceConnector: update.sourceConnector ?? previous?.sourceConnector,
    destinationConnector: update.destinationConnector ?? previous?.destinationConnector,
    jobId: update.jobId ?? previous?.jobId,
    jobName: update.jobName ?? previous?.jobName,
    bundleId: update.bundleId ?? previous?.bundleId,
    stagedAt: new Date().toISOString(),
    stagedFrom: update.stagedFrom ?? previous?.stagedFrom ?? "manual",
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey(workflowId), JSON.stringify(next));
  }
  return next;
}

export function slugifyJobName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}
