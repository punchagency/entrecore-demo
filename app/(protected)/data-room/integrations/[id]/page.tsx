"use client";

import { use } from "react";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Calendar, CheckCircle2, History, Save, Network, Clock, Settings, RefreshCcw, Pencil, X, AlertCircle } from "lucide-react";
import { useIntegrationJob, useIntegrationRuns, useActivateJob, useTriggerRun, useUpdateIntegrationJob } from "../hooks/use-data-integrations";
import { useJobRules } from "../hooks/use-integration-rules";
import { IntegrationMappingEditor } from "../components/mapping-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIntegrationErrorForToast } from "../services/integration-error-utils";
import { resolveUpsertKeys } from "../services/data-integration-api";
import { jobFailureMessage } from "@/utils/api-error";

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;
  
  const { data: job, isLoading } = useIntegrationJob(jobId);
  const { data: runsData, isLoading: runsLoading } = useIntegrationRuns(jobId);
  
  const activateMutation = useActivateJob();
  const triggerRunMutation = useTriggerRun();
  const updateMutation = useUpdateIntegrationJob();

  const [activeTab, setActiveTab] = useState("mappings");
  const [isEditingMappings, setIsEditingMappings] = useState(false);

  // Resolved through the shared helper so the badge and the editor agree with
  // the backend on what this job's write mode actually is.
  const upsertKeys = resolveUpsertKeys(job);
  // Rules beat the upsert key at run time, so the write mode shown here has to
  // account for them even though they are authored elsewhere.
  const { data: jobRules } = useJobRules(jobId);
  const jobHasRules = Boolean(jobRules?.document);

  // The most recent run stopped on an ambiguous upsert key. There can only be
  // one, since a parked run counts as active and blocks the next.
  const parkedRun = (runsData?.runs ?? []).find((r) => r.status === "awaiting_review");

  if (isLoading || !job) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-6">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-[500px] w-full rounded-3xl" />
      </div>
    );
  }

  const handleActivate = () => {
    activateMutation.mutate(jobId, {
      onSuccess: () => toast.success("Job activated"),
      onError: (error) =>
        toast.error(formatIntegrationErrorForToast(error, "Failed to activate job"), {
          duration: 8000,
        }),
    });
  };

  const handleRun = () => {
    triggerRunMutation.mutate(
      { jobId },
      {
        onSuccess: (run) => {
          // The backend returns the EXISTING run when one is still active
          // rather than starting a second one, so "triggered successfully" is
          // not always true. A run parked on an ambiguous upsert key is the
          // case people actually hit, and silently landing them on an old run
          // with a success toast is how it looks like nothing happened.
          if (run.status === "awaiting_review") {
            toast.warning(
              "This job already has a run waiting on you. Resolve it first — a second run can't start until then.",
              { duration: 8000 }
            );
            router.push(`/data-room/integrations/${jobId}/runs/${run.id}/review`);
            return;
          }
          if (run.status === "applying") {
            toast.info("This job's previous run is still being written.");
          } else {
            toast.success("Run triggered successfully");
          }
          router.push(`/data-room/integrations/${jobId}/runs/${run.id}`);
        },
        onError: () => toast.error("Failed to trigger run"),
      }
    );
  };

  const runs = runsData?.runs || [];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full hover:bg-slate-100"
            onClick={() => router.push("/data-room/integrations")}
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-slate-900">{job.name}</h1>
              {job.status === 'active' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Active</Badge>}
              {job.status === 'draft' && <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none">Draft</Badge>}
              {job.status === 'pending_mapping_approval' && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Pending Approval</Badge>}
              <Badge variant="outline" className="font-mono text-[10px]">v{job.version}</Badge>
              {/* Write mode was previously invisible — the only way to tell
                  whether a job appended or upserted was to read its run logs. */}
              {upsertKeys.length > 0 ? (
                <Badge
                  className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none"
                  title={`Rows are matched on ${upsertKeys.join(" + ")}`}
                >
                  Upsert: {upsertKeys.join(" + ")}
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none">
                  Append
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500 font-medium ml-1">
              <span className="flex items-center gap-1 font-mono text-[11px]"><Network className="w-3.5 h-3.5" /> {job.source_table || "CSV"} → {job.destination_table}</span>
              {job.schedule_cron && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {job.schedule_cron}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {job.status !== 'active' && (
            <Button 
              className="rounded-xl w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
              onClick={handleActivate}
              disabled={activateMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Activate Job
            </Button>
          )}
          
          {job.status === 'active' && (
            <Button 
              className="rounded-xl w-full md:w-auto bg-slate-900 text-white hover:bg-slate-800 shadow-lg"
              onClick={handleRun}
              disabled={triggerRunMutation.isPending}
            >
              <Play className="w-4 h-4 mr-2" /> Run Pipeline
            </Button>
          )}
        </div>
      </div>

      {/* A parked run needs to be visible without opening Run History — it is
          blocking this job's schedule until someone acts on it. */}
      {parkedRun && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-amber-900">This run is waiting on you</p>
            <p className="text-sm text-amber-800">
              Some rows matched more than one existing record, so they were not written. This job
              will not run again on its schedule until they are resolved.
            </p>
          </div>
          <Button
            className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() =>
              router.push(`/data-room/integrations/${jobId}/runs/${parkedRun.id}/review`)
            }
          >
            Pick records
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm h-14 w-full justify-start overflow-x-auto">
          <TabsTrigger value="mappings" className="rounded-xl px-6 h-12 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 font-bold transition-all">
            <Network className="w-4 h-4 mr-2" /> Mappings ({job.column_mappings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="rules" className="rounded-xl px-6 h-12 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 font-bold transition-all">
            <Settings className="w-4 h-4 mr-2" /> Rules ({job.validation_rules?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="runs" className="rounded-xl px-6 h-12 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 font-bold transition-all">
            <History className="w-4 h-4 mr-2" /> Run History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mappings" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 outline-none mt-0">
          {isEditingMappings ? (
            <IntegrationMappingEditor
              mappings={job.column_mappings || []}
              upsertKeys={upsertKeys}
              // Matching rules are authored in the OCR Abstraction workflow, not
              // here — but this job may well have them, and showing "Upsert on
              // title" for a job whose rules actually decide would state the
              // wrong write mode. No onOpenRules: there is nowhere on this
              // screen to send anyone, so the mode is explained without a jump.
              hasRules={jobHasRules}
              onCancel={() => setIsEditingMappings(false)}
              isSaving={updateMutation.isPending}
              onSave={(newMappings, newUpsertKeys) => {
                updateMutation.mutate(
                  {
                    id: jobId,
                    // upsert_fields is sent on every save, including as [] for
                    // Append. The backend gates on whether the field was sent,
                    // not on whether it is truthy, so omitting it would mean
                    // "leave unchanged" and Append could never be selected.
                    data: {
                      column_mappings: newMappings,
                      upsert_fields: newUpsertKeys,
                    },
                  },
                  {
                    onSuccess: (updated) => {
                      const saved = resolveUpsertKeys(updated);
                      if (newUpsertKeys.length > 0 && saved.length === 0) {
                        // The API accepted the save but did not store the key.
                        // The usual cause is a backend that predates
                        // upsert_fields: unknown fields are silently dropped by
                        // pydantic, so this returns 200 and the job quietly
                        // stays on Append. Say so, rather than letting the user
                        // reopen the editor and find their choice reverted.
                        toast.warning(
                          "Mappings saved, but the write key was not stored — this " +
                            "server may not support Upsert yet. The job will keep " +
                            "appending. Check with your backend deployment."
                        );
                      } else {
                        toast.success(
                          saved.length > 0
                            ? `Saved. Rows will be matched on ${saved.join(" + ")}.`
                            : "Saved. This job will append new rows on every run."
                        );
                      }
                      setIsEditingMappings(false);
                      // Saving mints a NEW job version with a new id; the page is
                      // still mounted on the old one, so without this it shows
                      // stale data until a manual refresh.
                      if (updated?.id && updated.id !== jobId) {
                        router.replace(`/data-room/integrations/${updated.id}`);
                      }
                    },
                    // Surfaces the backend's actual message — notably the 400
                    // naming an upsert column that does not exist or is
                    // computed, which is the whole point of validating on save.
                    onError: (error) =>
                      toast.error(
                        formatIntegrationErrorForToast(error, "Failed to update mappings")
                      ),
                  }
                );
              }}
            />
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Column Mappings</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl border-slate-200"
                  onClick={() => setIsEditingMappings(true)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Mappings
                </Button>
              </div>
              {job.column_mappings && job.column_mappings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th>
                        <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Destination</th>
                        <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Required</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {job.column_mappings.map((m, idx) => (
                        <tr key={m.id || idx} className="hover:bg-slate-50">
                          <td className="py-4 px-4 font-mono text-sm text-slate-700">{m.source_column}</td>
                          <td className="py-4 px-4 font-mono text-sm text-blue-700 font-bold">{m.destination_column}</td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className="bg-slate-100 text-slate-600 font-mono text-[10px]">{m.data_type}</Badge>
                          </td>
                          <td className="py-4 px-4">
                            {m.is_required ? (
                              <Badge className="bg-amber-100 text-amber-700 border-none">Yes</Badge>
                            ) : (
                              <span className="text-sm text-slate-400">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center flex flex-col items-center">
                  <p className="text-slate-500 text-sm mb-4">No mappings defined for this job.</p>
                  <Button onClick={() => setIsEditingMappings(true)} className="rounded-xl bg-blue-600">
                    Create Mappings
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="rules" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 outline-none mt-0">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Validation Rules</h3>
          {job.validation_rules && job.validation_rules.length > 0 ? (
            <div className="space-y-4">
              {job.validation_rules.map((rule, idx) => (
                <div key={rule.id || idx} className="p-4 border border-slate-200 rounded-2xl flex items-center justify-between hover:border-blue-200 transition-colors bg-slate-50/50">
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      {rule.rule_name}
                      <Badge variant="outline" className="bg-white font-mono text-[10px]">{rule.rule_type}</Badge>
                    </h4>
                    <p className="text-sm text-slate-500 mt-1">
                      Applies to <span className="font-mono text-blue-600">{rule.target_column}</span>. 
                      On failure: <strong className="uppercase text-[10px] tracking-wider ml-1">{rule.on_failure}</strong>
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-600 max-w-xs overflow-hidden">
                    {JSON.stringify(rule.config)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No validation rules defined.</p>
          )}
        </TabsContent>

        <TabsContent value="runs" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 outline-none mt-0">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">Run History</h3>
            <Button variant="ghost" size="sm" className="rounded-xl text-blue-600 hover:bg-blue-50">
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
          
          {runsLoading ? (
            <div className="space-y-4"><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-16 w-full rounded-2xl" /></div>
          ) : runs.length > 0 ? (
            <div className="space-y-4">
              {runs.map((r) => (
                <div 
                  key={r.id} 
                  className="p-4 border border-slate-200 rounded-2xl flex items-center justify-between hover:border-blue-300 hover:shadow-md cursor-pointer transition-all bg-white"
                  onClick={() => router.push(`/data-room/integrations/${jobId}/runs/${r.id}`)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                      r.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                      r.status === 'failed' ? 'bg-red-100 text-red-600' :
                      r.status === 'running' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                      r.status === 'awaiting_review' ? 'bg-amber-100 text-amber-600' :
                      r.status === 'applying' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {r.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                       r.status === 'failed' ? <AlertCircle className="w-5 h-5" /> :
                       r.status === 'running' ? <RefreshCcw className="w-5 h-5 animate-spin" /> :
                       r.status === 'awaiting_review' ? <AlertCircle className="w-5 h-5" /> :
                       r.status === 'applying' ? <RefreshCcw className="w-5 h-5 animate-spin" /> :
                       <Clock className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 capitalize">
                        {r.status === 'awaiting_review' ? 'Waiting on you' : r.status.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">Started {r.started_at ? formatTimeAgo(r.started_at) : 'Waiting...'}</p>
                      {(r.status === 'failed' || r.error) && (
                        <p className="text-xs text-rose-600 truncate" title={jobFailureMessage(r, '')}>
                          {jobFailureMessage(r, 'This run failed. Open it to see the run ID.')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-black text-slate-900">{r.processed_records || 0}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Processed</p>
                    </div>
                    {r.review_records ? (
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-black text-amber-600">{r.review_records}</p>
                        <p className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">To Review</p>
                      </div>
                    ) : null}
                    <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-10">No runs recorded for this job yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
