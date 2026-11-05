"use client";
import React, { useCallback, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database,
  GitBranch,
  Key,
  ToggleLeft,
  ToggleRight,
  Loader2,
  RefreshCw,
  Plus,
  Minus,
  ArrowRight,
} from "lucide-react";
import { Axios } from "@/app/config/axios";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";

// API utility functions for ERD endpoints
const erdApi = {
  // Get ERD Graph data
  getErdGraph: async (company_id: string, table_id?: string) => {
    const url = `/data/erd/graph?company_id=${company_id}${table_id ? `&table_id=${table_id}` : ""}`;
    const response = await Axios.post(url);
    return response.data;
  },

  // Get ERD Table view
  getErdTable: async (company_id: string, table_id: string) => {
    const url = `/data/erd/table?company_id=${company_id}&table_id=${table_id}`;
    const response = await Axios.post(url);
    return response.data;
  },

  // Search ERD relationships
  searchErd: async (company_id: string, search_query: string) => {
    const params = new URLSearchParams({ company_id, search_query });
    const response = await Axios.get(`/data/erd/search?${params.toString()}`);
    return response.data;
  },

  // Get ERD Statistics
  getErdStatistics: async (company_id: string) => {
    const params = new URLSearchParams({ company_id });
    const response = await Axios.get(`/data/erd/statistics?${params.toString()}`);
    return response.data;
  },

  // Get Filtered ERD Graph
  getFilteredErdGraph: async (company_id: string, filters: any) => {
    const url = `/data/erd/graph?company_id=${company_id}${filters.table_id ? `&table_id=${filters.table_id}` : ""}`;
    const response = await Axios.post(url);
    return response.data;
  },
};

interface TableColumn {
  id: string;
  name: string;
  dataType: string;
  keyType?: "FOREIGN_KEY" | "PRIMARY_KEY" | "NONE";
  isNullable?: Boolean;
}

interface TableNodeData {
  tableName: string;
  tableId: string;
  columns: TableColumn[];
  isDemoMode: boolean;
}

const TableNode = ({ data }: { data: TableNodeData }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const sortedColumns = [...data.columns].sort((a, b) => {
    const order: Record<string, number> = { PRIMARY_KEY: 1, FOREIGN_KEY: 2, NONE: 3 };

    const aKey = a.keyType ?? "NONE";
    const bKey = b.keyType ?? "NONE";

    return (order[aKey] ?? 99) - (order[bKey] ?? 99);
  });

  const visibleColumns = isExpanded ? sortedColumns : sortedColumns.slice(0, 5);

  return (
    <Card className="min-w-[280px] bg-card border-2 border-border shadow-lg overflow-hidden py-2 gap-3">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-primary" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-primary" />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-white" />
          <h3 className="font-bold text-white text-base overflow-hidden text-ellipsis">
            {data.tableName}
          </h3>
        </div>
        {data.isDemoMode && (
          <Badge className="bg-white text-black hover:bg-">
            <Link
              href={`/data-room/catalog/table/${data.tableId}/erd`}
              className=" flex items-center"
            >
              View Table ERD
            </Link>
          </Badge>
        )}
      </div>

      {/* Columns */}
      <div className="bg-card max-h-[300px] overflow-y-auto">
        {visibleColumns.map((column, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between px-3 py-2 border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {column.keyType === "PRIMARY_KEY" && <Key className="w-3 h-3 text-yellow-500" />}
              {column.keyType === "FOREIGN_KEY" && <Key className="w-3 h-3 text-blue-500" />}
              <span className="text-sm font-medium overflow-hidden text-ellipsis">
                {column.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs truncate">
                {column.dataType}
              </Badge>

              <Badge
                variant={column.isNullable ? "outline" : "destructive"}
                className="text-[10px] px-2 py-0.5"
              >
                {column.isNullable ? "Nullable" : "Not Null"}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {!isExpanded && data.columns.length > 5 ? (
        <button
          onClick={toggleExpand}
          className="w-full text-center py-1 pt-2 text-xs text-blue-600 hover:underline cursor-pointer  transition-colors border-t"
        >
          <div className="flex justify-center items-center gap-1 font-semibold">
            <Plus size={16} /> Show {data.columns.length - 5} more
          </div>
        </button>
      ) : (
        <button
          onClick={toggleExpand}
          className="w-full text-center py-1 pt-2 text-xs text-blue-600 hover:underline cursor-pointer  transition-colors border-t"
        >
          <div className="flex justify-center items-center gap-1 font-semibold">
            <Minus size={16} /> Show less
          </div>
        </button>
      )}
    </Card>
  );
};

const nodeTypes = {
  tableNode: TableNode,
};

const initialNodes: Node[] = [
  {
    id: "customers",
    type: "tableNode",
    position: { x: 100, y: 100 },
    data: {
      tableName: "customers",
      columns: [
        { name: "customer_id", dataType: "INT", keyType: "PRIMARY_KEY" },
        { name: "name", dataType: "VARCHAR" },
        { name: "email", dataType: "VARCHAR" },
        { name: "created_at", dataType: "TIMESTAMP" },
      ],
    },
  },
  {
    id: "orders",
    type: "tableNode",
    position: { x: 500, y: 50 },
    data: {
      tableName: "orders",
      columns: [
        { name: "order_id", dataType: "INT", keyType: "PRIMARY_KEY" },
        { name: "customer_id", dataType: "INT", keyType: "FOREIGN_KEY" },
        { name: "order_date", dataType: "TIMESTAMP" },
        { name: "total_amount", dataType: "DECIMAL" },
        { name: "status", dataType: "VARCHAR" },
      ],
    },
  },
  {
    id: "products",
    type: "tableNode",
    position: { x: 100, y: 400 },
    data: {
      tableName: "products",
      columns: [
        { name: "product_id", dataType: "INT", keyType: "PRIMARY_KEY" },
        { name: "name", dataType: "VARCHAR" },
        { name: "price", dataType: "DECIMAL" },
        { name: "category", dataType: "VARCHAR" },
        { name: "stock", dataType: "INT" },
      ],
    },
  },
  {
    id: "order_items",
    type: "tableNode",
    position: { x: 500, y: 350 },
    data: {
      tableName: "order_items",
      columns: [
        { name: "order_item_id", dataType: "INT", keyType: "PRIMARY_KEY" },
        { name: "order_id", dataType: "INT", keyType: "FOREIGN_KEY" },
        { name: "product_id", dataType: "INT", keyType: "FOREIGN_KEY" },
        { name: "quantity", dataType: "INT" },
        { name: "unit_price", dataType: "DECIMAL" },
      ],
    },
  },
  {
    id: "sales_analytics",
    type: "tableNode",
    position: { x: 900, y: 200 },
    data: {
      tableName: "sales_analytics",
      columns: [
        { name: "analytics_id", dataType: "INT", keyType: "PRIMARY_KEY" },
        { name: "order_id", dataType: "INT", keyType: "FOREIGN_KEY" },
        { name: "revenue", dataType: "DECIMAL" },
        { name: "profit_margin", dataType: "DECIMAL" },
        { name: "calculated_at", dataType: "TIMESTAMP" },
      ],
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: "customers-orders",
    source: "customers",
    target: "orders",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#3b82f6", strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#3b82f6",
    },
    label: "1:N",
    labelStyle: { fill: "#1f2937", fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
  },
  {
    id: "products-order_items",
    source: "products",
    target: "order_items",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#3b82f6", strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#3b82f6",
    },
    label: "1:N",
    labelStyle: { fill: "#1f2937", fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
  },
  {
    id: "orders-order_items",
    source: "orders",
    target: "order_items",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#3b82f6", strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#3b82f6",
    },
    label: "1:N",
    labelStyle: { fill: "#1f2937", fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
  },
  {
    id: "orders-sales_analytics",
    source: "orders",
    target: "sales_analytics",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#3b82f6", strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#3b82f6",
    },
    label: "1:1",
    labelStyle: { fill: "#1f2937", fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
  },
  {
    id: "order_items-sales_analytics",
    source: "order_items",
    target: "sales_analytics",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#10b981", strokeWidth: 2, strokeDasharray: "5,5" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#10b981",
    },
    label: "N:1",
    labelStyle: { fill: "#1f2937", fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
  },
  {
    id: "customers-sales_analytics",
    source: "customers",
    target: "sales_analytics",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#f59e0b", strokeWidth: 2, strokeDasharray: "5,5" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#f59e0b",
    },
    label: "1:N",
    labelStyle: { fill: "#1f2937", fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
  },
  {
    id: "products-sales_analytics",
    source: "products",
    target: "sales_analytics",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "5,5" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#ef4444",
    },
    label: "N:N",
    labelStyle: { fill: "#1f2937", fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
  },
];

export default function ERDVisualization() {
  const params = useParams<{ id: string }>();
  const tableId = params?.id as string;

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // State management
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [realErdData, setRealErdData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [company_id, setCompanyId] = useState<string | null>(null);

  // Get company ID from localStorage

  useEffect(() => {
    const updateCompanyId = () => {
      const id = localStorage.getItem("selectedCompanyId") || "";
      if (id !== company_id) {
        setCompanyId(id);
      }
    };

    updateCompanyId();

    window.addEventListener("storage", updateCompanyId);
    window.addEventListener("localStorageChange", updateCompanyId);

    return () => {
      window.removeEventListener("storage", updateCompanyId);
      window.removeEventListener("localStorageChange", updateCompanyId);
    };
  }, [company_id]);

  // Fetch real ERD data from API
  const fetchRealErdData = async () => {
    if (!company_id) {
      toast.error("No company selected");
      return;
    }

    setIsLoading(true);
    try {
      const response = await erdApi.getErdGraph(company_id, tableId);

      if (response && response.nodes && response.edges) {
        // Transform API data to ReactFlow format
        const GRID_X = 450;
        const GRID_Y = 350;
        const transformedNodes: Node[] = response?.nodes?.map((node: any, i: number) => ({
          id: node.id,
          type: "tableNode",
          position: node.position || {
            x: (i % 5) * GRID_X, // 5 nodes per row
            y: Math.floor(i / 5) * GRID_Y,
          },
          data: {
            tableName: node.data?.label || node.label || node.name || node.id,
            tableId: node.data?.table_id || node.id,
            columns: node.data?.columns || node.columns || [],
            isDemoMode: isDemoMode,
          },
        }));

        const transformedEdges: Edge[] = response?.edges?.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "smoothstep",
          animated: edge.animated || false,
          style: {
            stroke: edge.color || "#3b82f6",
            strokeWidth: 2,
            strokeDasharray: edge.type === "derived" ? "5,5" : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edge.color || "#3b82f6",
          },
          label: edge.label || "",
          labelStyle: { fill: "#1f2937", fontSize: 12, fontWeight: 600 },
          labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
        }));

        setRealErdData({ nodes: transformedNodes, edges: transformedEdges });
        if (transformedNodes.length || transformedEdges.length) {
          setNodes(transformedNodes);
          setEdges(transformedEdges);
          setIsDemoMode(false);
          toast.success("ERD data loaded successfully");
        } else {
          setIsDemoMode(true);
          toast.error("No ERD data for this company.");
        }
      } else {
        toast.info("No ERD data found, using demo data");
        setIsDemoMode(true);
      }
    } catch (error: any) {
      console.error("Error fetching ERD data:", error);
      toast.error("Failed to load ERD data");
      setIsDemoMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle between demo and real data
  const toggleDataMode = () => {
    if (isDemoMode) {
      // Switch to real data
      if (realErdData && realErdData.nodes.length && realErdData.edges.length) {
        setNodes(realErdData.nodes);
        setEdges(realErdData.edges);
        setIsDemoMode(false);
      } else {
        // Fetch real data - fetchRealErdData already handles setting demo mode appropriately
        fetchRealErdData();
      }
    } else {
      // Switch to demo data
      setNodes(initialNodes);
      setEdges(initialEdges);
      setIsDemoMode(true);
    }
  };

  // Load real data on mount if company is selected
  useEffect(() => {
    if (company_id) {
      fetchRealErdData();
    }
  }, [company_id]);

  return (
    <div className="bg-background m-8">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="p-2 rounded-lg bg-primary/20 text-primary">
                <GitBranch className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h1 className="text-md sm:text-lg font-bold max-w-[100px] sm:max-w-none truncate">
                ERD Visualization
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="h-[calc(80vh-4rem)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: false,
          }}
          className="bg-dots"
        >
          <Background gap={16} size={1} color="#e5e7eb" />
          <Controls className="bg-card border border-border" />
          {isDemoMode && (
            <div className="absolute top-4 left-4 z-50">
              <div className="px-3 py-2 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-md text-sm">
                <Database className="inline w-4 h-4 mr-2" />
                Demo Data
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 absolute top-4 right-4 z-50">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleDataMode}
                  disabled={isLoading}
                  className={`px-3 py-2 backdrop-blur-sm border rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDemoMode
                    ? "bg-yellow-100/80 text-yellow-800 border-yellow-300 hover:bg-yellow-100/60"
                    : "bg-card/80 text-card-foreground border-border hover:bg-card/60"
                    }`}
                >
                  {isDemoMode ? (
                    <ToggleRight className="h-4 w-4" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {isDemoMode ? "Switch to real data" : "Switch to demo data"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={fetchRealErdData}
                  disabled={isLoading}
                  className="px-3 py-2 bg-card/80 backdrop-blur-sm border border-border rounded-md hover:bg-card/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Refresh pipeline data</TooltipContent>
            </Tooltip>
          </div>

          <div className="absolute bottom-4 right-4 bg-card/80 backdrop-blur border border-border rounded-lg p-4 max-w-sm z-50">
            <h4 className="text-sm font-semibold mb-3">Legend</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Key className="w-3 h-3 text-yellow-500" />
                <span className="text-muted-foreground">Primary Key</span>
              </div>
              <div className="flex items-center gap-2">
                <Key className="w-3 h-3 text-blue-500" />
                <span className="text-muted-foreground">Foreign Key</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-primary"></div>
                <span className="text-muted-foreground">Direct Relationship</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-muted-foreground"></div>
                <span className="text-muted-foreground">Derived Relationship</span>
              </div>
            </div>
          </div>
        </ReactFlow>
      </main>
    </div>
  );
}
