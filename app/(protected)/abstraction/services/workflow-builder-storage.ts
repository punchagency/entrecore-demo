import { NodeType } from "@/types/abstraction";
import type { NodeConfigValues } from "./node-config-fields";

export interface StoredBuilderNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  config: NodeConfigValues;
}

export interface StoredBuilderConnection {
  from: string;
  to: string;
}

export interface PersistedWorkflowBuilderState {
  nodes: StoredBuilderNode[];
  connections: StoredBuilderConnection[];
  updatedAt: string;
}

const STORAGE_PREFIX = "abstraction-workflow-builder:";

function storageKey(workflowId: string): string {
  return `${STORAGE_PREFIX}${workflowId}`;
}

export function loadWorkflowBuilderState(
  workflowId: string
): PersistedWorkflowBuilderState | null {
  if (typeof window === "undefined" || !workflowId) return null;

  try {
    const raw = localStorage.getItem(storageKey(workflowId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedWorkflowBuilderState;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.connections)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWorkflowBuilderState(
  workflowId: string,
  state: Omit<PersistedWorkflowBuilderState, "updatedAt">
): void {
  if (typeof window === "undefined" || !workflowId) return;

  const payload: PersistedWorkflowBuilderState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(storageKey(workflowId), JSON.stringify(payload));
}
