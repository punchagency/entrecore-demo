"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useDataRoomWorkflows,
  DataRoomWorkflow,
} from "./hooks/use-data-room-workflows";
import WorkflowCanvasBuilder from "./components/WorkflowCanvasBuilder";
import NaturalLanguageDraftModal from "./components/NaturalLanguageDraftModal";
import { DraftWorkflowResult } from "./services/workflow-ai-generator";
import { hasVariableX } from "./components/node-variable-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Workflow,
  Plus,
  Play,
  MoreVertical,
  Route,
  Activity,
  Server,
  Clock,
  ArrowRight,
  Zap,
  Search,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Trash2,
  Layers,
  Database,
  Filter,
  Check,
  Calendar,
  Sliders,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function WorkflowsLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If URL has ?builder=true or ?id=..., show builder directly
  const builderQuery = searchParams.get("builder");
  const editIdQuery = searchParams.get("id");
  const draftQuery = searchParams.get("draft") === "true" || searchParams.get("aiDraft") === "true";
  const isInlineBuilder = Boolean(builderQuery === "true" || editIdQuery);

  const {
    workflows,
    isLoaded,
    saveWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
  } = useDataRoomWorkflows();

  // Natural Language Drafting Modal State
  const [isAIDraftOpen, setIsAIDraftOpen] = useState(false);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTrigger, setFilterTrigger] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Deletion Modal State
  const [workflowToDelete, setWorkflowToDelete] = useState<DataRoomWorkflow | null>(null);

  // Quick Simulation Modal State
  const [simulatingWorkflow, setSimulatingWorkflow] = useState<DataRoomWorkflow | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Filtered workflows list
  const filteredWorkflows = useMemo(() => {
    return workflows.filter((wf) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = wf.name.toLowerCase().includes(q);
        const matchesDesc = (wf.description || "").toLowerCase().includes(q);
        const matchesTrigger = wf.triggerName.toLowerCase().includes(q);
        const matchesNodes = wf.nodes.some((n) =>
          ((n.data?.label as string) || "").toLowerCase().includes(q) ||
          ((n.data?.variableValue as string) || "").toLowerCase().includes(q)
        );
        if (!matchesName && !matchesDesc && !matchesTrigger && !matchesNodes) {
          return false;
        }
      }

      // Trigger filter
      if (filterTrigger !== "all") {
        if (filterTrigger === "webhook" && !wf.triggerId.includes("webhook")) return false;
        if (filterTrigger === "schedule" && !wf.triggerId.includes("schedule")) return false;
        if (filterTrigger === "event" && !wf.triggerId.includes("event")) return false;
      }

      // Status filter
      if (filterStatus !== "all" && wf.status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [workflows, searchQuery, filterTrigger, filterStatus]);

  // Aggregate statistics
  const stats = useMemo(() => {
    const total = workflows.length;
    const active = workflows.filter((w) => w.status === "active").length;
    const totalVariables = workflows.reduce((sum, w) => sum + (w.variableCount || 0), 0);
    const confirmedVariables = workflows.reduce((sum, w) => sum + (w.confirmedVariableCount || 0), 0);
    const totalSteps = workflows.reduce((sum, w) => sum + (w.nodes?.length || 0), 0);
    const avgSteps = total > 0 ? (totalSteps / total).toFixed(1) : "0";

    return {
      total,
      active,
      totalVariables,
      confirmedVariables,
      avgSteps,
    };
  }, [workflows]);

  // Handle Quick Test Run
  const handleQuickRun = (wf: DataRoomWorkflow) => {
    setSimulatingWorkflow(wf);
    setIsSimulating(true);

    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          setIsSimulating(false);
          resolve(true);
        }, 2400);
      }),
      {
        loading: `Simulating workflow "${wf.name}"...`,
        success: `Workflow "${wf.name}" simulation completed successfully!`,
        error: "Simulation failed",
      }
    );
  };

  const confirmDelete = () => {
    if (workflowToDelete) {
      deleteWorkflow(workflowToDelete.id);
      toast.info(`Workflow "${workflowToDelete.name}" deleted.`);
      setWorkflowToDelete(null);
    }
  };

  const handleDuplicate = (wf: DataRoomWorkflow) => {
    duplicateWorkflow(wf.id);
    toast.success(`Duplicated "${wf.name}"!`);
  };

  // Handler for accepting AI-generated workflow draft from landing page
  const handleAcceptDraft = (draft: DraftWorkflowResult) => {
    const newId = `wf-${Date.now()}`;
    const variableNodes = draft.nodes.filter(
      (n) => !n.data?.isTrigger && (n.data?.hasVariable || hasVariableX((n.data?.originalLabel || n.data?.label) as string))
    );
    const confirmedNodes = variableNodes.filter((n) => n.data?.variableConfirmed);

    const newWf: DataRoomWorkflow = {
      id: newId,
      name: draft.name,
      description: draft.description,
      status: "draft",
      triggerId: draft.triggerId,
      triggerName: draft.triggerName,
      triggerColor: draft.triggerId.includes("webhook")
        ? "green"
        : draft.triggerId.includes("schedule")
        ? "blue"
        : "purple",
      triggerIcon: draft.triggerId.includes("webhook")
        ? "Zap"
        : draft.triggerId.includes("schedule")
        ? "Clock"
        : "Sparkles",
      nodes: draft.nodes,
      edges: draft.edges,
      variableCount: variableNodes.length,
      confirmedVariableCount: confirmedNodes.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveWorkflow(newWf);
    setIsAIDraftOpen(false);
    toast.success(`Workflow "${draft.name}" saved! Opening builder canvas...`);
    router.push(`/data-room/workflows/builder?id=${newId}`);
  };

  // If in builder mode, render the full canvas builder component. This return sits after
  // every hook: returning earlier changed the hook count when leaving the builder.
  if (isInlineBuilder) {
    return (
      <WorkflowCanvasBuilder
        workflowId={editIdQuery}
        initialOpenAIDraft={draftQuery}
        onBackToLanding={() => router.push("/data-room/workflows")}
        onSaved={() => router.push("/data-room/workflows")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
        <div className="container mx-auto p-6 space-y-8 max-w-7xl">
          {/* ─── Hero Header Section (Matching /workflows style) ─── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-white/10">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-indigo-300">
                    <Zap className="h-6 w-6" />
                  </div>
                  <Badge
                    variant="outline"
                    className="border-indigo-400/60 text-indigo-200 font-semibold tracking-wide bg-indigo-950/40 text-xs px-3 py-1"
                  >
                    Enterprise Data Room · Neural Automations
                  </Badge>
                </div>

                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
                  Data Room Workflow Engine
                </h1>

                <p className="text-indigo-100/80 text-base md:text-lg leading-relaxed max-w-2xl font-medium">
                  Design, automate, and orchestrate multi-step DAG pipelines for document abstraction,
                  compliance checks, database updates, and stakeholder messaging with variable-bound action nodes.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Button
                  onClick={() => router.push("/data-room/workflows/builder?draft=true")}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white shadow-xl shadow-purple-600/25 border-0 rounded-2xl px-6 py-6 text-base font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                >
                  <Sparkles className="h-5 w-5" />
                  Draft with Natural Language
                </Button>
                <Button
                  onClick={() => router.push("/data-room/workflows/builder")}
                  size="lg"
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl px-6 py-6 text-base font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="h-5 w-5 mr-1.5" />
                  Design Manually
                </Button>
              </div>
            </div>
          </div>

          {/* ─── Metric KPI Summary Cards ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-slate-200/90 bg-white/80 backdrop-blur-sm shadow-xs hover:border-indigo-200 transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Workflows
                  </p>
                  <p className="text-2xl font-extrabold text-slate-800 mt-1">
                    {stats.total}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Automations created</p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Workflow className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/90 bg-white/80 backdrop-blur-sm shadow-xs hover:border-emerald-200 transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Active Pipelines
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-2xl font-extrabold text-slate-800">{stats.active}</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Ready for trigger</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Activity className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/90 bg-white/80 backdrop-blur-sm shadow-xs hover:border-indigo-200 transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Variable Bindings (x)
                  </p>
                  <p className="text-2xl font-extrabold text-slate-800 mt-1">
                    {stats.confirmedVariables}
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      / {stats.totalVariables} bound
                    </span>
                  </p>
                  <p className="text-[11px] text-indigo-600 font-medium mt-0.5">Action parameters</p>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/90 bg-white/80 backdrop-blur-sm shadow-xs hover:border-slate-300 transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Avg Steps per DAG
                  </p>
                  <p className="text-2xl font-extrabold text-slate-800 mt-1">
                    {stats.avgSteps}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Nodes per pipeline</p>
                </div>
                <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                  <Layers className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Search, Filters & Toolbar ─── */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workflows by name, trigger, variable, or action..."
                className="pl-9 h-10 rounded-xl border-slate-200 text-sm focus-visible:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Trigger Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setFilterTrigger("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-semibold transition-all",
                    filterTrigger === "all"
                      ? "bg-white text-slate-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  All Triggers
                </button>
                <button
                  onClick={() => setFilterTrigger("webhook")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1",
                    filterTrigger === "webhook"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Zap className="h-3 w-3" /> Webhooks
                </button>
                <button
                  onClick={() => setFilterTrigger("schedule")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1",
                    filterTrigger === "schedule"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Clock className="h-3 w-3" /> Scheduled
                </button>
                <button
                  onClick={() => setFilterTrigger("event")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1",
                    filterTrigger === "event"
                      ? "bg-white text-purple-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Sparkles className="h-3 w-3" /> Events
                </button>
              </div>

              {/* Status Selector */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none hover:border-slate-300"
              >
                <option value="all">Status: All</option>
                <option value="active">Active Only</option>
                <option value="draft">Draft Only</option>
              </select>
            </div>
          </div>

          {/* ─── Workflows Section & Grid ─── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Route className="h-5 w-5 text-indigo-600" />
                Configured Workflows
                <span className="text-xs font-normal text-slate-400">
                  ({filteredWorkflows.length} {filteredWorkflows.length === 1 ? "workflow" : "workflows"})
                </span>
              </h2>
            </div>

            {/* Loading Skeleton */}
            {!isLoaded ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-slate-200 bg-white/60 animate-pulse rounded-3xl">
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <Skeleton className="h-12 w-12 rounded-2xl" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-6 w-3/4 rounded-lg" />
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-2/3 rounded" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredWorkflows.length === 0 ? (
              /* Empty State */
              <div className="py-16 px-6 text-center bg-white/70 border-2 border-dashed border-slate-200 rounded-3xl space-y-4">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Workflow className="h-8 w-8" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-slate-900">
                    {searchQuery ? "No matching workflows found" : "No workflows created yet"}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {searchQuery
                      ? "Try tweaking your search term or trigger filter to find your automated pipeline."
                      : "Start automating your data room by designing your first multi-step workflow with variable binding."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={() => router.push("/data-room/workflows/builder?draft=true")}
                    className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold h-11 px-5 shadow-md shadow-indigo-100 flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" /> Draft with Natural Language
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/data-room/workflows/builder")}
                    className="rounded-xl border-slate-200 text-slate-700 font-semibold h-11 px-5"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Design Manually
                  </Button>
                </div>
              </div>
            ) : (
              /* Workflow Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWorkflows.map((wf) => {
                  const nodeCount = wf.nodes?.length || 0;
                  const edgeCount = wf.edges?.length || 0;
                  const hasUnconfirmed =
                    (wf.variableCount || 0) > (wf.confirmedVariableCount || 0);

                  return (
                    <Card
                      key={wf.id}
                      className="group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 border border-slate-200/80 bg-white/95 rounded-3xl overflow-hidden flex flex-col justify-between hover:border-indigo-300/80"
                    >
                      <CardContent className="p-0 flex flex-col h-full">
                        {/* Top Card Body */}
                        <div
                          className="p-6 bg-gradient-to-b from-slate-50/60 to-white flex-1 cursor-pointer"
                          onClick={() => router.push(`/data-room/workflows/builder?id=${wf.id}`)}
                        >
                          {/* Header row */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
                                <Workflow className="h-6 w-6" />
                              </div>
                              <div>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold bg-white border-slate-200 text-slate-700 capitalize flex items-center gap-1"
                                >
                                  <Zap className="h-2.5 w-2.5 text-emerald-500" />
                                  {wf.triggerName || "Trigger Node"}
                                </Badge>
                                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                  ID: {wf.id.substring(0, 12)}
                                </span>
                              </div>
                            </div>

                            {/* Dropdown Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30"
                              >
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/data-room/workflows/builder?id=${wf.id}`);
                                  }}
                                  className="cursor-pointer text-xs font-semibold text-slate-700"
                                >
                                  <Sliders className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                                  Open in Builder
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickRun(wf);
                                  }}
                                  className="cursor-pointer text-xs font-semibold text-slate-700"
                                >
                                  <Play className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                                  Test Run DAG
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicate(wf);
                                  }}
                                  className="cursor-pointer text-xs text-slate-700"
                                >
                                  <Copy className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setWorkflowToDelete(wf);
                                  }}
                                  className="cursor-pointer text-xs text-red-600 hover:bg-red-50 font-semibold"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Delete Workflow
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Title & Description */}
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1.5 leading-snug line-clamp-1">
                            {wf.name}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
                            {wf.description || "No description provided for this automation."}
                          </p>

                          {/* Step Nodes Trail Preview */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Step Flow Pipeline ({nodeCount} nodes):
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                              {wf.nodes && wf.nodes.slice(0, 3).map((n, idx) => (
                                <React.Fragment key={n.id || idx}>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium truncate max-w-[140px]">
                                    {(n.data?.label as string) || "Node"}
                                  </span>
                                  {idx < Math.min(wf.nodes.length, 3) - 1 && (
                                    <span className="text-slate-300 text-xs">→</span>
                                  )}
                                </React.Fragment>
                              ))}
                              {wf.nodes && wf.nodes.length > 3 && (
                                <span className="text-[10px] font-bold text-slate-400">
                                  +{wf.nodes.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Variable Binding Badge */}
                          <div className="mt-3.5 flex items-center gap-2">
                            {wf.variableCount && wf.variableCount > 0 ? (
                              hasUnconfirmed ? (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold gap-1"
                                >
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                                  {wf.confirmedVariableCount}/{wf.variableCount} Variables Confirmed
                                </Badge>
                              ) : (
                                <Badge
                                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold gap-1"
                                >
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  All {wf.variableCount} Variables Bound
                                </Badge>
                              )
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]"
                              >
                                Static Workflow
                              </Badge>
                            )}

                            <span className="text-[10px] text-slate-400 ml-auto">
                              {edgeCount} {edgeCount === 1 ? "link" : "links"}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Card Footer */}
                        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="h-3 w-3" />
                            {wf.updatedAt
                              ? `Updated ${formatDistanceToNow(new Date(wf.updatedAt), { addSuffix: true })}`
                              : "Recently"}
                          </div>

                          <button
                            onClick={() => router.push(`/data-room/workflows/builder?id=${wf.id}`)}
                            className="flex items-center text-xs font-bold text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-1 transition-all"
                          >
                            Open Canvas <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Delete Confirmation Dialog ─── */}
        <Dialog
          open={Boolean(workflowToDelete)}
          onOpenChange={(open) => {
            if (!open) setWorkflowToDelete(null);
          }}
        >
          <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl border-none shadow-2xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
                  <Trash2 className="h-5 w-5" />
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Delete Workflow
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete{" "}
                <span className="font-bold text-slate-800">
                  "{workflowToDelete?.name}"
                </span>
                ? This action cannot be undone and will permanently remove this DAG automation.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setWorkflowToDelete(null)}
                className="rounded-xl border-slate-200 text-slate-600 font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md shadow-red-200"
              >
                Delete Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* ─── Natural Language Workflow Drafting Modal ─── */}
        <NaturalLanguageDraftModal
          isOpen={isAIDraftOpen}
          onClose={() => setIsAIDraftOpen(false)}
          onAcceptDraft={handleAcceptDraft}
        />
      </div>
  );
}

export default function DataRoomWorkflowsLandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
          <div className="space-y-4 text-center">
            <Skeleton className="h-10 w-64 mx-auto rounded-2xl" />
            <Skeleton className="h-4 w-96 mx-auto rounded-lg" />
          </div>
        </div>
      }
    >
      <WorkflowsLandingContent />
    </Suspense>
  );
}
