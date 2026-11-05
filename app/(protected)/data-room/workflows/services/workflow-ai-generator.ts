// ─── Natural Language Workflow Drafting Service (Mock Backend API) ───────────────
// Accepts a plain English description and generates a structured workflow skeleton
// with nodes, connections, and configuration warnings.

import { Node, Edge } from "@xyflow/react";
import { hasVariableX, getActionVariableMeta } from "../components/node-variable-meta";

export interface DraftWarning {
  nodeId: string;
  nodeLabel: string;
  field: string;
  severity: "warning" | "critical" | "info";
  message: string;
  suggestedValue?: string;
}

export interface DraftWorkflowResult {
  id: string;
  name: string;
  description: string;
  prompt: string;
  triggerName: string;
  triggerId: string;
  triggerIcon: string;
  triggerColor: string;
  nodes: Node[];
  edges: Edge[];
  warnings: DraftWarning[];
  confidenceScore: number;
  extractedEntities: {
    triggerType: string;
    detectedActions: string[];
    boundVariables: Record<string, string>;
  };
}

// ─── Example Prompt Presets for Quick Testing ──────────────────────────────
export const PROMPT_PRESETS = [
  {
    title: "Diligence Document Ingest & Slack Alert",
    prompt: "When a pitch deck or contract is uploaded via webhook, classify document into type invoice, extract structured fields, insert record into table diligence_records, and send Slack/Teams message to channel #diligence-alerts.",
  },
  {
    title: "Daily Portfolio NAV Recalculation",
    prompt: "Daily schedule trigger to query table portfolio_investments, recalculate metric net_irr, and refresh dashboard lp-executive-summary.",
  },
  {
    title: "KYC Sanctions Gate & User Approval",
    prompt: "When an event occurs, validate dataset against rule rule_sanctions_check, request approval from user compliance@entrecore.io, and send an email to founder@acme.com.",
  },
  {
    title: "Incomplete Flow (Triggers Configuration Warnings)",
    prompt: "Receive webhook, run LLM prompt, update record, and send an email.",
  },
];

/**
 * Helper to extract variable parameters from prompt text.
 * E.g., "send an email to founder@acme.com" -> "founder@acme.com"
 * "insert into table diligence_records" -> "diligence_records"
 */
function extractVariableFromPrompt(prompt: string, pattern: RegExp): string | null {
  const match = prompt.match(pattern);
  return match && match[1] ? match[1].trim() : null;
}

/**
 * Simulates a backend AI service call (e.g. POST /api/v1/workflows/generate-draft).
 */
export async function generateWorkflowDraft(prompt: string): Promise<DraftWorkflowResult> {
  // Realistic simulated network delay
  await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 600));

  const lower = prompt.toLowerCase();

  // 1. Determine Trigger
  let triggerId = "trigger-webhook";
  let triggerName = "Webhook Trigger";
  let triggerColor = "green";
  let triggerIcon = "Zap";
  let triggerDescription = "Starts workflow when an HTTP POST request is received.";

  if (lower.includes("schedule") || lower.includes("cron") || lower.includes("daily") || lower.includes("hourly") || lower.includes("recurring")) {
    triggerId = "trigger-schedule";
    triggerName = "Schedule Trigger";
    triggerColor = "blue";
    triggerIcon = "Clock";
    triggerDescription = "Executes on a regular cron or periodic timer schedule.";
  } else if (lower.includes("event") || lower.includes("kafka") || lower.includes("message queue") || lower.includes("audit")) {
    triggerId = "trigger-event";
    triggerName = "Event Trigger";
    triggerColor = "purple";
    triggerIcon = "Sparkles";
    triggerDescription = "Fires when a system event or pub/sub message arrives.";
  }

  // 2. Identify candidate actions based on semantic keywords
  const candidateActionDefs: {
    label: string;
    description: string;
    color: string;
    iconName?: string;
    extractRegex?: RegExp;
    defaultVar?: string;
  }[] = [];

  // Document Abstraction Actions
  if (lower.includes("classify") || lower.includes("categorize") || lower.includes("categorise")) {
    candidateActionDefs.push({
      label: "Classify document into type x",
      description: "Categorise document against a target type",
      color: "red",
      iconName: "FileText",
      extractRegex: /(?:classify(?: document)?(?: into type)?|type)\s+([a-zA-Z0-9_\-\.]+)/i,
    });
  }

  if (lower.includes("extract") && (lower.includes("structured") || lower.includes("field") || lower.includes("data"))) {
    candidateActionDefs.push({
      label: "Extract structured fields from document",
      description: "Parse key-value attributes from documents",
      color: "red",
      iconName: "FileText",
    });
  }

  if (lower.includes("ocr") || lower.includes("scan")) {
    candidateActionDefs.push({
      label: "Apply OCR to scanned document",
      description: "Convert scanned images or PDFs into text",
      color: "red",
      iconName: "FileText",
    });
  }

  // AI & LLM Actions
  if (lower.includes("llm") || lower.includes("prompt") || lower.includes("gpt") || lower.includes("summarize") || lower.includes("summarise")) {
    candidateActionDefs.push({
      label: "Run LLM prompt x",
      description: "Execute a language model prompt or template",
      color: "purple",
      iconName: "Sparkles",
      extractRegex: /(?:run llm prompt|prompt|extract(?:ing)? with llm)\s+([a-zA-Z0-9_\-\.\s]+?)(?:,| and | then |$)/i,
    });
  }

  if (lower.includes("agent") || lower.includes("autonomous")) {
    candidateActionDefs.push({
      label: "Trigger autonomous agent x",
      description: "Launch an autonomous AI agent task",
      color: "purple",
      iconName: "Sparkles",
      extractRegex: /(?:trigger autonomous agent|agent)\s+([a-zA-Z0-9_\-\.]+)/i,
    });
  }

  // Database Actions
  if (lower.includes("insert") || lower.includes("save into table") || lower.includes("store into table") || lower.includes("save to table")) {
    candidateActionDefs.push({
      label: "Insert record into table x",
      description: "Add a new record row to a database table",
      color: "violet",
      iconName: "Database",
      extractRegex: /(?:insert(?: record)? into table|save into table|store into table|table)\s+([a-zA-Z0-9_]+)/i,
    });
  }

  if (lower.includes("query") || lower.includes("fetch table") || lower.includes("select from")) {
    candidateActionDefs.push({
      label: "Query table x",
      description: "Fetch records matching a condition from table",
      color: "violet",
      iconName: "Database",
      extractRegex: /(?:query table|query|select from)\s+([a-zA-Z0-9_]+)/i,
    });
  }

  if (lower.includes("update record") || lower.includes("modify record")) {
    candidateActionDefs.push({
      label: "Update record x",
      description: "Modify an existing database record",
      color: "violet",
      iconName: "Database",
      extractRegex: /(?:update record)\s+([a-zA-Z0-9_\-\.]+)/i,
    });
  }

  // Analytics & Metrics Actions
  if (lower.includes("recalculate") || lower.includes("recompute") || lower.includes("metric") || lower.includes("irr") || lower.includes("mrr") || lower.includes("nav")) {
    candidateActionDefs.push({
      label: "Recalculate metric x",
      description: "Recompute a business KPI or formula",
      color: "amber",
      iconName: "BarChart2",
      extractRegex: /(?:recalculate metric|recompute metric|metric)\s+([a-zA-Z0-9_\-]+)/i,
    });
  }

  if (lower.includes("dashboard") || lower.includes("refresh dashboard")) {
    candidateActionDefs.push({
      label: "Refresh dashboard x",
      description: "Force cache refresh for an analytics dashboard",
      color: "amber",
      iconName: "BarChart2",
      extractRegex: /(?:refresh dashboard|dashboard)\s+([a-zA-Z0-9_\-]+)/i,
    });
  }

  // Governance & Rules
  if (lower.includes("rule") || lower.includes("validate") || lower.includes("sanction") || lower.includes("compliance")) {
    candidateActionDefs.push({
      label: "Validate dataset against rule x",
      description: "Check dataset integrity against a quality rule",
      color: "violet",
      iconName: "Database",
      extractRegex: /(?:validate dataset against rule|rule|validate against rule)\s+([a-zA-Z0-9_\-]+)/i,
    });
  }

  // User Interaction & Human-in-the-loop
  if (lower.includes("approval") || lower.includes("human") || lower.includes("sign-off") || lower.includes("sign off")) {
    candidateActionDefs.push({
      label: "Request approval from user x",
      description: "Pause workflow and ask a user for sign-off",
      color: "orange",
      iconName: "Users",
      extractRegex: /(?:request approval from user|approval from user|approval from)\s+([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/i,
    });
  }

  // Communication & Messaging Actions
  if (lower.includes("slack") || lower.includes("teams") || lower.includes("channel")) {
    candidateActionDefs.push({
      label: "Send Slack/Teams message to channel x",
      description: "Post a message to a team channel",
      color: "blue",
      iconName: "MessageSquare",
      extractRegex: /(?:channel|to channel)\s+(#?[a-zA-Z0-9_\-]+)/i,
    });
  }

  if (lower.includes("email") || lower.includes("mail") || lower.includes("send an email")) {
    candidateActionDefs.push({
      label: "Send an email to x",
      description: "Send an email to a specified recipient",
      color: "blue",
      iconName: "Mail",
      extractRegex: /(?:send (?:an )?email to|email to|to)\s+([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/i,
    });
  }

  // Fallback defaults if prompt was very brief
  if (candidateActionDefs.length === 0) {
    candidateActionDefs.push(
      {
        label: "Extract structured fields from document",
        description: "Parse key-value attributes from documents",
        color: "red",
        iconName: "FileText",
      },
      {
        label: "Insert record into table x",
        description: "Add a new record row to a database table",
        color: "violet",
        iconName: "Database",
      },
      {
        label: "Send Slack/Teams message to channel x",
        description: "Post a message to a team channel",
        color: "blue",
        iconName: "MessageSquare",
      }
    );
  }

  // 3. Assemble Nodes & Coordinates (Clean DAG Layout)
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const warnings: DraftWarning[] = [];
  const boundVariables: Record<string, string> = {};

  // Trigger Node
  const triggerNodeId = `draft-trigger-${Date.now()}`;
  nodes.push({
    id: triggerNodeId,
    type: "workflowNode",
    position: { x: 80, y: 150 },
    data: {
      label: triggerName,
      originalLabel: triggerName,
      description: triggerDescription,
      color: triggerColor,
      status: "idle",
      isTrigger: true,
      triggerId,
      iconName: triggerIcon,
    },
  });

  // Action Nodes & Warnings Check
  let prevNodeId = triggerNodeId;

  candidateActionDefs.forEach((act, index) => {
    const nodeId = `draft-node-${index + 1}-${Date.now()}`;
    const isVar = hasVariableX(act.label);

    let extractedVal: string | null = null;
    if (act.extractRegex) {
      extractedVal = extractVariableFromPrompt(prompt, act.extractRegex);
    }

    const isConfirmed = Boolean(extractedVal && extractedVal.trim().length > 0);
    const variableValue = extractedVal || "";

    if (isConfirmed) {
      boundVariables[act.label] = variableValue;
    }

    // Generate Display Label
    const displayLabel = isConfirmed
      ? act.label.replace(/\s+x$/i, ` [${variableValue}]`)
      : act.label;

    nodes.push({
      id: nodeId,
      type: "workflowNode",
      position: { x: 380 + index * 280, y: 150 },
      data: {
        label: displayLabel,
        originalLabel: act.label,
        description: act.description,
        color: act.color,
        iconName: act.iconName || "Settings",
        status: "idle",
        isTrigger: false,
        hasVariable: isVar,
        variableName: isVar ? "x" : undefined,
        variableValue,
        variableConfirmed: isConfirmed,
      },
    });

    // Generate Edge
    edges.push({
      id: `e-${prevNodeId}-${nodeId}`,
      source: prevNodeId,
      target: nodeId,
      animated: true,
      style: { stroke: "#6366f1", strokeWidth: 2 },
    });

    prevNodeId = nodeId;

    // Check for Missing Configuration Warnings (Acceptance Criterion 4)
    if (isVar && !isConfirmed) {
      const meta = getActionVariableMeta(act.label);
      warnings.push({
        nodeId,
        nodeLabel: act.label,
        field: meta.targetLabel || "Variable x",
        severity: "warning",
        message: `Missing parameter: Target ${meta.targetLabel || "value"} (x) is unconfirmed for "${act.label}".`,
        suggestedValue: meta.suggestions?.[0] || "",
      });
    }
  });

  // Derive workflow name from prompt
  const firstWords = prompt
    .replace(/^(when|create|make|build|automate|a workflow that|a workflow to)\s+/i, "")
    .split(/\s+/)
    .slice(0, 6)
    .join(" ");
  const capitalizedTitle = firstWords.charAt(0).toUpperCase() + firstWords.slice(1);
  const derivedName = capitalizedTitle.length > 5 ? capitalizedTitle : "Custom Automated Pipeline";

  // Derive confidence score based on confirmed variables vs warnings
  const confidenceScore = Math.max(
    65,
    Math.min(98, 100 - warnings.length * 12 + Object.keys(boundVariables).length * 8)
  );

  return {
    id: `wf-draft-${Date.now()}`,
    name: derivedName,
    description: `Generated from: "${prompt.length > 90 ? prompt.substring(0, 87) + "..." : prompt}"`,
    prompt,
    triggerName,
    triggerId,
    triggerIcon,
    triggerColor,
    nodes,
    edges,
    warnings,
    confidenceScore,
    extractedEntities: {
      triggerType: triggerName,
      detectedActions: candidateActionDefs.map((a) => a.label),
      boundVariables,
    },
  };
}
