import { Workflow } from "@/types/abstraction";

// Demo: a new company has no abstraction workflows. Production shows a hard-coded
// sample list here (docs/demo/UPSTREAM_FIXES.md).
export const mockWorkflows: Workflow[] = [];

export function getWorkflows(): Promise<Workflow[]> {
  return Promise.resolve(mockWorkflows);
}

export function getWorkflowById(id: string): Promise<Workflow | undefined> {
  return Promise.resolve(mockWorkflows.find((w) => w.id === id));
}

export function getWorkflowMetrics() {
  const allMetrics = mockWorkflows.map((w) => w.metrics);
  const avgSuccessRate = allMetrics.length
    ? allMetrics.reduce((sum, m) => sum + m.successRate, 0) / allMetrics.length
    : 0;
  const totalRecords = allMetrics.reduce((sum, m) => sum + m.recordsProcessed, 0);
  const avgErrorRate = allMetrics.length
    ? allMetrics.reduce((sum, m) => sum + m.errorRate, 0) / allMetrics.length
    : 0;

  const activeCount = mockWorkflows.filter((w) => w.status === "Active").length;
  const failedCount = mockWorkflows.filter((w) => w.status === "Failed").length;
  const developmentCount = mockWorkflows.filter(
    (w) => w.status === "In Development"
  ).length;

  return {
    avgSuccessRate,
    totalRecords,
    avgErrorRate,
    activeCount,
    failedCount,
    developmentCount,
    pendingReview: failedCount + developmentCount,
  };
}
