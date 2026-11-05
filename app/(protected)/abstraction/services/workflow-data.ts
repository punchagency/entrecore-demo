import { Workflow } from "@/types/abstraction";

export const mockWorkflows: Workflow[] = [
  {
    id: "wf-001",
    name: "Document Abstraction",
    description:
      "This workflow is designed to abstract critical data points from legal documentation and integrate with a target system",
    status: "Active",
    metrics: {
      successRate: 0,
      recordsProcessed: 0,
      processingTime: 0,
      errorRate: 0,
    },
    lastUpdated: "2024-05-15T10:30:00Z",
    createdAt: "2024-03-01T08:00:00Z",
  },
  {
    id: "wf-002",
    name: "CSV Abstraction",
    description:
      "This workflow is designed to abstract critical data points from CSV and integrate with a target system",
    status: "In Development",
    metrics: {
      successRate: 0,
      recordsProcessed: 0,
      processingTime: 0,
      errorRate: 0,
    },
    lastUpdated: "2024-05-10T14:20:00Z",
    createdAt: "2024-04-15T09:00:00Z",
  },
  {
    id: "wf-003",
    name: "JSON Data Extraction",
    description:
      "Extract structured data from JSON files and validate against schema definitions",
    status: "Active",
    metrics: {
      successRate: 0,
      recordsProcessed: 0,
      processingTime: 0,
      errorRate: 0,
    },
    lastUpdated: "2024-05-18T16:45:00Z",
    createdAt: "2024-02-20T10:15:00Z",
  },
  {
    id: "wf-004",
    name: "Contract Clause Analysis",
    description: "Identify and classify contract clauses for risk assessment",
    status: "Paused",
    metrics: {
      successRate: 0,
      recordsProcessed: 0,
      processingTime: 0,
      errorRate: 0,
    },
    lastUpdated: "2024-05-01T11:20:00Z",
    createdAt: "2024-01-10T09:30:00Z",
    integrationDefaults: {
      sourceTable: "ocr_staging_employee_records_extraction_config_test",
      destinationTable: "airtable_charter_documents_v3",
      sourceConnector: "bigquery",
      destinationConnector: "airtable",
    },
  },
  {
    id: "wf-005",
    name: "Entity Recognition Pipeline",
    description:
      "Extract and normalize entities from unstructured text using NLP models",
    status: "Failed",
    metrics: {
      successRate: 0,
      recordsProcessed: 0,
      processingTime: 0,
      errorRate: 0,
    },
    lastUpdated: "2024-05-12T09:10:00Z",
    createdAt: "2024-03-25T14:00:00Z",
  },
  {
    id: "wf-006",
    name: "Financial Data Extraction",
    description: "Extract financial metrics and statements from quarterly reports",
    status: "Active",
    metrics: {
      successRate: 0,
      recordsProcessed: 0,
      processingTime: 0,
      errorRate: 0,
    },
    lastUpdated: "2024-05-19T08:30:00Z",
    createdAt: "2024-02-01T10:00:00Z",
  },
  {
    id: "wf-007",
    name: "Regulatory Compliance Check",
    description:
      "Validate documents against regulatory requirements and generate compliance reports",
    status: "Archived",
    metrics: {
      successRate: 0,
      recordsProcessed: 0,
      processingTime: 0,
      errorRate: 0,
    },
    lastUpdated: "2024-04-15T13:50:00Z",
    createdAt: "2023-12-01T09:00:00Z",
  },
  {
    id: "wf-008",
    name: "Multi-Language Text Processing",
    description:
      "Process and extract data from documents in multiple languages with translation",
    status: "In Development",
    metrics: {
      successRate: 0,
      recordsProcessed: 0,
      processingTime: 0,
      errorRate: 0,
    },
    lastUpdated: "2024-05-14T15:25:00Z",
    createdAt: "2024-04-20T11:00:00Z",
  },
];

export function getWorkflows(): Promise<Workflow[]> {
  return Promise.resolve(mockWorkflows);
}

export function getWorkflowById(id: string): Promise<Workflow | undefined> {
  return Promise.resolve(mockWorkflows.find((w) => w.id === id));
}

export function getWorkflowMetrics() {
  const allMetrics = mockWorkflows.map((w) => w.metrics);
  const avgSuccessRate =
    allMetrics.reduce((sum, m) => sum + m.successRate, 0) / allMetrics.length;
  const totalRecords = allMetrics.reduce((sum, m) => sum + m.recordsProcessed, 0);
  const avgErrorRate =
    allMetrics.reduce((sum, m) => sum + m.errorRate, 0) / allMetrics.length;

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
