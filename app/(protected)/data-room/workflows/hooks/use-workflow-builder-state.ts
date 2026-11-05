"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
} from "@xyflow/react";
import { toast } from "sonner";
import { useDataRoomWorkflows, DataRoomWorkflow } from "./use-data-room-workflows";
import { hasVariableX } from "../components/node-variable-meta";
import { TriggerDefinition } from "../components/trigger-library-data";
import { DraftWorkflowResult } from "../services/workflow-ai-generator";

const DEFAULT_INITIAL_NODES: Node[] = [
  {
    id: "trigger-1",
    type: "workflowNode",
    data: {
      label: "Webhook Trigger",
      originalLabel: "Webhook Trigger",
      description: "Starts workflow when an HTTP POST request is received.",
      color: "green",
      status: "idle",
      isTrigger: true,
      triggerId: "trigger-webhook",
      iconName: "Zap",
    },
    position: { x: 140, y: 160 },
  },
];

const DEFAULT_INITIAL_EDGES: Edge[] = [];
const PROXIMITY_THRESHOLD = 80;

interface UseWorkflowBuilderStateProps {
  workflowId?: string | null;
  initialOpenAIDraft?: boolean;
  onSaved?: (wf: DataRoomWorkflow) => void;
  onBackToLanding?: () => void;
}

export function useWorkflowBuilderState({
  workflowId,
  initialOpenAIDraft = false,
  onSaved,
  onBackToLanding,
}: UseWorkflowBuilderStateProps) {
  const { getWorkflow, saveWorkflow } = useDataRoomWorkflows();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_INITIAL_EDGES);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Modal & execution states
  const [isTesting, setIsTesting] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isAIDraftOpen, setIsAIDraftOpen] = useState(Boolean(initialOpenAIDraft));
  const [selectedTriggerId, setSelectedTriggerId] = useState<string | null>("trigger-webhook");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (initialOpenAIDraft) {
      setIsAIDraftOpen(true);
    }
  }, [initialOpenAIDraft]);

  // Workflow identity
  const [workflowName, setWorkflowName] = useState<string>("Untitled Workflow");
  const [workflowDescription, setWorkflowDescription] = useState<string>(
    "Automated enterprise data-room pipeline"
  );
  const [currentId, setCurrentId] = useState<string>(workflowId || `wf-${Date.now()}`);

  // Load existing workflow if workflowId is provided
  useEffect(() => {
    if (workflowId) {
      const existing = getWorkflow(workflowId);
      if (existing) {
        setCurrentId(existing.id);
        setWorkflowName(existing.name);
        setWorkflowDescription(existing.description || "");
        setSelectedTriggerId(existing.triggerId || null);
        if (existing.nodes && existing.nodes.length > 0) {
          setNodes(existing.nodes);
        }
        if (existing.edges) {
          setEdges(existing.edges);
        }
      }
    }
  }, [workflowId, getWorkflow, setNodes, setEdges]);

  const onInitFlow = useCallback((instance: any) => {
    setReactFlowInstance(instance);
    setTimeout(() => {
      instance.fitView({ maxZoom: 0.5, padding: 0.35 });
    }, 50);
  }, []);

  // Selection handlers
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const onConfigureNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  // Update node data (e.g. variable binding)
  const onUpdateNodeData = useCallback((id: string, updatedData: Partial<Record<string, any>>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                ...updatedData,
              },
            }
          : n
      )
    );
  }, [setNodes]);

  // Node deletion
  const onDeleteNode = useCallback((id: string) => {
    setNodes((nds) => {
      const nodeToDelete = nds.find((n) => n.id === id);
      if (nodeToDelete?.data?.isTrigger) {
        setSelectedTriggerId(null);
      }
      return nds.filter((node) => node.id !== id);
    });
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
    toast.info("Node removed");
  }, [selectedNodeId, setNodes, setEdges]);

  // Node duplication
  const onDuplicateNode = useCallback((id: string) => {
    const nodeToCopy = nodes.find((n) => n.id === id);
    if (nodeToCopy) {
      const newNode: Node = {
        ...nodeToCopy,
        id: `${nodeToCopy.id}-copy-${Date.now()}`,
        position: {
          x: nodeToCopy.position.x + 40,
          y: nodeToCopy.position.y + 40,
        },
        selected: false,
      };
      setNodes((nds) => nds.concat(newNode));
      toast.success("Node duplicated");
    }
  }, [nodes, setNodes]);

  // Connect node directly to the active trigger
  const onConnectToTrigger = useCallback((nodeId: string) => {
    const triggerNode = nodes.find((n) => n.data?.isTrigger);
    if (!triggerNode) {
      toast.error("No trigger node found on canvas. Select a trigger in Step 1 first!");
      return;
    }
    const edgeExists = edges.some((e) => e.source === triggerNode.id && e.target === nodeId);
    if (edgeExists) {
      toast.info(`Already connected to ${triggerNode.data.label}`);
      return;
    }
    const newEdge: Edge = {
      id: `e-${triggerNode.id}-${nodeId}`,
      source: triggerNode.id,
      target: nodeId,
      animated: true,
      style: { stroke: "#6366f1", strokeWidth: 2 },
    };
    setEdges((eds) => addEdge(newEdge, eds));
    toast.success(`Connected to ${triggerNode.data.label}`);
  }, [nodes, edges, setEdges]);

  // Set trigger
  const handleTriggerSelect = useCallback((trigger: TriggerDefinition) => {
    setSelectedTriggerId(trigger.id);

    setNodes((nds) => {
      const existingTriggerIndex = nds.findIndex((n) => n.data?.isTrigger);
      if (existingTriggerIndex >= 0) {
        const updated = [...nds];
        updated[existingTriggerIndex] = {
          ...updated[existingTriggerIndex],
          data: {
            ...updated[existingTriggerIndex].data,
            label: `${trigger.label} Trigger`,
            originalLabel: `${trigger.label} Trigger`,
            description: trigger.description,
            color: trigger.color,
            isTrigger: true,
            triggerId: trigger.id,
            iconName: trigger.iconName,
          },
        };
        return updated;
      } else {
        const newTriggerNode: Node = {
          id: `trigger-${Date.now()}`,
          type: "workflowNode",
          position: { x: 140, y: 160 },
          data: {
            label: `${trigger.label} Trigger`,
            originalLabel: `${trigger.label} Trigger`,
            description: trigger.description,
            color: trigger.color,
            isTrigger: true,
            triggerId: trigger.id,
            iconName: trigger.iconName,
            status: "idle",
          },
        };
        return [newTriggerNode, ...nds];
      }
    });

    toast.success(`Workflow trigger set: ${trigger.label}`);
  }, [setNodes]);

  // Clear trigger
  const handleTriggerClear = useCallback(() => {
    setSelectedTriggerId(null);
    const triggerNode = nodes.find((n) => n.data?.isTrigger);
    if (triggerNode) {
      setNodes((nds) => nds.filter((n) => n.id !== triggerNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== triggerNode.id && e.target !== triggerNode.id));
    }
    toast.info("Trigger removed from workflow");
  }, [nodes, setNodes, setEdges]);

  // Proximity auto-linking on node drag stop
  const onNodeDragStop = useCallback((_: any, draggedNode: Node) => {
    const otherNodes = nodes.filter((n) => n.id !== draggedNode.id);

    otherNodes.forEach((targetNode) => {
      const draggedSourceX = draggedNode.position.x + 240;
      const draggedSourceY = draggedNode.position.y + 50;
      const targetInputX = targetNode.position.x;
      const targetInputY = targetNode.position.y + 50;

      const distanceForward = Math.sqrt(
        Math.pow(draggedSourceX - targetInputX, 2) + Math.pow(draggedSourceY - targetInputY, 2)
      );

      const targetSourceX = targetNode.position.x + 240;
      const targetSourceY = targetNode.position.y + 50;
      const draggedInputX = draggedNode.position.x;
      const draggedInputY = draggedNode.position.y + 50;

      const distanceBackward = Math.sqrt(
        Math.pow(targetSourceX - draggedInputX, 2) + Math.pow(targetSourceY - draggedInputY, 2)
      );

      if (distanceForward < PROXIMITY_THRESHOLD) {
        const edgeExists = edges.some(e => e.source === draggedNode.id && e.target === targetNode.id);
        if (!edgeExists) {
          setEdges((eds) => addEdge({
            source: draggedNode.id,
            target: targetNode.id,
            sourceHandle: null,
            targetHandle: null
          }, eds));
          toast.success(`Automatically linked to ${targetNode.data.label}`);
        }
      } else if (distanceBackward < PROXIMITY_THRESHOLD) {
        const edgeExists = edges.some(e => e.source === targetNode.id && e.target === draggedNode.id);
        if (!edgeExists) {
          setEdges((eds) => addEdge({
            source: targetNode.id,
            target: draggedNode.id,
            sourceHandle: null,
            targetHandle: null
          }, eds));
          toast.success(`Automatically linked from ${targetNode.data.label}`);
        }
      }
    });
  }, [nodes, edges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const isValidConnection = useCallback((connection: any) => {
    return connection.source !== connection.target;
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const dataStr = event.dataTransfer.getData("application/reactflow");
      if (!dataStr) return;

      const nodeData = JSON.parse(dataStr);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const isVar = Boolean(nodeData.hasVariable || hasVariableX(nodeData.label));
      const newNodeId = `${nodeData.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type: "workflowNode",
        position,
        data: {
          ...nodeData,
          originalLabel: nodeData.originalLabel || nodeData.label,
          hasVariable: isVar,
          variableName: isVar ? "x" : undefined,
          variableConfirmed: false,
          variableValue: "",
          status: "idle",
          isTrigger: false,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNodeId);

      const triggerNode = nodes.find((n) => n.data?.isTrigger);
      const nonTriggerCount = nodes.filter((n) => !n.data?.isTrigger).length;

      if (triggerNode && nonTriggerCount === 0) {
        const newEdge: Edge = {
          id: `e-${triggerNode.id}-${newNodeId}`,
          source: triggerNode.id,
          target: newNodeId,
          animated: true,
          style: { stroke: "#6366f1", strokeWidth: 2 },
        };
        setEdges((eds) => addEdge(newEdge, eds));
        toast.success(`Added & connected to ${triggerNode.data.label}`);
      } else {
        toast.success(`Added: ${nodeData.label}`);
      }
    },
    [reactFlowInstance, nodes, setNodes, setEdges]
  );

  // Handle action click from SkillLibrary
  const onSkillActionSelect = useCallback((action: { label: string; description?: string; color?: string }) => {
    const triggerNode = nodes.find((n) => n.data?.isTrigger);
    const nonTriggerNodes = nodes.filter((n) => !n.data?.isTrigger);

    let position = { x: 420, y: 160 };

    if (triggerNode) {
      const count = nonTriggerNodes.length;
      position = {
        x: triggerNode.position.x + 260,
        y: triggerNode.position.y + (count * 90),
      };
    } else if (reactFlowInstance) {
      position = reactFlowInstance.screenToFlowPosition({
        x: 350 + Math.random() * 80,
        y: 140 + Math.random() * 80,
      });
    }

    const isVar = Boolean((action as any).hasVariable || hasVariableX(action.label));
    const newNodeId = `${action.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: "workflowNode",
      position,
      data: {
        ...action,
        originalLabel: action.label,
        hasVariable: isVar,
        variableName: isVar ? "x" : undefined,
        variableConfirmed: false,
        variableValue: "",
        status: "idle",
        isTrigger: false,
      },
    };

    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(newNodeId);

    if (triggerNode) {
      const newEdge: Edge = {
        id: `e-${triggerNode.id}-${newNodeId}`,
        source: triggerNode.id,
        target: newNodeId,
        animated: true,
        style: { stroke: "#6366f1", strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      toast.success(`Connected "${action.label}" to ${triggerNode.data.label}`);
    } else {
      toast.success(`Added "${action.label}". Select a trigger to connect it!`);
    }
  }, [nodes, reactFlowInstance, setNodes, setEdges]);

  // Close AI draft modal and clean query params
  const handleCloseAIDraft = useCallback(() => {
    setIsAIDraftOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("draft") || url.searchParams.has("aiDraft")) {
        url.searchParams.delete("draft");
        url.searchParams.delete("aiDraft");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }
  }, []);

  // Accept natural language draft into canvas
  const handleAcceptDraftOnCanvas = useCallback((draft: DraftWorkflowResult) => {
    setWorkflowName(draft.name);
    setWorkflowDescription(draft.description);
    setSelectedTriggerId(draft.triggerId);
    setNodes(draft.nodes);
    setEdges(draft.edges);
    setIsAIDraftOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("draft") || url.searchParams.has("aiDraft")) {
        url.searchParams.delete("draft");
        url.searchParams.delete("aiDraft");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }
    toast.success(`Draft "${draft.name}" placed onto canvas!`);
    setTimeout(() => {
      reactFlowInstance?.fitView({ padding: 0.25, duration: 400 });
    }, 150);
  }, [reactFlowInstance, setNodes, setEdges]);

  // Save workflow
  const onSave = useCallback(() => {
    if (nodes.length === 0) {
      toast.error("Please add at least one node before saving");
      return;
    }

    const triggerNode = nodes.find((n) => n.data?.isTrigger);
    const varNodes = nodes.filter(
      (n) => !n.data?.isTrigger && (n.data?.hasVariable || hasVariableX((n.data?.originalLabel || n.data?.label) as string))
    );
    const confirmedVars = varNodes.filter((n) => n.data?.variableConfirmed);

    const savedRecord: DataRoomWorkflow = {
      id: currentId,
      name: workflowName.trim() || "Untitled Workflow",
      description: workflowDescription.trim() || "Custom data room automation",
      status: "active",
      triggerName: (triggerNode?.data?.label as string) || "Manual Trigger",
      triggerId: (triggerNode?.data?.triggerId as string) || "trigger-manual",
      triggerColor: (triggerNode?.data?.color as string) || "green",
      triggerIcon: (triggerNode?.data?.iconName as string) || "Zap",
      nodes,
      edges,
      variableCount: varNodes.length,
      confirmedVariableCount: confirmedVars.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveWorkflow(savedRecord);
    toast.success(`Workflow "${savedRecord.name}" saved!`);

    if (onSaved) {
      onSaved(savedRecord);
    }
    if (onBackToLanding) {
      onBackToLanding();
    }
  }, [
    currentId,
    workflowName,
    workflowDescription,
    nodes,
    edges,
    saveWorkflow,
    onSaved,
    onBackToLanding,
  ]);

  // Clear all nodes
  const onClearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedTriggerId(null);
    setSelectedNodeId(null);
    setIsClearDialogOpen(false);
    toast.info("Canvas cleared");
  }, [setNodes, setEdges]);

  // Run test simulation
  const onRunTest = useCallback(async () => {
    if (nodes.length === 0) {
      toast.error("Add some nodes first!");
      return;
    }

    const unconfirmedNodes = nodes.filter(
      (n) => !n.data?.isTrigger && (n.data?.hasVariable || hasVariableX((n.data?.originalLabel || n.data?.label) as string)) && !n.data?.variableConfirmed
    );
    if (unconfirmedNodes.length > 0) {
      toast.warning(
        `Notice: ${unconfirmedNodes.length} action node(s) have unconfirmed "x" variables. You can click on them anytime to bind specific targets!`,
        { duration: 4500 }
      );
    }

    setIsTesting(true);
    toast.promise(
      new Promise(async (resolve) => {
        setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: "idle" } })));

        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          setNodes((nds) => nds.map((n) => n.id === node.id ? { ...n, data: { ...n.data, status: "running" } } : n));
          await new Promise((r) => setTimeout(r, 900 + Math.random() * 800));
          setNodes((nds) => nds.map((n) => n.id === node.id ? { ...n, data: { ...n.data, status: "success" } } : n));
        }

        setIsTesting(false);
        resolve(true);
      }),
      {
        loading: "Running workflow simulation...",
        success: "Workflow execution simulation complete!",
        error: "Simulation failed",
      }
    );
  }, [nodes, setNodes]);

  // Bind node action callbacks for canvas rendering
  const nodesWithHandlers = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
      data: {
        ...node.data,
        onDelete: onDeleteNode,
        onDuplicate: onDuplicateNode,
        onConnectToTrigger: onConnectToTrigger,
        onConfigure: onConfigureNode,
      },
    }));
  }, [nodes, selectedNodeId, onDeleteNode, onDuplicateNode, onConnectToTrigger, onConfigureNode]);

  // Active trigger & selected node
  const activeTriggerNode = useMemo(() => {
    return nodes.find((n) => n.data?.isTrigger) || null;
  }, [nodes]);

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Compute variable counts
  const varNodesTotal = useMemo(() => {
    return nodes.filter(
      (n) => !n.data?.isTrigger && (n.data?.hasVariable || hasVariableX((n.data?.originalLabel || n.data?.label) as string))
    ).length;
  }, [nodes]);

  const varNodesConfirmed = useMemo(() => {
    return nodes.filter(
      (n) => !n.data?.isTrigger && n.data?.variableConfirmed
    ).length;
  }, [nodes]);

  const actionNodesCount = useMemo(() => {
    return nodes.filter((n) => !n.data?.isTrigger).length;
  }, [nodes]);

  return {
    reactFlowWrapper,
    nodes,
    edges,
    nodesWithHandlers,
    activeTriggerNode,
    selectedNode,
    selectedTriggerId,
    workflowName,
    setWorkflowName,
    workflowDescription,
    setWorkflowDescription,
    currentId,
    varNodesTotal,
    varNodesConfirmed,
    actionNodesCount,
    isTesting,
    isClearDialogOpen,
    setIsClearDialogOpen,
    isAIDraftOpen,
    setIsAIDraftOpen,
    handleCloseAIDraft,
    onNodesChange,
    onEdgesChange,
    onInitFlow,
    onNodeClick,
    onPaneClick,
    onNodeDragStop,
    onConnect,
    isValidConnection,
    onDragOver,
    onDrop,
    onSkillActionSelect,
    handleTriggerSelect,
    handleTriggerClear,
    onDeleteNode,
    onUpdateNodeData,
    setSelectedNodeId,
    onSave,
    onClearAll,
    onRunTest,
    handleAcceptDraftOnCanvas,
  };
}
