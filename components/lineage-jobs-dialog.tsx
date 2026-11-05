"use client";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchJobs, Job, fetchJobStatus } from "@/utils/lineage-api";
import { GitBranch, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

interface LineageJobsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LineageJobsDialog({ open, onOpenChange }: LineageJobsDialogProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadJobs = async () => {
    const companyId = localStorage.getItem("selectedCompanyId");
    if (!companyId) {
      toast.error("No company selected");
      return;
    }
    try {
      setIsLoading(true);
      const items = await fetchJobs({ company_id: companyId });
      setJobs(items || []);
    } catch (e) {
      toast.error("Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadJobs();
  }, [open]);

  // const refreshJob = async (jobId: string) => {
  //   try {
  //     const data = await fetchJobStatus(jobId);
  //     setJobs((prev) => prev.map((j) => (j.id === jobId ? data : j)));
  //   } catch (e) {
  //     toast.error("Failed to refresh job");
  //   }
  // };

  const getStatusIcon = (status: Job["status"]) => {
    const normalized = (status || "").toLowerCase();
    switch (normalized) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-amber-500 animate-pulse" />;
      case "running":
        return <Clock className="h-5 w-5 text-primary animate-pulse" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getJobTypeIcon = (type: Job["pipeline_type"]) => {
    return <GitBranch className="h-5 w-5 text-gray-400" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Lineage Jobs</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">Showing lineage crawl jobs for this company</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={loadJobs} disabled={isLoading}>
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-10 text-gray-600">
              <GitBranch className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-500">No lineage jobs found</div>
              <div className="text-xs text-gray-400 mt-1">
                Start a lineage crawl to see jobs here
              </div>
            </div>
          ) : (
            <div className="space-y-3 pr-2">
              {jobs.map((job) => (
                <div
                  key={job.pipeline_id}
                  className={`rounded-lg border overflow-hidden ${
                    job.status === "pending"
                      ? "border-amber-200 bg-gradient-to-r from-amber-50/50 to-white"
                      : job.status === "running"
                        ? "border-primary/20 bg-gradient-to-r from-blue-50/50 to-white"
                        : job.status === "completed"
                          ? "border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-white"
                          : job.status === "failed"
                            ? "border-red-200 bg-gradient-to-r from-red-50/50 to-white"
                            : "border-gray-200"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getJobTypeIcon(job.pipeline_type)}
                        <div>
                          <div className="text-sm font-semibold">ELT Pipeline</div>
                          <div className="text-xs text-gray-500">
                            Created {new Date(job.started_at || "").toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusIcon(job.status)}
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            job.status === "pending"
                              ? "text-amber-700 bg-amber-100"
                              : job.status === "running"
                                ? "text-primary bg-blue-100"
                                : job.status === "completed"
                                  ? "text-emerald-700 bg-emerald-100"
                                  : job.status === "failed"
                                    ? "text-red-700 bg-red-100"
                                    : "text-gray-700 bg-gray-100"
                          }`}
                        >
                          {job.status === "running"
                            ? "In Progress"
                            : job.status === "pending"
                              ? "Queued"
                              : job.status === "completed"
                                ? "Completed"
                                : job.status === "failed"
                                  ? "Failed"
                                  : job.status}
                        </span>
                        {job.status !== "completed" && job.status !== "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchJobStatus(job.pipeline_id)}
                          >
                            Check Status
                          </Button>
                        )}
                      </div>
                    </div>

                    {(job.status === "pending" || job.status === "running") && (
                      <div
                        className={`mt-3 p-3 rounded-lg border ${
                          job.status === "pending"
                            ? "bg-amber-50/50 border-amber-100"
                            : "bg-blue-50/50 border-primary/10"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              job.status === "pending" ? "bg-amber-500" : "bg-primary animate-pulse"
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              job.status === "pending" ? "text-amber-700" : "text-primary"
                            }`}
                          >
                            {job.status === "running"
                              ? "Processing data..."
                              : "ELT pipeline is queued and waiting to start"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* {job.error && job.error !== "" && (
                      <div className="mt-3 p-3 rounded-lg border border-red-100 bg-red-50/50">
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-red-700 mb-1">
                              Error Details
                            </div>
                            <div className="text-xs text-red-600 font-mono">{job.error}</div>
                          </div>
                        </div>
                      </div>
                    )} */}

                    {/* Removed green success strip as requested */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
