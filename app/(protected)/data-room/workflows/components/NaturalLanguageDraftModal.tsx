"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Zap,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit3,
  RefreshCw,
  Sliders,
  Check,
  HelpCircle,
  Clock,
  Layers,
  Wand2,
  Info,
  ChevronRight,
  X,
} from "lucide-react";
import {
  generateWorkflowDraft,
  DraftWorkflowResult,
  DraftWarning,
  PROMPT_PRESETS,
} from "../services/workflow-ai-generator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NaturalLanguageDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcceptDraft: (draft: DraftWorkflowResult) => void;
  initialPrompt?: string;
}

const GENERATION_STEPS = [
  "Parsing natural language intent...",
  "Selecting appropriate triggers & action skills...",
  "Synthesizing sequential DAG nodes and connections...",
  "Evaluating parameters & configuration warnings...",
];

export default function NaturalLanguageDraftModal({
  isOpen,
  onClose,
  onAcceptDraft,
  initialPrompt = "",
}: NaturalLanguageDraftModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [draftResult, setDraftResult] = useState<DraftWorkflowResult | null>(null);
  const [isModifying, setIsModifying] = useState(false);

  // Editable draft fields during modification
  const [editableName, setEditableName] = useState("");
  const [editableDesc, setEditableDesc] = useState("");

  const handleGenerate = async (targetPrompt?: string) => {
    const textToUse = targetPrompt || prompt;
    if (!textToUse.trim()) {
      toast.error("Please enter a description for your workflow");
      return;
    }

    setIsGenerating(true);
    setGenerationStep(0);
    setDraftResult(null);

    // Simulate progressive status steps
    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => (prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev));
    }, 450);

    try {
      const result = await generateWorkflowDraft(textToUse);
      clearInterval(stepInterval);
      setDraftResult(result);
      setEditableName(result.name);
      setEditableDesc(result.description);
      toast.success("Draft workflow generated with DAG skeleton!");
    } catch (err) {
      clearInterval(stepInterval);
      toast.error("Failed to generate workflow draft. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Quick fix for a warning (e.g. applying suggested value)
  const handleQuickFixWarning = (warning: DraftWarning, val: string) => {
    if (!draftResult) return;

    const updatedNodes = draftResult.nodes.map((node) => {
      if (node.id === warning.nodeId) {
        const nextLabel = node.data.originalLabel
          ? (node.data.originalLabel as string).replace(/\s+x$/i, ` [${val}]`)
          : `${node.data.label} [${val}]`;

        return {
          ...node,
          data: {
            ...node.data,
            label: nextLabel,
            variableValue: val,
            variableConfirmed: true,
          },
        };
      }
      return node;
    });

    const updatedWarnings = draftResult.warnings.filter(
      (w) => !(w.nodeId === warning.nodeId && w.field === warning.field)
    );

    setDraftResult({
      ...draftResult,
      nodes: updatedNodes,
      warnings: updatedWarnings,
    });

    toast.success(`Configured parameter for "${warning.nodeLabel}" as "${val}"!`);
  };

  // Accept the draft
  const handleAccept = () => {
    if (!draftResult) return;

    const finalDraft: DraftWorkflowResult = {
      ...draftResult,
      name: editableName.trim() || draftResult.name,
      description: editableDesc.trim() || draftResult.description,
    };

    onAcceptDraft(finalDraft);
    toast.success(`Workflow draft "${finalDraft.name}" accepted into builder!`);
    handleResetModal();
  };

  // Discard the draft
  const handleDiscard = () => {
    setDraftResult(null);
    setIsModifying(false);
    toast.info("Draft discarded");
  };

  const handleResetModal = () => {
    setDraftResult(null);
    setIsModifying(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleResetModal()}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl p-0 overflow-hidden flex flex-col">
        {/* ─── Modal Header ─── */}
        <DialogHeader className="p-6 pb-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl shadow-md shadow-indigo-100">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  Natural Language Workflow Drafting
                  <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                    AI Assisted
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Describe what your workflow should do in plain English. The system synthesizes the DAG skeleton with nodes, links, and integrity checks.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* ─── Modal Content (Scrollable) ─── */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Prompt Input Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-indigo-600" />
                Describe Your Desired Workflow:
              </label>
              {draftResult && (
                <button
                  type="button"
                  onClick={() => setIsModifying(!isModifying)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <Edit3 className="h-3 w-3" />
                  {isModifying ? "Hide Prompt" : "Refine Prompt"}
                </button>
              )}
            </div>

            {(!draftResult || isModifying) && (
              <div className="space-y-3">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. When a contract is received via webhook, classify document into type invoice, extract structured fields, insert into table diligence_records, and send a Slack message to channel #diligence-alerts."
                  className="text-sm rounded-2xl border-slate-200 min-h-[96px] focus-visible:ring-indigo-500 shadow-inner bg-slate-50/50 p-3.5 leading-relaxed"
                  autoFocus
                />

                {/* Preset Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sample Workflow Prompts:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PROMPT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPrompt(preset.prompt);
                          handleGenerate(preset.prompt);
                        }}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-slate-100/80 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200/60 text-slate-600 transition-all text-left"
                      >
                        ⚡ {preset.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    onClick={() => handleGenerate()}
                    disabled={isGenerating || !prompt.trim()}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-5 shadow-md shadow-indigo-100 flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating Draft...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        {draftResult ? "Regenerate Draft" : "Generate Draft Workflow"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ─── Generation Progress Animation ─── */}
          {isGenerating && (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-indigo-600 animate-spin" />
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {GENERATION_STEPS[generationStep]}
                  </p>
                  <p className="text-xs text-slate-400">
                    Step {generationStep + 1} of {GENERATION_STEPS.length}
                  </p>
                </div>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-300"
                  style={{ width: `${((generationStep + 1) / GENERATION_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ─── Generated Draft Preview & Validation ─── */}
          {draftResult && !isGenerating && (
            <div className="space-y-5 animate-in fade-in-50 duration-300">
              {/* Draft Overview Card */}
              <div className="p-4 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/40 rounded-2xl border border-indigo-100 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Input
                        value={editableName}
                        onChange={(e) => setEditableName(e.target.value)}
                        className="font-bold text-slate-900 text-base h-8 bg-white border-slate-200 px-2 max-w-md focus-visible:ring-indigo-500"
                      />
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold shrink-0">
                        Confidence: {draftResult.confidenceScore}%
                      </Badge>
                    </div>
                    <Input
                      value={editableDesc}
                      onChange={(e) => setEditableDesc(e.target.value)}
                      className="text-xs text-slate-500 h-7 bg-white border-slate-200 px-2 focus-visible:ring-indigo-500"
                      placeholder="Workflow description..."
                    />
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Trigger
                    </span>
                    <Badge variant="outline" className="text-xs font-semibold bg-white border-slate-200 text-slate-700">
                      ⚡ {draftResult.triggerName}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* ─── Configuration Warnings Banner (Acceptance Criteria 4) ─── */}
              {draftResult.warnings && draftResult.warnings.length > 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-amber-100 rounded-md text-amber-700">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                        Configuration Warnings ({draftResult.warnings.length})
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-700">
                      Requires attention before active deployment
                    </span>
                  </div>

                  <div className="space-y-2">
                    {draftResult.warnings.map((warn, wIdx) => (
                      <div
                        key={wIdx}
                        className="p-3 bg-white rounded-xl border border-amber-200/60 shadow-xs flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            {warn.nodeLabel}
                          </p>
                          <p className="text-[11px] text-amber-800 leading-relaxed truncate">
                            {warn.message}
                          </p>
                        </div>

                        {warn.suggestedValue && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickFixWarning(warn, warn.suggestedValue!)}
                            className="h-7 text-[11px] px-2.5 rounded-lg border-amber-300 text-amber-800 hover:bg-amber-50 shrink-0 gap-1 font-semibold"
                          >
                            <Check className="h-3 w-3" />
                            Use: "{warn.suggestedValue}"
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  All generated action parameters and variables confirmed! Zero configuration warnings.
                </div>
              )}

              {/* ─── Visual DAG Skeleton Preview ─── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-500" />
                    Generated DAG Pipeline ({draftResult.nodes.length} nodes · {draftResult.edges.length} links):
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Sequential Flow
                  </span>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 overflow-x-auto">
                  <div className="flex items-center gap-3 min-w-max py-2">
                    {draftResult.nodes.map((node, nIdx) => {
                      const isTrig = Boolean(node.data?.isTrigger);
                      const isVar = Boolean(node.data?.hasVariable);
                      const isConf = Boolean(node.data?.variableConfirmed);

                      return (
                        <React.Fragment key={node.id || nIdx}>
                          {/* Node Card Skeleton */}
                          <div
                            className={cn(
                              "w-52 p-3 rounded-xl border bg-white shadow-xs space-y-2 transition-all",
                              isTrig
                                ? "border-emerald-300 ring-1 ring-emerald-100"
                                : isVar && !isConf
                                ? "border-amber-300 ring-1 ring-amber-100"
                                : "border-slate-200"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                  isTrig
                                    ? "bg-emerald-50 text-emerald-700"
                                    : isVar
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "bg-slate-100 text-slate-600"
                                )}
                              >
                                {isTrig ? "Trigger" : `Step ${nIdx}`}
                              </span>
                              {isVar && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] px-1 py-0",
                                    isConf
                                      ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                                      : "text-amber-700 border-amber-200 bg-amber-50"
                                  )}
                                >
                                  {isConf ? "x: Bound" : "x: Unbound"}
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">
                              {(node.data?.label as string) || "Node"}
                            </p>

                            {Boolean(node.data?.variableValue) && (
                              <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50/60 p-1 rounded border border-emerald-100 truncate">
                                x = {String(node.data?.variableValue)}
                              </div>
                            )}
                          </div>

                          {/* Arrow between nodes */}
                          {nIdx < draftResult.nodes.length - 1 && (
                            <div className="flex items-center text-slate-300 font-bold">
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Modal Footer Actions (Accept, Modify, Discard) ─── */}
        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 sm:justify-between">
          <div>
            {draftResult && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Discard Draft
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleResetModal}
              className="rounded-xl border-slate-200 text-slate-600 font-semibold text-xs h-10 px-4"
            >
              Cancel
            </Button>

            {draftResult && (
              <Button
                onClick={handleAccept}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-6 shadow-md shadow-indigo-100 flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                Accept Draft into Canvas
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
