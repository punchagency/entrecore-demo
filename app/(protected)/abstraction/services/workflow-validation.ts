import { WorkflowFlow, WorkflowNode, WorkflowEdge } from "@/types/abstraction";

/**
 * Validates workflow for circular dependencies using DFS
 */
function hasCircularDependency(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): boolean {
  const adjacencyList: Record<string, string[]> = {};

  // Build adjacency list
  nodes.forEach((node) => {
    adjacencyList[node.id] = [];
  });

  edges.forEach((edge) => {
    adjacencyList[edge.source]?.push(edge.target);
  });

  // DFS to detect cycle
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const dfs = (nodeId: string): boolean => {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    for (const neighbor of adjacencyList[nodeId] || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true; // Cycle detected
      }
    }

    recursionStack.delete(nodeId);
    return false;
  };

  for (const nodeId of Object.keys(adjacencyList)) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) return true;
    }
  }

  return false;
}

/**
 * Get all upstream dependencies for a node
 */
export function getUpstreamDependencies(
  nodeId: string,
  edges: WorkflowEdge[]
): string[] {
  const upstreamIds = new Set<string>();
  const queue = [nodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    visited.add(currentId);

    const incomingEdges = edges.filter((e) => e.target === currentId);
    incomingEdges.forEach((edge) => {
      if (!visited.has(edge.source)) {
        upstreamIds.add(edge.source);
        queue.push(edge.source);
      }
    });
  }

  return Array.from(upstreamIds);
}

/**
 * Get all downstream dependencies for a node
 */
export function getDownstreamDependencies(
  nodeId: string,
  edges: WorkflowEdge[]
): string[] {
  const downstreamIds = new Set<string>();
  const queue = [nodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    visited.add(currentId);

    const outgoingEdges = edges.filter((e) => e.source === currentId);
    outgoingEdges.forEach((edge) => {
      if (!visited.has(edge.target)) {
        downstreamIds.add(edge.target);
        queue.push(edge.target);
      }
    });
  }

  return Array.from(downstreamIds);
}

/**
 * Validate complete workflow
 */
export function validateWorkflow(flow: WorkflowFlow): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for circular dependencies
  if (hasCircularDependency(flow.nodes, flow.edges)) {
    errors.push("Workflow contains circular dependencies");
  }

  // Check for disconnected nodes (except first and last)
  const connectedNodeIds = new Set<string>();
  flow.edges.forEach((edge) => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  flow.nodes.forEach((node) => {
    if (!connectedNodeIds.has(node.id) && flow.nodes.length > 1) {
      // Allow single disconnected node only if it's the only node
      errors.push(`Node "${node.label}" is not connected to the workflow`);
    }
  });

  // Check for nodes without input (except start nodes)
  flow.nodes.forEach((node) => {
    const hasIncoming = flow.edges.some((e) => e.target === node.id);
    const hasOutgoing = flow.edges.some((e) => e.source === node.id);

    // Every node should have at least input or output (except isolated nodes)
    if (connectedNodeIds.has(node.id) && !hasIncoming && flow.edges.length > 0) {
      // This is OK - it's a start node
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get node impact - shows what happens if a node is removed
 */
export function getNodeImpact(
  nodeId: string,
  edges: WorkflowEdge[]
): { upstream: string[]; downstream: string[] } {
  return {
    upstream: getUpstreamDependencies(nodeId, edges),
    downstream: getDownstreamDependencies(nodeId, edges),
  };
}
