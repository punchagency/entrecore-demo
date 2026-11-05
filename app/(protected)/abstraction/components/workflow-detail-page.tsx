"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ArrowLeft } from "lucide-react";
import { Workflow } from "@/types/abstraction";
import { getWorkflowById } from "@/app/(protected)/abstraction/services/workflow-data";
import { fetchAllOcrDocuments } from "@/app/(protected)/abstraction/services/ocr-api";
import {
  computePipelineMetrics,
  formatMetricCount,
  formatMetricPercent,
  formatProcessingTime,
  type ComputedPipelineMetrics,
} from "@/app/(protected)/abstraction/utils/workflow-metrics";
import { useAbstractionStore } from "@/app/store/abstractionStore";
import { TabNavigation, AbstractionStage } from "./tab-navigation";
import { SchemaDriftButton } from "./schema-drift-button";
import { DocumentPipeline } from "./document-pipeline";
import { ProtocolEditor } from "./protocol-editor";
import { WorkflowBuilder } from "./workflow-builder";
import { DragDropWorkflowBuilder } from "./drag-drop-builder";
import { HumanReview } from "./human-review";
import { ExtractionResults } from "./extraction-results";
import { IntegrationsComparison } from "./integrations-comparison";
import { statusConfig } from "./workflow-table";

export function WorkflowDetailPage() {
  const params = useParams();
  const workflowId = params.id as string;
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<AbstractionStage>("workflow");
  const [showInteractiveBuilder, setShowInteractiveBuilder] = useState(false);
  const [integrateStageRevision, setIntegrateStageRevision] = useState(0);
  const [pipelineMetrics, setPipelineMetrics] = useState<ComputedPipelineMetrics | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);
  const storeDocuments = useAbstractionStore((state) => state.documents);

  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        setIsLoading(true);
        const data = await getWorkflowById(workflowId);
        setWorkflow(data || null);
      } catch (error) {
        console.error("Failed to load workflow:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();
  }, [workflowId]);

  useEffect(() => {
    let cancelled = false;

    async function loadPipelineMetrics() {
      setIsMetricsLoading(true);
      try {
        const backendDocs = await fetchAllOcrDocuments();
        if (cancelled) return;
        const docs =
          backendDocs?.length
            ? backendDocs
            : storeDocuments
              .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc?.id))
              .map((doc) => ({
                id: doc.id,
                name: doc.name,
                status: doc.status,
                ocrAccuracy: doc.ocrAccuracy,
              }));
        setPipelineMetrics(computePipelineMetrics(docs));
      } catch (error) {
        console.error("Failed to load pipeline metrics:", error);
        if (!cancelled) {
          setPipelineMetrics(computePipelineMetrics([]));
        }
      } finally {
        if (!cancelled) setIsMetricsLoading(false);
      }
    }

    loadPipelineMetrics();
    return () => {
      cancelled = true;
    };
  }, [workflowId, storeDocuments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <p className="text-slate-600 mb-4">Workflow not found</p>
          <Link href="/abstraction">
            <Button variant="outline">Back to Workflows</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const config = statusConfig[workflow.status] || statusConfig.Active;

  return (
    <div className="min-h-screen bg-[#EFF4FF]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 w-full flex items-center justify-between py-4 md:py-5 px-4 md:px-8 lg:px-10 bg-white/40 backdrop-blur-xl border-b border-white/60 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/abstraction"
            className="w-10 h-10 rounded-full bg-white/60 border border-white/60 shadow-sm flex items-center justify-center hover:bg-blue-600 hover:text-white hover:scale-110 transition-all duration-300 group"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 group-hover:text-white" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-gray-900 uppercase">
              {workflow.name}
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">{workflow.description}</p>
          </div>
        </div>
        <Badge className={`${config.bg} ${config.text} border-0`}>
          {workflow.status}
        </Badge>
      </div>

      <div className="container mx-auto p-6 space-y-8">
        {/* ── Pipeline metrics (from OCR documents, not mock workflow data) ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(
            [
              {
                label: "Success Rate",
                value: isMetricsLoading
                  ? "…"
                  : formatMetricPercent(pipelineMetrics?.successRate ?? null),
              },
              {
                label: "Records Processed",
                value: isMetricsLoading
                  ? "…"
                  : formatMetricCount(pipelineMetrics?.recordsProcessed ?? 0),
              },
              {
                label: "Processing Time",
                value: isMetricsLoading
                  ? "…"
                  : formatProcessingTime(pipelineMetrics?.processingTimeMs ?? null),
              },
              {
                label: "Error Rate",
                value: isMetricsLoading
                  ? "…"
                  : formatMetricPercent(pipelineMetrics?.errorRate ?? null),
              },
            ] as const
          ).map((metric) => (
            <Card
              key={metric.label}
              className="p-6 bg-white/60 backdrop-blur-xl ring-1 ring-slate-200/50 rounded-xl"
            >
              <p className="text-sm text-slate-600">{metric.label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{metric.value}</p>
            </Card>
          ))}
        </div>
        {!isMetricsLoading && pipelineMetrics && !pipelineMetrics.hasData && (
          <p className="text-sm text-slate-500 -mt-4">
            Upload documents in the Pipeline tab to populate these metrics.
          </p>
        )}

        {/* ── Tab Navigation ─────────────────────────────────── */}
        <Card className="border-0 shadow-xl bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-slate-200/50">
          <div className="p-6 space-y-6">
            <div className="flex justify-center sm:justify-start">
              <TabNavigation
                activeStage={activeStage}
                onStageChange={setActiveStage}
              />
            </div>

            {/* ── Tab Content ─────────────────────────────────── */}
            <div className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeStage === "workflow" && (
                <>
                  {/* Toggle Button */}
                  <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                    {/* Schema drift is a catalog check rather than a workflow
                        step, but this tab is where someone stands when they
                        wonder whether the schema under this workflow still
                        matches the source it was built against. */}
                    <SchemaDriftButton />

                    <Button
                      onClick={() => setShowInteractiveBuilder(!showInteractiveBuilder)}
                      variant={showInteractiveBuilder ? "default" : "outline"}
                      className="gap-2"
                    >
                      {showInteractiveBuilder ? "← Beautiful View" : "✏️ Edit (Drag & Drop)"}
                    </Button>
                  </div>

                  {/* Beautiful Flow View (Default) */}
                  {!showInteractiveBuilder && <WorkflowBuilder />}

                  {/* Interactive Builder */}
                  {showInteractiveBuilder && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <DragDropWorkflowBuilder workflowId={workflow.id} />
                    </div>
                  )}
                </>
              )}
              {activeStage === "protocol" && <ProtocolEditor />}
              {activeStage === "pipeline" && (
                <DocumentPipeline
                  workflowId={workflow.id}
                  workflowName={workflow.name}
                  integrationDefaults={workflow.integrationDefaults}
                  onStagedForIntegrate={() => {
                    setIntegrateStageRevision((revision) => revision + 1);
                    setActiveStage("integrate");
                  }}
                  onNavigateToOcrReview={() => setActiveStage("ocr-review")}
                  onNavigateToResults={() => setActiveStage("results")}
                />
              )}
              {activeStage === "ocr-review" && <HumanReview />}
              {activeStage === "integrate" && (
                <IntegrationsComparison
                  workflowId={workflow.id}
                  workflowName={workflow.name}
                  integrationDefaults={workflow.integrationDefaults}
                  stageRevision={integrateStageRevision}
                />
              )}
              {activeStage === "results" && <ExtractionResults />}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
