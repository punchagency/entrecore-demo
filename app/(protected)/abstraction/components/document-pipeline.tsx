"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  extractWorkflowRunId,
  fetchAllOcrDocuments,
  listOcrConfigurations,
  OcrConfiguration,
  uploadOcrDocument,
} from "../services/ocr-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
  Trash2,
  ScanLine,
  FileSearch,
  Sparkles,
  ArrowRight,
  CloudUpload,
  X,
  // @ts-ignore
} from "lucide-react";
import {
  useAbstractionStore,
  AbstractionDocument,
  EntityDefinition,
} from "@/app/store/abstractionStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { WorkflowIntegrationDefaults } from "@/types/abstraction";
import {
  extractSourceTableFromDocuments,
  getWorkflowIntegrationStage,
  setWorkflowIntegrationStage,
  slugifyJobName,
} from "../services/workflow-integration-context";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage, showApiErrorToast } from "@/utils/api-error";
import { JobFailureReason } from "@/components/job-failure-reason";

const STATUS_CONFIG: Record<
  AbstractionDocument["status"],
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  uploading: {
    label: "Uploading",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    icon: <CloudUpload className="h-3.5 w-3.5 animate-bounce" />,
  },
  ocr_processing: {
    label: "OCR Processing",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    icon: <ScanLine className="h-3.5 w-3.5 animate-pulse" />,
  },
  extracting: {
    label: "Extracting",
    color: "text-violet-700",
    bgColor: "bg-violet-50 border-violet-200",
    icon: <FileSearch className="h-3.5 w-3.5 animate-pulse" />,
  },
  review: {
    label: "Needs Review",
    color: "text-rose-700",
    bgColor: "bg-rose-50 border-rose-200",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  completed: {
    label: "Completed",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  failed: {
    label: "Failed",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    icon: <X className="h-3.5 w-3.5" />,
  },
};

function getAccuracyColor(accuracy: number) {
  if (accuracy >= 95) return "text-emerald-600";
  if (accuracy >= 90) return "text-blue-600";
  if (accuracy >= 85) return "text-amber-600";
  return "text-red-600";
}

function getAccuracyBg(accuracy: number) {
  if (accuracy >= 95) return "bg-emerald-500";
  if (accuracy >= 90) return "bg-blue-500";
  if (accuracy >= 85) return "bg-amber-500";
  return "bg-red-500";
}

function formatSize(bytes: number) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(0) + " KB";
}

function getDocumentType(file: File): AbstractionDocument["type"] {
  if (file.type.includes("pdf")) return "pdf";
  return "image";
}

const VALID_ENTITY_DATA_TYPES: EntityDefinition["dataType"][] = [
  "text",
  "long_text",
  "single_select",
  "multi_select",
  "boolean",
  "date",
  "currency",
  "integer",
  "float",
];

function mapConfigToProtocol(config: OcrConfiguration) {
  return {
    id: config.id || config.name,
    name: config.name,
    description: config.description,
    entities: (config.entities_config || []).map((e, index) => ({
      id: `e-${config.id || config.name}-${index}`,
      name: e.name,
      description: e.description,
      type: "custom" as const,
      dataType: (VALID_ENTITY_DATA_TYPES as readonly string[]).includes(e.dataType)
        ? (e.dataType as EntityDefinition["dataType"])
        : "text",
      options: e.optionList ?? [],
      dataSource: e.dataSource ?? undefined,
      defaultValue: e.defaultValue ?? "",
      // Carried even though this view never shows it: these protocols go into
      // the same store the protocol editor deploys from, so dropping the flag
      // here would silently un-split every config saved after visiting this tab.
      isRecordKey: e.isRecordKey ?? false,
      required: false,
      color: `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`,
    })),
    clauses: Object.entries(config.clauses_config || {}).map(([name, description], index) => ({
      id: `c-${config.id || config.name}-${index}`,
      name,
      description,
      type: "custom" as const,
      keywords: [],
      color: `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    documentCount: 0,
  };
}

interface DocumentPipelineProps {
  workflowId?: string;
  workflowName?: string;
  integrationDefaults?: WorkflowIntegrationDefaults;
  onStagedForIntegrate?: () => void;
  /** Switch workflow detail view to OCR Review (e.g. from Document Queue Review button). */
  onNavigateToOcrReview?: () => void;
  /** Switch workflow detail view to Results (e.g. from Document Queue View button). */
  onNavigateToResults?: () => void;
}

export function DocumentPipeline({
  workflowId,
  workflowName,
  integrationDefaults,
  onStagedForIntegrate,
  onNavigateToOcrReview,
  onNavigateToResults,
}: DocumentPipelineProps = {}) {
  const {
    documents,
    addDocument,
    removeDocument,
    setSelectedDocument,
    protocols,
    activeProtocolId,
    setActiveProtocol,
    setProtocols,
  } = useAbstractionStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [stagingTableOverride, setStagingTableOverride] = useState("");
  const [isStagingForIntegrate, setIsStagingForIntegrate] = useState(false);
  const activeProtocol = protocols.find((protocol) => protocol.id === activeProtocolId) ?? null;
  const existingStage = workflowId ? getWorkflowIntegrationStage(workflowId) : null;

  const handleStageForIntegrate = async () => {
    if (!workflowId) {
      onStagedForIntegrate?.();
      return;
    }
    setIsStagingForIntegrate(true);
    try {
      const backendDocs = await fetchAllOcrDocuments();
      const fromDocuments = extractSourceTableFromDocuments(backendDocs);
      const sourceTable =
        stagingTableOverride.trim() || fromDocuments || integrationDefaults?.sourceTable || "";

      if (!sourceTable) {
        toast.error(
          "No staging table found. Complete OCR on a document, or enter a source table name."
        );
        return;
      }

      setWorkflowIntegrationStage(workflowId, {
        sourceTable,
        destinationTable: integrationDefaults?.destinationTable,
        sourceConnector: integrationDefaults?.sourceConnector,
        destinationConnector: integrationDefaults?.destinationConnector,
        jobName: workflowName ? slugifyJobName(workflowName) : undefined,
        stagedFrom: "pipeline",
      });
      toast.success(`Staged "${sourceTable}" — opening Integrate tab.`);
      onStagedForIntegrate?.();
    } catch (error) {
      showApiErrorToast(error, "Failed to stage data for Integrate.");
    } finally {
      setIsStagingForIntegrate(false);
    }
  };

  const loadDocuments = async (mappedProtocols: any[] = []) => {
    try {
      const backendDocs = await fetchAllOcrDocuments();
      if (!backendDocs?.length) return;
      console.log("[OCR] Fetched documents from backend:", backendDocs);
      const {
        documents: currentDocuments,
        addDocument: addStoreDocument,
        updateDocument: updateStoreDocument,
      } = useAbstractionStore.getState();

      // remove document that have id of doc-
      currentDocuments.forEach((current) => {
        if (current.id.startsWith("doc-")) {
          removeDocument(current.id);
        }
      });

      backendDocs?.forEach((doc) => {
        const existingDoc = currentDocuments.find((current) => current.id === doc.id);
        const protocol = mappedProtocols.find((p) => p.id === doc.protocolId);
        const mappedDoc: AbstractionDocument = {
          id: doc.id,
          name: doc.name,
          type: doc.type ?? "pdf",
          size: doc.size ?? existingDoc?.size ?? 0,
          uploadedAt: doc.uploadedAt ?? existingDoc?.uploadedAt ?? new Date().toISOString(),
          status: doc.status ?? existingDoc?.status ?? "review",
          ocrAccuracy: doc.ocrAccuracy ?? existingDoc?.ocrAccuracy,
          pageCount: doc.pageCount ?? existingDoc?.pageCount,
          protocolId: doc.protocolId ?? existingDoc?.protocolId,
          protocolName: protocol?.name ?? existingDoc?.protocolName,
          sourceUrl: doc.sourceUrl ?? existingDoc?.sourceUrl,
          workflowRunId: doc.workflowRunId ?? existingDoc?.workflowRunId,
          failureReason: doc.failureReason,
        };

        if (existingDoc) {
          updateStoreDocument(existingDoc.id, mappedDoc);
          return;
        }

        addStoreDocument(mappedDoc);
      });
    } catch (error) {
      console.error("[OCR] Failed to fetch pipeline documents:", error);
      showApiErrorToast(error, "Couldn't load the pipeline documents", { id: "pipeline-documents" });
    }
  };

  const loadConfigurations: any = async () => {
    try {
      const configs = await listOcrConfigurations();
      const mappedProtocols = configs.map(mapConfigToProtocol);

      setProtocols(mappedProtocols);

      if (
        activeProtocolId &&
        !mappedProtocols.some((protocol) => protocol.id === activeProtocolId)
      ) {
        setActiveProtocol(null);
      }

      return mappedProtocols;
    } catch (error) {
      console.error("[OCR] Failed to fetch protocol configurations:", error);
      showApiErrorToast(error, "Couldn't load protocol configurations", { id: "pipeline-configs" });
    }
  };
  const reloadPage = async () => {
    const mappedProtocols: any[] = await loadConfigurations();
    await loadDocuments(mappedProtocols);
  };

  useEffect(() => {
    reloadPage();
  }, [activeProtocolId, setActiveProtocol, setProtocols]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!activeProtocol) return;

      acceptedFiles.forEach(async (file) => {
        const newDoc: AbstractionDocument = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          type: getDocumentType(file),
          protocolId: activeProtocol.id,
          protocolName: activeProtocol.name,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          status: "uploading",
          pageCount: undefined,
          ocrAccuracy: undefined,
        };
        addDocument(newDoc);

        const { updateDocument } = useAbstractionStore.getState();

        try {
          // Step 1 – send the file to the backend
          updateDocument(newDoc.id, { status: "uploading" });
          setUploadingCount((c) => c + 1);

          let responseData: Record<string, string>;
          try {
            let currentDocId = newDoc.id;
            updateDocument(currentDocId, { status: "uploading" });
            responseData = await uploadOcrDocument(activeProtocol.id, file);
            const uploadRunId = extractWorkflowRunId(
              responseData as unknown as Record<string, unknown>
            );
            if (uploadRunId) {
              updateDocument(currentDocId, { workflowRunId: uploadRunId });
            }
            toast.success(responseData?.message ?? "File is processing");
          } finally {
            setUploadingCount((c) => c - 1);
            await loadDocuments();
          }

          // If the backend returned a string, assume it's the real ID as per developer's feedback
          // Note: "It should be the document id not your document name"
          // if (
          //   backendId &&
          //   typeof backendId === "string" &&
          //   !backendId.includes("{") &&
          //   backendId.length < 100
          // ) {
          //   const { updateDocumentId } = useAbstractionStore.getState();
          //   updateDocumentId(newDoc.id, backendId);
          //   currentDocId = backendId;
          //   console.log(`[OCR] Syncing backend ID: ${newDoc.id} -> ${backendId}`);
          // }

          // // Step 2 – animate through OCR → extracting → review
          // updateDocument(currentDocId, { status: "ocr_processing" });
          // await new Promise((r) => setTimeout(r, 1200));

          // updateDocument(currentDocId, {
          //   status: "extracting",
          //   ocrAccuracy: 85 + Math.random() * 12,
          //   pageCount: Math.floor(Math.random() * 20) + 3,
          // });
          // await new Promise((r) => setTimeout(r, 1200));

          // updateDocument(currentDocId, { status: "review" });
        } catch (err) {
          console.error("OCR upload failed:", err);
          updateDocument(newDoc.id, {
            status: "failed",
            failureReason: getApiErrorMessage(err, "The upload failed. Try uploading it again."),
          });
          showApiErrorToast(err, `Couldn't upload "${newDoc.name}" for OCR`);
        }
      });
    },
    [activeProtocol, addDocument]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/tiff": [".tiff", ".tif"],
      "text/csv": [".csv"],
    },
    multiple: true,
    disabled: !activeProtocol,
  });

  const handleRunPipeline = async () => {
    try {
      setIsProcessing(true);
      await reloadPage();
    } finally {
      setIsProcessing(false);
    }

    // // Simulate batch processing
    // const uploadingDocs = documents.filter(
    //   (d) => d.status === "uploading" || d.status === "ocr_processing"
    // );
    // setTimeout(() => setIsProcessing(false), 4000);
  };

  const pipelineStats = {
    total: documents.length,
    completed: documents.filter((d) => d.status === "completed").length,
    review: documents.filter((d) => d.status === "review").length,
    processing: documents.filter(
      (d) => d.status === "uploading" || d.status === "ocr_processing" || d.status === "extracting"
    ).length,
    avgAccuracy:
      documents.filter((d) => d.ocrAccuracy).reduce((sum, d) => sum + (d.ocrAccuracy || 0), 0) /
      (documents.filter((d) => d.ocrAccuracy).length || 1),
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Documents",
            value: pipelineStats.total,
            icon: <FileText className="h-5 w-5" />,
            color: "text-slate-700",
            bg: "bg-slate-50",
            ring: "ring-slate-200",
          },
          {
            label: "Processing",
            value: pipelineStats.processing,
            icon: <Loader2 className="h-5 w-5 animate-spin" />,
            color: "text-amber-700",
            bg: "bg-amber-50",
            ring: "ring-amber-200",
          },
          {
            label: "Pending Review",
            value: pipelineStats.review,
            icon: <AlertCircle className="h-5 w-5" />,
            color: "text-rose-700",
            bg: "bg-rose-50",
            ring: "ring-rose-200",
          },
          {
            label: "Avg. OCR Accuracy",
            value: pipelineStats.avgAccuracy.toFixed(1) + "%",
            icon: <Sparkles className="h-5 w-5" />,
            color: getAccuracyColor(pipelineStats.avgAccuracy),
            bg: "bg-emerald-50",
            ring: "ring-emerald-200",
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={cn(
              "border-0 shadow-sm ring-1 overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5",
              stat.ring
            )}
          >
            <CardContent className={cn("p-4", stat.bg)}>
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl bg-white shadow-sm", stat.color)}>
                  {stat.icon}
                </div>
                <div>
                  <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                  <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workflowId && (
        <Card className="border-0 shadow-sm ring-1 ring-violet-200/60 bg-gradient-to-r from-violet-50/80 to-indigo-50/50">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Stage for Integrate</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xl">
                  Push the OCR staging table to this workflow&apos;s Integrate tab. The source table
                  field fills automatically when you open Integrate.
                </p>
                {existingStage?.sourceTable && (
                  <p className="text-xs text-violet-700 mt-2 font-medium">
                    Last staged: {existingStage.sourceTable}
                  </p>
                )}
              </div>
              <Button
                onClick={handleStageForIntegrate}
                disabled={isStagingForIntegrate}
                className="shrink-0 bg-violet-600 hover:bg-violet-500 rounded-xl"
              >
                {isStagingForIntegrate ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {isStagingForIntegrate ? "Staging..." : "Stage & open Integrate"}
              </Button>
            </div>
            <div className="space-y-1.5 max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Source table override (optional)
              </p>
              <Input
                value={stagingTableOverride}
                onChange={(event) => setStagingTableOverride(event.target.value)}
                placeholder={
                  integrationDefaults?.sourceTable ||
                  "e.g. ocr_staging_employee_records_extraction_config_test"
                }
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        {/* Document List */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Document Queue</h3>
            <Button
              onClick={handleRunPipeline}
              disabled={isProcessing}
              size="sm"
              className="bg-violet-600 hover:bg-violet-500 rounded-xl shadow-md shadow-violet-200"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {isProcessing ? "Processing..." : "Reload"}
            </Button>
          </div>

          <div className="space-y-3">
            {/* order by uploaded_at as in date format */}
            {documents
              .slice()
              .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
              .map((doc, index) => {
                const config = STATUS_CONFIG[doc.status];
                return (
                  <Card
                    key={doc.id}
                    className="border-0 shadow-sm ring-1 ring-slate-200/50 hover:ring-violet-300/50 hover:shadow-md transition-all group overflow-hidden"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* File Icon */}
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                          <FileText className="h-5 w-5 text-violet-600" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {doc.name} <br />
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full border shrink-0",
                                config.bgColor,
                                config.color
                              )}
                            >
                              <span className="mr-1">{config.icon}</span>
                              {config.label}
                            </Badge>
                            {doc.protocolName && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 py-0.5 rounded-full border-violet-200 text-violet-700 bg-violet-50 shrink-0"
                              >
                                {doc.protocolName}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-500">
                            <span>{formatSize(doc.size)}</span>
                            {doc.pageCount && <span>{doc.pageCount} pages</span>}
                            {doc.ocrAccuracy && (
                              <span
                                className={cn("font-semibold", getAccuracyColor(doc.ocrAccuracy))}
                              >
                                {doc.ocrAccuracy.toFixed(1)}% accuracy
                              </span>
                            )}
                            <span>
                              {new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* Progress bar for processing statuses */}
                          {(doc.status === "uploading" ||
                            doc.status === "ocr_processing" ||
                            doc.status === "extracting") && (
                            <div className="mt-2">
                              <Progress
                                value={
                                  doc.status === "uploading"
                                    ? 25
                                    : doc.status === "ocr_processing"
                                      ? 55
                                      : 80
                                }
                                className="h-1.5 bg-slate-100"
                              />
                            </div>
                          )}

                          {doc.status === "failed" && (
                            <JobFailureReason
                              className="mt-2 text-xs"
                              reason={
                                doc.failureReason ??
                                "Processing failed. Retry it, or share the document ID with support."
                              }
                              // Local placeholders ("doc-…") never reached the server, so they have no logs.
                              runId={doc.id.startsWith("doc-") ? null : doc.id}
                              runIdLabel="Document ID"
                            />
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 self-end sm:self-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {doc.status === "review" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDocument(doc.id);
                                onNavigateToOcrReview?.();
                              }}
                              className="h-8 px-3 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Review
                            </Button>
                          )}
                          {doc.status === "completed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDocument(doc.id);
                                onNavigateToResults?.();
                              }}
                              className="h-8 px-3 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(doc.id)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>

        {/* Upload Drop Zone */}
        <div className="space-y-4 min-w-0">
          <h3 className="text-lg font-bold text-slate-800">Upload</h3>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Target Configuration
            </p>
            <Select value={activeProtocolId ?? undefined} onValueChange={setActiveProtocol}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                <SelectValue placeholder="Choose configuration for this upload" />
              </SelectTrigger>
              <SelectContent>
                {protocols.map((protocol) => (
                  <SelectItem key={protocol.id} value={protocol.id}>
                    {protocol.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!protocols.length && (
              <p className="text-xs text-amber-600">
                No deployed configuration loaded yet. Open the Protocol tab and select one first.
              </p>
            )}
          </div>
          <div
            {...getRootProps()}
            className={cn(
              "relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300",
              !activeProtocol && "cursor-not-allowed opacity-60",
              isDragActive
                ? "border-violet-400 bg-violet-50/50 scale-[1.02] shadow-lg shadow-violet-500/10"
                : "border-slate-300 bg-white hover:border-violet-300 hover:bg-violet-50/30 hover:shadow-md"
            )}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div
                className={cn(
                  "w-16 h-16 rounded-2xl mx-auto flex items-center justify-center transition-all duration-300",
                  uploadingCount > 0
                    ? "bg-violet-500 shadow-lg shadow-violet-500/30"
                    : isDragActive
                      ? "bg-violet-500 shadow-lg shadow-violet-500/30 scale-110"
                      : "bg-gradient-to-br from-violet-100 to-indigo-100"
                )}
              >
                {uploadingCount > 0 ? (
                  <Loader2 className="h-7 w-7 text-white animate-spin" />
                ) : (
                  <Upload
                    className={cn("h-7 w-7", isDragActive ? "text-white" : "text-violet-600")}
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {uploadingCount > 0
                    ? `Uploading ${uploadingCount} file${uploadingCount > 1 ? "s" : ""}…`
                    : !activeProtocol
                      ? "Select a target configuration first"
                      : isDragActive
                        ? "Drop files here"
                        : "Drag & drop documents"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {uploadingCount > 0
                    ? "Please wait while your file is being uploaded"
                    : !activeProtocol
                      ? "Choose where uploads should be processed"
                      : `Uploading to: ${activeProtocol.name}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-violet-200 text-violet-600 hover:bg-violet-50"
              >
                Browse Files
              </Button>
            </div>
          </div>

          {/* OCR Accuracy Gauge */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-violet-500" />
                OCR Accuracy Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents
                .filter((d) => d.ocrAccuracy)
                .slice(0, 5)
                .map((doc) => (
                  <div key={doc.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 truncate max-w-[180px]">{doc.name}</span>
                      <span className={cn("font-bold", getAccuracyColor(doc.ocrAccuracy!))}>
                        {doc.ocrAccuracy!.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          getAccuracyBg(doc.ocrAccuracy!)
                        )}
                        style={{ width: `${doc.ocrAccuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Agent Logs Peek */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Recent Agent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {useAbstractionStore
                .getState()
                .agentLogs.slice(-4)
                .reverse()
                .map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{log.stepName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{log.outputs}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{log.duration}ms</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
