"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Network, Play, Calendar, AlertCircle, ArrowRight, CheckCircle2, History, Bot, RefreshCw } from "lucide-react";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import { useIntegrationJobs, useActivateJob, useTriggerRun, useToggleSchedule } from "./hooks/use-data-integrations";
import { IntegrationJob, resolveUpsertKeys } from "./services/data-integration-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

/**
 * Whether a job appends or updates, and — when it updates — which columns it
 * matches rows on.
 *
 * Shown for BOTH modes deliberately. An upsert-only badge makes "this job
 * appends" and "this card was rendered before the feature existed" look
 * identical, and appending silently is exactly the behaviour people get caught
 * out by.
 */
function WriteModeBadge({ job }: { job: IntegrationJob }) {
  const keys = resolveUpsertKeys(job);

  if (keys.length === 0) {
    return (
      <Badge
        variant="secondary"
        className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none flex items-center gap-1"
        title="Every run adds new rows. Existing rows are never changed."
      >
        <Plus className="w-3 h-3" /> Append
      </Badge>
    );
  }

  return (
    <Badge
      className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none flex items-center gap-1"
      title={`Rows are matched on ${keys.join(" + ")} — a row is updated only when ${
        keys.length > 1 ? "all of these agree" : "this agrees"
      }.`}
    >
      <RefreshCw className="w-3 h-3" /> Upsert: {keys.join(" + ")}
    </Badge>
  );
}

export default function IntegrationsDashboard() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useIntegrationJobs(page, 20);
  
  const activateMutation = useActivateJob();
  const triggerRunMutation = useTriggerRun();
  const toggleScheduleMutation = useToggleSchedule();

  const handleActivate = (job: IntegrationJob) => {
    activateMutation.mutate(job.id, {
      onSuccess: () => toast.success("Job activated successfully"),
      onError: () => toast.error("Failed to activate job"),
    });
  };

  const handleRun = (job: IntegrationJob) => {
    triggerRunMutation.mutate(
      { jobId: job.id },
      {
        onSuccess: (run) => {
          toast.success("Run triggered successfully");
          router.push(`/data-room/integrations/${job.id}/runs/${run.id}`);
        },
        onError: () => toast.error("Failed to trigger run"),
      }
    );
  };

  const handleToggleSchedule = (job: IntegrationJob, enable: boolean) => {
    toggleScheduleMutation.mutate(
      { id: job.id, enable },
      {
        onSuccess: () => toast.success(`Schedule ${enable ? 'enabled' : 'disabled'}`),
        onError: () => toast.error("Failed to update schedule"),
      }
    );
  };

  const jobs = data?.jobs || [];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
              <Network className="w-6 h-6 text-white" />
            </div>
            Data Integrations
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Manage data pipelines, schedule imports, and map source to destination schemas.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="rounded-xl border-slate-200 shadow-sm"
            onClick={() => router.push("/data-room/integrations/review")}
          >
            <History className="w-4 h-4 mr-2" />
            Review Queue
          </Button>
          
          <Button 
            className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
            onClick={() => router.push("/data-room/integrations/create")}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Integration
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-3xl" />
          ))
        ) : jobs.length === 0 ? (
          <div className="col-span-1 lg:col-span-2 py-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Network className="w-10 h-10 text-blue-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">No Integrations Found</h3>
            <p className="text-slate-500 mt-2 max-w-md">
              Create your first integration job to start moving data from sources into the intelligence hub.
            </p>
            <Button 
              className="mt-6 rounded-xl bg-blue-600 hover:bg-blue-700"
              onClick={() => router.push("/data-room/integrations/create")}
            >
              <Plus className="w-4 h-4 mr-2" /> Create Integration
            </Button>
          </div>
        ) : (
          jobs.map((job) => (
            <Card key={job.id} className="rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-blue-200/60 transition-all overflow-hidden group">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{job.name}</h3>
                        {job.status === 'active' && (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Active</Badge>
                        )}
                        {job.status === 'draft' && (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none">Draft</Badge>
                        )}
                        {job.status === 'pending_mapping_approval' && (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none flex items-center gap-1">
                            <Bot className="w-3 h-3" /> AI Mapping
                          </Badge>
                        )}
                        {/* Write mode at a glance — previously only discoverable
                            by opening the job and reading its run logs. Shown for
                            BOTH modes: "no badge" would be indistinguishable from
                            "this card predates the feature". */}
                        <WriteModeBadge job={job} />
                      </div>
                      {job.description && (
                        <p className="text-sm text-slate-500 line-clamp-1">{job.description}</p>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => router.push(`/data-room/integrations/${job.id}`)}
                    >
                      <ArrowRight className="w-5 h-5 text-slate-400" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 mb-6">
                    <Badge variant="outline" className="font-mono text-[10px] bg-slate-50">
                      {job.source_table || job.source_type}
                    </Badge>
                    <ArrowRight className="w-3 h-3 text-slate-300" />
                    <Badge variant="outline" className="font-mono text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                      {job.destination_table}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                    <div className="flex flex-col gap-1">
                      {job.schedule_cron ? (
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={job.schedule_enabled} 
                            onCheckedChange={(val) => handleToggleSchedule(job, val)}
                            disabled={job.status !== 'active'}
                          />
                          <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {job.schedule_cron}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Manual trigger only</span>
                      )}
                      
                      {job.schedule_last_run_at && (
                        <span className="text-[10px] text-slate-400">
                          Last run: {formatTimeAgo(job.schedule_last_run_at)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {job.status === 'active' ? (
                        <Button 
                          size="sm" 
                          className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                          onClick={() => handleRun(job)}
                          disabled={triggerRunMutation.isPending}
                        >
                          <Play className="w-3.5 h-3.5 mr-1" /> Run Now
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => handleActivate(job)}
                          disabled={activateMutation.isPending}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Activate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
