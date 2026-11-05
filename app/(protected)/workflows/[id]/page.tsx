"use client";

import { 
  useWorkflow, 
  useWorkflowRuns, 
  useTriggerRun, 
  useDeleteWorkflow,
  useWorkflowMetrics,
  useWorkflowVersions,
  useWorkflowAuditLog,
  useRestoreVersion,
  useRerunWorkflow,
  useExportAuditLog
} from "../hooks/use-workflows";
import { 
  AuditAction, 
  AuditLogSearchParams 
} from "../services/workflow-api";
import { NodeLogsDrawer } from "../components/node-logs-drawer";
import { VersionDiffDialog } from "../components/version-diff-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Network, 
  Trash2, 
  GitBranch, 
  Terminal, 
  ExternalLink, 
  RefreshCcw, 
  Activity, 
  Clock, 
  History, 
  Layers, 
  ShieldCheck, 
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  FileText,
  RotateCcw,
  GitCompare,
  User,
  CheckCircle2,
  XCircle,
  FileSearch,
  ChevronRight,
  ArrowRight,
  Plus,
  Download,
  Filter,
  ChevronLeft,
  Sparkles,
  Database,
  Bot
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { use, useState } from "react";
import { useRouter } from "next/navigation";

export default function WorkflowDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedNodeRunId, setSelectedNodeRunId] = useState<string | null>(null);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  
  const [diffA, setDiffA] = useState<string | null>(null);
  const [diffB, setDiffB] = useState<string | null>(null);
  const [isDiffOpen, setIsDiffOpen] = useState(false);

  // Audit Log State
  const [auditAction, setAuditAction] = useState<AuditAction | undefined>(undefined);
  const [auditPage, setAuditPage] = useState(0);
  const AUDIT_LIMIT = 10;

  const { data: workflow, isLoading } = useWorkflow(id);
  const { data: runs, isLoading: isRunsLoading } = useWorkflowRuns(id);
  const { data: metrics, isLoading: isMetricsLoading } = useWorkflowMetrics(id);
  const { data: versions, isLoading: isVersionsLoading } = useWorkflowVersions(id);
  const { data: auditLog, isLoading: isAuditLoading } = useWorkflowAuditLog(id, {
    action: auditAction,
    limit: AUDIT_LIMIT,
    offset: auditPage * AUDIT_LIMIT
  });
  
  const triggerRun = useTriggerRun();
  const deleteWf = useDeleteWorkflow();
  const restoreVer = useRestoreVersion();
  const rerunWf = useRerunWorkflow();
  const exportAudit = useExportAuditLog();

  const handleCompare = (vId: string) => {
    // If no A is selected, this is A. If A exists, this is B and we open.
    if (!diffA) {
      setDiffA(vId);
      toast.info("Select another version to compare with.");
    } else if (diffA === vId) {
       toast.warning("Select a different version to compare.");
    } else {
      setDiffB(vId);
      setIsDiffOpen(true);
    }
  };

  const handleTrigger = () => {
    triggerRun.mutate(id, {
      onSuccess: (data) => {
        toast.success("Workflow triggered successfully", {
          description: `Run ID: ${data.id.substring(0, 8)}`
        });
        router.push(`/workflows/runs/${data.id}`);
      },
      onError: () => toast.error("Failed to trigger workflow")
    });
  };

  const handleRerun = (runId: string) => {
    rerunWf.mutate({ runId, data: {} }, {
      onSuccess: (data) => {
        toast.success("Rerun triggered successfully");
        router.push(`/workflows/runs/${data.id}`);
      },
      onError: () => toast.error("Failed to rerun workflow")
    });
  };

  const handleRestore = (versionId: string) => {
    restoreVer.mutate({ id: workflow?.id || id, versionId }, {
      onSuccess: () => {
        toast.success("Workflow version restored successfully");
        setActiveTab("overview");
      },
      onError: () => toast.error("Failed to restore version")
    });
  };

  const handleDelete = () => {
    deleteWf.mutate(id, {
      onSuccess: () => {
        toast.success("Workflow deleted");
        router.push("/workflows");
      },
      onError: () => toast.error("Failed to delete workflow")
    });
  };

  const handleExportAudit = () => {
    exportAudit.mutate({ id, params: { action: auditAction } }, {
      onSuccess: () => toast.success("Audit log export started"),
      onError: () => toast.error("Failed to export audit log")
    });
  };

  if (isLoading) {
    return <div className="container mx-auto p-6 space-y-6"><Skeleton className="h-64 w-full rounded-3xl" /></div>;
  }

  if (!workflow) {
    return <div className="container mx-auto p-6">Workflow not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="container mx-auto p-6 space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-3xl p-8 shadow-sm ring-1 ring-slate-200/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-xl">
                <Network className="h-6 w-6 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">{workflow.name}</h1>
            </div>
            <p className="text-slate-500 text-lg">{workflow.description}</p>
            <div className="flex gap-2 pt-2">
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">ID: {workflow.id}</Badge>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">{workflow.nodes.length} Nodes</Badge>
              <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50">
                Company: {workflow.company_id || 'Global'}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <Button 
               onClick={handleTrigger}
               disabled={triggerRun.isPending}
               className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 px-6 h-12"
            >
              {triggerRun.isPending ? <RefreshCcw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2 fill-current" />}
              Execute Run
            </Button>
            <Button
               onClick={handleDelete}
               variant="outline"
               className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl h-12"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm h-14">
            <TabsTrigger value="overview" className="rounded-xl px-6 h-12 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 transition-all font-semibold">
              <Network className="h-4 w-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="runs" className="rounded-xl px-6 h-12 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 transition-all font-semibold">
              <Terminal className="h-4 w-4 mr-2" /> Run History
            </TabsTrigger>
            <TabsTrigger value="versions" className="rounded-xl px-6 h-12 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 transition-all font-semibold">
              <Layers className="h-4 w-4 mr-2" /> Versions
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-xl px-6 h-12 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 transition-all font-semibold">
              <ShieldCheck className="h-4 w-4 mr-2" /> Audit Log
            </TabsTrigger>
            <TabsTrigger value="integration" className="rounded-xl px-6 h-12 data-[state=active]:bg-violet-50 data-[state=active]:text-violet-600 transition-all font-semibold">
              <Sparkles className="h-4 w-4 mr-2" /> Data Integration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 outline-none mt-0">
            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-3xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-0">
                      Success Rate
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-2xl font-bold text-slate-900">{metrics?.success_rate_pct?.toFixed(1) || "0.0"}%</h4>
                    <p className="text-xs text-slate-500 font-medium">Of {metrics?.total_runs || 0} total runs</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-3xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                      <Clock className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-0">
                      Avg. Duration
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-2xl font-bold text-slate-900">{metrics?.avg_duration_seconds?.toFixed(1) || "0.0"}s</h4>
                    <p className="text-xs text-slate-500 font-medium">Min: {metrics?.min_duration_seconds?.toFixed(1) || 0}s | Max: {metrics?.max_duration_seconds?.toFixed(1) || 0}s</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-3xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-0">
                      Failures
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-2xl font-bold text-slate-900">{(metrics?.by_status?.failed || 0) + (metrics?.by_status?.cancelled || 0)}</h4>
                    <p className="text-xs text-slate-500 font-medium">{metrics?.total_failed_nodes || 0} nodes failed in total</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-3xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <Layers className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-0">
                      Data Volume
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-2xl font-bold text-slate-900">{metrics?.total_rows_processed?.toLocaleString() || "0"}</h4>
                    <p className="text-xs text-slate-500 font-medium">Total rows processed</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Topology Map */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="flex items-center text-lg gap-2">
                  <GitBranch className="h-5 w-5 text-indigo-500" />
                  Pipeline Topology
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workflow.nodes.map((node, i) => (
                    <div key={node.node_key} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shadow-inner ring-4 ring-white">
                          {i + 1}
                        </div>
                        {i < workflow.nodes.length - 1 && (
                          <div className="w-0.5 h-full bg-slate-200 my-1 group-hover:bg-indigo-300 transition-colors" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm group-hover:border-indigo-200 group-hover:shadow-md transition-all cursor-default">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-slate-800">{node.label}</h4>
                            <Badge variant="outline" className="uppercase text-[10px] tracking-wider text-slate-500 bg-slate-50">
                              {node.node_type}
                            </Badge>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {node.node_key}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="runs" className="outline-none mt-0">
            <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <div className="flex justify-between items-center">
                   <CardTitle className="flex items-center text-lg gap-2">
                    <Terminal className="h-5 w-5 text-indigo-500" />
                    Execution History
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isRunsLoading ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                ) : runs?.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <Activity className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                    <p>No executions recorded yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {Array.isArray(runs) && runs.map(run => (
                      <div 
                        key={run.id} 
                        className="p-5 hover:bg-slate-50 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-6 cursor-pointer" onClick={() => router.push(`/workflows/runs/${run.id}`)}>
                          <div className={`p-2.5 rounded-xl ${
                            run.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                            run.status === 'running' ? 'bg-blue-50 text-blue-600 animate-pulse' : 
                            run.status === 'failed' ? 'bg-red-50 text-red-600' : 
                            'bg-slate-50 text-slate-600'
                          }`}>
                            {run.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> :
                             run.status === 'failed' ? <XCircle className="h-5 w-5" /> :
                             run.status === 'running' ? <RefreshCcw className="h-5 w-5 animate-spin" /> :
                             <Clock className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-mono text-sm font-bold text-slate-900">
                                Run #{run.id.split('-')[0].toUpperCase()}
                              </span>
                              <Badge 
                                variant="secondary" 
                                className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wide border-0
                                  ${run.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                                    run.status === 'running' ? 'bg-blue-100 text-blue-700' : 
                                    run.status === 'failed' ? 'bg-red-100 text-red-700' : 
                                    'bg-slate-100 text-slate-600'}`
                                }
                              >
                                {run.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5" />
                              {run.started_at ? format(new Date(run.started_at), "MMM d, HH:mm:ss") : "Not started"}
                              {run.completed_at && (
                                <>
                                  <Separator orientation="vertical" className="h-3 ml-1" />
                                  <span>Completed {formatDistanceToNow(new Date(run.completed_at))} ago</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                            onClick={() => handleRerun(run.id)}
                            disabled={rerunWf.isPending}
                          >
                            <RotateCcw className={`h-4 w-4 mr-2 ${rerunWf.isPending ? 'animate-spin' : ''}`} /> Rerun
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 group-hover:text-indigo-600 transition-colors"
                            onClick={() => router.push(`/workflows/runs/${run.id}`)}
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="versions" className="outline-none mt-0">
            <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="flex items-center text-lg gap-2">
                  <Layers className="h-5 w-5 text-indigo-500" />
                  Version Management
                </CardTitle>
                <CardDescription>View historical snapshots and roll back to previous stable versions.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isVersionsLoading ? (
                  <div className="p-6 space-y-4 font-mono text-sm">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                ) : !versions?.length ? (
                  <div className="p-12 text-center text-slate-500">
                    <History className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                    <p>Only the current version exists.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {versions.map((ver) => (
                      <div key={ver.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                        <div className="flex items-center gap-6">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                             ver.is_active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500'
                           }`}>
                             {ver.version}
                           </div>
                           <div>
                             <div className="flex items-center gap-3 mb-1">
                               <h4 className="font-bold text-slate-900">Version {ver.version}</h4>
                               {ver.is_active && (
                                 <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100">Active Now</Badge>
                               )}
                             </div>
                             <div className="text-xs text-slate-500 flex items-center gap-3">
                               <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {format(new Date(ver.created_at), "MMM d, yyyy HH:mm")}</span>
                               <span className="flex items-center gap-1.5"><Network className="h-3.5 w-3.5" /> {ver.nodes_count} Nodes</span>
                               <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">ID: {ver.id.substring(0, 8)}</span>
                             </div>
                           </div>
                        </div>

                        {!ver.is_active && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className={`rounded-lg ${diffA === ver.id ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-indigo-600 hover:bg-indigo-50'}`}
                              onClick={() => handleCompare(ver.id)}
                            >
                              <GitCompare className="h-4 w-4 mr-2" /> {diffA === ver.id ? 'Selecting...' : 'Compare'}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              onClick={() => handleRestore(ver.id)}
                              disabled={restoreVer.isPending}
                            >
                              <RotateCcw className={`h-4 w-4 mr-2 ${restoreVer.isPending ? 'animate-spin' : ''}`} /> Restore
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="outline-none mt-0">
             <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="flex items-center text-lg gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-500" />
                  Change Governance
                </CardTitle>
                <CardDescription>Chronological audit trail of all schema and configuration changes.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {isAuditLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                  </div>
                ) : !auditLog?.entries?.length ? (
                  <div className="p-12 text-center text-slate-500">
                    <FileSearch className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                    <p>No audit entries found.</p>
                  </div>
                ) : (
                  <>
                    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-200 before:via-slate-200 before:to-transparent">
                      {auditLog.entries.map((entry) => (
                        <div key={entry.id} className="relative flex items-start gap-4 group">
                          <div className={`mt-1.5 h-10 w-10 rounded-xl flex items-center justify-center border-4 border-white shadow-sm shrink-0 z-10 transition-transform group-hover:scale-110 ${
                            entry.action === 'created' ? 'bg-emerald-500 text-white' :
                            entry.action === 'updated' ? 'bg-amber-500 text-white' :
                            entry.action === 'restored' ? 'bg-indigo-600 text-white' :
                            entry.action === 'run_started' ? 'bg-blue-500 text-white' :
                            entry.action === 'run_completed' ? 'bg-emerald-600 text-white' :
                            entry.action === 'run_failed' ? 'bg-rose-600 text-white' :
                            entry.action === 'node_failed' ? 'bg-orange-500 text-white' :
                            'bg-slate-500 text-white'
                          }`}>
                            {entry.action === 'created' ? <Plus className="h-5 w-5" /> :
                             entry.action === 'updated' ? <Activity className="h-5 w-5" /> :
                             entry.action === 'restored' ? <RotateCcw className="h-5 w-5" /> :
                             entry.action === 'run_started' ? <Play className="h-5 w-5" /> :
                             entry.action === 'run_completed' ? <CheckCircle2 className="h-5 w-5" /> :
                             entry.action === 'run_failed' ? <XCircle className="h-5 w-5" /> :
                             entry.action === 'node_failed' ? <AlertCircle className="h-5 w-5" /> :
                             <FileText className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 group-hover:bg-white group-hover:shadow-md group-hover:border-indigo-100 transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-bold text-slate-900 capitalize">{entry.action.replace('_', ' ')} </span>
                                {entry.version_to && (
                                  <span className="text-slate-500 text-sm">version {entry.version_to}</span>
                                )}
                              </div>
                              <time className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {formatDistanceToNow(new Date(entry.created_at))} ago
                              </time>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <User className="h-3.5 w-3.5" /> 
                              <span className="font-medium">
                                {entry.changed_by ? `${entry.changed_by.substring(0, 8)}...` : 'System'}
                              </span>
                              {entry.version_from && (
                                <>
                                  <ArrowRight className="h-3 w-3 mx-1 text-slate-300" />
                                  <span className="bg-slate-200 px-1.5 py-0.5 rounded font-bold text-[10px]">v{entry.version_from}</span>
                                </>
                              )}
                            </div>
                            
                            {entry.changed_fields && Object.keys(entry.changed_fields).length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap gap-2">
                                {Object.entries(entry.changed_fields).map(([field, value]) => (
                                  <div key={field} className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm text-[10px]">
                                    <span className="text-slate-400 font-bold uppercase tracking-tighter">{field.replace('_', ' ')}</span>
                                    <span className="font-bold text-indigo-600 truncate max-w-[150px]">
                                      {typeof value === 'object' ? JSON.stringify(value).substring(0, 20) : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {auditLog && (
                      <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
                        <p className="text-sm text-slate-500 font-medium">
                          Showing <span className="text-slate-900 font-bold">{auditLog.entries.length}</span> of <span className="text-slate-900 font-bold">{auditLog.total}</span> events
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={auditPage === 0}
                            onClick={() => setAuditPage(p => Math.max(0, p - 1))}
                            className="rounded-xl border-slate-200"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={(auditPage + 1) * AUDIT_LIMIT >= auditLog.total}
                            onClick={() => setAuditPage(p => p + 1)}
                            className="rounded-xl border-slate-200"
                          >
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integration" className="outline-none mt-0">
            <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-3xl overflow-hidden bg-white">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center space-y-5">
                  <div className="p-4 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-200">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Data Integration Preview</h3>
                    <p className="text-sm text-slate-500 max-w-lg">
                      AI-generated column mappings with interactive editing, data preview,
                      transformation logic, exception handling, and approval workflows.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                      <Bot className="h-4 w-4 text-violet-500" />
                      <span>AI-powered mapping</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                      <Database className="h-4 w-4 text-blue-500" />
                      <span>Schema-aware preview</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span>Approval controls</span>
                    </div>
                  </div>
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 px-8 h-12 text-base"
                    onClick={() => router.push(`/workflows/${id}/integration`)}
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    Open Integration Editor
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals & Drawers */}
      <NodeLogsDrawer 
        nodeRunId={selectedNodeRunId}
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        nodeName="Workflow Engine" 
      />

      <VersionDiffDialog 
        workflowId={id}
        versionAId={diffA}
        versionBId={diffB}
        isOpen={isDiffOpen}
        onClose={() => {
          setIsDiffOpen(false);
          setDiffA(null);
          setDiffB(null);
        }}
      />
    </div>
  );
}
