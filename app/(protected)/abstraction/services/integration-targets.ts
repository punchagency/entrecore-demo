/** Multi-target integration config — one source table, many destination tables. */

export type TargetRelationship = "1:1" | "1:N";

export interface IntegrationTargetLink {
  id: string;
  destinationTable: string;
  destinationConnector: string;
  /** How the source links to this target (e.g. user_id → profiles.user_id) */
  relationship: TargetRelationship;
  /** Source column used as the join / FK key */
  linkColumn?: string;
  jobId?: string;
  label?: string;
}

const TARGETS_STORAGE_PREFIX = "abstraction:integration-targets:";

export function getIntegrationTargets(workflowId: string): IntegrationTargetLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${TARGETS_STORAGE_PREFIX}${workflowId}`);
    return raw ? (JSON.parse(raw) as IntegrationTargetLink[]) : [];
  } catch {
    return [];
  }
}

export function saveIntegrationTargets(
  workflowId: string,
  targets: IntegrationTargetLink[]
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${TARGETS_STORAGE_PREFIX}${workflowId}`, JSON.stringify(targets));
}

export function upsertIntegrationTarget(
  workflowId: string,
  target: IntegrationTargetLink
): IntegrationTargetLink[] {
  const existing = getIntegrationTargets(workflowId);
  const index = existing.findIndex((t) => t.id === target.id);
  const next =
    index >= 0
      ? existing.map((t) => (t.id === target.id ? { ...t, ...target } : t))
      : [...existing, target];
  saveIntegrationTargets(workflowId, next);
  return next;
}

export function removeIntegrationTarget(workflowId: string, targetId: string): IntegrationTargetLink[] {
  const next = getIntegrationTargets(workflowId).filter((t) => t.id !== targetId);
  saveIntegrationTargets(workflowId, next);
  return next;
}

/** Remove every target except the ones whose id is in `keepIds`. */
export function clearIntegrationTargets(
  workflowId: string,
  keepIds: string[] = []
): IntegrationTargetLink[] {
  const next = getIntegrationTargets(workflowId).filter((t) => keepIds.includes(t.id));
  saveIntegrationTargets(workflowId, next);
  return next;
}

export function createTargetId(): string {
  return `tgt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Ensure primary destination exists in targets list */
export function syncPrimaryTarget(
  workflowId: string,
  primary: Omit<IntegrationTargetLink, "id"> & { id?: string }
): IntegrationTargetLink[] {
  const existing = getIntegrationTargets(workflowId);
  const match = existing.find(
    (t) =>
      t.destinationTable === primary.destinationTable &&
      t.destinationConnector === primary.destinationConnector
  );
  if (match) {
    const updated = existing.map((t) =>
      t.id === match.id
        ? { ...t, ...primary, id: match.id, jobId: primary.jobId ?? t.jobId }
        : t
    );
    saveIntegrationTargets(workflowId, updated);
    return updated;
  }
  const created: IntegrationTargetLink = {
    id: primary.id ?? createTargetId(),
    destinationTable: primary.destinationTable,
    destinationConnector: primary.destinationConnector,
    relationship: primary.relationship ?? "1:1",
    linkColumn: primary.linkColumn,
    jobId: primary.jobId,
    label: primary.label,
  };
  const next = [created, ...existing];
  saveIntegrationTargets(workflowId, next);
  return next;
}
