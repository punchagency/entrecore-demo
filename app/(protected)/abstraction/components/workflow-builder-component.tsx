"use client";

import React, { useCallback, useState, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Plus, AlertCircle, CheckCircle2, Save, History } from "lucide-react";
import {
  nodeDefinitions,
  getAvailableNodeTypes,
} from "@/app/(protected)/abstraction/services/node-definitions";
import { validateWorkflow, getUpstreamDependencies, getDownstreamDependencies } from "@/app/(protected)/abstraction/services/workflow-validation";
import { WorkflowNode as WorkflowNodeType, WorkflowEdge, NodeType } from "@/types/abstraction";
import WorkflowNode from "./workflow-node";

interface WorkflowBuilderProps {
  workflowId: string;
  onVersionCreate?: (version: any) => void;
}

export function WorkflowBuilderComponent({ workflowId }: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([
    {
      id: "1",
      data: { label: "Document Intake" },
      position: { x: 0, y: 0 },
      type: "workflow",
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [expandedPanel, setExpandedPanel] = useState<string | null>("nodes");

  // Validate workflow on nodes/edges change
  useEffect(() => {
    const validation = validateWorkflow({
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.type || "document-intake",
        label: n.data.label,
        description: n.data.description || "",
        position: n.position,
        data: n.data,
      })) as WorkflowNodeType[],
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })) as WorkflowEdge[],
    });

    setValidationErrors(validation.errors);
  }, [nodes, edges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
      setIsDirty(true);
    },
    [setEdges]
  );

  const addNode = (nodeType: NodeType) => {
    const nodeDef = nodeDefinitions[nodeType];
    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      data: {
        label: nodeDef.label,
        description: nodeDef.description,
        type: nodeType,
      },
      position: {
        x: Math.random() * 500,
        y: Math.random() * 500,
      },
      type: "workflow",
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
  };

  const handleSave = () => {
    if (validationErrors.length === 0) {
      // Auto-save logic will go here
      setIsDirty(false);
      // TODO: Implement version creation
    }
  };

  const isValid = validationErrors.length === 0;

  return (
    <div className="h-[calc(100vh-300px)] flex gap-4 bg-slate-50 rounded-lg p-4">
      {/* React Flow Canvas */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={{ workflow: WorkflowNode }}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Side Panel */}
      <div className="w-80 flex flex-col gap-4">
        {/* Add Nodes Panel */}
        <Card className="p-4">
          <button
            onClick={() =>
              setExpandedPanel(expandedPanel === "nodes" ? null : "nodes")
            }
            className="flex items-center justify-between w-full mb-3"
          >
            <h3 className="font-semibold text-slate-900">Available Nodes</h3>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                expandedPanel === "nodes" ? "rotate-180" : ""
              }`}
            />
          </button>

          {expandedPanel === "nodes" && (
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {getAvailableNodeTypes().map((nodeType) => {
                  const def = nodeDefinitions[nodeType];
                  const Icon = def.icon;
                  return (
                    <Button
                      key={nodeType}
                      onClick={() => addNode(nodeType)}
                      variant="outline"
                      className="w-full justify-start gap-2 h-auto py-2 text-left"
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{def.label}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">
                          {def.description}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* Validation Panel */}
        <Card className={`p-4 ${isValid ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
          <button
            onClick={() =>
              setExpandedPanel(expandedPanel === "validation" ? null : "validation")
            }
            className="flex items-center justify-between w-full mb-2"
          >
            <div className="flex items-center gap-2">
              {isValid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600" />
              )}
              <h3 className="font-semibold text-sm">
                {isValid ? "Valid" : "Validation Errors"}
              </h3>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                expandedPanel === "validation" ? "rotate-180" : ""
              }`}
            />
          </button>

          {expandedPanel === "validation" && (
            <div className="space-y-2 text-sm">
              {isValid ? (
                <p className="text-emerald-700">Workflow is valid and ready to publish</p>
              ) : (
                validationErrors.map((error, i) => (
                  <div key={i} className="text-rose-700 p-2 bg-white rounded border border-rose-200">
                    {error}
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!isDirty || !isValid}
            className="flex-1 gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
          <Button variant="outline" className="flex-1 gap-2">
            <History className="w-4 h-4" />
            History
          </Button>
        </div>

        {/* Info Panel */}
        {hoveredNode && (
          <Card className="p-4 bg-slate-100">
            <h4 className="font-semibold mb-2 text-sm">Node Details</h4>
            <p className="text-xs text-slate-600">
              Click nodes to view dependencies and impact
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
