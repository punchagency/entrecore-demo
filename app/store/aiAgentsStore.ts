import { isAxiosError } from "axios";
import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { Axios } from "../config/axios";

function getGuidesFetchErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    const detailMessage =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item?.msg ?? String(item)).join(", ")
          : null;

    if (!error.response) {
      return "Cannot reach the API server. Check your network and NEXT_PUBLIC_API_URL, then restart the dev server.";
    }
    if (status === 401) return "Session expired. Please log in again.";
    if (status === 403) return "You do not have permission to view guides for this company.";
    if (status === 404) {
      return "Guides API returned 404. Verify NEXT_PUBLIC_API_URL and ensure the guides endpoint path is correct (some backends require /data/guides/ with a trailing slash).";
    }
    return detailMessage || error.message || "Failed to fetch guides";
  }

  return error instanceof Error ? error.message : "Failed to fetch guides";
}

export interface GuideAction {
  id: string;
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface ModelSettings {
  temperature: number;
  max_tokens: number;
  technical_level?: string;
}

export interface ToolConfig {
  max_query_rows: number;
  enable_sql_querying: boolean;
  enable_data_analysis?: boolean;
}

export interface GeneratedConfig {
  agent_persona: string;
  communication_style: string;
  custom_instructions: string;
  enable_chat: boolean;
  enable_data_analysis: boolean;
  enable_memory: boolean;
  enable_tools: boolean;
  focus_areas: string[];
  preferred_output_format: string;
  response_length: string;
  specialization: string;
  technical_level: string;
  message: string;
}

export interface MetadataConfig {
  use_tools: boolean;
  chat_enabled: boolean;
  memory_enabled: boolean;
  data_processing: boolean;
  custom_prompts: Record<string, string>;
  model_settings: ModelSettings;
  tool_config: ToolConfig;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  model_type: string;
  model_version: string;
  model_metadata: string;
  agent_persona: string | null;
  communication_style: string | null;
  created_at: string;
  updated_at: string;
  datasets: string[];
  specialization: string | null;
  technical_level: string | null;
  error: string | null;
}

interface Datasets {
  id?: string;
  name?: string;
}
export interface GuideMetrics {
  totalMessages: number;
  lastActive: string;
  tasksCompleted: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface GuideDetail extends Guide {
  metrics?: GuideMetrics;
  conversationHistory?: Array<{
    id: string;
    message: string;
    sender: "user" | "assistant";
    timestamp: string;
    type?: string;
  }>;
}

export interface Guide {
  id?: string;
  name: string;
  description: string;
  model_type: string;
  model_version: string;
  model_metadata: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  actions?: GuideAction[];
  datasets?: Datasets[];
  // New schema fields based on the AI agent configuration
  agent?: Agent;
  generated_config?: GeneratedConfig;
  metadata_config?: MetadataConfig;

  // Legacy fields for backward compatibility
  config?: Record<string, any>;
  agent_persona?: string;
  specialization?: string;
  technical_level?: string;
}

export const AGENT_TYPE_DESCRIPTIONS = {
  "data-analyst": {
    title: "Data Analyst",
    description:
      "Specializes in KPIs, metrics, and business intelligence. Ideal for creating dashboards, analyzing performance trends, and generating business reports.",
    icon: "BarChart3",
    color: "blue",
  },
  "data-quality": {
    title: "Data Quality",
    description:
      "Focuses on data validation, cleansing, and integrity checks. Perfect for ensuring data accuracy, completeness, and consistency across your datasets.",
    icon: "Database",
    color: "emerald",
  },
  automation: {
    title: "Automation",
    description:
      "Handles workflow automation and process optimization. Great for scheduling tasks, automating data pipelines, and streamlining repetitive operations.",
    icon: "Zap",
    color: "purple",
  },
  "insight-generator": {
    title: "Insight Generator",
    description:
      "Generates predictive insights and forecasts from your data. Excellent for trend analysis, predictive modeling, and strategic recommendations.",
    icon: "TrendingUp",
    color: "orange",
  },
  custom: {
    title: "Custom",
    description:
      "Flexible agent type for specialized use cases. Configure custom parameters and actions to meet your specific business requirements.",
    icon: "Bot",
    color: "gray",
  },
};

export const AVAILABLE_ACTIONS: GuideAction[] = [
  {
    id: "data-quality-check",
    name: "Data Quality Check",
    description: "Analyze data quality metrics, missing values, and anomalies",
    parameters: {
      thresholds: { completeness: 95, accuracy: 90, consistency: 85 },
    },
  },
  {
    id: "trend-analysis",
    name: "Trend Analysis",
    description: "Identify trends and patterns in time-series data",
    parameters: {
      period: "30d",
      confidence: 0.85,
    },
  },
  {
    id: "anomaly-detection",
    name: "Anomaly Detection",
    description: "Detect unusual patterns or outliers in the dataset",
    parameters: {
      sensitivity: "medium",
      method: "isolation-forest",
    },
  },
  {
    id: "data-profiling",
    name: "Data Profiling",
    description: "Generate comprehensive data profile with statistics and distributions",
    parameters: {
      includeDistributions: true,
      sampleSize: 10000,
    },
  },
  {
    id: "correlation-analysis",
    name: "Correlation Analysis",
    description: "Find correlations between different data columns",
    parameters: {
      method: "pearson",
      threshold: 0.7,
    },
  },
  {
    id: "automated-insights",
    name: "Automated Insights",
    description: "Generate business insights and recommendations from data",
    parameters: {
      insightTypes: ["trends", "comparisons", "forecasts"],
    },
  },
  {
    id: "data-validation",
    name: "Data Validation",
    description: "Validate data against predefined business rules and constraints",
    parameters: {
      strictMode: false,
      customRules: [],
    },
  },
  {
    id: "report-generation",
    name: "Report Generation",
    description: "Generate automated reports with visualizations and summaries",
    parameters: {
      format: "pdf",
      includeCharts: true,
    },
  },
];

interface GuidesState {
  guides: Guide[];
  isLoading: boolean;
  error: string | null;

  // Guide detail state
  currentGuide: GuideDetail | null;
  isLoadingGuide: boolean;
  guideError: string | null;

  // Guide management
  fetchGuides: () => Promise<void>;
  addGuide: (guide: Omit<Guide, "id" | "createdAt">, llmProvider?: string) => void;
  createGuideFromPrompt: (prompt: string, llmProvider?: string) => Promise<Guide>;
  updateGuide: (id: string, updates: Partial<Guide>) => void;
  deleteGuide: (id: string) => void;
  startGuideProcessing: (id: string) => void;
  stopGuideProcessing: (id: string) => void;

  // Guide detail methods
  fetchGuideById: (guideId: string) => Promise<void>;
  getGuideById: (guideId: string) => Guide | undefined;
  clearCurrentGuide: () => void;

  // Dataset assignment
  assignDatasetToGuide: (guideId: string, datasetId: string, datasetName: string) => void;
  unassignDatasetFromGuide: (guideId: string, datasetId: string) => void;

  // Action management
  addActionToGuide: (guideId: string, action: GuideAction) => void;
  removeActionFromGuide: (guideId: string, actionId: string) => void;
  updateGuideActions: (guideId: string, actions: GuideAction[]) => void;

  // Utility functions
  getGuidesByDataset: (datasetId: string) => Guide[];
  getAvailableActions: () => GuideAction[];
  clearError: () => void;
}

export const useGuidesStore = create<GuidesState>()(
  persist(
    (set, get) => ({
      guides: [],
      isLoading: false,
      error: null,

      // Guide detail state
      currentGuide: null,
      isLoadingGuide: false,
      guideError: null,

      fetchGuides: async () => {
        set({ isLoading: true, error: null });

        try {
          const companyId = localStorage.getItem("selectedCompanyId");
          const url = companyId ? `/data/guides/?company_id=${companyId}` : "/data/guides/";
          const response = await Axios.get(url);

          if (response.status !== 200) {
            throw new Error("Failed to fetch guides");
          }

          const guides = response.data?.items || response.data || [];
          console.log(guides);
          // Ensure guides is always an array
          const guidesArray = Array.isArray(guides) ? guides : [];

          set({
            guides: guidesArray,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message = getGuidesFetchErrorMessage(error);
          console.error("[fetchGuides]", message, error);
          set({
            isLoading: false,
            error: message,
          });
        }
      },

      addGuide: async (guideData, llmProvider?: string) => {
        console.log(guideData);
        if (get().guides.find((guide) => guide.name === guideData.name)) {
          toast.error("Guide already exists");
          return;
        }

        const newGuide: Guide = {
          ...guideData,
          status: guideData.status || "inactive",
          model_type: guideData.model_type || "data-analyst",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        console.log(newGuide.metadata_config);

        // Add LLM provider to the payload if provided
        const payloadWithLLM = llmProvider ? { ...newGuide, llm_provider: llmProvider } : newGuide;

        if (
          newGuide.metadata_config?.use_tools ||
          newGuide.metadata_config?.chat_enabled ||
          newGuide.metadata_config?.memory_enabled ||
          newGuide.metadata_config?.data_processing
        ) {
          const response = await Axios.post("/data/guides/with-config", payloadWithLLM);
          if (response.status !== 201) {
            toast.error("Failed to create guide metadata");
            return;
          }
          newGuide.metadata_config = response.data.metadata_config;
          newGuide.id = response.data.id;
        } else {
          const response = await Axios.post("/data/guides/", payloadWithLLM);
          if (response.status !== 201) {
            toast.error("Failed to create guide");
            return;
          }
          newGuide.id = response.data.id;
        }

        toast.success(`Guide "${newGuide.name}" created successfully`);
        set((state) => ({
          guides: [...state.guides, newGuide],
        }));
      },

      createGuideFromPrompt: async (instructions: any, llmProvider?: string) => {
        const data = JSON.parse(instructions);
        const payload: any = {
          prompt: data.prompt,
          company_id: data.company_id,
          agent_name: data.name,
          agent_persona: data.expectedPersona,
        };

        // Add LLM provider if provided
        if (llmProvider) {
          payload.llm_provider = llmProvider;
        }

        const response = await Axios.post("/data/guides/from-prompt", payload);
        if (![200, 201].includes(response.status) || response.data.success === false) {
          throw new Error("Failed to create guide from prompt");
        }
        const newGuide = response.data.agent;
        set((state) => ({
          guides: [newGuide, ...state.guides],
        }));
        return response.data;
      },

      updateGuide: async (guide_id, updates) => {
        const response = await Axios.put(`/data/guides/${guide_id}`, updates);
        if (response.status !== 200) {
          throw new Error("Failed to update guide");
        }

        set((state) => ({
          guides: state.guides.map((guide) =>
            guide.id === guide_id ? { ...guide, ...updates } : guide
          ),
        }));
      },

      deleteGuide: async (guide_id) => {
        const response = await Axios.delete(`/data/guides/${guide_id}`);
        if (response.status !== 204) {
          toast.error("Failed to delete guide");
          return;
        }
        toast.success(`Guide "${guide_id}" deleted successfully`);

        set((state) => ({
          guides: state.guides.filter((guide) => guide.id !== guide_id),
        }));
      },

      startGuideProcessing: (id: string) => {
        set((state) => ({
          guides: state.guides.map((guide) =>
            guide.id === id
              ? {
                  ...guide,
                  status: "active",
                }
              : guide
          ),
        }));
      },

      stopGuideProcessing: (id: string) => {
        set((state) => ({
          guides: state.guides.map((guide) =>
            guide.id === id
              ? {
                  ...guide,
                  status: "inactive",
                }
              : guide
          ),
        }));
      },

      assignDatasetToGuide: async (guideId, datasetId, datasetName) => {
        const response = await Axios.post(`/data/guides/${guideId}/datasets/assign`, {
          dataset_ids: [datasetId],
        });
        if (response.status !== 200) {
          throw new Error("Failed to assign dataset to guide");
        }

        set((state) => ({
          guides: state.guides.map((guide) => {
            if (guide.id !== guideId) return guide;
            const existing = guide.datasets || [];
            const alreadyAssigned = existing.some((d) => d.id === datasetId);
            return alreadyAssigned
              ? guide
              : { ...guide, datasets: [...existing, { id: datasetId, name: datasetName }] };
          }),
        }));
      },

      unassignDatasetFromGuide: async (guideId, datasetId) => {
        const response = await Axios.post(`/data/guides/${guideId}/datasets/remove`, {
          dataset_ids: [datasetId],
        });
        if (response.status !== 200) {
          throw new Error("Failed to unassign dataset from guide");
        }
        toast.success(`Dataset successfully removed from guide`);
        set((state) => ({
          guides: state.guides.map((guide) => {
            if (guide.id !== guideId) return guide;
            const existing = guide.datasets || [];
            return { ...guide, datasets: existing.filter((d) => d.id !== datasetId) };
          }),
        }));
      },

      addActionToGuide: (guideId, action) => {
        set((state) => ({
          guides: state.guides.map((guide) =>
            guide.id === guideId ? { ...guide, actions: [...(guide.actions || []), action] } : guide
          ),
        }));
      },

      removeActionFromGuide: (guideId, actionId) => {
        set((state) => ({
          guides: state.guides.map((guide) =>
            guide.id === guideId
              ? {
                  ...guide,
                  actions: guide.actions?.filter((action) => action.id !== actionId) || [],
                }
              : guide
          ),
        }));
      },

      updateGuideActions: (guideId, actions) => {
        set((state) => ({
          guides: state.guides.map((guide) =>
            guide.id === guideId ? { ...guide, actions } : guide
          ),
        }));
      },

      getGuidesByDataset: (datasetId) => {
        return get().guides.filter((guide) => guide.datasets?.find((i) => i.id === datasetId));
      },

      getAvailableActions: () => {
        return AVAILABLE_ACTIONS;
      },

      fetchGuideById: async (guideId: string) => {
        set({ isLoadingGuide: true, guideError: null });

        try {
          // First try to get from local store
          const localGuide = get().guides.find((g) => g.id === guideId);

          // Then fetch detailed data from API
          const response = await Axios.get(`/data/guides/${guideId}`);

          if (response.status !== 200) {
            throw new Error("Failed to fetch guide details");
          }

          const guideData = response.data;

          // Merge local data with detailed API data
          const detailedGuide: GuideDetail = {
            ...(localGuide || {}),
            ...guideData,
            // Add mock metrics for now - replace with real API data
            metrics: {
              totalMessages: guideData.totalMessages || 0,
              lastActive: guideData.lastActive || new Date().toISOString(),
              tasksCompleted: guideData.tasksCompleted || 0,
              averageResponseTime: guideData.averageResponseTime || 0,
              errorRate: guideData.errorRate || 0,
            },
            conversationHistory: guideData.conversationHistory || [],
          };

          set({
            currentGuide: detailedGuide,
            isLoadingGuide: false,
            guideError: null,
          });
        } catch (error) {
          set({
            currentGuide: null,
            isLoadingGuide: false,
            guideError: error instanceof Error ? error.message : "Failed to fetch guide details",
          });
        }
      },

      getGuideById: (guideId: string) => {
        return get().guides.find((g) => g.id === guideId);
      },

      clearCurrentGuide: () => {
        set({ currentGuide: null, guideError: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "guides-storage",
      partialize: (state) => ({
        guides: state.guides,
      }),
    }
  )
);
