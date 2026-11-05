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
// Demo: a new company has no workflows. Production seeds three samples here.
const SEED_WORKFLOWS: DataRoomWorkflow[] = [];

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
