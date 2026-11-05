"use client";

import { useState, useEffect, useCallback } from "react";
import { Node, Edge } from "@xyflow/react";

export interface DataRoomWorkflow {
  id: string;
  name: string;
  description: string;
  status: "active" | "draft" | "paused";
  triggerName: string;
  triggerId: string;
  triggerColor?: string;
  triggerIcon?: string;
  nodes: Node[];
  edges: Edge[];
  variableCount: number;
  confirmedVariableCount: number;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "entrecore_dataroom_workflows_v2";

// ─── Pre-seeded high quality default workflows for immediate viewing ────────
const SEED_WORKFLOWS: DataRoomWorkflow[] = [
  {
    id: "wf-drat-ingest",
    name: "Automated Diligence Document Ingestion & Extraction",
    description: "Captures inbound diligence documents, classifies type, parses financials with LLM, and logs alerts to teams.",
    status: "active",
    triggerName: "Webhook Trigger",
    triggerId: "trigger-webhook",
    triggerColor: "green",
    triggerIcon: "Zap",
    variableCount: 4,
    confirmedVariableCount: 4,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    nodes: [
      {
        id: "trigger-node",
        type: "workflowNode",
        position: { x: 80, y: 140 },
        data: {
          label: "Webhook Trigger",
          originalLabel: "Webhook Trigger",
          description: "Starts workflow when an HTTP POST request is received.",
          color: "green",
          status: "success",
          isTrigger: true,
          triggerId: "trigger-webhook",
          iconName: "Zap",
        },
      },
      {
        id: "node-classify",
        type: "workflowNode",
        position: { x: 380, y: 140 },
        data: {
          label: "Classify document into type [financial_audit_10k]",
          originalLabel: "Classify document into type x",
          description: "Categorise document against target type",
          color: "red",
          status: "idle",
          isTrigger: false,
          hasVariable: true,
          variableName: "x",
          variableValue: "financial_audit_10k",
          variableConfirmed: true,
        },
      },
      {
        id: "node-llm",
        type: "workflowNode",
        position: { x: 680, y: 140 },
        data: {
          label: "Run LLM prompt [Extract balance sheet metrics]",
          originalLabel: "Run LLM prompt x",
          description: "Execute a language model prompt or template",
          color: "purple",
          status: "idle",
          isTrigger: false,
          hasVariable: true,
          variableName: "x",
          variableValue: "Extract balance sheet metrics",
          variableConfirmed: true,
        },
      },
      {
        id: "node-insert",
        type: "workflowNode",
        position: { x: 980, y: 140 },
        data: {
          label: "Insert record into table [diligence_records]",
          originalLabel: "Insert record into table x",
          description: "Add a new record row to a database table",
          color: "violet",
          status: "idle",
          isTrigger: false,
          hasVariable: true,
          variableName: "x",
          variableValue: "diligence_records",
          variableConfirmed: true,
        },
      },
    ],
    edges: [
      { id: "e1", source: "trigger-node", target: "node-classify", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
      { id: "e2", source: "node-classify", target: "node-llm", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
      { id: "e3", source: "node-llm", target: "node-insert", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
    ],
  },
  {
    id: "wf-kyc-compliance",
    name: "KYC Sanctions & Identity Verification Gate",
    description: "Evaluates partner datasets against AML/KYC sanctions policies, requesting human sign-off before investor access.",
    status: "active",
    triggerName: "Schedule Trigger",
    triggerId: "trigger-schedule",
    triggerColor: "blue",
    triggerIcon: "Clock",
    variableCount: 3,
    confirmedVariableCount: 3,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    nodes: [
      {
        id: "trigger-sched",
        type: "workflowNode",
        position: { x: 80, y: 140 },
        data: {
          label: "Schedule Trigger",
          originalLabel: "Schedule Trigger",
          description: "Executes on a regular cron schedule.",
          color: "blue",
          status: "idle",
          isTrigger: true,
          triggerId: "trigger-schedule",
          iconName: "Clock",
        },
      },
      {
        id: "node-rule",
        type: "workflowNode",
        position: { x: 380, y: 140 },
        data: {
          label: "Validate dataset against rule [rule_sanctions_check]",
          originalLabel: "Validate dataset against rule x",
          description: "Check dataset integrity against a quality rule",
          color: "violet",
          status: "idle",
          isTrigger: false,
          hasVariable: true,
          variableName: "x",
          variableValue: "rule_sanctions_check",
          variableConfirmed: true,
        },
      },
      {
        id: "node-approval",
        type: "workflowNode",
        position: { x: 680, y: 140 },
        data: {
          label: "Request approval from user [compliance-officer@entrecore.io]",
          originalLabel: "Request approval from user x",
          description: "Pause workflow and ask a user for sign-off",
          color: "orange",
          status: "idle",
          isTrigger: false,
          hasVariable: true,
          variableName: "x",
          variableValue: "compliance-officer@entrecore.io",
          variableConfirmed: true,
        },
      },
      {
        id: "node-email",
        type: "workflowNode",
        position: { x: 980, y: 140 },
        data: {
          label: "Send an email to [founder@acme.com]",
          originalLabel: "Send an email to x",
          description: "Send an email to a specified recipient",
          color: "blue",
          status: "idle",
          isTrigger: false,
          hasVariable: true,
          variableName: "x",
          variableValue: "founder@acme.com",
          variableConfirmed: true,
        },
      },
    ],
    edges: [
      { id: "e-k1", source: "trigger-sched", target: "node-rule", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
      { id: "e-k2", source: "node-rule", target: "node-approval", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
      { id: "e-k3", source: "node-approval", target: "node-email", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
    ],
  },
  {
    id: "wf-portfolio-nav",
    name: "Portfolio NAV Re-computation & LP Dispatch",
    description: "Periodically recomputes net IRR and variance metrics from investment tables and pushes live updates to the LP dashboard.",
    status: "draft",
    triggerName: "Event Trigger",
    triggerId: "trigger-event",
    triggerColor: "purple",
    triggerIcon: "Sparkles",
    variableCount: 3,
    confirmedVariableCount: 2,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    nodes: [
      {
        id: "trigger-ev",
        type: "workflowNode",
        position: { x: 80, y: 140 },
        data: {
          label: "Event Trigger",
          originalLabel: "Event Trigger",
          description: "Runs on system event bus message.",
          color: "purple",
          status: "idle",
          isTrigger: true,
          triggerId: "trigger-event",
          iconName: "Sparkles",
        },
      },
      {
        id: "node-query",
        type: "workflowNode",
        position: { x: 380, y: 140 },
        data: {
          label: "Query table [portfolio_investments]",
          originalLabel: "Query table x",
          description: "Fetch records matching a condition from table",
          color: "violet",
          status: "idle",
          isTrigger: false,
          hasVariable: true,
          variableName: "x",
          variableValue: "portfolio_investments",
          variableConfirmed: true,
        },
      },
      {
        id: "node-recalc",
        type: "workflowNode",
        position: { x: 680, y: 140 },
        data: {
          label: "Recalculate metric [net_portfolio_irr]",
          originalLabel: "Recalculate metric x",
          description: "Recompute a business KPI or formula",
          color: "amber",
          status: "idle",
          isTrigger: false,
          hasVariable: true,
          variableName: "x",
          variableValue: "net_portfolio_irr",
          variableConfirmed: true,
        },
      },
      {
        id: "node-refresh",
        type: "workflowNode",
        position: { x: 980, y: 140 },
        data: {
          label: "Refresh dashboard x",
          originalLabel: "Refresh dashboard x",
          description: "Force cache refresh for an analytics dashboard",
          color: "amber",
          status: "idle",
          isTrigger: false,
          hasVariable: true,
          variableName: "x",
          variableValue: "",
          variableConfirmed: false,
        },
      },
    ],
    edges: [
      { id: "e-p1", source: "trigger-ev", target: "node-query", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
      { id: "e-p2", source: "node-query", target: "node-recalc", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
      { id: "e-p3", source: "node-recalc", target: "node-refresh", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
    ],
  },
];

export function useDataRoomWorkflows() {
  const [workflows, setWorkflows] = useState<DataRoomWorkflow[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from localStorage or seed
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWorkflows(parsed);
          setIsLoaded(true);
          return;
        }
      }
      // Seed default workflows
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_WORKFLOWS));
      setWorkflows(SEED_WORKFLOWS);
    } catch (e) {
      console.error("Failed to load workflows from localStorage:", e);
      setWorkflows(SEED_WORKFLOWS);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to state and localStorage
  const persistWorkflows = useCallback((nextWorkflows: DataRoomWorkflow[]) => {
    setWorkflows(nextWorkflows);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextWorkflows));
    } catch (e) {
      console.error("Failed to save workflows to localStorage:", e);
    }
  }, []);

  // Create or save workflow
  const saveWorkflow = useCallback((workflow: Omit<DataRoomWorkflow, "createdAt" | "updatedAt"> & { createdAt?: string }) => {
    const now = new Date().toISOString();
    setWorkflows((prev) => {
      const existingIdx = prev.findIndex((w) => w.id === workflow.id);
      let updated: DataRoomWorkflow[];

      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = {
          ...prev[existingIdx],
          ...workflow,
          updatedAt: now,
        };
      } else {
        const newWorkflow: DataRoomWorkflow = {
          ...workflow,
          createdAt: workflow.createdAt || now,
          updatedAt: now,
        };
        updated = [newWorkflow, ...prev];
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  // Delete workflow
  const deleteWorkflow = useCallback((id: string) => {
    setWorkflows((prev) => {
      const filtered = prev.filter((w) => w.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      } catch (e) {
        console.error(e);
      }
      return filtered;
    });
  }, []);

  // Duplicate workflow
  const duplicateWorkflow = useCallback((id: string) => {
    setWorkflows((prev) => {
      const target = prev.find((w) => w.id === id);
      if (!target) return prev;

      const now = new Date().toISOString();
      const duplicate: DataRoomWorkflow = {
        ...target,
        id: `wf-${Date.now()}`,
        name: `${target.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
      };

      const next = [duplicate, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  }, []);

  // Get workflow by ID
  const getWorkflow = useCallback((id: string): DataRoomWorkflow | undefined => {
    return workflows.find((w) => w.id === id);
  }, [workflows]);

  return {
    workflows,
    isLoaded,
    saveWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    getWorkflow,
  };
}
