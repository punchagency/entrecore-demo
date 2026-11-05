"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Sparkles,
  TableIcon,
  ShieldAlert,
  Layers,
  Activity,
  Save,
  CheckCircle2,
  XCircle,
  MessageSquare,
  RefreshCcw,
  Network,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Database,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { useIntegrationPreview, useSaveMappings } from "../../hooks/use-integration";
import { useWorkflow } from "../../hooks/use-workflows";
import { useIntegrationStore } from "@/app/store/integrationStore";
import { MappingEditor } from "../../components/mapping-editor";
import { DataPreviewPanel } from "../../components/data-preview-panel";
import { ExceptionConfigPanel } from "../../components/exception-config-panel";
import { MappingVersionHistory } from "../../components/mapping-version-history";
import { PostExecutionPanel } from "../../components/post-execution-panel";
import type { MappingDecision, ConnectorConfig } from "../../services/integration-api";
import { fetchCompanyConnectors } from "../../services/integration-api";
import { useCompaniesStore } from "@/app/store/companiesStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function IntegrationPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const workflowId = resolvedParams.id;

  const [activeTab, setActiveTab] = useState("mapping");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const { data: workflow, isLoading: isWfLoading } = useWorkflow(workflowId);
  const { data: preview, isLoading: isPreviewLoading } = useIntegrationPreview(workflowId);
  const saveMutation = useSaveMappings();

  const {
    mappings,
    isDirty,
    setInitialData,
    getValidationSummary,
    markClean,
    availableConnectors,
    selectedConnectorId,
    setAvailableConnectors,
    setSelectedConnector,
  } = useIntegrationStore();

  const { companies } = useCompaniesStore();
  const companyId = localStorage.getItem("selectedCompanyId") || companies[0]?.id;

  // Load connectors
  useEffect(() => {
    if (companyId) {
      fetchCompanyConnectors(companyId).then((connectors) => {
        setAvailableConnectors(connectors);
        if (connectors.length > 0 && !selectedConnectorId) {
          setSelectedConnector(connectors[0].id);
        }
      });
    }
  }, [companyId, setAvailableConnectors, setSelectedConnector, selectedConnectorId]);

  // Initialize store from API data
  useEffect(() => {
    if (preview) {
      setInitialData({
        mappings: preview.mappings,
        sourceColumns: preview.source_columns,
        targetColumns: preview.target_columns,
        sourceTable: preview.source_table,
        targetTable: preview.target_table,
        sourcePreviewData: preview.source_sample_data,
      });
    }
  }, [preview, setInitialData]);

  const validation = getValidationSummary();

  const handleSave = (decision: MappingDecision, feedback?: string) => {
    saveMutation.mutate(
      {
        workflowId,
        data: {
          mappings,
          decision,
          feedback_notes: feedback,
        },
      },
      {
        onSuccess: (result) => {
          markClean();
          if (decision === "approve") {
            toast.success("Mapping approved & promoted to execution", {
              description: `Version ${result.version_id.substring(0, 8)} locked`,
            });
          } else if (decision === "reject") {
            toast.info("Mapping rejected — feedback sent to agent", {
              description: feedback,
            });
            setShowRejectInput(false);
            setRejectReason("");
          } else {
            toast.success("Mapping draft saved", {
              description: `Version ${result.version_id.substring(0, 8)}`,
            });
          }
        },
        onError: () => {
          toast.error("Failed to save mapping");
        },
      }
    );
  };

  const isLoading = isWfLoading || isPreviewLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-20 w-full rounded-3xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="container mx-auto p-6 space-y-6">
        {/* ─── Header ─────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 shadow-sm ring-1 ring-slate-200/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full shrink-0 hover:bg-slate-100"
                onClick={() => router.push(`/workflows/${workflowId}`)}
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-200">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Data Integration Preview
                  </h1>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 ml-12">
                  {workflow && (
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-slate-600"
                    >
                      <Network className="h-3 w-3 mr-1" />{" "}
                      {workflow.name}
                    </Badge>
                  )}
                  {preview && (
                    <>
                      {/* Staging Connector Selector */}
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Staging Source
                        </span>
                        <Select
                          value={selectedConnectorId || ""}
                          onValueChange={setSelectedConnector}
                        >
                          <SelectTrigger className="h-8 px-3 border-slate-200 bg-white/50 text-xs font-bold rounded-xl min-w-[160px] hover:border-indigo-300 transition-all shadow-sm">
                            <SelectValue placeholder="Select Connector" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                            {availableConnectors.map((conn: ConnectorConfig) => (
                              <SelectItem 
                                key={conn.id} 
                                value={conn.id} 
                                className="text-xs font-medium py-2.5 rounded-xl"
                              >
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full shadow-sm",
                                    conn.erp_type === 'netsuite' ? 'bg-orange-500' : 
                                    conn.erp_type === 'bigquery' ? 'bg-blue-500' : 
                                    conn.erp_type === 'airtable' ? 'bg-emerald-500' : 'bg-slate-400'
                                  )} />
                                  {conn.connector_name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator orientation="vertical" className="h-8 mx-2 hidden md:block" />

                      <Badge
                        variant="outline"
                        className="border-blue-200 text-blue-700 bg-blue-50 font-mono text-[10px]"
                      >
                        <Database className="h-3 w-3 mr-1" />
                        {preview.source_table}
                      </Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                      <Badge
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 bg-emerald-50 font-mono text-[10px]"
                      >
                        <Database className="h-3 w-3 mr-1" />
                        {preview.target_table}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status + Action Buttons */}
            <div className="flex items-center gap-3 ml-12 md:ml-0">
              {/* Validation status pill */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${
                  validation.errors > 0
                    ? "bg-red-50 border-red-200 text-red-700"
                    : validation.warnings > 0
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
              >
                {validation.errors > 0 ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : validation.warnings > 0 ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {validation.errors > 0
                  ? `${validation.errors} errors`
                  : validation.warnings > 0
                    ? `${validation.warnings} warnings`
                    : "All valid"}
              </div>

              {isDirty && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 animate-pulse text-[10px]">
                  Unsaved changes
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* ─── Tabs ───────────────────────────────────────── */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm h-14 w-full justify-start overflow-x-auto">
            <TabsTrigger
              value="mapping"
              className="rounded-xl px-5 h-12 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 transition-all font-semibold text-sm"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Mapping
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="rounded-xl px-5 h-12 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 transition-all font-semibold text-sm"
            >
              <TableIcon className="h-4 w-4 mr-2" /> Preview
            </TabsTrigger>
            <TabsTrigger
              value="exceptions"
              className="rounded-xl px-5 h-12 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 transition-all font-semibold text-sm"
            >
              <ShieldAlert className="h-4 w-4 mr-2" /> Exceptions
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-xl px-5 h-12 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 transition-all font-semibold text-sm"
            >
              <Layers className="h-4 w-4 mr-2" /> History
            </TabsTrigger>
            <TabsTrigger
              value="validation"
              className="rounded-xl px-5 h-12 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 transition-all font-semibold text-sm"
            >
              <Activity className="h-4 w-4 mr-2" /> Validation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mapping" className="outline-none mt-0">
            <MappingEditor />
          </TabsContent>

          <TabsContent value="preview" className="outline-none mt-0">
            <DataPreviewPanel workflowId={workflowId} />
          </TabsContent>

          <TabsContent value="exceptions" className="outline-none mt-0">
            <ExceptionConfigPanel />
          </TabsContent>

          <TabsContent value="history" className="outline-none mt-0">
            <MappingVersionHistory workflowId={workflowId} />
          </TabsContent>

          <TabsContent value="validation" className="outline-none mt-0">
            <PostExecutionPanel workflowId={workflowId} />
          </TabsContent>
        </Tabs>

        {/* ─── Footer Action Bar ──────────────────────────── */}
        <div className="sticky bottom-0 z-30">
          <Card className="border-0 shadow-xl ring-1 ring-slate-200/50 rounded-2xl bg-white/95 backdrop-blur-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {/* Left: mapping summary */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Bot className="h-4 w-4 text-violet-500" />
                    <span className="text-slate-500">
                      <span className="font-bold text-slate-900">
                        {mappings.filter((m) => m.ai_generated && !m.human_modified).length}
                      </span>{" "}
                      AI
                    </span>
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">
                      <span className="font-bold text-slate-900">
                        {mappings.filter((m) => m.human_modified).length}
                      </span>{" "}
                      Modified
                    </span>
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">
                      <span className="font-bold text-slate-900">
                        {mappings.length}
                      </span>{" "}
                      Total
                    </span>
                  </div>
                </div>

                {/* Right: action buttons */}
                <div className="flex items-center gap-3">
                  {/* Reject */}
                  {showRejectInput ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rejection reason..."
                        className="h-10 px-3 text-sm border border-red-200 rounded-xl bg-red-50/30 focus:outline-none focus:ring-2 focus:ring-red-300 w-64"
                        autoFocus
                      />
                      <Button
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl h-10"
                        onClick={() =>
                          handleSave("reject", rejectReason)
                        }
                        disabled={saveMutation.isPending || !rejectReason}
                      >
                        <XCircle className="h-4 w-4 mr-2" /> Confirm
                        Rejection
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl"
                        onClick={() => {
                          setShowRejectInput(false);
                          setRejectReason("");
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl h-10"
                        onClick={() => setShowRejectInput(true)}
                      >
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                      </Button>

                      {/* Save Draft */}
                      <Button
                        variant="outline"
                        className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-10"
                        onClick={() => handleSave("modify")}
                        disabled={saveMutation.isPending || !isDirty}
                      >
                        {saveMutation.isPending ? (
                          <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Draft
                      </Button>

                      {/* Approve */}
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200 h-10 px-6"
                        onClick={() => handleSave("approve")}
                        disabled={
                          saveMutation.isPending || validation.errors > 0
                        }
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Approve &
                        Execute
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
