export type WorkflowStatus = "Active" | "In Development" | "Paused" | "Failed" | "Archived";

export type SortField = "status" | "name" | "lastUpdated" | "successRate";
export type SortOrder = "asc" | "desc";

export type NodeType = 
  | "document-intake"
  | "ocr-extraction"
  | "classification"
  | "validation"
  | "integration"
  | "exception-handling"
  | "export"
  | "write-sql-table"
  | "write-storage"
  | "write-webhook";

export const OUTPUT_NODE_TYPES = [
  "write-sql-table",
  "write-storage",
  "write-webhook",
] as const satisfies readonly NodeType[];

export type OutputNodeType = (typeof OUTPUT_NODE_TYPES)[number];

export interface WorkflowMetrics {
  successRate: number;
  recordsProcessed: number;
  processingTime: number;
  errorRate: number;
}

export interface WorkflowIntegrationDefaults {
  sourceTable?: string;
  destinationTable?: string;
  sourceConnector?: string;
  destinationConnector?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  metrics: WorkflowMetrics;
  lastUpdated: string;
  createdAt: string;
  integrationDefaults?: WorkflowIntegrationDefaults;
}

export interface AbstractionStageTab {
  id: string;
  label: string;
  icon: string;
  description: string;
  disabled?: boolean;
}

export interface WorkflowFilters {
  status?: WorkflowStatus[];
  search?: string;
  sortField?: SortField;
  sortOrder?: SortOrder;
}

// Workflow Builder Types
export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description: string;
    type: NodeType;
    upstreamDependencies?: string[];
    downstreamDependencies?: string[];
    successRate?: number;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface WorkflowFlow {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowVersion {
  id: string;
  version: number;
  flow: WorkflowFlow;
  createdBy: string;
  createdAt: string;
  changeSummary: string;
}

export interface WorkflowBuilderState {
  flow: WorkflowFlow;
  currentVersion: number;
  versions: WorkflowVersion[];
  isDirty: boolean;
  lastSaved: string;
  validationErrors: string[];
}
