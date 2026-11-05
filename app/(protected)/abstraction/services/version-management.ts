import { WorkflowVersion, WorkflowFlow } from "@/types/abstraction";

export interface VersionStore {
  versions: WorkflowVersion[];
  currentVersion: number;
}

let versionStore: VersionStore = {
  versions: [],
  currentVersion: 1,
};

/**
 * Create a new workflow version
 */
export function createVersion(
  workflowId: string,
  flow: WorkflowFlow,
  changeSummary: string,
  createdBy: string = "Current User"
): WorkflowVersion {
  const newVersion: WorkflowVersion = {
    id: `v${versionStore.currentVersion}`,
    version: versionStore.currentVersion,
    flow: JSON.parse(JSON.stringify(flow)), // Deep clone
    createdBy,
    createdAt: new Date().toISOString(),
    changeSummary,
  };

  versionStore.versions.push(newVersion);
  versionStore.currentVersion += 1;

  return newVersion;
}

/**
 * Get all versions
 */
export function getVersions(): WorkflowVersion[] {
  return versionStore.versions;
}

/**
 * Get specific version
 */
export function getVersion(versionId: string): WorkflowVersion | undefined {
  return versionStore.versions.find((v) => v.id === versionId);
}

/**
 * Restore a previous version
 */
export function restoreVersion(versionId: string): WorkflowFlow | null {
  const version = getVersion(versionId);
  if (!version) return null;

  return JSON.parse(JSON.stringify(version.flow)); // Deep clone
}

/**
 * Get version history with metadata
 */
export function getVersionHistory(): Array<{
  version: WorkflowVersion;
  changeCount: number;
  timeSinceCreation: string;
}> {
  const now = new Date();

  return versionStore.versions.map((version) => {
    const createdDate = new Date(version.createdAt);
    const diffMs = now.getTime() - createdDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeSinceCreation = "";
    if (diffMins < 1) timeSinceCreation = "Just now";
    else if (diffMins < 60) timeSinceCreation = `${diffMins}m ago`;
    else if (diffHours < 24) timeSinceCreation = `${diffHours}h ago`;
    else timeSinceCreation = `${diffDays}d ago`;

    const nodeCount = version.flow.nodes.length;
    const edgeCount = version.flow.edges.length;
    const changeCount = nodeCount + edgeCount;

    return {
      version,
      changeCount,
      timeSinceCreation,
    };
  });
}

/**
 * Compare two versions
 */
export function compareVersions(
  versionId1: string,
  versionId2: string
): { added: string[]; removed: string[]; modified: string[] } {
  const v1 = getVersion(versionId1);
  const v2 = getVersion(versionId2);

  if (!v1 || !v2) {
    return { added: [], removed: [], modified: [] };
  }

  const nodes1 = new Set(v1.flow.nodes.map((n) => n.id));
  const nodes2 = new Set(v2.flow.nodes.map((n) => n.id));

  const added = Array.from(nodes2).filter((n) => !nodes1.has(n));
  const removed = Array.from(nodes1).filter((n) => !nodes2.has(n));
  const modified: string[] = [];

  // Check for modifications
  v1.flow.nodes.forEach((node) => {
    const correspondingNode = v2.flow.nodes.find((n) => n.id === node.id);
    if (correspondingNode && JSON.stringify(node) !== JSON.stringify(correspondingNode)) {
      modified.push(node.id);
    }
  });

  return { added, removed, modified };
}

/**
 * Auto-save function (called periodically)
 */
export function autoSave(
  workflowId: string,
  flow: WorkflowFlow,
  changeSummary: string = "Auto-save"
): WorkflowVersion {
  return createVersion(workflowId, flow, changeSummary, "System");
}
