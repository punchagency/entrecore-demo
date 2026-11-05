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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  Table as TableIcon,
  GitGraph,
} from "lucide-react";
import { Axios } from "@/app/config/axios";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { fromTheme } from "tailwind-merge";

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
    // Note: If the backend supports more filters via query params, they should be added here.
    // Based on the provided spec, we only have table_id and company_id.
    const url = `/data/erd/graph?company_id=${company_id}${filters.table_ids?.[0] ? `&table_id=${filters.table_ids[0]}` : ""}`;
    const response = await Axios.post(url);
    return response.data;
  },
};

// Interface for association table data
interface AssociationRow {
  source_table: string;
  source_column: string;
  relationship_type: string;
  target_table: string;
  target_column: string;
  confidence: number;
  data_type: string;
  is_nullable: boolean;
  description: string;
}

interface TableColumn {
  id: string;
  name: string;
  dataType: string;
  keyType?: "FOREIGN_KEY" | "PRIMARY_KEY" | "NONE";
  is_nullable?: boolean;
}

interface TableNodeData {
  tableName: string;
  columns: TableColumn[];
  isMainTable?: boolean;
}

const TableNode = ({
  data,
  isMainTable = false,
}: {
  data: TableNodeData;
  isMainTable?: boolean;
}) => {
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative min-w-[300px] bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      {/* Handles based on table position */}
      {data.isMainTable ? (
        <Handle type="source" position={Position.Left} className="w-3 h-3 bg-indigo-500 border-2 border-white" />
      ) : (
        <Handle type="target" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-white" />
      )}

      {/* Header */}
      <div className={cn(
        "px-6 py-4 flex items-center justify-between border-b border-white/60",
        data.isMainTable ? "bg-indigo-600/10" : "bg-white/40"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center shadow-sm",
            data.isMainTable ? "bg-indigo-600 text-white" : "bg-white text-indigo-600"
          )}>
            <Database className="w-4 h-4" />
          </div>
          <h3 className="font-black text-gray-900 tracking-tight">
            {data.tableName}
          </h3>
        </div>
      </div>

      {/* Columns */}
      <div className="max-h-[350px] overflow-y-auto px-4 py-3 space-y-1">
        {visibleColumns.map((column, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-white/60 transition-all group/col"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {column.keyType === "PRIMARY_KEY" && <Key className="w-3 h-3 text-amber-500" />}
                {column.keyType === "FOREIGN_KEY" && <Key className="w-3 h-3 text-indigo-400" />}
                {!column.keyType || column.keyType === "NONE" && <div className="w-3 h-3" />}
              </div>
              <span className="text-xs font-bold text-gray-700 tracking-tight">
                {column.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover/col:text-indigo-600 transition-colors">
                {column.dataType}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4">
        {!isExpanded && data.columns.length > 5 ? (
          <button
            onClick={toggleExpand}
            className="w-full text-center py-1 text-xs text-indigo-600 hover:underline cursor-pointer transition-colors border-t border-white/60 pt-3"
          >
            <div className="flex justify-center items-center gap-1 font-semibold">
              <Plus size={14} /> Show {data.columns.length - 5} more
            </div>
          </button>
        ) : data.columns.length > 5 ? (
          <button
            onClick={toggleExpand}
            className="w-full text-center py-1 text-xs text-indigo-600 hover:underline cursor-pointer transition-colors border-t border-white/60 pt-3"
          >
            <div className="flex justify-center items-center gap-1 font-semibold">
              <Minus size={14} /> Show less
            </div>
          </button>
        ) : null}
      </div>
    </motion.div>
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
  // orders has FK (customer_id) referencing customers
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
  // order_items has FKs (order_id, product_id) referencing orders and products
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
  // sales_analytics has FK (order_id) referencing orders
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

// Demo associations derived from initialEdges (for table view when no real data)
// This maps: Source (referenced table with PK) -> Target (table with FK)
const initialAssociations: AssociationRow[] = [
  {
    source_table: "customers", source_column: "customer_id",
    relationship_type: "1:N",
    target_table: "orders", target_column: "customer_id",
    confidence: 1.0, data_type: "INT", is_nullable: false, description: "Customer reference"
  },
  {
    source_table: "products", source_column: "product_id",
    relationship_type: "1:N",
    target_table: "order_items", target_column: "product_id",
    confidence: 1.0, data_type: "INT", is_nullable: false, description: "Product reference"
  },
  {
    source_table: "orders", source_column: "order_id",
    relationship_type: "1:N",
    target_table: "order_items", target_column: "order_id",
    confidence: 1.0, data_type: "INT", is_nullable: false, description: "Order reference"
  }
];

export default function ERDVisualization() {
  const params = useParams<{ id: string }>();
  const tableId = params?.id as string;

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // State management
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [realErdData, setRealErdData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [rawApiData, setRawApiData] = useState<{ tables: any[]; edges: any[] } | null>(null);
  const [company_id, setCompanyId] = useState<string | null>(null);
  const [tableName, setTableName] = useState<string | null>(null);
  const [chatSuggestions, setChatSuggestions] = useState<any[]>([]);

  // View mode state: 'diagram' or 'table'
  const [viewMode, setViewMode] = useState<'diagram' | 'table'>('diagram');
  const [associationsData, setAssociationsData] = useState<AssociationRow[]>(initialAssociations);

  // Get company ID from localStorage and fetch table name
  useEffect(() => {
    if (window) {
      const cid = localStorage.getItem("selectedCompanyId") || "";
      setCompanyId(cid);

      // Fetch the real table name so we can match it in the ERD response
      if (cid && tableId) {
        console.log("[ERD] Fetching metadata for tableId:", tableId, "company_id:", cid);
        Axios.get(`/data/metadata/tables/${tableId}`, { params: { company_id: cid } })
          .then((res) => {
            const name = res.data?.table_name || res.data?.name || null;
            console.log("[ERD] Metadata response:", res.data, "Extracted name:", name);
            setTableName(name);
          })
          .catch((err) => {
            // If metadata fetch fails, we'll try to match by table_id in ERD response
            console.log("[ERD] Metadata fetch failed:", err?.response?.data || err?.message);
            setTableName(null);
          });
      }
    }
  }, [tableId]);

  // Call observe endpoint when ERD page first loads for this table/company


  // Fetch real ERD data from API
  const fetchRealErdData = async () => {
    if (!company_id) {
      toast.error("No company selected");
      return;
    }

    setIsLoading(true);
    try {
      console.log("[ERD] Fetching ERD graph and table data for company_id:", company_id, "tableId:", tableId);

      // Attempt 1: Fetch relationships specifically for this table
      let graphResponse = await erdApi.getErdGraph(company_id, tableId);
      const tableResponse = await erdApi.getErdTable(company_id, tableId);

      console.log("[ERD] Initial Graph API response:", graphResponse);

      // Fallback: If no results found, try fetching the full company graph
      if ((!graphResponse?.nodes || graphResponse.nodes.length === 0) && (!graphResponse?.edges || graphResponse.edges.length === 0)) {
        console.log("[ERD] No specific data found for tableId, trying fallback (full company graph)...");
        graphResponse = await erdApi.getErdGraph(company_id);
        console.log("[ERD] Fallback Graph API response:", graphResponse);
      }

      console.log("[ERD] Table API response:", tableResponse);

      // 1. Process Graph Data
      const tablesArray = graphResponse?.nodes || [];
      const edgesArray = graphResponse?.edges || [];

      console.log("[ERD] nodes:", tablesArray?.length, "edges:", edgesArray?.length);

      if (tablesArray && tablesArray.length > 0) {
        const allTables = tablesArray;
        const allEdges = edgesArray;

        // Try multiple matching strategies to find the current table:
        let mainTable = allTables.find((t: any) => t.id === tableId || t.data?.table_id === tableId);

        if (!mainTable && tableName) {
          mainTable = allTables.find((t: any) =>
            (t.data?.label || t.label || t.name || "").toLowerCase() === tableName.toLowerCase()
          );
        }

        const MAIN_TABLE_X = 900;
        const ASSOCIATED_TABLE_X = 200;
        const TABLE_HEIGHT = 400;
        const CENTER_Y = 400;

        let transformedNodes: Node[];
        let transformedEdges: Edge[];

        if (mainTable) {
          const directEdges = allEdges.filter(
            (edge: any) => edge.source === mainTable.id || edge.target === mainTable.id
          );
          const connectedIds = new Set<string>([mainTable.id]);
          directEdges.forEach((edge: any) => {
            connectedIds.add(edge.source);
            connectedIds.add(edge.target);
          });
          const filteredTables = allTables.filter((t: any) => connectedIds.has(t.id));

          transformedNodes = filteredTables.map((node: any, i: number) => {
            const columns = node.data?.columns || node.columns || [];
            const isMain = node.id === mainTable.id;

            if (isMain) {
              return {
                id: node.id,
                type: "tableNode",
                position: node.position || { x: MAIN_TABLE_X, y: CENTER_Y },
                data: { tableName: node.data?.label || node.label || node.name || node.id, columns, isMainTable: true },
              };
            }

            const associated = filteredTables.filter((t: any) => t.id !== mainTable.id);
            const idx = associated.findIndex((t: any) => t.id === node.id);
            const ySpacing = ((associated.length - 1) * TABLE_HEIGHT) / 2;
            const yPos = CENTER_Y + (idx * TABLE_HEIGHT - ySpacing);

            return {
              id: node.id,
              type: "tableNode",
              position: node.position || { x: ASSOCIATED_TABLE_X, y: yPos },
              data: { tableName: node.data?.label || node.label || node.name || node.id, columns, isMainTable: false },
            };
          });

          transformedEdges = directEdges.map((edge: any) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: "smoothstep",
            animated: edge.animated || false,
            style: {
              stroke: edge.color || "#3b82f6",
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: edge.color || "#3b82f6",
            },
            label: edge.label || "",
            labelStyle: { fill: "#1f2937", fontSize: 11, fontWeight: 600 },
            labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
          }));
        } else {
          transformedNodes = allTables.map((node: any, i: number) => {
            const columns = node.data?.columns || node.columns || [];
            return {
              id: node.id,
              type: "tableNode",
              position: node.position || { x: (i % 3) * 500 + 100, y: Math.floor(i / 3) * 450 + 100 },
              data: { tableName: node.data?.label || node.label || node.name || node.id, columns, isMainTable: false },
            };
          });

          transformedEdges = allEdges.map((edge: any) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: "smoothstep",
            animated: edge.animated || false,
            style: {
              stroke: edge.color || "#3b82f6",
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: edge.color || "#3b82f6",
            },
            label: edge.label || "",
            labelStyle: { fill: "#1f2937", fontSize: 11, fontWeight: 600 },
            labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
          }));
        }

        setRealErdData({ nodes: transformedNodes, edges: transformedEdges });
        setNodes(transformedNodes);
        setEdges(transformedEdges);
        setIsDemoMode(false);
      }

      // 2. Process Table Data
      if (tableResponse && tableResponse.data) {
        setAssociationsData(tableResponse.data);
      }

      if (!tablesArray.length && (!tableResponse || !tableResponse.data?.length)) {
        toast.info("No ERD data found for this company.");
        setIsDemoMode(true);
      } else {
        toast.success("ERD data loaded successfully.");
      }
    } catch (error: any) {
      console.error("[ERD] Error fetching ERD data:", error?.response?.data || error?.message || error);
      toast.error("Failed to load ERD data");
      setIsDemoMode(true);
    } finally {
      setIsLoading(false);
    }
  };



  // Toggle between demo and real data
  const toggleDataMode = async () => {
    if (isDemoMode) {
      // Switch to real data - always fetch fresh data
      setIsDemoMode(false);
      await fetchRealErdData();
    } else {
      // Switch to demo data
      setNodes(initialNodes);
      setEdges(initialEdges);
      setIsDemoMode(true);
    }
  };

  // Load real data when company_id is ready.
  // We now have improved matching logic that can:
  // 1. Match by ERD node id
  // 2. Match by data.table_id
  // 3. Match by tableName (if available)
  // 4. Show all tables if no specific match found
  // So we don't need to wait for tableName - we can fetch immediately.
  const hasFetchedRef = React.useRef(false);

  useEffect(() => {
    if (company_id && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchRealErdData();
    }
  }, [company_id]);

  useEffect(() => {
    if (isDemoMode) {
      setAssociationsData(initialAssociations);
    }
  }, [isDemoMode]);

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'diagram' ? 'table' : 'diagram');
  };

  return (
    <div className="bg-[#f8fafc] h-[calc(100vh-160px)] flex flex-col overflow-hidden">
      <header className="px-6 py-4 bg-white/40 backdrop-blur-xl border-b border-white/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">ERD Visualization</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-white/60 backdrop-blur-md rounded-2xl border border-white/80 shadow-sm">
            {[
              { id: 'diagram', icon: <GitGraph className="w-4 h-4" />, label: 'Diagram' },
              { id: 'table', icon: <TableIcon className="w-4 h-4" />, label: 'Table' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  viewMode === mode.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-gray-500 hover:text-indigo-600 hover:bg-white"
                )}
              >
                {mode.icon}
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {viewMode === 'diagram' ? (
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
      ) : (
        <main className="p-6">
          {/* Controls for table view */}
          <div className="flex items-center justify-end gap-2 mb-4">
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

          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Table Associations</h3>
              <p className="text-sm text-muted-foreground">
                View relationships between tables in tabular format
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="border p-2 text-center font-bold">Source Table</TableHead>
                  <TableHead className="border p-2 text-center font-bold">Source Column</TableHead>
                  <TableHead className="border p-2 text-center font-bold">Type</TableHead>
                  <TableHead className="border p-2 text-center font-bold">Target Table</TableHead>
                  <TableHead className="border p-2 text-center font-bold">Target Column</TableHead>
                  <TableHead className="border p-2 text-center font-bold">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {associationsData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="border p-2 text-center">{row.source_table}</TableCell>
                    <TableCell className="border p-2 text-center">{row.source_column}</TableCell>
                    <TableCell className="border p-2 text-center">
                      <Badge variant="outline">{row.relationship_type}</Badge>
                    </TableCell>
                    <TableCell className="border p-2 text-center">{row.target_table}</TableCell>
                    <TableCell className="border p-2 text-center">{row.target_column}</TableCell>
                    <TableCell className="border p-2 text-center">
                      {row.confidence ? `${(row.confidence * 100).toFixed(0)}%` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </main>
      )}


    </div>
  );
}
