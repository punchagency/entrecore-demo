import { NodeType, OUTPUT_NODE_TYPES } from "@/types/abstraction";
import { parseStoredSchema, validateSchemaCompatibility } from "./output-schema-validation";

export type NodeConfigFieldType = "text" | "number" | "email" | "select" | "boolean";

export interface NodeConfigFieldDefinition {
  key: string;
  label: string;
  type: NodeConfigFieldType;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string;
}

export type NodeConfigValues = Record<string, string | number | boolean>;

/** Rendered by ConnectorInputSection instead of generic form fields */
export const CONNECTOR_MANAGED_FIELD_KEYS = new Set([
  "connectorId",
  "sourceTableId",
  "sourceTableName",
  "destinationTableId",
  "destinationTableName",
  "inferredSchemaJson",
  "connectionStatus",
  "connectionMessage",
  "connectionLatencyMs",
  "connectionTestedAt",
  "webhookUrl",
  "httpMethod",
  "storagePath",
  "schemaCompatibilityJson",
  "schemaCompatible",
  "upstreamSchemaJson",
]);

export const OUTPUT_NODE_TYPES_SET = new Set<string>(OUTPUT_NODE_TYPES);

export function isOutputNodeType(nodeType: NodeType): boolean {
  return OUTPUT_NODE_TYPES_SET.has(nodeType);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONNECTOR_ID_PATTERN = /^[a-zA-Z0-9_-]{3,64}$/;

export const nodeConfigFields: Record<NodeType, NodeConfigFieldDefinition[]> = {
  "document-intake": [
    {
      key: "displayName",
      label: "Display Name",
      type: "text",
      required: true,
      placeholder: "Document Intake",
    },
    {
      key: "connectorId",
      label: "Connector",
      type: "text",
      required: true,
      placeholder: "Select connector in Data Source section",
    },
    {
      key: "sourceTableId",
      label: "Source Table",
      type: "text",
      required: true,
      placeholder: "Select table in Data Source section",
    },
    {
      key: "acceptedFormats",
      label: "Accepted Formats",
      type: "select",
      required: true,
      options: [
        { value: "pdf", label: "PDF only" },
        { value: "pdf,docx", label: "PDF & Word" },
        { value: "pdf,docx,image", label: "PDF, Word & Images" },
      ],
    },
    {
      key: "maxFileSizeMb",
      label: "Max File Size (MB)",
      type: "number",
      required: true,
      min: 1,
      max: 500,
      placeholder: "50",
    },
  ],
  "ocr-extraction": [
    {
      key: "displayName",
      label: "Display Name",
      type: "text",
      required: true,
      placeholder: "OCR Extraction",
    },
    {
      key: "ocrEngine",
      label: "OCR Engine",
      type: "select",
      required: true,
      options: [
        { value: "tesseract", label: "Tesseract" },
        { value: "azure", label: "Azure Document Intelligence" },
        { value: "google", label: "Google Document AI" },
      ],
    },
    {
      key: "language",
      label: "Language Code",
      type: "text",
      required: true,
      placeholder: "eng",
      pattern: /^[a-z]{2,3}(-[A-Z]{2})?$/,
      patternMessage: "Use a valid language code (e.g. eng, en-US)",
    },
    {
      key: "minConfidence",
      label: "Minimum Confidence (%)",
      type: "number",
      required: true,
      min: 0,
      max: 100,
      placeholder: "85",
    },
  ],
  classification: [
    {
      key: "displayName",
      label: "Display Name",
      type: "text",
      required: true,
      placeholder: "Classification",
    },
    {
      key: "protocolId",
      label: "Protocol ID",
      type: "text",
      required: true,
      placeholder: "protocol-uuid",
      pattern: CONNECTOR_ID_PATTERN,
      patternMessage: "3–64 alphanumeric characters, underscores, or hyphens",
    },
    {
      key: "confidenceThreshold",
      label: "Confidence Threshold (0–1)",
      type: "number",
      required: true,
      min: 0,
      max: 1,
      placeholder: "0.85",
    },
  ],
  validation: [
    {
      key: "displayName",
      label: "Display Name",
      type: "text",
      required: true,
      placeholder: "Validation",
    },
    {
      key: "strictMode",
      label: "Strict Mode",
      type: "select",
      required: true,
      options: [
        { value: "true", label: "Enabled" },
        { value: "false", label: "Disabled" },
      ],
    },
    {
      key: "failOnMissingRequired",
      label: "Fail on Missing Required Fields",
      type: "select",
      required: true,
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
  ],
  integration: [
    {
      key: "displayName",
      label: "Display Name",
      type: "text",
      required: true,
      placeholder: "Integration",
    },
    {
      key: "connectorId",
      label: "Destination Connector",
      type: "text",
      required: true,
      placeholder: "Select connector in Data Target section",
    },
    {
      key: "destinationTableId",
      label: "Destination Table",
      type: "text",
      required: false,
      placeholder: "Select table in Data Target section",
    },
  ],
  "exception-handling": [
    {
      key: "displayName",
      label: "Display Name",
      type: "text",
      required: true,
      placeholder: "Exception Handling",
    },
    {
      key: "retryAttempts",
      label: "Retry Attempts",
      type: "number",
      required: true,
      min: 0,
      max: 10,
      placeholder: "3",
    },
    {
      key: "notifyEmail",
      label: "Notification Email",
      type: "email",
      required: false,
      placeholder: "ops@company.com",
    },
  ],
  export: [
    {
      key: "displayName",
      label: "Display Name",
      type: "text",
      required: true,
      placeholder: "Export",
    },
    {
      key: "exportFormat",
      label: "Export Format",
      type: "select",
      required: true,
      options: [
        { value: "json", label: "JSON" },
        { value: "csv", label: "CSV" },
        { value: "parquet", label: "Parquet" },
      ],
    },
    {
      key: "outputPath",
      label: "Output Path",
      type: "text",
      required: true,
      placeholder: "/exports/abstraction",
      pattern: /^\/[a-zA-Z0-9_./-]+$/,
      patternMessage: "Must be an absolute path starting with /",
    },
  ],
  "write-sql-table": [
    {
      key: "displayName",
      label: "Display Name",
      type: "text",
      required: true,
      placeholder: "Write SQL Table",
    },
    {
      key: "connectorId",
      label: "Target Connector",
      type: "text",
      required: true,
    },
    {
      key: "destinationTableId",
      label: "Destination Table",
      type: "text",
      required: true,
    },
  ],
  "write-storage": [
    {
      key: "displayName",
      label: "Display Name",
      type: "text",
      required: true,
      placeholder: "Write to Storage",
    },
    {
      key: "connectorId",
      label: "Storage Connector",
      type: "text",
      required: true,
    },
    {
      key: "storagePath",
      label: "Storage Path",
      type: "text",
      required: true,
      placeholder: "bucket-name/exports/output",
    },
    {
      key: "fileFormat",
      label: "File Format",
      type: "select",
      required: true,
      options: [
        { value: "json", label: "JSON" },
        { value: "csv", label: "CSV" },
        { value: "parquet", label: "Parquet" },
      ],
    },
    {
      key: "fileNamePattern",
      label: "File Name Pattern",
      type: "text",
      required: false,
      placeholder: "workflow_{date}.json",
    },
  ],
  "write-webhook": [
    {
      key: "displayName",
      label: "Display Name",
      type: "text",
      required: true,
      placeholder: "Webhook Output",
    },
    {
      key: "webhookUrl",
      label: "Webhook URL",
      type: "text",
      required: true,
      placeholder: "https://api.example.com/hooks/workflow",
    },
    {
      key: "httpMethod",
      label: "HTTP Method",
      type: "select",
      required: true,
      options: [
        { value: "POST", label: "POST" },
        { value: "PUT", label: "PUT" },
        { value: "PATCH", label: "PATCH" },
      ],
    },
    {
      key: "connectorId",
      label: "Auth Connector",
      type: "text",
      required: false,
    },
  ],
};

export function getDefaultNodeConfig(nodeType: NodeType): NodeConfigValues {
  const fields = nodeConfigFields[nodeType];
  const defaults: NodeConfigValues = {};

  fields.forEach((field) => {
    if (field.type === "number") {
      if (field.key === "maxFileSizeMb") defaults[field.key] = 50;
      else if (field.key === "minConfidence") defaults[field.key] = 85;
      else if (field.key === "confidenceThreshold") defaults[field.key] = 0.85;
      else if (field.key === "retryAttempts") defaults[field.key] = 3;
      else defaults[field.key] = field.min ?? 0;
    } else if (field.type === "select" && field.options?.length) {
      defaults[field.key] = field.options[0].value;
    } else if (field.type === "boolean") {
      defaults[field.key] = false;
    } else {
      defaults[field.key] = "";
    }
  });

  const defLabel = nodeType
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  if ("displayName" in defaults || fields.some((f) => f.key === "displayName")) {
    defaults.displayName = defLabel;
  }

  return defaults;
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function validateNodeConfig(
  nodeType: NodeType,
  config: NodeConfigValues
): Record<string, string> {
  const errors: Record<string, string> = {};
  const fields = nodeConfigFields[nodeType];

  fields.forEach((field) => {
    const raw = config[field.key];
    const value = stringifyValue(raw);

    if (field.required && !value) {
      errors[field.key] = `${field.label} is required`;
      return;
    }

    if (!value) return;

    if (field.type === "number") {
      const num = Number(value);
      if (Number.isNaN(num)) {
        errors[field.key] = `${field.label} must be a number`;
        return;
      }
      if (field.min !== undefined && num < field.min) {
        errors[field.key] = `${field.label} must be at least ${field.min}`;
      }
      if (field.max !== undefined && num > field.max) {
        errors[field.key] = `${field.label} must be at most ${field.max}`;
      }
      return;
    }

    if (field.type === "email" && !EMAIL_PATTERN.test(value)) {
      errors[field.key] = "Enter a valid email address";
      return;
    }

    if (field.pattern && !field.pattern.test(value)) {
      errors[field.key] = field.patternMessage || `${field.label} format is invalid`;
    }
  });

  if (nodeType === "write-webhook") {
    const url = stringifyValue(config.webhookUrl);
    if (url) {
      try {
        new URL(url);
      } catch {
        errors.webhookUrl = "Enter a valid URL (https://...)";
      }
    }
  }

  if (nodeType === "write-storage") {
    const path = stringifyValue(config.storagePath);
    if (path && !/^[a-zA-Z0-9_./-]+$/.test(path)) {
      errors.storagePath = "Path may only contain letters, numbers, /, ., _, and -";
    }
  }

  if (nodeType === "write-sql-table") {
    const targetSchema = parseStoredSchema(config.inferredSchemaJson);
    const sourceSchema = parseStoredSchema(config.upstreamSchemaJson);

    if (targetSchema.length > 0 && sourceSchema.length > 0) {
      const compatibility = validateSchemaCompatibility(sourceSchema, targetSchema);
      if (!compatibility.compatible) {
        const firstError = compatibility.issues.find((issue) => issue.severity === "error");
        errors.schemaCompatible =
          firstError?.message ?? "Pipeline output schema is incompatible with destination table";
      }
    }
  }

  return errors;
}

export function isNodeConfigValid(nodeType: NodeType, config: NodeConfigValues): boolean {
  return Object.keys(validateNodeConfig(nodeType, config)).length === 0;
}
