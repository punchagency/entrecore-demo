"use client";

import React, { useState } from "react";
import { Handle, Position } from "reactflow";
import { Card } from "@/components/ui/card";
import { nodeDefinitions } from "@/app/(protected)/abstraction/services/node-definitions";
import { NodeType } from "@/types/abstraction";

interface WorkflowNodeProps {
  data: {
    label: string;
    description?: string;
    type?: NodeType;
    upstreamDependencies?: string[];
    downstreamDependencies?: string[];
    successRate?: number;
  };
  selected?: boolean;
}

export default function WorkflowNode({
  data,
  selected = false,
}: WorkflowNodeProps) {
  const [showDetails, setShowDetails] = useState(false);
  const nodeType = (data.type as NodeType) || "document-intake";
  const def = nodeDefinitions[nodeType];

  if (!def) {
    return (
      <div className="px-4 py-2 bg-slate-100 rounded border border-slate-300">
        Unknown Node
      </div>
    );
  }

  const Icon = def.icon;

  return (
    <Card
      className={`w-48 p-4 cursor-pointer transition-all ${
        selected
          ? "ring-2 ring-blue-500 shadow-lg"
          : "hover:shadow-md"
      } ${def.bgColor}`}
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      <Handle type="target" position={Position.Top} />

      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${def.textColor}`} />
        <h3 className={`font-semibold text-sm ${def.textColor}`}>
          {data.label}
        </h3>
      </div>

      {data.description && (
        <p className="text-xs text-slate-600 line-clamp-2 mb-2">
          {data.description}
        </p>
      )}

      {data.successRate !== undefined && (
        <div className="mb-2 p-2 bg-white/50 rounded">
          <p className="text-xs font-semibold text-slate-700">
            Success Rate: {data.successRate.toFixed(1)}%
          </p>
        </div>
      )}

      {showDetails && (
        <div className="text-xs space-y-1 mt-2 p-2 bg-white/60 rounded">
          {data.upstreamDependencies && data.upstreamDependencies.length > 0 && (
            <div>
              <p className="font-semibold text-slate-700">Upstream:</p>
              <p className="text-slate-600">{data.upstreamDependencies.join(", ")}</p>
            </div>
          )}
          {data.downstreamDependencies && data.downstreamDependencies.length > 0 && (
            <div>
              <p className="font-semibold text-slate-700">Downstream:</p>
              <p className="text-slate-600">{data.downstreamDependencies.join(", ")}</p>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </Card>
  );
}
