"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Workflow,
  ScanLine,
  FileSearch,
  Tag,
  TreePine,
  ShieldCheck,
  UserCheck,
  Database,
  Play,
  Pause,
  Plus,
  GripVertical,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Settings2,
} from "lucide-react";
import { useAbstractionStore, AgentStep } from "@/app/store/abstractionStore";
import { cn } from "@/lib/utils";

const STEP_CONFIG: Record<
  AgentStep["type"],
  { label: string; icon: React.ReactNode; color: string; bgFrom: string; bgTo: string; ring: string }
> = {
  ocr: {
    label: "OCR Engine",
    icon: <ScanLine className="h-5 w-5" />,
    color: "text-blue-600",
    bgFrom: "from-blue-50",
    bgTo: "to-sky-50",
    ring: "ring-blue-200",
  },
  text_extract: {
    label: "Text Extraction",
    icon: <FileSearch className="h-5 w-5" />,
    color: "text-violet-600",
    bgFrom: "from-violet-50",
    bgTo: "to-purple-50",
    ring: "ring-violet-200",
  },
  entity_recognition: {
    label: "Entity Recognition",
    icon: <Tag className="h-5 w-5" />,
    color: "text-emerald-600",
    bgFrom: "from-emerald-50",
    bgTo: "to-green-50",
    ring: "ring-emerald-200",
  },
  clause_classification: {
    label: "Clause Classification",
    icon: <TreePine className="h-5 w-5" />,
    color: "text-amber-600",
    bgFrom: "from-amber-50",
    bgTo: "to-yellow-50",
    ring: "ring-amber-200",
  },
  validation: {
    label: "Validation Gate",
    icon: <ShieldCheck className="h-5 w-5" />,
    color: "text-rose-600",
    bgFrom: "from-rose-50",
    bgTo: "to-pink-50",
    ring: "ring-rose-200",
  },
  human_review: {
    label: "Human Review",
    icon: <UserCheck className="h-5 w-5" />,
    color: "text-indigo-600",
    bgFrom: "from-indigo-50",
    bgTo: "to-blue-50",
    ring: "ring-indigo-200",
  },
  output: {
    label: "Data Output",
    icon: <Database className="h-5 w-5" />,
    color: "text-cyan-600",
    bgFrom: "from-cyan-50",
    bgTo: "to-teal-50",
    ring: "ring-cyan-200",
  },
};

const AVAILABLE_AGENTS: { type: AgentStep["type"]; description: string }[] = [
  { type: "ocr", description: "Azure Vision / Google Vision OCR" },
  { type: "text_extract", description: "Layout-aware text parser" },
  { type: "entity_recognition", description: "SLM-based entity extraction" },
  { type: "clause_classification", description: "Semantic clause classifier" },
  { type: "validation", description: "Confidence threshold gate" },
  { type: "human_review", description: "Manual review queue" },
  { type: "output", description: "Structured data output" },
];

interface WorkflowStepNode {
  step: AgentStep;
  config: typeof STEP_CONFIG[AgentStep["type"]];
  connections: string[];
}

export function WorkflowBuilder() {
  const { workflow, agentLogs } = useAbstractionStore();
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Hooks must run on every render, so they handle a missing workflow themselves and the
  // early return comes after them; returning first changed the hook count once it loaded.

  // Build the visual flow topology
  const stepMap = useMemo(() => {
    const map = new Map<string, WorkflowStepNode>();
    if (!workflow) return map;
    workflow.steps.forEach((step) => {
      const outgoing = workflow.connections
        .filter((c) => c.sourceId === step.id)
        .map((c) => c.targetId);
      map.set(step.id, {
        step,
        config: STEP_CONFIG[step.type],
        connections: outgoing,
      });
    });
    return map;
  }, [workflow]);

  // Topological layers for visual layout
  const layers = useMemo(() => {
    if (!workflow) return [];
    const inDegree = new Map<string, number>();
    workflow.steps.forEach((s) => inDegree.set(s.id, 0));
    workflow.connections.forEach((c) =>
      inDegree.set(c.targetId, (inDegree.get(c.targetId) || 0) + 1)
    );

    const layers: AgentStep[][] = [];
    const visited = new Set<string>();
    let queue = workflow.steps.filter((s) => (inDegree.get(s.id) || 0) === 0);

    while (queue.length > 0) {
      layers.push(queue);
      queue.forEach((s) => visited.add(s.id));
      const nextQueue: AgentStep[] = [];
      queue.forEach((s) => {
        const node = stepMap.get(s.id);
        node?.connections.forEach((targetId) => {
          if (!visited.has(targetId)) {
            const target = workflow.steps.find((st) => st.id === targetId);
            if (target && !nextQueue.find((q) => q.id === targetId)) {
              // Check all inputs are visited
              const allInputsVisited = workflow.connections
                .filter((c) => c.targetId === targetId)
                .every((c) => visited.has(c.sourceId));
              if (allInputsVisited) {
                nextQueue.push(target);
              }
            }
          }
        });
      });
      queue = nextQueue;
    }
    return layers;
  }, [workflow, stepMap]);

  if (!workflow) return null;

  const handleRunWorkflow = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 5000);
  };

  const selectedStep = selectedStepId ? workflow.steps.find((s) => s.id === selectedStepId) : null;
  const selectedStepLogs = selectedStepId
    ? agentLogs.filter((l) => l.stepId === selectedStepId)
    : [];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl">
            <Workflow className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{workflow.name}</h3>
            <p className="text-xs text-slate-500">
              {workflow.steps.length} agents • {workflow.connections.length} connections
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "rounded-full text-xs px-3 py-1",
              workflow.status === "active"
                ? "bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-500 hover:text-emerald-100"
                : "bg-slate-100 text-slate-600 border-0 hover:bg-slate-500 hover:text-slate-100"
            )}
          >
            {workflow.status === "active" ? (
              <Zap className="h-3 w-3 mr-1" />
            ) : (
              <Pause className="h-3 w-3 mr-1" />
            )}
            {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
          </Badge>
          <Button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-200"
          >
            {isRunning ? (
              <Clock className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunning ? "Running..." : "Run Pipeline"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* ── Visual Workflow Canvas ─────────────────────── */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
          <CardContent className="p-6">
            <div className="relative overflow-x-auto">
              <div className="flex items-start gap-4 min-w-[900px] py-4">
                {layers.map((layer, layerIdx) => (
                  <div key={layerIdx} className="flex flex-col items-center gap-4">
                    {/* Layer Label */}
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Step {layerIdx + 1}
                    </div>

                    {layer.map((step) => {
                      const config = STEP_CONFIG[step.type];
                      const isSelected = selectedStepId === step.id;
                      const hasLog = agentLogs.find((l) => l.stepId === step.id);

                      return (
                        <div key={step.id} className="flex items-center gap-3">
                          {/* Step Node */}
                          <div
                            className={cn(
                              "relative w-[180px] p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 group",
                              `bg-gradient-to-br ${config.bgFrom} ${config.bgTo}`,
                              isSelected
                                ? `border-transparent ring-2 ${config.ring} shadow-lg scale-105`
                                : "border-transparent hover:shadow-md hover:scale-[1.02]"
                            )}
                            onClick={() => setSelectedStepId(isSelected ? null : step.id)}
                          >
                            {/* Status indicator */}
                            {hasLog && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                <CheckCircle2 className="h-3 w-3 text-white" />
                              </div>
                            )}

                            {isRunning && layerIdx <= 2 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                                <Clock className="h-3 w-3 text-white" />
                              </div>
                            )}

                            <div className={cn("mb-2", config.color)}>{config.icon}</div>
                            <p className="text-sm font-bold text-slate-800">{step.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {config.label}
                            </p>

                            {hasLog && (
                              <div className="flex items-center gap-1 mt-2">
                                <div className="h-1 flex-1 bg-emerald-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${hasLog.confidence * 100}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-semibold text-emerald-600">
                                  {(hasLog.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Connection Arrow (if not last layer) */}
                          {layerIdx < layers.length - 1 && (
                            <div className="flex items-center">
                              <div className={cn(
                                "h-0.5 w-8 transition-colors",
                                isRunning && layerIdx <= 1 ? "bg-blue-400 animate-pulse" : "bg-slate-300"
                              )} />
                              <ArrowRight className={cn(
                                "h-4 w-4 -ml-1 transition-colors",
                                isRunning && layerIdx <= 1 ? "text-blue-400 animate-pulse" : "text-slate-300"
                              )} />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Fork indicator for parallel branches */}
                    {layer.length > 1 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Badge className="text-[9px] px-2 py-0 bg-slate-100 text-slate-500 border-0 rounded-full">
                          Parallel
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Right Panel ────────────────────────────────── */}
        <div className="space-y-4">
          {/* Available Agents (Drag palette) */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-500" />
                Available Agents
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1.5">
              {AVAILABLE_AGENTS.map((agent) => {
                const config = STEP_CONFIG[agent.type];
                return (
                  <div
                    key={agent.type}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 cursor-grab transition-all group"
                  >
                    <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-400" />
                    <div className={cn("p-1.5 rounded-lg bg-white shadow-sm", config.color)}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{config.label}</p>
                      <p className="text-[10px] text-slate-500 truncate">{agent.description}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Step Detail / Logs */}
          {selectedStep && (
            <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-violet-500" />
                  {selectedStep.name} — Config
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                {Object.entries(selectedStep.config).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="text-xs font-medium text-slate-600 capitalize">
                      {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                    </span>
                    <Badge variant="outline" className="text-[10px] rounded-full">
                      {String(value)}
                    </Badge>
                  </div>
                ))}

                {/* Step Logs */}
                {selectedStepLogs.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Execution Log
                    </p>
                    {selectedStepLogs.map((log) => (
                      <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">{log.outputs}</span>
                          <span className="text-[10px] text-slate-400">{log.duration}ms</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${log.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-600">
                            {(log.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        {log.error && (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-[10px]">{log.error}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
