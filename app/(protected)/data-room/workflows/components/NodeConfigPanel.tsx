"use client";

import React, { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import {
  Settings2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  Clock,
  ArrowRight,
  Code2,
  Sliders,
  Eye,
  Info
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  hasVariableX,
  getActionVariableMeta,
  formatDisplayLabelWithVariable
} from "./node-variable-meta";

interface NodeConfigPanelProps {
  node: Node | null;
  onClose: () => void;
  onDeleteNode?: (id: string) => void;
  onUpdateNodeData: (id: string, updatedData: Partial<Record<string, any>>) => void;
}

export default function NodeConfigPanel(props: NodeConfigPanelProps) {
  // Returning before the content's hooks would change the hook count when a node is
  // deselected, so the empty case is handled here and the hooks live in the content.
  if (!props.node) return null;
  return <NodeConfigPanelContent {...props} node={props.node} />;
}

function NodeConfigPanelContent({
  node,
  onClose,
  onDeleteNode,
  onUpdateNodeData,
}: NodeConfigPanelProps & { node: Node }) {
  const nodeData = (node.data || {}) as Record<string, any>;
  const isTrigger = Boolean(nodeData.isTrigger);
  const baseLabel = (nodeData.originalLabel || nodeData.label || "") as string;
  const isVarAction = Boolean(nodeData.hasVariable || hasVariableX(baseLabel));

  // Meta for this action
  const varMeta = getActionVariableMeta(baseLabel);

  // Local state for interactive editing
  const [displayLabel, setDisplayLabel] = useState<string>(nodeData.label || baseLabel);
  const [variableValue, setVariableValue] = useState<string>(nodeData.variableValue || "");
  const [isConfirmed, setIsConfirmed] = useState<boolean>(Boolean(nodeData.variableConfirmed));
  const [description, setDescription] = useState<string>(nodeData.description || "");
  const [timeoutSec, setTimeoutSec] = useState<number>(nodeData.config?.timeout ?? 30);
  const [retryCount, setRetryCount] = useState<number>(nodeData.config?.retries ?? 0);
  const [continueOnError, setContinueOnError] = useState<boolean>(nodeData.config?.continueOnError ?? false);
  const [copiedVar, setCopiedVar] = useState(false);

  // Sync state whenever selected node changes
  useEffect(() => {
    setDisplayLabel(nodeData.label || baseLabel);
    setVariableValue(nodeData.variableValue || "");
    setIsConfirmed(Boolean(nodeData.variableConfirmed));
    setDescription(nodeData.description || "");
    setTimeoutSec(nodeData.config?.timeout ?? 30);
    setRetryCount(nodeData.config?.retries ?? 0);
    setContinueOnError(nodeData.config?.continueOnError ?? false);
  }, [node.id, nodeData.label, nodeData.variableValue, nodeData.variableConfirmed, nodeData.description]);

  // Handle confirming the variable
  const handleConfirmVariable = () => {
    if (!variableValue.trim()) {
      toast.error(`Please provide a value for variable "${varMeta.variableName || "x"}"`);
      return;
    }

    const trimmedValue = variableValue.trim();
    setIsConfirmed(true);

    // Compute updated label that points to the confirmed variable
    const nextFormattedLabel = formatDisplayLabelWithVariable(baseLabel, trimmedValue, true);
    setDisplayLabel(nextFormattedLabel);

    onUpdateNodeData(node.id, {
      label: nextFormattedLabel,
      originalLabel: baseLabel,
      hasVariable: true,
      variableName: "x",
      variableValue: trimmedValue,
      variableConfirmed: true,
      config: {
        ...(nodeData.config || {}),
        variable_x: trimmedValue,
        isConfirmed: true,
        timeout: timeoutSec,
        retries: retryCount,
        continueOnError,
      },
    });

    toast.success(`Variable "${varMeta.variableName || "x"}" confirmed as "${trimmedValue}"!`);
  };

  // Handle unbinding/clearing variable confirmation
  const handleResetVariable = () => {
    setIsConfirmed(false);
    setDisplayLabel(baseLabel);
    onUpdateNodeData(node.id, {
      label: baseLabel,
      variableConfirmed: false,
      config: {
        ...(nodeData.config || {}),
        variable_x: "",
        isConfirmed: false,
      },
    });
    toast.info("Variable confirmation reset. Node returned to variable state.");
  };

  // Quick insertion of suggestion
  const handleApplySuggestion = (sug: string) => {
    setVariableValue(sug);
  };

  // Update display label manually
  const handleLabelChange = (newLabel: string) => {
    setDisplayLabel(newLabel);
    onUpdateNodeData(node.id, {
      label: newLabel,
    });
  };

  // Update description
  const handleDescriptionChange = (newDesc: string) => {
    setDescription(newDesc);
    onUpdateNodeData(node.id, {
      description: newDesc,
    });
  };

  // Update execution options
  const handleRuntimeConfigChange = (key: string, val: any) => {
    onUpdateNodeData(node.id, {
      config: {
        ...(nodeData.config || {}),
        [key]: val,
      },
    });
  };

  return (
    <div className="w-[380px] bg-white border-l border-slate-200 flex flex-col z-20 relative shadow-2xl h-full select-text animate-in slide-in-from-right duration-200">
      {/* ─── Header ─── */}
      <div className="h-14 border-b border-slate-100 flex items-center px-4 justify-between bg-slate-50/90 shrink-0">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <Settings2 className="h-4 w-4 text-indigo-600" />
          <span>Node Settings</span>
          {isTrigger ? (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold ml-1">
              Trigger
            </Badge>
          ) : isVarAction ? (
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-semibold ml-1">
              Variable Node
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-500 text-[10px] ml-1">
              Action
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onDeleteNode && (
            <Button
              variant="ghost"
              size="icon"
              title="Delete node"
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              onClick={() => onDeleteNode(node.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            title="Close settings"
            className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ─── Scrollable Body ─── */}
      <div className="p-4 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
        {/* ── Section 1: Identity ── */}
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Identity</span>
            <span className="text-[10px] font-mono font-normal text-slate-400">Node Definition</span>
          </Label>

          <div className="space-y-1">
            <Label className="text-[11px] text-slate-400">Node ID (Internal)</Label>
            <Input
              value={node.id}
              disabled
              className="h-8 text-xs bg-slate-50 font-mono text-slate-600 border-slate-200"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-slate-400">Display Label</Label>
            <Input
              value={displayLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              className="h-9 text-sm border-slate-200 focus-visible:ring-indigo-500"
              placeholder="e.g. Send Email Notification"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-slate-400">Description / Notes</Label>
            <Textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="text-xs border-slate-200 min-h-[60px] resize-none focus-visible:ring-indigo-500"
              placeholder="What does this step accomplish in your workflow?"
            />
          </div>
        </div>

        {/* ── Section 2: Variable Parameter (x) Binding ── */}
        {isVarAction && (
          <div className="space-y-3.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <Label className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Variable Binding (x)
                </Label>
              </div>

              {isConfirmed ? (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Confirmed
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold gap-1">
                  <AlertCircle className="h-3 w-3 text-amber-500" /> Needs Confirmation
                </Badge>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/30 space-y-3 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    {varMeta.targetLabel || "Variable Parameter (x)"}
                  </Label>
                  <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    var: x
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {varMeta.description}
                </p>
              </div>

              {/* Input for the variable value */}
              <div className="space-y-1.5">
                {varMeta.inputType === "textarea" || varMeta.inputType === "sql" ? (
                  <Textarea
                    value={variableValue}
                    onChange={(e) => {
                      setVariableValue(e.target.value);
                      setIsConfirmed(false);
                    }}
                    placeholder={varMeta.placeholder}
                    className="text-xs font-mono border-slate-300 min-h-[90px] focus-visible:ring-indigo-500 bg-white"
                  />
                ) : (
                  <div className="relative">
                    <Input
                      type={varMeta.inputType === "date" ? "date" : "text"}
                      value={variableValue}
                      onChange={(e) => {
                        setVariableValue(e.target.value);
                        setIsConfirmed(false);
                      }}
                      placeholder={varMeta.placeholder}
                      className="h-9 text-xs border-slate-300 pr-8 focus-visible:ring-indigo-500 bg-white font-mono"
                    />
                    {variableValue && (
                      <button
                        type="button"
                        onClick={() => {
                          setVariableValue("");
                          setIsConfirmed(false);
                        }}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        title="Clear input"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Suggestions / Reference Chips */}
              {varMeta.suggestions && varMeta.suggestions.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Quick Insert / Suggestions:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {varMeta.suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplySuggestion(sug)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all text-left truncate max-w-full"
                        title={`Click to insert: ${sug}`}
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm / Unbind Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={handleConfirmVariable}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isConfirmed ? "Update Variable (x)" : "Confirm Variable (x)"}
                </Button>

                {isConfirmed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetVariable}
                    className="w-full h-7 text-[11px] text-slate-500 hover:text-slate-700 border-slate-200"
                  >
                    Reset / Revert to Variable x
                  </Button>
                )}
              </div>
            </div>

            {/* Canvas Node Preview with confirmed state */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Eye className="h-3 w-3" /> Canvas Display Preview
              </span>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {displayLabel}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                    {isConfirmed ? (
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <Check className="h-2.5 w-2.5" /> x confirmed: {variableValue}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium flex items-center gap-1">
                        <AlertCircle className="h-2.5 w-2.5" /> x: unconfirmed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 3: Trigger Configuration ── */}
        {isTrigger && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-emerald-500" />
              Trigger Configuration
            </Label>
            <div className="space-y-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">Event Source</Label>
                <Input
                  value={nodeData.triggerId || "trigger-webhook"}
                  disabled
                  className="h-8 text-xs bg-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">Simulated Webhook Endpoint</Label>
                <div className="flex items-center gap-1">
                  <Input
                    value={`https://api.entrecore.io/v1/hooks/${node.id}`}
                    readOnly
                    className="h-8 text-xs bg-white font-mono text-slate-600 truncate"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://api.entrecore.io/v1/hooks/${node.id}`);
                      setCopiedVar(true);
                      setTimeout(() => setCopiedVar(false), 2000);
                      toast.success("Webhook URL copied to clipboard");
                    }}
                  >
                    {copiedVar ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 4: Execution & Runtime Options ── */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-slate-400" />
            Execution Parameters
          </Label>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Timeout (s)
              </Label>
              <Input
                type="number"
                min={1}
                max={300}
                value={timeoutSec}
                onChange={(e) => {
                  const val = Number(e.target.value) || 30;
                  setTimeoutSec(val);
                  handleRuntimeConfigChange("timeout", val);
                }}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-400 flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Retries
              </Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={retryCount}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setRetryCount(val);
                  handleRuntimeConfigChange("retries", val);
                }}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-700">Continue on Error</p>
              <p className="text-[10px] text-slate-400">Do not fail entire DAG if this step errors</p>
            </div>
            <Switch
              checked={continueOnError}
              onCheckedChange={(checked) => {
                setContinueOnError(checked);
                handleRuntimeConfigChange("continueOnError", checked);
              }}
            />
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Info className="h-3 w-3" /> All changes auto-save
        </span>
        <Button
          onClick={onClose}
          className="h-8 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
