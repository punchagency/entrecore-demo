import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Axios } from "@/app/config/axios";

export interface CrawlJobLog {
  id: string;
  timestamp: number;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  metadata?: Record<string, any>;
  jobId: string;
}

export interface CrawlJob {
  id: string;
  jobId: string; // Backend job ID
  type: "crawl" | "profile" | "lineage" | "elt";
  status: "pending" | "starting" | "running" | "completed" | "failed" | "cancelled";
  progress: number; // 0-100
  message: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  estimatedDuration?: number; // in seconds
  elapsedTime?: number; // in seconds
  connectorId?: string;
  companyId: string;
  tableId?: string;
  columnId?: string;
  logs: CrawlJobLog[];
  result?: {
    tablesCrawled?: number;
    columnsCrawled?: number;
    rowsCrawled?: number;
    datasetsCrawled?: number;
    errors?: string[];
    message?: string;
  };
  error?: string;
}

interface CrawlJobState {
  // Jobs management
  jobs: Record<string, CrawlJob>;
  activeJobs: Record<string, string>; // jobId -> storeJobId
  isLoading: boolean;

  // Log streaming
  isStreaming: boolean;
  streamingJobId?: string;
  streamingStates: Record<string, {
    lastMessageIndex: number;
    messageCount: number;
    timeoutId?: NodeJS.Timeout;
  }>;

  // Real-time polling
  pollingStates: Record<string, {
    intervalId?: NodeJS.Timeout;
    lastStatus?: string;
    lastProgress?: number;
    pollCount: number;
  }>;

  // Actions
  createJob: (job: Omit<CrawlJob, "id" | "createdAt" | "logs">) => string;
  updateJob: (jobId: string, updates: Partial<CrawlJob>) => void;
  removeJob: (jobId: string) => void;
  getJob: (jobId: string) => CrawlJob | undefined;
  getJobsByStatus: (status: CrawlJob["status"]) => CrawlJob[];
  getActiveJobs: () => CrawlJob[];

  // Log management
  addLog: (jobId: string, log: Omit<CrawlJobLog, "id" | "timestamp">) => void;
  addLogs: (jobId: string, logs: Omit<CrawlJobLog, "id" | "timestamp">[]) => void;
  clearLogs: (jobId: string) => void;
  getLogs: (jobId: string) => CrawlJobLog[];

  // Status management
  updateJobStatus: (jobId: string, status: CrawlJob["status"], message?: string) => void;
  updateJobProgress: (jobId: string, progress: number, message?: string) => void;

  // Real-time polling
  startRealTimePolling: (jobId: string, connectorId: string, companyId: string) => void;
  stopRealTimePolling: (jobId: string) => void;

  // Streaming (keep for demo purposes)
  startLogStreaming: (jobId: string) => void;
  stopLogStreaming: () => void;

  // Utility
  clearCompletedJobs: () => void;
  clearAllJobs: () => void;
}

const generateId = () => `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useCrawlJobStore = create<CrawlJobState>()(
  subscribeWithSelector((set, get) => ({
    jobs: {},
    activeJobs: {},
    isLoading: false,
    isStreaming: false,
    streamingJobId: undefined,
    streamingStates: {},
    pollingStates: {},

    createJob: (jobData) => {
      const id = generateId();
      const job: CrawlJob = {
        ...jobData,
        id,
        createdAt: Date.now(),
        logs: [],
        status: "pending",
        progress: 0,
      };

      set((state) => ({
        jobs: { ...state.jobs, [id]: job },
        activeJobs: { ...state.activeJobs, [jobData.jobId]: id },
      }));

      return id;
    },

    updateJob: (jobId, updates) => {
      set((state) => ({
        jobs: {
          ...state.jobs,
          [jobId]: { ...state.jobs[jobId], ...updates },
        },
      }));
    },

    removeJob: (jobId) => {
      set((state) => {
        const job = state.jobs[jobId];
        if (!job) return state;

        const { [jobId]: removed, ...remainingJobs } = state.jobs;
        const { [job.jobId]: removedActive, ...remainingActive } = state.activeJobs;

        return {
          jobs: remainingJobs,
          activeJobs: remainingActive,
        };
      });
    },

    getJob: (jobId) => {
      return get().jobs[jobId];
    },

    getJobsByStatus: (status) => {
      return Object.values(get().jobs).filter((job) => job.status === status);
    },

    getActiveJobs: () => {
      return Object.values(get().jobs).filter(
        (job) => job.status === "pending" || job.status === "starting" || job.status === "running"
      );
    },

    addLog: (jobId, logData) => {
      const log: CrawlJobLog = {
        ...logData,
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      set((state) => ({
        jobs: {
          ...state.jobs,
          [jobId]: {
            ...state.jobs[jobId],
            logs: [...state.jobs[jobId].logs, log],
          },
        },
      }));
    },

    addLogs: (jobId, logsData) => {
      const logs: CrawlJobLog[] = logsData.map((logData) => ({
        ...logData,
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      }));

      set((state) => ({
        jobs: {
          ...state.jobs,
          [jobId]: {
            ...state.jobs[jobId],
            logs: [...state.jobs[jobId].logs, ...logs],
          },
        },
      }));
    },

    clearLogs: (jobId) => {
      set((state) => ({
        jobs: {
          ...state.jobs,
          [jobId]: {
            ...state.jobs[jobId],
            logs: [],
          },
        },
      }));
    },

    getLogs: (jobId) => {
      return get().jobs[jobId]?.logs || [];
    },

    updateJobStatus: (jobId, status, message) => {
      const updates: Partial<CrawlJob> = { status };

      if (message) {
        updates.message = message;
      }

      if (status === "running" && !get().jobs[jobId]?.startedAt) {
        updates.startedAt = Date.now();
      }

      if (status === "completed" || status === "failed" || status === "cancelled") {
        updates.completedAt = Date.now();
        if (get().jobs[jobId]?.startedAt) {
          updates.elapsedTime = Math.floor((Date.now() - get().jobs[jobId]!.startedAt!) / 1000);
        }
      }

      get().updateJob(jobId, updates);
    },

    updateJobProgress: (jobId, progress, message) => {
      const updates: Partial<CrawlJob> = { progress };

      if (message) {
        updates.message = message;
      }

      if (progress > 0 && !get().jobs[jobId]?.startedAt) {
        updates.startedAt = Date.now();
        updates.status = "running";
      }

      get().updateJob(jobId, updates);
    },

    startRealTimePolling: (jobId, connectorId, companyId) => {
      const state = get();
      const job = state.jobs[jobId];

      if (!job) return;

      // Initialize polling state
      set((prevState) => ({
        pollingStates: {
          ...prevState.pollingStates,
          [jobId]: {
            pollCount: 0,
            lastStatus: job.status,
            lastProgress: job.progress,
          }
        }
      }));

      // Add initial log
      get().addLog(jobId, {
        level: "info",
        message: "Starting real-time job monitoring...",
        jobId,
      });

      const pollJobStatus = async () => {
        const currentState = get();
        const pollingState = currentState.pollingStates[jobId];
        const currentJob = currentState.jobs[jobId];

        if (!pollingState || !currentJob) {
          get().stopRealTimePolling(jobId);
          return;
        }

        try {
          // Poll the backend for job status
          const response = await Axios.get(`/data/jobs/connector/${connectorId}`, {
            params: {
              company_id: companyId,
              limit: 10,
              offset: 0,
            },
          });

          const backendJobs = response.data;
          const backendJob = backendJobs.find((j: any) => j.id === job.jobId || j.job_id === job.jobId);

          if (backendJob) {
            const newStatus = backendJob.status as CrawlJob["status"];
            const newProgress = backendJob.result?.progress ?
              parseInt(backendJob.result.progress.replace('%', '')) || 0 : 0;
            const progressMessage = backendJob.result?.progress || backendJob.result?.message;

            // Status changed - add log
            if (newStatus !== pollingState.lastStatus) {
              get().addLog(jobId, {
                level: newStatus === "failed" ? "error" : "info",
                message: `Job status changed to: ${newStatus}`,
                jobId,
                metadata: {
                  previousStatus: pollingState.lastStatus,
                  newStatus,
                  backendData: backendJob
                }
              });

              get().updateJobStatus(jobId, newStatus, progressMessage);
            }

            // Progress changed - add log
            if (newProgress !== pollingState.lastProgress && newProgress > pollingState.lastProgress!) {
              get().addLog(jobId, {
                level: "info",
                message: progressMessage || `Progress: ${newProgress}%`,
                jobId,
                metadata: {
                  progress: newProgress,
                  previousProgress: pollingState.lastProgress,
                  backendData: backendJob
                }
              });

              get().updateJobProgress(jobId, newProgress, progressMessage);
            }

            // Add detailed progress information
            if (backendJob.result && pollingState.pollCount % 3 === 0) {
              const details = [];

              if (backendJob.result.tables_crawled !== undefined) {
                details.push(`Tables crawled: ${backendJob.result.tables_crawled}`);
              }
              if (backendJob.result.columns_crawled !== undefined) {
                details.push(`Columns crawled: ${backendJob.result.columns_crawled}`);
              }
              if (backendJob.result.rows_crawled !== undefined) {
                details.push(`Rows crawled: ${backendJob.result.rows_crawled}`);
              }
              if (backendJob.result.elapsed_seconds) {
                const minutes = Math.floor(backendJob.result.elapsed_seconds / 60);
                const seconds = backendJob.result.elapsed_seconds % 60;
                details.push(`Elapsed: ${minutes}m ${seconds}s`);
              }

              if (details.length > 0) {
                get().addLog(jobId, {
                  level: "info",
                  message: `Job details: ${details.join(', ')}`,
                  jobId,
                  metadata: {
                    detailedProgress: true,
                    backendData: backendJob
                  }
                });
              }
            }

            // Handle errors
            if (backendJob.error || (backendJob.result?.errors?.length > 0)) {
              const errors = backendJob.result?.errors || [backendJob.error];
              errors.forEach((error: string) => {
                get().addLog(jobId, {
                  level: "error",
                  message: `Error: ${error}`,
                  jobId,
                });
              });
            }

            // Update polling state
            set((prevState) => ({
              pollingStates: {
                ...prevState.pollingStates,
                [jobId]: {
                  ...prevState.pollingStates[jobId],
                  lastStatus: newStatus,
                  lastProgress: newProgress,
                  pollCount: prevState.pollingStates[jobId].pollCount + 1,
                }
              }
            }));

            // Stop polling if job is completed or failed
            if (newStatus === "completed" || newStatus === "failed") {
              get().addLog(jobId, {
                level: newStatus === "completed" ? "info" : "error",
                message: `Job ${newStatus}${backendJob.result?.message ? `: ${backendJob.result.message}` : ''}`,
                jobId,
                metadata: {
                  finalStatus: true,
                  backendData: backendJob
                }
              });

              // Update job with final results
              get().updateJob(jobId, {
                result: backendJob.result,
                error: backendJob.error,
              });

              get().stopRealTimePolling(jobId);
              return;
            }
          }
        } catch (error) {
          console.error("Error polling job status:", error);
          get().addLog(jobId, {
            level: "warning",
            message: "Failed to fetch job status, will retry...",
            jobId,
            metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }

        // Schedule next poll (every 3 seconds)
        const intervalId = setTimeout(pollJobStatus, 3000);
        set((prevState) => ({
          pollingStates: {
            ...prevState.pollingStates,
            [jobId]: {
              ...prevState.pollingStates[jobId],
              intervalId,
            }
          }
        }));
      };

      // Start polling
      const initialIntervalId = setTimeout(pollJobStatus, 2000); // Start after 2 seconds
      set((prevState) => ({
        pollingStates: {
          ...prevState.pollingStates,
          [jobId]: {
            ...prevState.pollingStates[jobId],
            intervalId: initialIntervalId,
          }
        }
      }));
    },

    stopRealTimePolling: (jobId) => {
      set((state) => {
        const pollingState = state.pollingStates[jobId];
        if (pollingState?.intervalId) {
          clearTimeout(pollingState.intervalId);
        }

        const { [jobId]: removed, ...remainingStates } = state.pollingStates;

        return {
          pollingStates: remainingStates,
        };
      });

      get().addLog(jobId, {
        level: "info",
        message: "Stopped real-time job monitoring",
        jobId,
      });
    },

    startLogStreaming: (jobId) => {
      set((state) => ({
        isStreaming: true,
        streamingJobId: jobId,
        streamingStates: {
          ...state.streamingStates,
          [jobId]: {
            lastMessageIndex: -1,
            messageCount: 0,
          }
        }
      }));

      // Simulate real-time log streaming (replace with actual WebSocket/SSE implementation)
      const streamLogs = () => {
        const state = get();
        const job = state.jobs[jobId];
        const streamingState = state.streamingStates[jobId];

        if (!job || !state.isStreaming || state.streamingJobId !== jobId || !streamingState) {
          return;
        }

        if (job.status === "pending") {
          if (streamingState.messageCount === 0) {
            get().addLog(jobId, {
              level: "info",
              message: "Job is queued and waiting to start...",
              jobId,
            });

            set((state) => ({
              streamingStates: {
                ...state.streamingStates,
                [jobId]: {
                  ...state.streamingStates[jobId],
                  messageCount: 1,
                }
              }
            }));
          }

          // Check status every 2 seconds
          const timeoutId = setTimeout(streamLogs, 2000);
          set((state) => ({
            streamingStates: {
              ...state.streamingStates,
              [jobId]: {
                ...state.streamingStates[jobId],
                timeoutId,
              }
            }
          }));
        } else if (job.status === "starting") {
          if (streamingState.messageCount <= 1) {
            get().addLog(jobId, {
              level: "info",
              message: "Initializing crawl job...",
              jobId,
            });

            set((state) => ({
              streamingStates: {
                ...state.streamingStates,
                [jobId]: {
                  ...state.streamingStates[jobId],
                  messageCount: 2,
                }
              }
            }));
          }

          const timeoutId = setTimeout(streamLogs, 1500);
          set((state) => ({
            streamingStates: {
              ...state.streamingStates,
              [jobId]: {
                ...state.streamingStates[jobId],
                timeoutId,
              }
            }
          }));
        } else if (job.status === "running") {
          const progressMessages = [
            "Connecting to data source...",
            "Authenticating with data provider...",
            "Scanning available tables...",
            "Analyzing table schemas...",
            "Extracting column metadata...",
            "Processing data types...",
            "Validating data integrity...",
            "Building lineage relationships...",
            "Generating data quality reports...",
            "Finalizing crawl results...",
          ];

          const currentProgress = job.progress;

          // Only add a new log if progress has advanced significantly or it's been a while
          if (currentProgress < 100) {
            // Calculate message index based on progress
            const baseIndex = Math.floor((currentProgress / 100) * progressMessages.length);
            const messageIndex = Math.min(baseIndex, progressMessages.length - 1);

            // Only add log if we haven't shown this message recently
            if (messageIndex > streamingState.lastMessageIndex) {
              const message = progressMessages[messageIndex];

              get().addLog(jobId, {
                level: "info",
                message,
                jobId,
                metadata: {
                  progress: currentProgress,
                  messageIndex,
                  totalMessages: progressMessages.length
                }
              });

              set((state) => ({
                streamingStates: {
                  ...state.streamingStates,
                  [jobId]: {
                    ...state.streamingStates[jobId],
                    lastMessageIndex: messageIndex,
                    messageCount: streamingState.messageCount + 1,
                  }
                }
              }));
            }

            // Continue streaming with variable intervals
            const delay = 2000 + Math.random() * 2000; // 2-4 seconds
            const timeoutId = setTimeout(streamLogs, delay);
            set((state) => ({
              streamingStates: {
                ...state.streamingStates,
                [jobId]: {
                  ...state.streamingStates[jobId],
                  timeoutId,
                }
              }
            }));
          } else {
            // Job completed
            get().addLog(jobId, {
              level: "info",
              message: "Crawl job completed successfully!",
              jobId,
            });
          }
        }
      };

      // Start streaming
      const initialTimeoutId = setTimeout(streamLogs, 1000);
      set((state) => ({
        streamingStates: {
          ...state.streamingStates,
          [jobId]: {
            ...state.streamingStates[jobId],
            timeoutId: initialTimeoutId,
          }
        }
      }));
    },

    stopLogStreaming: () => {
      const state = get();
      const currentJobId = state.streamingJobId;

      if (currentJobId) {
        const timeoutId = state.streamingStates[currentJobId]?.timeoutId;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const { [currentJobId]: removed, ...remainingStates } = state.streamingStates;

        set({
          isStreaming: false,
          streamingJobId: undefined,
          streamingStates: remainingStates,
        });
      } else {
        set({ isStreaming: false, streamingJobId: undefined });
      }
    },

    clearCompletedJobs: () => {
      set((state) => {
        const remainingJobs = Object.fromEntries(
          Object.entries(state.jobs).filter(([_, job]) =>
            !["completed", "failed", "cancelled"].includes(job.status)
          )
        );

        const remainingActiveJobs = Object.fromEntries(
          Object.entries(state.activeJobs).filter(([backendJobId, storeJobId]) =>
            remainingJobs[storeJobId]
          )
        );

        return {
          jobs: remainingJobs,
          activeJobs: remainingActiveJobs,
        };
      });
    },

    clearAllJobs: () => {
      // Clear any active timeouts
      const state = get();
      Object.values(state.streamingStates).forEach((streamingState) => {
        if (streamingState?.timeoutId) {
          clearTimeout(streamingState.timeoutId);
        }
      });

      Object.values(state.pollingStates).forEach((pollingState) => {
        if (pollingState?.intervalId) {
          clearTimeout(pollingState.intervalId);
        }
      });

      set({
        jobs: {},
        activeJobs: {},
        isStreaming: false,
        streamingJobId: undefined,
        streamingStates: {},
        pollingStates: {}
      });
    },
  }))
);

// Subscription to automatically update job status based on progress
useCrawlJobStore.subscribe(
  (state) => state.jobs,
  (jobs, prevJobs) => {
    // Only auto-complete if the job wasn't manually completed
    Object.values(jobs).forEach((job) => {
      const prevJob = prevJobs[job.id];
      if (job.status === "running" && job.progress >= 100 &&
        (!prevJob || prevJob.status !== "completed")) {
        useCrawlJobStore.getState().updateJobStatus(job.id, "completed", "Crawl & profile completed successfully");
      }
    });
  }
);

// Stable empty value: a selector returning a fresh [] makes zustand re-render endlessly.
const NO_LOGS: CrawlJobLog[] = [];

// Hook for real-time job monitoring. The store is read unconditionally (hooks can't depend on
// whether a jobId was passed); the selectors handle the missing id instead.
export const useCrawlJobMonitor = (jobId?: string) => {
  const job = useCrawlJobStore((state) => (jobId ? state.jobs[jobId] : undefined));
  const logs = useCrawlJobStore((state) => (jobId ? state.jobs[jobId]?.logs : undefined)) ?? NO_LOGS;
  const isStreaming = useCrawlJobStore((state) => state.isStreaming && state.streamingJobId === jobId);

  return { job, logs, isStreaming };
};

// Hook for active jobs
export const useActiveCrawlJobs = () => {
  const activeJobs = useCrawlJobStore((state) => state.getActiveJobs());
  const isLoading = useCrawlJobStore((state) => state.isLoading);

  return { activeJobs, isLoading };
};