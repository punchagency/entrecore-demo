"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, Save, History, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { nodeDefinitions, getAvailableNodeTypes } from "@/app/(protected)/abstraction/services/node-definitions";
import { validateWorkflow } from "@/app/(protected)/abstraction/services/workflow-validation";
import {
  getDefaultNodeConfig,
  isNodeConfigValid,
  NodeConfigValues,
} from "@/app/(protected)/abstraction/services/node-config-fields";
import {
  loadWorkflowBuilderState,
  saveWorkflowBuilderState,
} from "@/app/(protected)/abstraction/services/workflow-builder-storage";
import { NodeConfigurationPanel } from "./node-configuration-panel";
import { NodeType, OUTPUT_NODE_TYPES, WorkflowNode as WorkflowNodeType, WorkflowEdge } from "@/types/abstraction";
import { useCompaniesStore } from "@/app/store/companiesStore";
import { parseStoredSchema } from "../services/output-schema-validation";
import type { InferredSchemaColumn } from "../services/connector-input-api";

interface DragDropNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  config: NodeConfigValues;
}

interface DragDropWorkflowBuilderProps {
  workflowId: string;
}

const DEFAULT_NODES: DragDropNode[] = [
  {
    id: "1",
    type: "document-intake",
    x: 50,
    y: 50,
    config: getDefaultNodeConfig("document-intake"),
  },
  {
    id: "2",
    type: "ocr-extraction",
    x: 250,
    y: 50,
    config: getDefaultNodeConfig("ocr-extraction"),
  },
];

const DEFAULT_CONNECTIONS = [{ from: "1", to: "2" }];

const PROCESSING_NODE_TYPES = getAvailableNodeTypes().filter(
  (type) => !OUTPUT_NODE_TYPES.includes(type as (typeof OUTPUT_NODE_TYPES)[number])
);

function resolveUpstreamSchema(
  nodeId: string,
  workflowNodes: DragDropNode[],
  workflowConnections: Array<{ from: string; to: string }>
): InferredSchemaColumn[] {
  const upstreamIds = workflowConnections
    .filter((connection) => connection.to === nodeId)
    .map((connection) => connection.from);

  for (const upstreamId of upstreamIds) {
    const upstreamNode = workflowNodes.find((node) => node.id === upstreamId);
    if (!upstreamNode) continue;
    const schema = parseStoredSchema(upstreamNode.config.inferredSchemaJson);
    if (schema.length > 0) return schema;
  }

  return [];
}

export function DragDropWorkflowBuilder({ workflowId }: DragDropWorkflowBuilderProps) {
  const { companies } = useCompaniesStore();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<DragDropNode[]>(DEFAULT_NODES);
  const [connections, setConnections] = useState<Array<{ from: string; to: string }>>(
    DEFAULT_CONNECTIONS
  );
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setCompanyId(localStorage.getItem("selectedCompanyId") || companies[0]?.id || null);
  }, [companies]);

  useEffect(() => {
    const stored = loadWorkflowBuilderState(workflowId);
    if (stored?.nodes?.length) {
      setNodes(
        stored.nodes.map((node) => ({
          ...node,
          config: node.config ?? getDefaultNodeConfig(node.type),
        }))
      );
      setConnections(stored.connections ?? []);
      setLastSavedAt(stored.updatedAt);
    }
    setIsHydrated(true);
  }, [workflowId]);

  const persistState = useCallback(
    (nextNodes: DragDropNode[], nextConnections: typeof connections) => {
      saveWorkflowBuilderState(workflowId, {
        nodes: nextNodes,
        connections: nextConnections,
      });
      setLastSavedAt(new Date().toISOString());
    },
    [workflowId]
  );

  useEffect(() => {
    if (!isHydrated) return;

    const workflowNodes = nodes.map((n) => {
      const displayName =
        typeof n.config.displayName === "string" && n.config.displayName.trim()
          ? n.config.displayName
          : nodeDefinitions[n.type].label;
      return {
        id: n.id,
        type: n.type,
        label: displayName,
        description: nodeDefinitions[n.type].description,
        position: { x: n.x, y: n.y },
        data: {
          label: displayName,
          description: nodeDefinitions[n.type].description,
          type: n.type,
        },
      };
    }) as WorkflowNodeType[];

    const workflowEdges = connections.map((c) => ({
      id: `${c.from}-${c.to}`,
      source: c.from,
      target: c.to,
    })) as WorkflowEdge[];

    const configErrors = nodes
      .filter((n) => !isNodeConfigValid(n.type, n.config))
      .map(
        (n) =>
          `Node "${typeof n.config.displayName === "string" ? n.config.displayName : nodeDefinitions[n.type].label}" has incomplete configuration`
      );

    const result = validateWorkflow({ nodes: workflowNodes, edges: workflowEdges });
    setValidationErrors([...configErrors, ...result.errors]);
  }, [nodes, connections, isHydrated]);

  const handleAddNode = (nodeType: NodeType) => {
    const newId = `${nodeType}-${Date.now()}`;
    const randomX = Math.random() * 400;
    const randomY = Math.random() * 400;
    const nextNodes = [
      ...nodes,
      {
        id: newId,
        type: nodeType,
        x: randomX,
        y: randomY,
        config: getDefaultNodeConfig(nodeType),
      },
    ];
    setNodes(nextNodes);
    setSelectedNode(newId);
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    const canvas = e.currentTarget.closest("[data-canvas]") as HTMLElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setDraggingNode(nodeId);
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    });
    setSelectedNode(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode) return;

    const canvas = e.currentTarget as HTMLElement;
    const rect = canvas.getBoundingClientRect();

    const newX = Math.max(0, e.clientX - rect.left - dragOffset.x);
    const newY = Math.max(0, e.clientY - rect.top - dragOffset.y);

    setNodes(
      nodes.map((n) => (n.id === draggingNode ? { ...n, x: newX, y: newY } : n))
    );
  };

  const handleMouseUp = () => {
    if (draggingNode) {
      persistState(nodes, connections);
    }
    setDraggingNode(null);
  };

  const handleDeleteNode = (nodeId: string) => {
    const nextNodes = nodes.filter((n) => n.id !== nodeId);
    const nextConnections = connections.filter((c) => c.from !== nodeId && c.to !== nodeId);
    setNodes(nextNodes);
    setConnections(nextConnections);
    if (selectedNode === nodeId) setSelectedNode(null);
    persistState(nextNodes, nextConnections);
  };

  const handleConnect = (fromId: string, toId: string) => {
    if (!connections.some((c) => c.from === fromId && c.to === toId)) {
      const nextConnections = [...connections, { from: fromId, to: toId }];
      setConnections(nextConnections);
      persistState(nodes, nextConnections);
    }
  };

  const handleDeleteConnection = (fromId: string, toId: string) => {
    const nextConnections = connections.filter((c) => !(c.from === fromId && c.to === toId));
    setConnections(nextConnections);
    persistState(nodes, nextConnections);
  };

  const handleSaveNodeConfig = (nodeId: string, config: NodeConfigValues) => {
    const nextNodes = nodes.map((n) => (n.id === nodeId ? { ...n, config } : n));
    setNodes(nextNodes);
    persistState(nextNodes, connections);
  };

  const handleSaveWorkflow = () => {
    if (validationErrors.length > 0) {
      toast.error("Resolve validation errors before saving the workflow");
      return;
    }
    persistState(nodes, connections);
    toast.success("Workflow saved");
  };

  const selectedNodeData = nodes.find((n) => n.id === selectedNode);
  const isValid = validationErrors.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Interactive Workflow Builder</h3>
        <p className="text-sm text-slate-600">
          Click a node to configure • Drag to reposition • Config auto-saves
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card className="overflow-hidden">
          <div
            data-canvas
            className="relative w-full h-[500px] bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-dashed border-slate-300 cursor-grab active:cursor-grabbing"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedNode(null)}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {connections.map((conn, idx) => {
                const fromNode = nodes.find((n) => n.id === conn.from);
                const toNode = nodes.find((n) => n.id === conn.to);
                if (!fromNode || !toNode) return null;

                return (
                  <line
                    key={idx}
                    x1={fromNode.x + 60}
                    y1={fromNode.y + 30}
                    x2={toNode.x}
                    y2={toNode.y + 30}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                </marker>
              </defs>
            </svg>

            {nodes.map((node) => {
              const def = nodeDefinitions[node.type];
              const Icon = def.icon;
              const isSelected = selectedNode === node.id;
              const displayName =
                typeof node.config.displayName === "string" && node.config.displayName.trim()
                  ? node.config.displayName
                  : def.label;
              const configValid = isNodeConfigValid(node.type, node.config);

              return (
                <div
                  key={node.id}
                  className={`absolute w-32 p-3 rounded-lg border-2 cursor-move transition-all ${
                    isSelected
                      ? "border-violet-500 bg-violet-50 shadow-lg ring-2 ring-violet-300"
                      : configValid
                        ? `${def.bgColor} border-slate-300 hover:shadow-md`
                        : "border-amber-400 bg-amber-50/80 hover:shadow-md"
                  }`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleNodeMouseDown(node.id, e);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleDeleteNode(node.id);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-4 h-4 ${def.textColor}`} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className={`text-xs font-bold ${def.textColor} line-clamp-2`}>{displayName}</p>
                  {!configValid && (
                    <p className="text-[9px] text-amber-700 mt-1 font-semibold">Needs config</p>
                  )}

                  {isSelected && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {nodes
                        .filter((n) => n.id !== node.id)
                        .slice(0, 2)
                        .map((targetNode) => (
                          <Button
                            key={targetNode.id}
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnect(node.id, targetNode.id);
                            }}
                          >
                            → {nodeDefinitions[targetNode.type].label.split(" ")[0]}
                          </Button>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                <p>Add nodes from the right panel</p>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          {selectedNodeData ? (
            <NodeConfigurationPanel
              nodeId={selectedNodeData.id}
              nodeType={selectedNodeData.type}
              config={selectedNodeData.config}
              companyId={companyId}
              upstreamSchema={resolveUpstreamSchema(
                selectedNodeData.id,
                nodes,
                connections
              )}
              onSave={(config) => {
                const upstream = resolveUpstreamSchema(
                  selectedNodeData.id,
                  nodes,
                  connections
                );
                const withUpstream =
                  upstream.length > 0 && !config.upstreamSchemaJson
                    ? { ...config, upstreamSchemaJson: JSON.stringify(upstream) }
                    : config;
                handleSaveNodeConfig(selectedNodeData.id, withUpstream);
              }}
              onClose={() => setSelectedNode(null)}
            />
          ) : (
            <Card className="border-dashed border-slate-200 bg-slate-50/50">
              <CardContent className="py-8 text-center">
                <p className="text-sm font-medium text-slate-600">No node selected</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click a node on the canvas to open its configuration panel
                </p>
              </CardContent>
            </Card>
          )}

          <Card className={`p-4 ${isValid ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
            <div className="flex items-center gap-2 mb-2">
              {isValid ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600" />
              )}
              <h4 className="font-semibold text-sm">{isValid ? "Valid" : "Errors"}</h4>
            </div>
            {isValid ? (
              <p className="text-sm text-emerald-700">✓ Workflow is valid</p>
            ) : (
              <div className="space-y-1">
                {validationErrors.map((err, i) => (
                  <p key={i} className="text-xs text-rose-700">
                    • {err}
                  </p>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Nodes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-56">
                <div className="space-y-3 pr-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Processing
                    </p>
                    {PROCESSING_NODE_TYPES.map((nodeType) => {
                      const def = nodeDefinitions[nodeType];
                      return (
                        <Button
                          key={nodeType}
                          onClick={() => handleAddNode(nodeType)}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2"
                        >
                          <def.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold">{def.label}</div>
                            <div className="text-xs text-slate-600 line-clamp-1">{def.description}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                      Output Targets
                    </p>
                    {OUTPUT_NODE_TYPES.map((nodeType) => {
                      const def = nodeDefinitions[nodeType];
                      return (
                        <Button
                          key={nodeType}
                          onClick={() => handleAddNode(nodeType)}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2 border-indigo-200 bg-indigo-50/40"
                        >
                          <def.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold">{def.label}</div>
                            <div className="text-xs text-slate-600 line-clamp-1">{def.description}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {connections.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Connections ({connections.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-28">
                  <div className="space-y-1 pr-4">
                    {connections.map((conn, idx) => {
                      const fromNode = nodes.find((n) => n.id === conn.from);
                      const toNode = nodes.find((n) => n.id === conn.to);
                      if (!fromNode || !toNode) return null;

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs"
                        >
                          <span>
                            {nodeDefinitions[fromNode.type].label.split(" ")[0]} →{" "}
                            {nodeDefinitions[toNode.type].label.split(" ")[0]}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteConnection(conn.from, conn.to)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button className="flex-1 gap-2" disabled={!isValid} onClick={handleSaveWorkflow}>
              <Save className="w-4 h-4" />
              Save
            </Button>
            <Button variant="outline" className="flex-1 gap-2" disabled>
              <History className="w-4 h-4" />
              Versions
            </Button>
          </div>

          {lastSavedAt && (
            <p className="text-[10px] text-slate-500 text-center">
              Last saved {new Date(lastSavedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>How to use:</strong> Add nodes → Click a node to configure it in the panel → Save
            configuration → Drag nodes and connect → Save workflow. Settings persist in your browser
            for this workflow.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
