"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, ChevronDown, Loader2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { jobFailureMessage, showApiErrorToast } from "@/utils/api-error";
import { JobFailureReason } from "@/components/job-failure-reason";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseApiUtcDate } from "@/lib/datetime";
import {
  useFailedDratRuns,
  useRerunFailedDratRun,
  useRejectFailedDratRun,
} from "../hooks/use-drat-log";

function failedNodeLabel(node: string | null | undefined): string {
  if (!node) return "pipeline";
  return node.replace(/^drat_/, "").replace(/_/g, " ");
}

export function DratFailedRunsCard() {
  const { data, isLoading } = useFailedDratRuns();
  const rerun = useRerunFailedDratRun();
  const reject = useRejectFailedDratRun();
  const [open, setOpen] = useState(false);
  const [busyRun, setBusyRun] = useState<string | null>(null);

  const failedRuns = data?.items ?? [];

  const handleRerun = (runId: string, filename: string) => {
    setBusyRun(runId);
    rerun.mutate(runId, {
      onSuccess: () => {
        toast.success(`Re-queued "${filename}"`);
        setBusyRun(null);
      },
      onError: (error) => {
        showApiErrorToast(error, "Failed to re-queue run");
        setBusyRun(null);
      },
    });
  };

  const handleReject = (runId: string, filename: string) => {
    setBusyRun(runId);
    reject.mutate(runId, {
      onSuccess: () => {
        toast.success(`Rejected "${filename}"`);
        setBusyRun(null);
      },
      onError: (error) => {
        showApiErrorToast(error, "Failed to reject run");
        setBusyRun(null);
      },
    });
  };

  if (isLoading || failedRuns.length === 0) return null;

  return (
    <div className="rounded-2xl border border-rose-200/70 bg-rose-50/70 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-rose-50 transition-colors"
      >
        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
        <p className="text-sm font-semibold text-rose-800">
          {failedRuns.length} failed {failedRuns.length === 1 ? "run" : "runs"} — review
        </p>
        <p className="text-xs text-rose-600/80 hidden sm:block">
          Documents that stopped at a failed step; re-queue or reject them here.
        </p>
        <ChevronDown
          className={`h-4 w-4 ml-auto text-rose-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="divide-y divide-rose-100 border-t border-rose-100">
          {failedRuns.map((run) => (
            <div
              key={run.run_id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {run.filename || run.run_id}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {run.entity_name && (
                    <span className="text-xs text-slate-600">{run.entity_name}</span>
                  )}
                  <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-200 bg-rose-50/50">
                    failed at {failedNodeLabel(run.failed_node)}
                  </Badge>
                  {run.started_at && (
                    <span className="text-[10px] text-slate-400">
                      {formatDistanceToNow(parseApiUtcDate(run.started_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <JobFailureReason
                  className="mt-2 text-xs"
                  reason={jobFailureMessage(run, "This filing failed.")}
                  runId={run.run_id}
                />
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                  variant="outline"
                  disabled={busyRun === run.run_id}
                  onClick={() => handleReject(run.run_id, run.filename || run.run_id)}
                >
                  {busyRun === run.run_id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </Button>
                <Button
                  className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                  variant="outline"
                  disabled={busyRun === run.run_id}
                  onClick={() => handleRerun(run.run_id, run.filename || run.run_id)}
                >
                  {busyRun === run.run_id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Re-queue
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}