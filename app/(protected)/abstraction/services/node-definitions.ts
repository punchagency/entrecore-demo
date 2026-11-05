import { NodeType } from "@/types/abstraction";
import {
  FileUp,
  Zap,
  Tag,
  CheckCircle,
  Plug,
  AlertTriangle,
  Download,
  Database,
  HardDrive,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NodeDefinition {
  id: NodeType;
  label: string;
  description: string;
  icon: typeof FileUp;
  color: string;
  bgColor: string;
  textColor: string;
}

export const nodeDefinitions: Record<NodeType, NodeDefinition> = {
  "document-intake": {
    id: "document-intake",
    label: "Document Intake",
    description: "Upload and receive documents for processing",
    icon: FileUp,
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  "ocr-extraction": {
    id: "ocr-extraction",
    label: "OCR Extraction",
    description: "Extract text from documents using OCR",
    icon: Zap,
    color: "bg-yellow-500",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
  },
  classification: {
    id: "classification",
    label: "Classification",
    description: "Classify extracted entities and clauses",
    icon: Tag,
    color: "bg-purple-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
  },
  validation: {
    id: "validation",
    label: "Validation",
    description: "Validate extracted data against rules",
    icon: CheckCircle,
    color: "bg-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
  },
  integration: {
    id: "integration",
    label: "Integration",
    description: "Send data to external systems",
    icon: Plug,
    color: "bg-indigo-500",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-700",
  },
  "exception-handling": {
    id: "exception-handling",
    label: "Exception Handling",
    description: "Handle errors and exceptions",
    icon: AlertTriangle,
    color: "bg-rose-500",
    bgColor: "bg-rose-50",
    textColor: "text-rose-700",
  },
  export: {
    id: "export",
    label: "Export",
    description: "Export processed data to storage",
    icon: Download,
    color: "bg-cyan-500",
    bgColor: "bg-cyan-50",
    textColor: "text-cyan-700",
  },
  "write-sql-table": {
    id: "write-sql-table",
    label: "Write SQL Table",
    description: "Write workflow results to a SQL destination table",
    icon: Database,
    color: "bg-sky-500",
    bgColor: "bg-sky-50",
    textColor: "text-sky-700",
  },
  "write-storage": {
    id: "write-storage",
    label: "Write to Storage",
    description: "Export results as a file to cloud storage",
    icon: HardDrive,
    color: "bg-teal-500",
    bgColor: "bg-teal-50",
    textColor: "text-teal-700",
  },
  "write-webhook": {
    id: "write-webhook",
    label: "Call Webhook / API",
    description: "Deliver results to an external webhook or REST API",
    icon: Webhook,
    color: "bg-fuchsia-500",
    bgColor: "bg-fuchsia-50",
    textColor: "text-fuchsia-700",
  },
};

export const getNodeDefinition = (nodeType: NodeType): NodeDefinition => {
  return nodeDefinitions[nodeType];
};

export const getAvailableNodeTypes = (): NodeType[] => {
  return Object.keys(nodeDefinitions) as NodeType[];
};
