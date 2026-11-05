import { Axios } from "@/app/config/axios";
import { Edge, Node } from "reactflow";
import { toast } from "sonner";

interface StartLineageCrawlPayload {
  company_id: string;
  table_id: string;
  column_id?: string;
}

interface ELTPipelineConfig {
  extract_method: string;
  transform_method: string;
  load_method: string;
}

interface StartELTPipelinePayload {
  company_id: string;
  entity: string;
  config: ELTPipelineConfig;
  connector_id?: string;
}

interface StartCrawlResponse {
  job_id?: string;
  status?: string;
  message?: string;
  success?: boolean;
  records_processed?: number;
}

export const startTableLineageCrawl = async (payload: StartLineageCrawlPayload) => {
  const response = await Axios.post<StartCrawlResponse>(
    `/data/lineage/start-lineage-crawl`,
    payload
  );
  return response.data;
};

export const startELTPipeline = async (payload: StartELTPipelinePayload) => {
  try {
    const response = await Axios.post<StartCrawlResponse>(`/data/elt/pipeline/start`, payload);
    if (response.status === 202) {
      response.data["success"] = true;
    }
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 409) {
      toast.error("A pipeline is already running");
      return { success: false, message: "A pipeline is already running" };
    }
    throw error;
  }
};

export const startAgnosticELTPipeline = async (payload: {
  company_id: string;
  table_id: string;
}) => {
  try {
    const response = await Axios.post<StartCrawlResponse>(
      `/data/elt/pipeline/agnostic/start`,
      payload
    );
    if (response.status === 202) {
      response.data["success"] = true;
    }
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 409) {
      toast.error("A pipeline is already running");
      return { success: false, message: "A pipeline is already running" };
    }
    throw error;
  }
};

export const stageTable = async (payload: {
  company_id: string;
  table_id: string;
  destination_connector_id?: string;
}) => {
  try {
    const response = await Axios.post<StartCrawlResponse>(
      `/data/elt/pipeline/stage`,
      payload
    );
    if (response.status === 202 || response.status === 200) {
      response.data["success"] = true;
    }
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 409) {
      toast.error("A pipeline stage is already in progress");
      return { success: false, message: "A pipeline stage is already in progress" };
    }
    if (error.response?.status === 400) {
      // No repository connector configured — let the caller handle the error message
      throw error;
    }
    throw error;
  }
};

export interface LineageNodeData {
  label: string;
  table_id?: string;
  column_id?: string;
  node_type: "table" | "column";
  transformation_type?: string;
  pipeline_stage?: string;
  data_quality_score?: number;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface LineageNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: LineageNodeData;
  style?: Record<string, any>;
  className?: string;
}

export interface LineageEdgeData {
  label?: string;
  transformation_type?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface LineageGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  type?: string;
  style?: Record<string, any>;
  data?: LineageEdgeData;
}

export interface EnhancedLineageGraphResponse {
  nodes: LineageNode[];
  edges: LineageGraphEdge[];
  metadata?: Record<string, any>;
}

export interface ReactFlowGraphResponse {
  nodes: Node[];
  edges: Edge[];
}

export const fetchReactFlowGraph = async (params: {
  company_id: string;
  table_id: string;
  column_id?: string;
}) => {
  const response = await Axios.post<ReactFlowGraphResponse>(
    `/data/lineage/graph/reactflow`,
    params
  );
  return response.data;
};

export interface Job {
  pipeline_id: string;
  status: "pending" | "running" | "completed" | "failed" | string;
  company_id?: string;
  entity: string;
  pipeline_type: string;
  completed_at?: string;
  started_at?: string;
  duration_minutes?: number;
  records_processed?: number;
}

export const fetchJobs = async (params: { company_id: string }) => {
  const response = await Axios.get<{ items: Job[] }>(`/data/elt/pipeline`, { params });
  return response.data.items;
};

export const fetchJobStatus = async (pipelineId: string) => {
  const response = await Axios.get<Job>(`/data/elt/pipeline/${pipelineId}/status`);
  return response.data;
};

export interface LineageEdge {
  id: string;
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
  source_schema?: string;
  target_schema?: string;
  transformation?: string;
  created_at?: string;
  updated_at?: string;
  company_id?: string;
  confidence?: number;
  is_active?: boolean;
  relationship_type?: string;
  source_column_id?: string;
  source_table_id?: string;
  target_column_id?: string;
  target_table_id?: string;
}

export const getLineageEdges = async (data: {
  company_id: string;
  include_pipelines: boolean;
  include_quality_indicators: boolean;
  layout_algorithm: string;
}) => {
  const response = await Axios.post<EnhancedLineageGraphResponse>("/data/lineage/graph/enhanced", {
    company_id: data.company_id,
    include_pipelines: data.include_pipelines,
    include_quality_indicators: data.include_quality_indicators,
    layout_algorithm: data.layout_algorithm,
  });
  return response.data;
};

export const getLineageTables = async (data: {
  company_id: string;
  include_pipelines: boolean;
  include_quality_indicators: boolean;
  layout_algorithm: string;
}) => {
  const response = await Axios.post<EnhancedLineageGraphResponse>("/data/lineage/enhanced/tables", {
    company_id: data.company_id,
    include_pipelines: data.include_pipelines,
    include_quality_indicators: data.include_quality_indicators,
    layout_algorithm: data.layout_algorithm,
  });
  return response.data;
};

export const getLineageEdge = async (edgeId: string) => {
  const response = await Axios.get<LineageEdge>(`/data/lineage/${edgeId}`);
  return response.data;
};

export const startNetsuiteLineageDiscovery = async (params: any) => {
  const response = await Axios.post<StartCrawlResponse>(
    `/data/lineage/start-netsuite-lineage-discovery`,
    null,
    {
      params: params,
    }
  );
  return response.data;
};

export interface TableNode {
  id: string;
  name: string;
  type: string;
  is_nullable?: boolean;
  description?: string;
  metadata?: Record<string, any>;
}
export interface TableEdge {
  id: string;
  source: string;
  target: string;
  label?: boolean;
  data?: Record<string, any>;
}

export interface TableColumnsResponse {
  nodes: TableNode[];
  table_id: string;
  table_name: string;
  edges: TableEdge[];
}

export const getTableColumns = async (tableId: string, company_id: string | null) => {
  const response = await Axios.post<TableColumnsResponse>(
    `/data/lineage/enhanced/${tableId}/columns`,
    {
      company_id,
    }
  );
  return response.data;
};

export const getColumnEdges = async (tableId: string, company_id: string | null) => {
  const response = await Axios.post<{ nodes: any[]; edges: any[] }>(
    `/data/lineage/enhanced/${tableId}/column-edges`,
    {
      company_id,
    }
  );
  return response.data;
};
