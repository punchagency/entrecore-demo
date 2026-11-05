"use client";

import React from "react";
import { Panel, Node } from "@xyflow/react";
import { MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasStatusOverlayProps {
  activeTriggerNode?: Node | null;
  actionNodesCount: number;
  connectedEdgesCount: number;
}

export default function CanvasStatusOverlay({
  activeTriggerNode,
  actionNodesCount,
  connectedEdgesCount,
}: CanvasStatusOverlayProps) {
  return (
    <>
      {/* Live Trigger & Connection Status Badge */}
      <Panel position="top-left" className="m-4">
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                activeTriggerNode ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              )}
            />
            <span className="text-slate-400 font-medium">Trigger:</span>
            <span
              className={cn(
                "font-bold px-2 py-0.5 rounded-md text-[11px]",
                activeTriggerNode
                  ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                  : "text-amber-700 bg-amber-50 border border-amber-200"
              )}
            >
              {(activeTriggerNode?.data as any)?.label ?? "None (Choose in Step 1)"}
            </span>
          </div>
          <span className="text-slate-200">|</span>
          <span className="text-xs text-slate-500 font-medium">
            {actionNodesCount} actions · {connectedEdgesCount} connected
          </span>
        </div>
      </Panel>

      <Panel position="top-right" className="canvas-panel">
        <div className="zoom-indicator">
          <MousePointer2 className="w-4 h-4" />
          <span>Interactive Canvas</span>
        </div>
      </Panel>
    </>
  );
}
