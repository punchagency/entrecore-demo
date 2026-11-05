"use client";
import React, { memo, useEffect, useState } from "react";
import {
  Handle,
  Position,
  useConnection,
  ConnectionState,
  useReactFlow,
  Node,
} from "@xyflow/react";
import { Database, Zap, Target, Play, CheckCircle, AlertCircle, Clock, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonHandle } from "./button-handle";
import { BaseNode, BaseNodeContent } from "./base-node";
import { Button } from "./ui/button";
import { getTableColumns, getColumnEdges, TableEdge, TableNode } from "@/utils/lineage-api";
import ColumnNode, { ColumnData } from "./column-node";
import { useTableFetchedIdStore } from "@/app/store/tableFetchedStore";

export interface DataProduct extends Record<string, unknown> {
  id: string;
  name: string;
  type: "source" | "transform" | "destination";
  status: "running" | "success" | "error" | "pending";
  description?: string;
  recordCount?: number;
  lastRun?: string;
  owner?: string;
  table_id?: string;
}

interface DataProductNodeProps {
  data: DataProduct;
  selected?: boolean;
}

const getIcon = (type: DataProduct["type"]) => {
  switch (type) {
    case "source":
      return Database;
    case "transform":
      return Zap;
    case "destination":
      return Target;
    default:
      return Database;
  }
};

const getStatusIcon = (status: DataProduct["status"]) => {
  switch (status) {
    case "running":
      return Play;
    case "success":
      return CheckCircle;
    case "error":
      return AlertCircle;
    case "pending":
      return Clock;
    default:
      return Clock;
  }
};

const DataProductNode = ({ data, selected, id }: DataProductNodeProps & { id: string }) => {
  const Icon = getIcon(data.type);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const StatusIcon = getStatusIcon(data.status);
  const { addNodes, addEdges, getNodes, deleteElements } = useReactFlow();
  const [isLoading, setIsLoading] = useState(false);
  const { TableId, setTableId, removeTableId } = useTableFetchedIdStore();

  useEffect(() => {
    const selectedCompanyId = localStorage.getItem("selectedCompanyId");
    setCompanyId(selectedCompanyId || null);
  }, []);

  const onClick = async () => {
    if (!data.table_id || isLoading) {
      console.log("❌ Early return:", { table_id: data.table_id, isLoading });
      return;
    }

    // Check if table is already expanded
    const isExpanded = TableId.includes(data.table_id);

    if (isExpanded) {
      // COLLAPSE LOGIC
      console.log("Variations of collapsing table:", data.table_id);

      const currentNodes = getNodes();
      // Find all column nodes created for this table
      const nodesToDelete = currentNodes.filter(node =>
        node.id.startsWith(`${id}-column-`)
      );

      console.log(`Found ${nodesToDelete.length} nodes to delete`);

      if (nodesToDelete.length > 0) {
        await deleteElements({ nodes: nodesToDelete });
      }

      removeTableId(data.table_id);
      return;
    }

    // EXPAND LOGIC (Fetch columns)
    console.log(data.table_id, "data.table_id");
    setTableId(data.table_id || "");
    console.log(TableId, "TableId");

    console.log("🚀 Starting API call for table_id:", data.table_id);
    setIsLoading(true);

    try {
      // Call API to get table columns
      console.log("📡 Calling API...");
      const response = await getTableColumns(data.table_id, companyId);
      console.log("✅ API response:", response);

      // Get current nodes to determine positioning
      const currentNodes = getNodes();
      const parentNode = currentNodes.find((node) => node.id === id);

      if (!parentNode) {
        console.log("❌ Parent node not found:", id);
        return;
      }

      console.log("📍 Creating column nodes...");
      console.log("🔍 Available nodes in response:", response?.nodes?.length);
      console.log("🔍 Sample node:", response?.nodes?.[0]);

      // Create column nodes using the positions provided by the API
      const columnNodes: Node[] = response?.nodes?.map((column: any, index: number) => {
        console.log(`📍 Processing column ${index}:`, column);

        // Extract data from the correct fields based on API response structure
        const columnData = column.data || column;
        const metadata = columnData.metadata || {};

        // Handle both table and column data structures
        const nodeId = column.id;
        const nodeLabel =
          columnData.label || metadata.column_name || column.name || `Column ${nodeId}`;
        const nodeType = columnData.node_type?.toLowerCase() || "column";
        const isTableNode =
          nodeType === "table" ||
          nodeType === "source" ||
          nodeType === "destination" ||
          nodeType === "transform";

        console.log(`📍 Column ${index} - ID: ${nodeId}, Label: ${nodeLabel}, Type: ${nodeType}`);

        let position = { x: 0, y: 0 };
        if (column.position && typeof column.position === "object") {
          position = {
            x: column.position.x || 0,
            y: (column.position.y || 0) + 400,
          };
        } else {
          position = {
            x: parentNode.position.x + 250 + index * 180,
            y: parentNode.position.y + 250,
          };
        }

        return {
          id: `${id}-column-${nodeId}`,
          type: "columnNode", // Use DataProductNode for hierarchical expansion
          position: position,
          data: {
            // Map to DataProduct interface for hierarchical support
            id: nodeId,
            name: nodeLabel,
            type: isTableNode ? "transform" : "source", // Default type for columns that might be tables
            status: columnData.record_count > 0 ? "success" : "pending",
            description: `Column node - ${nodeLabel}`,
            recordCount: columnData.record_count || 0,
            lastRun: columnData.last_run || "Unknown",
            owner: "Unknown",
            table_id: metadata.table_id || columnData.table_id || nodeId, // Use node ID as table_id for expansion

            // Keep original data for proper field mapping
            label: nodeLabel,
            column_id: nodeId,
            node_type: nodeType,
            column_type: metadata.data_type || columnData.data_type || "string",
            data_type: metadata.data_type || columnData.data_type || "string",
            is_nullable: metadata.nullable,
            nullable: metadata.nullable,
            metadata: metadata,
            record_count: columnData.record_count,
            last_run: columnData.last_run,
            pipeline_stage: columnData.pipeline_stage,
            transformation_type: columnData.transformation_type,
            data_quality_score: columnData.data_quality_score,
          } as DataProduct,
        };
      });

      console.log("📊 Created column nodes:", columnNodes.length);

      // Create simple edges from parent to all children
      const parentToChildrenEdges = columnNodes.map((columnNode) => ({
        id: `parent-child-${id}-${columnNode.id}`,
        source: id,
        target: columnNode.id,
        type: "default",
        animated: true,
        style: {
          stroke: "#3b82f6",
          strokeWidth: 3,
        },
      }));

      // Process edges - some are table-to-column, some are column-to-column
      const allEdges = response?.edges || [];
      console.log("🔍 Processing edges:", allEdges.length, "total edges");

      // Separate table-to-column edges from column-to-column edges
      const tableToColumnEdges: any[] = [];
      const columnToColumnEdges: any[] = [];

      allEdges.forEach((edge: any) => {
        const edgeData = edge.data || {};
        const metadata = edgeData.metadata || {};

        // Check if this is a column-to-column edge or table-to-column edge
        const isColumnToColumn = metadata.is_column_to_column === true;

        if (isColumnToColumn) {
          // This is a column-to-column edge
          const confidence = edgeData.confidence || metadata.confidence || 0.8;
          let strokeColor = "#f59e0b"; // Default amber for column relationships
          let strokeWidth = 2;

          if (confidence >= 0.9) {
            strokeColor = "#10b981"; // Green for high confidence
            strokeWidth = 3;
          } else if (confidence >= 0.7) {
            strokeColor = "#f59e0b"; // Amber for medium confidence
            strokeWidth = 2;
          } else {
            strokeColor = "#ef4444"; // Red for lower confidence
            strokeWidth = 2;
          }

          // Special styling for netsuite references
          if (
            metadata.relationship_type === "netsuite_reference" ||
            edge.label === "netsuite_reference"
          ) {
            strokeColor = "#8b5cf6"; // Purple for netsuite references
          }

          const sourceNodeId = edge.source;
          const targetNodeId = edge.target;

          console.log(`🔗 Creating column-to-column edge: ${sourceNodeId} → ${targetNodeId}`);

          columnToColumnEdges.push({
            id: `col-edge-${edge.id}`,
            source: sourceNodeId,
            target: targetNodeId,
            // sourceHandle: sourceNodeId, // Specify which handle to use
            // targetHandle: targetNodeId, // Specify which handle to use
            label: `${edge.label || metadata.relationship_type || "column_relationship"} (${Math.round(confidence * 100)}%)`,
            type: "default",
            animated: edgeData.is_active !== false,
            style: {
              stroke: strokeColor,
              strokeWidth: strokeWidth,
              strokeDasharray: confidence < 0.7 ? "5,5" : undefined, // Dashed for low confidence
            },
            data: {
              sourceColumn: edge.source,
              targetColumn: edge.target,
              sourceTable: edgeData.source_table,
              targetTable: edgeData.target_table,
              sourceSchema: edgeData.source_schema,
              targetSchema: edgeData.target_schema,
              relationshipType: metadata.relationship_type || edge.label || "column_relationship",
              confidence: confidence,
              isActive: edgeData.is_active !== false,
              transformation: edgeData.transformation,
              metadata: metadata,
            },
          });
        } else {
          // This is a table-to-column edge (additional edges from API)
          tableToColumnEdges.push({
            id: `${id}-${id}-column-${edge.id}`,
            source: id,
            target: `${id}-column-${edge.target || edge.id}`,
            type: "default",
            animated: true,
            style: {
              stroke: "#64748b",
              strokeWidth: 2,
              strokeDasharray: "3,3", // Dashed to distinguish from table edges
            },
            data: {
              sourceTable: data.table_id,
              targetColumn: edge.target || edge.id,
              relationshipType: "column_relationship",
              confidence: 1.0,
              isActive: true,
              metadata: {},
            },
          });
        }
      });

      console.log("📊 Adding nodes and edges:", {
        columnNodes: columnNodes.length,
        parentToChildrenEdges: parentToChildrenEdges.length,
        tableToColumnEdges: tableToColumnEdges.length,
        columnToColumnEdges: columnToColumnEdges.length,
      });

      // Add nodes and edges to the flow
      if (columnNodes.length > 0) {
        addNodes(columnNodes);
        addEdges([...parentToChildrenEdges, ...tableToColumnEdges, ...columnToColumnEdges]);
        console.log("✅ Successfully added column nodes and all edges");
      }
    } catch (error) {
      console.error("❌ Failed to fetch table columns:", error);
    } finally {
      setIsLoading(false);
      console.log("🏁 Finished onClick handler");
    }
  };

  const selector = (connection: ConnectionState) => {
    return connection.inProgress;
  };

  const connectionInProgress = useConnection(selector);

  return (
    <div
      className={cn(
        "relative p-5 rounded-xl border-2",
        "bg-gradient-to-br from-card to-card/90 backdrop-blur-md",
        "shadow-lg transition-all duration-300",
        "hover:shadow-2xl hover:scale-[1.01]",
        selected && "ring-4 ring-primary/20 border-primary shadow-[0_0_25px_hsl(var(--primary)/0.15)]",
        data.status === "running" && "animate-pulse duration-800",
        "flex flex-col h-full"
      )}
      style={{ width: "auto", minWidth: 300, maxWidth: 700 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Input Handle */}
      {data.node_type !== "source" && (
        <Handle
          id={`${id}-target`}
          type="target"
          position={Position.Left}
          className="w-4 h-4 bg-primary border-4 border-background -left-2"
        />
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className={cn(
            "p-2.5 rounded-lg shrink-0",
            data.type === "source" && "bg-green-100 text-green-700",
            data.type === "transform" && "bg-amber-100 text-amber-700",
            data.type === "destination" && "bg-purple-100 text-purple-700"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-sm text-foreground break-words leading-snug" title={data.name}>
            {data.name}
          </h3>
          {(data.metadata as any)?.column_name && (
            <p className="text-xs text-muted-foreground break-words mt-1 font-medium italic">
              Column: {(data.metadata as any).column_name}
            </p>
          )}
        </div>

        <div
          className={cn(
            "p-1.5 rounded-full shrink-0",
            data.status === "running" && "bg-blue-100 text-blue-600",
            data.status === "success" && "bg-green-100 text-green-600",
            data.status === "error" && "bg-red-100 text-red-600",
            data.status === "pending" && "bg-yellow-100 text-yellow-600"
          )}
        >
          <StatusIcon className="w-4 h-4" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{data.description}</p>
        )}

        {/* Show data type for columns */}
        {(data.metadata as any)?.data_type && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Type:</span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
              {(data.metadata as any).data_type}
            </span>
            {(data.metadata as any)?.key_type && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                {(data.metadata as any).key_type}
              </span>
            )}
          </div>
        )}

        <div className="flex justify-between text-xs text-muted-foreground">
          {data.recordCount !== undefined && data.recordCount > 0 && (
            <span>{data.recordCount.toLocaleString()} records</span>
          )}
          {data.lastRun && data.lastRun !== "Unknown" && <span>Last: {data.lastRun}</span>}
        </div>

        {/* Show schema information for columns */}
        {(data.metadata as any)?.schema_name && (
          <div className="text-xs text-muted-foreground">
            Schema: {(data.metadata as any).schema_name}
          </div>
        )}

        {/* Show nullability for columns */}
        {(data.metadata as any)?.nullable !== undefined && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Nullable:</span>
            <span
              className={cn(
                "text-xs font-medium",
                (data.metadata as any).nullable ? "text-green-600" : "text-red-600"
              )}
            >
              {(data.metadata as any).nullable ? "Yes" : "No"}
            </span>
          </div>
        )}

        {/* Show primary/foreign key indicators */}
        {(data.metadata as any)?.is_primary_key && (
          <div className="text-xs text-purple-600 font-medium">Primary Key</div>
        )}
        {(data.metadata as any)?.is_foreign_key && (
          <div className="text-xs text-blue-600 font-medium">Foreign Key</div>
        )}

        {data.owner && data.owner !== "Unknown" && (
          <div className="text-xs text-muted-foreground">Owner: {data.owner}</div>
        )}
      </div>

      {/* Connection indicator */}
      {data.status === "running" && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse opacity-30 pointer-events-none" />
      )}

      {/* Output Handle */}
      {data.node_type !== "destination" && (
        <Handle
          id={id}
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-gray-500 border-2 border-background"
        />
      )}

      {/* Expand/Collapse Button - Only for nodes that have a table_id */}
      {data.table_id &&
        !id.includes("column") && (
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 z-10">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 rounded-full border-2 border-blue-200 bg-blue-50 shadow-sm hover:bg-blue-100 hover:text-blue-600"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              ) : TableId.includes(data.table_id || "") ? (
                <Minus className="h-3 w-3 text-blue-500" />
              ) : (
                <Plus className="h-3 w-3 text-blue-500" />
              )}
            </Button>
          </div>
        )}
    </div>
  );
};

export default memo(DataProductNode);
