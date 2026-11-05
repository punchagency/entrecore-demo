"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BrainCircuit,
  Settings,
  Activity,
  BarChart3,
  Network,
  PlaySquare,
  Trophy,
  History,
  Bot,
  Loader2,
  Download,
  RotateCcw,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { ScenarioWorkspace } from "./components/scenario-workspace";
import { OrchestratorVisualizer } from "./components/orchestrator-visualizer";
import { PerformanceDashboard } from "./components/performance-dashboard";
import { IntelligenceHub } from "./components/intelligence-hub";
import { ConfigureEngineDialog } from "./components/configure-engine-dialog";
import { TrainingProgressDialog } from "./components/training-progress-dialog";
import { TraceReview } from "./components/trace-review";
import {
  useTraceStats,
  useTriggerTraining,
  useExportTraces,
  useResetTraces,
} from "./hooks/use-training";
import { PageWrapper } from "@/components/page-wrapper";

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState("scenario");
  const [isTrainingProgressOpen, setIsTrainingProgressOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  // Real data hooks
  const { data: stats, isLoading: statsLoading } = useTraceStats();
  const triggerMutation = useTriggerTraining();
  const exportMutation = useExportTraces();
  const resetMutation = useResetTraces();

  const handleStartSession = () => {
    triggerMutation.mutate(50, {
      onSuccess: (data) => {
        if (data.error) {
          toast.error(data.error);
        } else {
          setIsTrainingProgressOpen(true);
        }
      },
      onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
        const detail = error?.response?.data?.detail;
        if (detail && typeof detail === "string" && detail.toLowerCase().includes("wandb")) {
          toast.error("WANDB_API_KEY is not configured on the server. Please contact your admin.");
        } else {
          toast.error(detail || "Failed to start training session. Check server logs.");
        }
      },
    });
  };

  const handleTrainingComplete = () => {
    setActiveTab("scenario");
    toast.success("New active training session started.");
  };

  const handleExport = () => {
    exportMutation.mutate(
      { limit: 2000, unusedOnly: true },
      {
        onSuccess: () => toast.success("Traces exported as JSON."),
        onError: () => toast.error("Failed to export traces."),
      }
    );
  };

  const handleReset = () => {
    resetMutation.mutate(undefined, {
      onSuccess: () => toast.success("Training flags reset. Traces can be re-used."),
      onError: () => toast.error("Failed to reset training flags."),
    });
  };

  return (
    <PageWrapper title="Training">
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="container mx-auto p-6 space-y-8">
        
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 p-8 text-white shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          
          <div className="relative z-10 grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                  <BrainCircuit className="h-6 w-6 text-blue-300" />
                </div>
                <Badge variant="outline" className="border-blue-400 text-blue-300 font-medium tracking-wide bg-blue-950/30">
                  Reinforcement Learning Engine
                </Badge>
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                Orchestrator & Guide Training
              </h1>
              <p className="text-blue-100/80 text-lg leading-relaxed max-w-xl font-medium">
                Train AI systems by rewarding or correcting decisions in real business scenarios. Optimize outcomes instantly without writing a single line of code.
              </p>
              
              <div className="flex flex-wrap gap-3 pt-4">
                <Button 
                  onClick={handleStartSession}
                  className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 border-0 rounded-xl px-6 w-48"
                  disabled={triggerMutation.isPending}
                >
                  {triggerMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PlaySquare className="h-4 w-4 mr-2" /> 
                  )}
                  {triggerMutation.isPending ? "Starting..." : "Start Training Session"}
                </Button>
                <Button 
                  onClick={() => setConfigOpen(true)}
                  variant="outline" 
                  className="bg-transparent border-white/20 hover:bg-white/10 text-white hover:text-white rounded-xl backdrop-blur-sm px-6"
                >
                  <Settings className="h-4 w-4 mr-2" /> Configure Engine
                </Button>
                <Button
                  onClick={handleExport}
                  variant="outline"
                  className="bg-transparent border-white/20 hover:bg-white/10 text-white hover:text-white rounded-xl backdrop-blur-sm px-4"
                  disabled={exportMutation.isPending}
                >
                  {exportMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="bg-transparent border-white/20 hover:bg-white/10 text-white hover:text-white rounded-xl backdrop-blur-sm px-4"
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Reset
                </Button>
              </div>
            </div>
            
            {/* Live Stats Cards */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white overflow-hidden group">
                <CardContent className="p-6">
                  <Activity className="h-8 w-8 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
                  {statsLoading ? (
                    <Skeleton className="h-8 w-20 bg-white/20 rounded mb-1" />
                  ) : (
                    <p className="text-3xl font-bold">{stats?.total_traces?.toLocaleString() ?? "—"}</p>
                  )}
                  <p className="text-sm text-blue-200 font-medium">Total Traces Captured</p>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white overflow-hidden group">
                <CardContent className="p-6">
                  <Trophy className="h-8 w-8 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 bg-white/20 rounded mb-1" />
                  ) : (
                    <p className="text-3xl font-bold">
                      {stats && stats.total_traces > 0
                        ? `${Math.round((stats.labelled_traces / stats.total_traces) * 100)}%`
                        : "—"}
                    </p>
                  )}
                  <p className="text-sm text-blue-200 font-medium">Labelling Progress</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Configuration Dialog */}
        <ConfigureEngineDialog open={configOpen} onOpenChange={setConfigOpen} />

        {/* Training Progress Dialog */}
        <TrainingProgressDialog 
          open={isTrainingProgressOpen} 
          onOpenChange={setIsTrainingProgressOpen} 
          onComplete={handleTrainingComplete} 
        />

        {/* Main Interface Tabs */}
        <Card className="border-0 shadow-xl bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-slate-200/50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="p-4 sm:px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/30 flex justify-center sm:justify-start lg:justify-center">
              <TabsList className="bg-white/70 backdrop-blur-md p-1.5 rounded-full shadow-lg shadow-slate-200/50 h-auto flex flex-wrap gap-1 w-full sm:w-auto border border-slate-200/60 ring-1 ring-white/40">
                <TabsTrigger 
                  value="scenario" 
                  className="rounded-full px-5 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700 font-semibold transition-all cursor-pointer"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Scenario Workspace
                </TabsTrigger>
                <TabsTrigger 
                  value="traces" 
                  className="rounded-full px-5 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-700 font-semibold transition-all cursor-pointer"
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Trace Review
                  {stats && stats.unused_traces > 0 && (
                    <Badge className="ml-2 bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 px-1.5 py-0 text-[10px] font-bold">
                      {stats.unused_traces}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="orchestrator" 
                  className="rounded-full px-5 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 font-semibold transition-all cursor-pointer"
                >
                  <Network className="h-4 w-4 mr-2" />
                  Orchestrator Visualizer
                </TabsTrigger>
                <TabsTrigger 
                  value="performance" 
                  className="rounded-full px-5 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 font-semibold transition-all cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Performance & Impact
                </TabsTrigger>
                <TabsTrigger 
                  value="intelligence" 
                  className="rounded-full px-5 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-700 font-semibold transition-all cursor-pointer"
                >
                  <BrainCircuit className="h-4 w-4 mr-2" />
                  Intelligence Hub
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 min-h-[600px]">
              <TabsContent value="scenario" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ScenarioWorkspace />
              </TabsContent>

              <TabsContent value="traces" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <TraceReview />
              </TabsContent>

              <TabsContent value="orchestrator" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <OrchestratorVisualizer />
              </TabsContent>

              <TabsContent value="performance" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PerformanceDashboard />
              </TabsContent>

              <TabsContent value="intelligence" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <IntelligenceHub />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
    </PageWrapper>
  );
}
