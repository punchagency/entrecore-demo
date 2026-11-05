"use client";

import { use } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, CheckCircle2, XCircle, RefreshCcw, Clock, 
  Database, Layers, FileText, ShieldCheck, Fingerprint, 
  AlertCircle, ChevronRight, Activity, Zap
} from "lucide-react";
import { useIntegrationRun, useRunLineage, useTriggerRun } from "../../../hooks/use-data-integrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { jobFailureMessage } from "@/utils/api-error";
import { CopyableId } from "@/components/copyable-id";
import { JobFailureReason } from "@/components/job-failure-reason";

export default function RunMonitorPage({ params }: { params: Promise<{ id: string; runId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;
  const runId = resolvedParams.runId;

  // Poll for status until completed or failed
  const { data: run, isLoading } = useIntegrationRun(runId, true);
  const { data: lineageData } = useRunLineage(runId);
  const triggerRunMutation = useTriggerRun();

  if (isLoading || !run) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-6">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  const isFinished = run.status === "completed" || run.status === "failed";
  // Parked on an ambiguous upsert key: part of the batch is written, the rest
  // is waiting on someone to pick which record to update.
  const isAwaitingReview = run.status === "awaiting_review";
  const stages = run.stages || [];
  
  // Calculate overall progress percentage
  const completedStages = stages.filter(s => s.status === 'completed' || s.status === 'skipped').length;
  const progressPercent = (completedStages / 4) * 100;

  const handleResume = () => {
    triggerRunMutation.mutate(
      { jobId, resumeFromId: run.id },
      {
        onSuccess: (newRun) => {
          toast.success("Resuming from last failure point");
          router.push(`/data-room/integrations/${jobId}/runs/${newRun.id}`);
        },
        onError: () => toast.error("Failed to resume run"),
      }
    );
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full hover:bg-slate-100"
            onClick={() => router.push(`/data-room/integrations/${jobId}`)}
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                Pipeline Execution
              </h1>
              <CopyableId label="Run ID" value={run.id} className="text-[10px] text-slate-500" />
              {run.resumed_from_run_id && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none text-[10px]">Resumed from {run.resumed_from_run_id.substring(0, 8)}</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  run.status === 'completed' ? 'bg-emerald-500' :
                  run.status === 'failed' ? 'bg-red-500' :
                  run.status === 'running' ? 'bg-blue-500 animate-pulse' :
                  run.status === 'awaiting_review' ? 'bg-amber-500' :
                  run.status === 'applying' ? 'bg-blue-500 animate-pulse' :
                  'bg-slate-300'
                )} />
                <span className="capitalize">
                  {run.status === 'awaiting_review' ? 'Waiting on you' : run.status.replace(/_/g, ' ')}
                </span>
              </div>
              <span>Batch ID: <span className="font-mono">{run.batch_id.substring(0, 8)}</span></span>
              {run.duration_seconds && <span>Duration: {run.duration_seconds.toFixed(2)}s</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAwaitingReview && (
            <Button
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200"
              onClick={() => router.push(`/data-room/integrations/${jobId}/runs/${runId}/review`)}
            >
              <AlertCircle className="w-4 h-4 mr-2" /> Pick records
            </Button>
          )}
          {run.status === 'failed' && (
            <Button 
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
              onClick={handleResume}
              disabled={triggerRunMutation.isPending}
            >
              <Zap className="w-4 h-4 mr-2" /> Resume Run
            </Button>
          )}
          {run.review_records && run.review_records > 0 && (
            <Button 
              variant="outline"
              className="rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50"
              onClick={() => router.push(`/data-room/integrations/review?job_id=${jobId}`)}
            >
              <AlertCircle className="w-4 h-4 mr-2" /> Review Records ({run.review_records})
            </Button>
          )}
        </div>
      </div>

      {/* The run stopped rather than guess which record to overwrite. This is
          the primary way anyone finds out — a button in the header row alone is
          too easy to miss on a page that is mostly progress chrome. */}
      {isAwaitingReview && (
        <Card className="rounded-3xl border-2 border-amber-300 bg-amber-50 shadow-sm overflow-hidden">
          <CardContent className="p-6 flex flex-wrap items-center gap-4">
            <AlertCircle className="w-8 h-8 text-amber-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-amber-900 uppercase tracking-tight text-sm mb-1">
                Waiting on you
              </h4>
              <p className="text-sm text-amber-800 font-medium">
                Some rows matched more than one existing record, so they were not written — the
                rest of this run landed as normal. Pick which record each one should update, or
                add it as a new record.
              </p>
            </div>
            <Button
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200"
              onClick={() => router.push(`/data-room/integrations/${jobId}/runs/${runId}/review`)}
            >
              Pick records
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Pipeline Visualization */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Card */}
          <Card className="rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <CardContent className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Live Execution Status
                </h3>
                <span className="text-sm font-black text-blue-600">{Math.round(progressPercent)}%</span>
              </div>
              
              <Progress value={progressPercent} className="h-3 rounded-full bg-slate-100" />
              
              <div className="mt-12 grid grid-cols-4 gap-4 relative">
                {/* Connector Lines */}
                <div className="absolute top-6 left-8 right-8 h-0.5 bg-slate-100 -z-10" />
                
                {stages.map((stage, idx) => (
                  <div key={stage.id} className="flex flex-col items-center text-center space-y-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500",
                      stage.status === 'completed' ? 'bg-emerald-500 text-white' :
                      stage.status === 'running' ? 'bg-blue-600 text-white animate-pulse' :
                      stage.status === 'failed' ? 'bg-red-500 text-white' :
                      stage.status === 'awaiting_review' ? 'bg-amber-500 text-white' :
                      stage.status === 'skipped' ? 'bg-slate-200 text-slate-500' :
                      'bg-white text-slate-300 border border-slate-100'
                    )}>
                      {stage.stage_name === 'source' && <Database className="w-5 h-5" />}
                      {stage.stage_name === 'stage' && <Layers className="w-5 h-5" />}
                      {stage.stage_name === 'int' && <FileText className="w-5 h-5" />}
                      {stage.stage_name === 'target' && <ShieldCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">{stage.stage_name}</h4>
                      <p className={cn(
                        "text-xs font-bold capitalize",
                        stage.status === 'completed' ? 'text-emerald-600' :
                        stage.status === 'running' ? 'text-blue-600' :
                        stage.status === 'failed' ? 'text-red-600' :
                        stage.status === 'awaiting_review' ? 'text-amber-600' :
                        'text-slate-400'
                      )}>
                        {stage.status === 'awaiting_review' ? 'Waiting on you' : stage.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Error Message if Failed */}
          {(run.error || run.status === "failed") && (
            <JobFailureReason
              className="rounded-3xl p-5"
              title={
                run.status === "failed" ? "Why this run failed" : run.status === "cancelled" ? "Why this run stopped" : "What went wrong"
              }
              tone={run.status === "cancelled" ? "neutral" : "error"}
              reason={jobFailureMessage(
                run,
                "This integration run failed. Share the run ID with support to find the full error."
              )}
              runId={run.id}
            />
          )}

          {/* Stage Details */}
          <div className="space-y-4">
            <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm px-2">Stage Audit Details</h3>
            {stages.map((stage) => (
              <Card key={stage.id} className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-2 h-10 rounded-full",
                      stage.status === 'completed' ? 'bg-emerald-400' :
                      stage.status === 'failed' ? 'bg-red-400' :
                      stage.status === 'running' ? 'bg-blue-400 animate-pulse' :
                      'bg-slate-200'
                    )} />
                    <div>
                      <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest">{stage.stage_name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        {stage.duration_seconds ? `${stage.duration_seconds.toFixed(3)}s` : '--'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{stage.records_in ?? '--'}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">In</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-blue-600">{stage.records_out ?? '--'}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Out</p>
                    </div>
                    {stage.records_rejected ? (
                      <div className="text-right">
                        <p className="text-sm font-black text-red-500">{stage.records_rejected}</p>
                        <p className="text-[8px] font-bold text-red-400 uppercase tracking-widest">Rejected</p>
                      </div>
                    ) : null}
                    <ChevronRight className="w-4 h-4 text-slate-200" />
                  </div>
                  </div>
                  {(stage.error || stage.status === "failed") && (
                    <JobFailureReason
                      className="text-xs"
                      reason={jobFailureMessage(stage, `The ${stage.stage_name} stage failed.`)}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Col: Stats & Lineage Preview */}
        <div className="space-y-6">
          <Card className="rounded-3xl border border-slate-100 shadow-sm bg-white p-6">
            <h3 className="font-black text-slate-900 uppercase tracking-tight text-xs mb-6 border-b border-slate-50 pb-4">Record Summary</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Total Input</span>
                <span className="text-lg font-black text-slate-900">{run.total_records || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Clean Records</span>
                <span className="text-lg font-black text-emerald-600">{run.processed_records || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Failed / Rejected</span>
                <span className="text-lg font-black text-red-500">{run.failed_records || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Human Review</span>
                <span className="text-lg font-black text-amber-500">{run.review_records || 0}</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-100 shadow-sm bg-[#0F172A] text-white p-6 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Fingerprint className="w-4 h-4 text-blue-400" />
                <h3 className="font-black uppercase tracking-widest text-[10px]">Data Lineage Fingerprints</h3>
              </div>
              
              {lineageData?.rows && lineageData.rows.length > 0 ? (
                <div className="space-y-4">
                  {lineageData.rows.slice(0, 5).map((row) => (
                    <div key={row.id} className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                        <span>Source Row Hash</span>
                        <span>{row.destination_table}</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-2 rounded-lg font-mono text-[9px] text-blue-400 truncate">
                        {row.source_row_key}
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="ghost" 
                    className="w-full text-xs text-slate-400 hover:text-white hover:bg-white/5"
                    onClick={() => toast.info("Full lineage browser coming soon")}
                  >
                    View All {lineageData.total} Records
                  </Button>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500">
                  <p className="text-xs font-medium italic">Pending target stage completion...</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
