"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Play,
  Trash2,
  Clock,
  XCircle,
  Activity,
  Database,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Zap,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Axios } from "@/app/config/axios";
import { usePlatformConnectorId } from "../hooks/usePlatformConnectorId";
import { erpTypeFromAppName } from "../services/platform-connector-api";
import { Button } from "@/components/ui/button";
import { Company } from "@/app/store/companiesStore";
import { EditConnectorConfigDialog } from "./edit-connector-config-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { startELTPipeline } from "@/utils/lineage-api";
import { getApiErrorMessage } from "@/utils/api-error";
import { formatDistanceToNow } from "date-fns";
import { useCrawlJobStore } from "@/app/store/crawlJobStore";
import { CompactLogViewer } from "@/components/log-viewer";

const shimmerStyles = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  .shimmer-bg-primary {
    background: linear-gradient(90deg, #3064F6 0%, #5078F7 50%, #3064F6 100%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
  .shimmer-bg-amber {
    background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
`;

interface CrawlResult {
  errors?: string[];
  datasets_crawled?: number;
  tables_crawled?: number;
  columns_crawled?: number;
  rows_crawled?: number;
  total_columns?: number;
  status?: string;
  tables_count?: number;
}

interface ProfileResult {
  errors?: string[];
  tables_profiled?: number;
  columns_profiled?: number;
  status?: string;
  tables_count?: number;
}

// Define the new Job interface locally to avoid import conflicts
interface JobData {
  id: string;
  job_type: "crawl" | "profile";
  status: "pending" | "running" | "completed" | "failed";
  connector_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error?: string;
  result?: {
    // For running jobs
    progress?: string;
    last_updated?: number;
    elapsed_seconds?: number;
    datasets_crawled?: number;
    tables_crawled?: number;
    columns_crawled?: number;
    rows_crawled?: number;
    total_columns?: number;
    status?: string;
    tables_count?: number;
    tables_profiled?: number;
    columns_profiled?: number;
    // For completed jobs
    errors?: string[];
    message?: string;
    crawl_result?: {
      errors?: string[];
      tables_crawled?: number;
    };
    connector_type?: string;
    profile_result?: {
      errors?: string[];
      message?: string;
      tables_failed?: number;
      tables_profiled?: number;
    };
    operations_completed?: string[];
  };
}

interface ELTPipelineJob {
  pipeline_id: string;
  status: string;
  company_id: string;
  entity: string;
  pipeline_type: string;
  started_at: string;
  completed_at: string;
  duration_minutes: number;
  records_processed: number;
}

interface CrawlJobResponse {
  job_id: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
}

interface ConnectorDropdownProps {
  appName: string;
  appId?: number;
  /** Explicit connector id, overrides erp_type catalog lookup. */
  connectorId?: string;
  /** Hides the "Edit Configuration" menu item, for connector types EditConnectorConfigDialog
   * doesn't have a form for (it would otherwise silently submit the wrong shape). */
  hideEditConfig?: boolean;
  onToggleFavorite?: () => void;
  onRemove?: (appId: number, appName: string) => void;
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  onDropdownClose?: () => void;
  selectedCompany?: Company | null;
}

export function ConnectorDropdown({
  appName,
  appId,
  connectorId,
  hideEditConfig = false,
  onToggleFavorite,
  onRemove,
  children,
  className,
  align = "end",
  onDropdownClose,
  selectedCompany,
}: ConnectorDropdownProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [showJobStatus, setShowJobStatus] = useState(false);
  const [showJobLoading, setShowJobLoading] = useState(false);
  const [showEditConfig, setShowEditConfig] = useState(false);
  const [jobLoadingType, setJobLoadingType] = useState<"crawl" | "profile" | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobData["status"] | "all">("all");
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Enhanced job management with logging
  const {
    createJob,
    updateJobStatus,
    updateJobProgress,
    getJob,
    startRealTimePolling,
    stopRealTimePolling,
    jobs: enhancedJobs
  } = useCrawlJobStore();

  const erpType = erpTypeFromAppName(appName);
  const envFallback =
    erpType === "bigquery"
      ? process.env.NEXT_PUBLIC_BIG_QUERY_CONNECTOR_ID
      : erpType === "netsuite"
        ? process.env.NEXT_PUBLIC_NET_SUITE_CONNECTOR_ID
        : erpType === "airtable"
          ? process.env.NEXT_PUBLIC_AIRTABLE_CONNECTOR_ID
          : erpType === "notion"
            ? process.env.NEXT_PUBLIC_NOTION_CONNECTOR_ID
            : erpType === "google_drive"
              ? process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CONNECTOR_ID
              : undefined;
  const {
    connectorId: resolvedConnectorId,
    isResolving: isResolvingConnectorId,
    resolveError: resolveConnectorIdError,
  } = usePlatformConnectorId(erpType ?? "", envFallback);
  const CONNECTOR_ID = connectorId || resolvedConnectorId || "";

  console.log(appName, "app name");

  const filteredJobs = jobs.filter((job: JobData) => {
    const normalizedJobStatus = job.status?.toLowerCase().trim();
    const normalizedStatusFilter = statusFilter?.toLowerCase().trim();

    const effectiveJobStatus = normalizedJobStatus === "running" ? "pending" : normalizedJobStatus;

    const matchesStatus = statusFilter === "all" || effectiveJobStatus === normalizedStatusFilter;
    return matchesStatus;
  });

  const menuItems = [
    // { id: "start-elt", name: "Start ELT Pipeline", icon: Play },
    { id: "start-crawl-and-profile", name: "Sync", icon: Play },
    { id: "get-status", name: "View Jobs", icon: RefreshCw },
    { id: "view-drift", name: "View Drift", icon: Activity },
    ...(hideEditConfig ? [] : [{ id: "edit-config", name: "Edit Configuration", icon: Settings }]),
    { id: "remove-config", name: "Remove", icon: Trash2 },
  ];

  const getStatusIcon = (status: JobData["status"]) => {
    const normalizedStatus = status?.toLowerCase().trim();
    switch (normalizedStatus) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-amber-500 animate-pulse" />;
      case "running":
        return <Clock className="h-5 w-5 text-primary animate-pulse" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  // const getJobTypeIcon = (type: Job["job_type"]) => {
  //   switch (type) {
  //     case "crawl":
  //       return <Database className="h-5 w-5 text-primary" />;
  //     case "profile":
  //       return <Activity className="h-5 w-5 text-primary" />;
  //     default:
  //       return null;
  //   }
  // };

  const terminateJobs = async (jobsToTerminate: JobData[]) => {
    // Attempt to delete jobs, but proceed even if it fails (e.g. 404 if job doesn't exist)
    const promises = jobsToTerminate.map((job) =>
      Axios.delete(`/data/jobs/${job.id}`).catch((err) => {
        console.warn(`Failed to delete job ${job.id}`, err);
        return null;
      })
    );

    await Promise.all(promises);

    toast.message("Starting new job...", {
      description: "Previous jobs have been cleared or ignored."
    });

    // Refresh the jobs list
    getJobs();

    // Force start the new crawl after a short delay
    setTimeout(() => {
      crawlAndProfileConnector(true);
    }, 1000);
  };

  const crawlAndProfileConnector = async (force: boolean = false) => {
    try {
      if (!selectedCompany?.id) {
        toast.error("No company selected. Please select a company from the dropdown.");
        return;
      }

      // Without a connector id the request URL collapses to `/data/connectors//...`,
      // which the API rejects as a validation error instead of a readable message.
      if (!CONNECTOR_ID) {
        toast.error(
          isResolvingConnectorId
            ? `Still loading the ${appName} connector. Try again in a moment.`
            : resolveConnectorIdError || `${appName} is not available on this platform yet.`
        );
        return;
      }

      // Check for existing crawl jobs before starting a new one
      const jobsEndpoint = `/data/jobs/connector/${CONNECTOR_ID}`;
      const jobsResponse = await Axios.get<JobData[]>(jobsEndpoint, {
        params: {
          company_id: selectedCompany.id,
          limit: 100,
          offset: 0,
        },
      });

      // Check if there's already a crawl job running or pending
      const activeCrawlJobs = jobsResponse.data.filter(
        (job) => job.job_type === "crawl" && (job.status === "running" || job.status === "pending")
      );

      // If force is true, we skip this check
      if (activeCrawlJobs.length > 0 && !force) {
        toast("A crawl job is already running", {
          description: "Would you like to terminate it and start a new one?",
          action: {
            label: "Terminate & Start",
            onClick: () => terminateJobs(activeCrawlJobs),
          },
          duration: 8000,
        });
        return;
      }

      setJobLoadingType("crawl");
      setShowJobLoading(true);

      // Use the new combined crawl and profile endpoint
      const endpoint = `/data/connectors/${CONNECTOR_ID}/crawl-and-profile?company_id=${selectedCompany.id}`;

      const response = await Axios.post<CrawlJobResponse>(endpoint);
      const actualBackendJobId = response.data.job_id;

      // Create enhanced job with real backend job ID
      const storeJobId = createJob({
        jobId: actualBackendJobId,
        type: "crawl",
        status: "pending",
        progress: 0,
        message: "Job queued and waiting to start",
        companyId: selectedCompany.id,
        connectorId: CONNECTOR_ID,
        estimatedDuration: 300, // 5 minutes estimated
      });

      setActiveJobId(storeJobId);

      // Start real-time polling for this job
      startRealTimePolling(storeJobId, CONNECTOR_ID, selectedCompany.id);

      toast.success("Crawl and profile job started successfully");
      setShowJobLoading(false);

      getJobs();
    } catch (error) {
      console.error("Crawl and profile error:", error);
      const errorMessage = getApiErrorMessage(error, "Failed to start crawl and profile job");
      toast.error(errorMessage);
      setShowJobLoading(false);

      // Update job status to failed if we created one
      if (activeJobId) {
        updateJobStatus(activeJobId, "failed", errorMessage);
        stopRealTimePolling(activeJobId);
      }
    }
  };

  const getJobs = async () => {
    try {
      if (!selectedCompany?.id) {
        toast.error("No company selected. Please select a company from the dropdown.");
        return;
      }

      setIsLoadingJobs(true);

      // Use the new unified endpoint for getting jobs by connector
      const endpoint = `/data/jobs/connector/${CONNECTOR_ID}`;

      const response = await Axios.get<JobData[]>(endpoint, {
        params: {
          company_id: selectedCompany.id,
          limit: 100, // Get up to 100 jobs
          offset: 0,
        },
      });

      setJobs(response.data);
      setShowJobStatus(true);
    } catch (error) {
      console.error("Get jobs error:", error);
      const errorMessage = getApiErrorMessage(error, "Failed to get jobs");
      toast.error(errorMessage);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const removeConnectorConfig = async () => {
    try {
      if (!selectedCompany?.id) {
        toast.error("No company selected. Please select a company from the dropdown.");
        return;
      }

      const normalizedName = appName.toLowerCase().replace(/\s+/g, "");
      if (!CONNECTOR_ID) {
        toast.error(`${appName} is not available on this platform yet.`);
        return;
      }
      if (normalizedName === "bigquery") {
        const response = await Axios.get(`/data/connectors/${CONNECTOR_ID}/configs`, {
          params: { company_id: selectedCompany.id },
        });

        if (response.data && response.data.length > 0) {
          const configId = response.data[0].id;
          await Axios.delete(`/data/connectors/${CONNECTOR_ID}/configs/${configId}`);
        }

        try {
          const key = `bigquery_connected_${selectedCompany.id}`;
          localStorage.removeItem(key);
        } catch (error) {
          console.warn("Failed to clear BigQuery state from localStorage:", error);
        }
      } else if (normalizedName === "netsuite") {
        const response = await Axios.get(`/data/connectors/${CONNECTOR_ID}/configs`, {
          params: { company_id: selectedCompany.id },
        });

        if (response.data && response.data.length > 0) {
          const configId = response.data[0].id;
          await Axios.delete(`/data/connectors/${CONNECTOR_ID}/configs/${configId}`);
        }

        try {
          const key = `netsuite_connected_${selectedCompany.id}`;
          localStorage.removeItem(key);
        } catch (error) {
          console.warn("Failed to clear NetSuite state from localStorage:", error);
        }
      } else if (normalizedName === "airtable") {
        const response = await Axios.get(`/data/connectors/${CONNECTOR_ID}/configs`, {
          params: { company_id: selectedCompany.id },
        });

        if (response.data && response.data.length > 0) {
          const configId = response.data[0].id;
          await Axios.delete(`/data/connectors/${CONNECTOR_ID}/configs/${configId}`);
        }

        try {
          const key = `airtable_connected_${selectedCompany.id}`;
          localStorage.removeItem(key);
        } catch (error) {
          console.warn("Failed to clear Airtable state from localStorage:", error);
        }
      } else if (normalizedName === "notion") {
        const response = await Axios.get(`/data/connectors/${CONNECTOR_ID}/configs`, {
          params: { company_id: selectedCompany.id },
        });

        if (response.data && response.data.length > 0) {
          const configId = response.data[0].id;
          await Axios.delete(`/data/connectors/${CONNECTOR_ID}/configs/${configId}`);
        }

        try {
          const key = `notion_connected_${selectedCompany.id}`;
          localStorage.removeItem(key);
        } catch (error) {
          console.warn("Failed to clear Notion state from localStorage:", error);
        }
      } else {
        // Generic fallback for connector types without a hardcoded env-var id (e.g. Google Drive)
        const response = await Axios.get(`/data/connectors/${CONNECTOR_ID}/configs`, {
          params: { company_id: selectedCompany.id },
        });

        if (response.data && response.data.length > 0) {
          const configId = response.data[0].id;
          await Axios.delete(`/data/connectors/${CONNECTOR_ID}/configs/${configId}`);
        }

        try {
          const key = `${normalizedName}_connected_${selectedCompany.id}`;
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`Failed to clear ${appName} state from localStorage:`, error);
        }
      }

      onToggleFavorite?.();
      onRemove?.(appId || 0, appName);
      toast.success(`${appName} removed successfully`);
    } catch (error) {
      console.error("Remove config error:", error);
      const errorMessage = getApiErrorMessage(error, "Failed to remove configuration");
      toast.error(errorMessage);
    }
  };

  const handleMenuItemClick = async (itemId: string) => {
    setMenuOpen(false);
    switch (itemId) {
      case "view-drift":
        if (CONNECTOR_ID) {
          router.push(`/connectors/${CONNECTOR_ID}/drift`);
        } else {
          toast.error("Connector ID not available");
        }
        if (onDropdownClose) {
          onDropdownClose();
        }
        break;
      case "start-crawl-and-profile":
        crawlAndProfileConnector();
        // Close dropdown immediately when opening dialog
        if (onDropdownClose) {
          onDropdownClose();
        }
        break;
      case "start-elt":
        const response = await startELTPipeline({
          company_id: selectedCompany?.id || "",
          connector_id: CONNECTOR_ID,
          entity: "customer",
          config: {
            extract_method: "full",
            transform_method: "dbt",
            load_method: "bigquery",
          },
        });

        if (response?.success) {
          toast.success(response.message || "ELT pipeline started successfully");
        }

        // Close dropdown immediately when opening dialog
        if (onDropdownClose) {
          onDropdownClose();
        }
        break;
      case "get-status":
        await getJobs();
        // Close dropdown immediately when opening dialog
        if (onDropdownClose) {
          onDropdownClose();
        }
        break;
      case "edit-config":
        setShowEditConfig(true);
        // Close dropdown immediately when opening dialog
        if (onDropdownClose) {
          onDropdownClose();
        }
        break;
      case "remove-config":
        removeConnectorConfig();
        break;
      case "remove":
        onToggleFavorite?.();
        break;
    }
  };

  const toggleErrorExpansion = (jobId: string) => {
    setExpandedErrors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: shimmerStyles }} />
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
          if (!open && onDropdownClose) {
            onDropdownClose();
          }
        }}
      >
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          className={cn(
            "w-[240px] bg-white/90 backdrop-blur-2xl rounded-[1.8rem] border border-white/60 shadow-[0_20px_50px_rgba(37,99,235,0.1)] p-2",
            className
          )}
          sideOffset={10}
        >
          <div className="px-4 py-2 mb-1">
            <span className="text-[10px] font-black text-blue-600/60 uppercase tracking-[0.2em]">{appName}</span>
          </div>

          {menuItems.slice(0, -1).map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer focus:bg-blue-600 focus:text-white transition-all group"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMenuItemClick(item.id);
              }}
            >
              <item.icon className="h-4 w-4 text-blue-500 group-focus:text-white transition-colors" />
              <span className="text-sm font-bold tracking-tight">{item.name}</span>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="bg-blue-100/30 my-2 mx-2" />

          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer focus:bg-red-500 focus:text-white transition-all group text-red-600"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(false);
              removeConnectorConfig();
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500 group-focus:text-white transition-colors" />
            <span className="text-sm font-bold tracking-tight">Remove Connector</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={showJobLoading}
        onOpenChange={(open) => {
          setShowJobLoading(open);
          if (!open && onDropdownClose) {
            onDropdownClose();
          }
        }}
      >
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>
              Starting {jobLoadingType === "crawl" ? "Crawl" : "Profile"} Job
            </DialogTitle>
          </DialogHeader>
          <div
            className="py-6 flex flex-col items-center justify-center space-y-4"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600 text-center">
              Starting {jobLoadingType === "crawl" ? "crawl" : "profile"} job, this might take a
              moment...
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showJobStatus}
        onOpenChange={(open) => {
          setShowJobStatus(open);
          if (!open && onDropdownClose) {
            onDropdownClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-[650px] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] mx-auto max-h-[90vh] bg-white/90 backdrop-blur-3xl rounded-[2.5rem] border-white/60 shadow-[0_30px_90px_rgba(37,99,235,0.15)] flex flex-col p-8 p-0 gap-0 overflow-hidden">
          <div className="flex items-center justify-between p-8 pb-4">
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-gray-900">Job Orchestrator</DialogTitle>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time status monitor</p>
            </div>
          </div>
          <div
            className="flex-1 space-y-6 overflow-y-auto px-8 custom-scrollbar pb-8"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/40 backdrop-blur-md z-10 py-4 -mx-2 px-2 rounded-2xl border border-white/20 shadow-sm">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "All Hubs" },
                    { value: "completed", label: "Completed", icon: CheckCircle2, color: "text-green-500" },
                    { value: "failed", label: "Failed", icon: XCircle, color: "text-red-500" },
                    { value: "pending", label: "Queued", icon: Clock, color: "text-amber-500" },
                    { value: "running", label: "Active", icon: Activity, color: "text-blue-500" },
                  ].map(({ value, label, icon: Icon, color }) => (
                    <Button
                      key={value}
                      size="sm"
                      variant="ghost"
                      onClick={() => setStatusFilter(value as JobData["status"] | "all")}
                      className={cn(
                        "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border",
                        statusFilter === value
                          ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25"
                          : "bg-white/50 text-gray-400 border-white/50 hover:bg-white hover:text-gray-900"
                      )}
                    >
                      {Icon && <Icon className={cn("mr-2 h-3.5 w-3.5", statusFilter === value ? "text-white" : color)} />}
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">
                    Displaying {filteredJobs.length} Process{filteredJobs.length !== 1 ? "es" : ""}
                  </span>
                </div>
              </div>
            </div>

            {isLoadingJobs ? (
              <div className="py-8 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {jobs.length === 0 ? "No jobs found" : "No jobs match the selected filters"}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job: JobData) => {
                  const enhancedJob = Object.values(enhancedJobs).find((ej) => ej.jobId === job.id);
                  const rawStatus = enhancedJob?.status || job.status;
                  const uiStatus = rawStatus === "starting" ? "pending" : rawStatus;
                  const normalizedStatus = uiStatus?.toLowerCase();
                  const inlineLogsJobId =
                    (enhancedJob && enhancedJob.logs.length > 0 && enhancedJob.id) ||
                    (activeJobId && enhancedJobs[activeJobId]?.logs.length > 0 ? activeJobId : undefined);

                  const effectiveResult = enhancedJob?.result || job.result;
                  const effectiveError = enhancedJob?.error || job.error;
                  const resultAny = effectiveResult as any;
                  const effectiveMessage = (resultAny?.message as string) || job.result?.message;
                  const effectiveOperations = (resultAny?.operations_completed as string[]) || job.result?.operations_completed;
                  const effectiveCrawl = (resultAny?.crawl_result as CrawlResult | undefined) || job.result?.crawl_result;
                  const effectiveProfile =
                    (resultAny?.profile_result as ProfileResult | undefined) || job.result?.profile_result;
                  const effectiveProgress =
                    typeof resultAny?.progress === "string" ? (resultAny.progress as string) : undefined;
                  const effectiveElapsedSeconds =
                    (resultAny?.elapsed_seconds as number | undefined) ?? (resultAny?.elapsedTime as number | undefined);
                  const effectiveConnectorType = (resultAny?.connector_type as string | undefined) || job.result?.connector_type;

                  return (
                    <div
                      key={job.id}
                      className={cn(
                        "group relative rounded-[2rem] border transition-all duration-500",
                        normalizedStatus === "completed"
                          ? "bg-white/40 border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.06)]"
                          : normalizedStatus === "failed"
                            ? "bg-red-50/30 border-red-100 shadow-[0_8px_30px_rgba(239,68,68,0.05)]"
                            : "bg-blue-50/30 border-blue-100 shadow-[0_8px_30px_rgba(37,99,235,0.05)]"
                      )}
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border",
                              normalizedStatus === "failed" ? "bg-red-50 border-red-100 text-red-500" : "bg-blue-50 border-blue-100 text-blue-500"
                            )}>
                              <Database className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="text-lg font-black tracking-tight capitalize text-gray-900 leading-tight">
                                {job.job_type} Engine
                              </h3>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                Initiated{" "}
                                {job.created_at
                                  ? formatDistanceToNow(new Date(job.created_at + "Z"), {
                                    addSuffix: true,
                                    includeSeconds: true,
                                  })
                                  : "Recently"}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {getStatusIcon((uiStatus || "pending") as JobData["status"])}
                            {(normalizedStatus === "pending" || normalizedStatus === "running") && (
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 rounded-full shadow-lg shadow-blue-500/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                <span className="text-[10px] font-black text-white uppercase tracking-wider">
                                  {normalizedStatus === "running" ? "Active" : "Queued"}
                                </span>
                              </div>
                            )}
                            {normalizedStatus === "completed" && (
                              <div className="px-3 py-1 bg-green-500 rounded-full shadow-lg shadow-green-500/20">
                                <span className="text-[10px] font-black text-white uppercase tracking-wider">Success</span>
                              </div>
                            )}
                            {normalizedStatus === "failed" && (
                              <div className="px-3 py-1 bg-red-500 rounded-full shadow-lg shadow-red-500/20">
                                <span className="text-[10px] font-black text-white uppercase tracking-wider">Failed</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {(normalizedStatus === "pending" || normalizedStatus === "running") && (
                          <div
                            className={cn(
                              "mt-3 p-4 rounded-2xl border transition-colors",
                              normalizedStatus === "pending"
                                ? "bg-amber-50/30 border-amber-100"
                                : "bg-blue-50/30 border-blue-100"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "w-3 h-3 rounded-full",
                                  normalizedStatus === "pending"
                                    ? "bg-amber-500"
                                    : "bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]"
                                )}
                              />
                              <span
                                className={cn(
                                  "text-xs font-black uppercase tracking-widest",
                                  normalizedStatus === "pending" ? "text-amber-700" : "text-blue-700"
                                )}
                              >
                                {normalizedStatus === "running" && effectiveProgress
                                  ? effectiveProgress
                                  : normalizedStatus === "running"
                                    ? `Executing ${job.job_type} cycles...`
                                    : `Initializing sequence...`}
                              </span>
                            </div>
                            {effectiveElapsedSeconds !== undefined && (
                              <div className="mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Uptime: {Math.floor(effectiveElapsedSeconds / 60)}m{" "}
                                {effectiveElapsedSeconds % 60}s
                              </div>
                            )}

                            {inlineLogsJobId && (
                              <div className="mt-4 border-t border-gray-100 pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Terminal className="h-3.5 w-3.5 text-blue-600" />
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Kernel Activity ({enhancedJobs[inlineLogsJobId].logs.length})
                                  </span>
                                </div>
                                <CompactLogViewer jobId={inlineLogsJobId} maxLogs={5} />
                              </div>
                            )}
                          </div>
                        )}

                        {normalizedStatus === "completed" && effectiveMessage && (
                          <div className="mt-4 p-5 rounded-[1.5rem] bg-gradient-to-br from-green-50/50 to-white/30 border border-green-100/50 relative overflow-hidden group/message">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover/message:opacity-20 transition-opacity">
                              <CheckCircle2 className="h-12 w-12 text-green-600" />
                            </div>
                            <div className="relative z-10">
                              <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <Activity className="h-3 w-3" />
                                System Report
                              </p>
                              <p className="text-sm font-black text-gray-950 leading-relaxed">
                                {effectiveMessage}
                              </p>
                            </div>
                          </div>
                        )}

                        {normalizedStatus === "completed" && effectiveOperations && (
                          <div className="mt-4 p-5 rounded-[1.5rem] bg-white/40 border border-white/60">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                              <Zap className="h-3 w-3 text-blue-600" />
                              Modules Executed
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {effectiveOperations.map((operation: string, index: number) => (
                                <div
                                  key={index}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-blue-500/20"
                                >
                                  {operation}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {normalizedStatus === "completed" && (
                          <div className="mt-4 grid grid-cols-1 gap-4">
                            {effectiveCrawl && (
                              <div className="bg-white/40 p-5 rounded-[1.5rem] border border-white/60 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <Database className="h-4 w-4 text-blue-600" />
                                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Extraction Log</span>
                                  </div>
                                  {effectiveConnectorType && (
                                    <span className="px-2.5 py-1 bg-gray-900 text-white text-[9px] font-black uppercase tracking-tighter rounded-full">
                                      {effectiveConnectorType}
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-white/20">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Tables Scanned</span>
                                    <span className="text-sm font-black text-gray-900">
                                      {effectiveCrawl?.tables_crawled || 0}
                                    </span>
                                  </div>
                                  {effectiveCrawl?.errors && effectiveCrawl.errors.length > 0 && (
                                    <div className="mt-2">
                                      <button
                                        onClick={() => toggleErrorExpansion(`crawl-${job.id}`)}
                                        className="flex items-center gap-2 w-full p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100 transition-colors"
                                      >
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="text-xs font-black uppercase tracking-widest flex-1 text-left">
                                          {effectiveCrawl.errors.length} Anomalies Detected
                                        </span>
                                      </button>
                                      {expandedErrors.has(`crawl-${job.id}`) && (
                                        <div className="mt-2 p-4 bg-red-50/50 rounded-2xl border border-red-100 text-[11px] font-medium text-red-600 leading-relaxed font-mono">
                                          {effectiveCrawl.errors.map((error: string, idx: number) => (
                                            <div key={idx} className="mb-1">
                                              {">"} {error}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {effectiveProfile && (
                              <div className="bg-white/40 p-5 rounded-[1.5rem] border border-white/60 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                  <Activity className="h-4 w-4 text-blue-600" />
                                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Intelligence Log</span>
                                </div>
                                {(() => {
                                  const profileDetails = effectiveProfile as any;
                                  const profileErrors = (profileDetails?.errors as string[] | undefined) || effectiveProfile?.errors;
                                  const profileFailed = profileDetails?.tables_failed as number | undefined;
                                  const profileMessage = profileDetails?.message as string | undefined;
                                  const profileTablesProfiled =
                                    (profileDetails?.tables_profiled as number | undefined) ||
                                    effectiveProfile?.tables_profiled ||
                                    0;
                                  return (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1 p-3 bg-white/50 rounded-xl border border-white/20">
                                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Profiled</span>
                                          <span className="text-lg font-black text-gray-900">{profileTablesProfiled}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 p-3 bg-white/50 rounded-xl border border-white/20">
                                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Failed</span>
                                          <span className={cn("text-lg font-black", profileFailed && profileFailed > 0 ? "text-red-600" : "text-gray-900")}>
                                            {profileFailed || 0}
                                          </span>
                                        </div>
                                      </div>

                                      {profileMessage && (
                                        <div className="p-3 bg-blue-50/50 rounded-xl text-[10px] font-bold text-blue-700 tracking-tight italic">
                                          "{profileMessage}"
                                        </div>
                                      )}

                                      {profileErrors && profileErrors.length > 0 && (
                                        <div className="mt-2">
                                          <button
                                            onClick={() => toggleErrorExpansion(`profile-${job.id}`)}
                                            className="flex items-center gap-2 w-full p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100 transition-colors"
                                          >
                                            <AlertCircle className="h-4 w-4" />
                                            <span className="text-xs font-black uppercase tracking-widest flex-1 text-left">
                                              {profileErrors.length} Profiling Errors
                                            </span>
                                          </button>
                                          {expandedErrors.has(`profile-${job.id}`) && (
                                            <div className="mt-2 p-4 bg-red-50/50 rounded-2xl border border-red-100 text-[11px] font-medium text-red-600 leading-relaxed font-mono">
                                              {profileErrors.map((error: string, idx: number) => (
                                                <div key={idx} className="mb-1">
                                                  {">"} {error}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Fallback for old structure */}
                        {!effectiveCrawl && !effectiveProfile && (
                          <div className="space-y-3">
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Database className="h-4 w-4 text-gray-600" />
                                <span className="text-sm font-medium">Job Type</span>
                              </div>
                              <span className="text-lg font-bold capitalize">{job.job_type}</span>
                            </div>
                            {effectiveElapsedSeconds !== undefined && (
                              <div className="bg-gray-50 p-2 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-gray-600" />
                                  <span className="text-sm font-medium">Duration</span>
                                </div>
                                <span className="text-lg font-bold">
                                  {Math.floor((effectiveElapsedSeconds || 0) / 60)}m{" "}
                                  {(effectiveElapsedSeconds || 0) % 60}s
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {normalizedStatus === "completed" && (job.completed_at || enhancedJob?.completedAt) && (
                          <div className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                            Process Concluded{" "}
                            {formatDistanceToNow(
                              new Date(
                                (job.completed_at ? job.completed_at + "Z" : "") ||
                                new Date(enhancedJob?.completedAt || Date.now()).toISOString()
                              ),
                              {
                                addSuffix: true,
                                includeSeconds: true,
                              }
                            )}
                          </div>
                        )}

                        {normalizedStatus === "failed" && effectiveError && (
                          <div className="mt-4 p-5 rounded-[1.5rem] bg-red-50/50 border border-red-100/50">
                            <div className="flex items-center gap-2 mb-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">Protocol Failure</span>
                            </div>
                            <span className="text-sm font-bold text-red-600 leading-relaxed font-mono">{effectiveError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <EditConnectorConfigDialog
        isOpen={showEditConfig}
        onClose={() => {
          setShowEditConfig(false);
          if (onDropdownClose) {
            onDropdownClose();
          }
        }}
        onBack={() => {
          setShowEditConfig(false);
          if (onDropdownClose) {
            onDropdownClose();
          }
        }}
        connectorId={CONNECTOR_ID}
        selectedCompany={selectedCompany}
      />

    </>
  );
}
