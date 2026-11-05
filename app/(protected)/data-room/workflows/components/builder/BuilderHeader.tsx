"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Workflow,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Trash2,
  Save,
  Play,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BuilderHeaderProps {
  workflowName: string;
  onWorkflowNameChange: (val: string) => void;
  currentId: string;
  varNodesTotal: number;
  varNodesConfirmed: number;
  nodesCount: number;
  isTesting: boolean;
  onBackToLanding?: () => void;
  onOpenAIDraft: () => void;
  onOpenClearDialog: () => void;
  onSave: () => void;
  onRunTest: () => void;
}

export default function BuilderHeader({
  workflowName,
  onWorkflowNameChange,
  currentId,
  varNodesTotal,
  varNodesConfirmed,
  nodesCount,
  isTesting,
  onBackToLanding,
  onOpenAIDraft,
  onOpenClearDialog,
  onSave,
  onRunTest,
}: BuilderHeaderProps) {
  return (
    <header className="workflow-header">
      <div className="header-left">
        {onBackToLanding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToLanding}
            className="mr-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl gap-1.5 font-semibold text-xs h-9 px-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Workflows
          </Button>
        )}

        <div className="icon-container">
          <Workflow className="w-5 h-5" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => onWorkflowNameChange(e.target.value)}
              placeholder="Workflow Name"
              className="font-bold text-slate-900 text-base bg-transparent hover:bg-slate-100/60 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5 border border-transparent hover:border-slate-200 transition-all outline-none max-w-[260px] truncate"
            />
            <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 text-slate-500">
              {currentId.substring(0, 10)}
            </Badge>
          </div>
          <span className="text-[11px] text-slate-400 px-1.5">
            Connect trigger to automated skills · Parameterise with variable x
          </span>
        </div>
      </div>

      <div className="header-actions">
        {/* Integrity Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          {varNodesTotal > 0 ? (
            varNodesConfirmed === varNodesTotal ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                All {varNodesTotal} Variables Bound
              </span>
            ) : (
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                {varNodesConfirmed}/{varNodesTotal} Variables Confirmed
              </span>
            )
          ) : (
            <span className="text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              {nodesCount} Nodes
            </span>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAIDraft}
          title="Draft with Natural Language"
          className="border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 rounded-xl gap-1.5 font-bold text-xs h-9 px-3.5 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          AI Draft
        </Button>

        <button
          className="btn-secondary text-red-600 hover:bg-red-50"
          onClick={onOpenClearDialog}
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          Clear
        </button>

        <button
          className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={onSave}
        >
          <Save className="w-4 h-4 mr-1.5" />
          Save & Exit
        </button>

        <button
          className={cn("btn-accent", isTesting && "opacity-50 cursor-not-allowed")}
          onClick={onRunTest}
          disabled={isTesting}
        >
          {isTesting ? (
            <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-1.5" />
          )}
          {isTesting ? "Running..." : "Test Run"}
        </button>
      </div>
    </header>
  );
}
