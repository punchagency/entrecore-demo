import React, { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import DataProductNode, { DataProduct } from "./data-product-node";
import ColumnNode, { ColumnData } from "./column-node";
import { getLineageEdges, getLineageTables, fetchReactFlowGraph } from "@/utils/lineage-api";
import { useUserStore } from "@/app/store/userStore";
import {
  Loader2,
  AlertCircle,
  Database,
  RefreshCw,
  DatabaseZap,
  List,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useTableFetchedIdStore } from "@/app/store/tableFetchedStore";
import { toast } from "sonner";

interface PipelineVisualizationProps {
  onNodeClick?: (dataProduct: DataProduct) => void;
  tableId?: string;
  columnId?: string;
}

const nodeTypes = {
  dataProduct: DataProductNode,
  columnNode: DataProductNode,
  // Map defaults to ensure they also use our custom styling
  default: DataProductNode,
  input: DataProductNode,
  output: DataProductNode,
};

// Sample data - fallback when no API data is available
const fallbackNodes: Node<DataProduct>[] = [
  {
    id: "1",
    type: "dataProduct",
    position: { x: -100, y: 100 },
    data: {
      id: "1",
      name: "Customer Orders",
      type: "source",
      status: "success",
      description: "Raw customer order data from production PostgreSQL database",
      recordCount: 1250000,
      lastRun: "2 hours ago",
      owner: "Data Engineering Team",
      table_id: "customer_orders_table_001", // Added for testing
    },
  },
  {
    id: "2",
    type: "dataProduct",
    position: { x: 0, y: 300 },
    data: {
      id: "2",
      name: "Product Catalog",
      type: "source",
      status: "success",
      description: "Product information and pricing data",
      recordCount: 45000,
      lastRun: "1 hour ago",
      owner: "Product Team",
      table_id: "product_catalog_table_002", // Added for testing
    } as DataProduct,
  },
  {
    id: "3",
    type: "dataProduct",
    position: { x: 450, y: 200 },
    data: {
      id: "3",
      name: "Order Enrichment",
      type: "transform",
      status: "running",
      description: "Joins order data with product information and customer details",
      recordCount: 1200000,
      lastRun: "Running now",
      owner: "Analytics Team",
    } as DataProduct,
  },
  {
    id: "4",
    type: "dataProduct",
    position: { x: 1000, y: 50 },
    data: {
      id: "4",
      name: "Sales Analytics",
      type: "destination",
      status: "success",
      description: "Aggregated sales metrics for business intelligence",
      recordCount: 850000,
      lastRun: "30 minutes ago",
      owner: "BI Team",
    } as DataProduct,
  },
  {
    id: "5",
    type: "dataProduct",
    position: { x: 1100, y: 350 },
    data: {
      id: "5",
      name: "Customer 360",
      type: "destination",
      status: "pending",
      description: "Complete customer profile with order history and preferences",
      recordCount: 125000,
      lastRun: "4 hours ago",
      owner: "Customer Success Team",
    } as DataProduct,
  },
  {
    id: "6",
    type: "dataProduct",
    position: { x: 600, y: 450 },
    data: {
      id: "6",
      name: "Data Quality Check",
      type: "transform",
      status: "error",
      description: "Validates data integrity and applies business rules",
      recordCount: 0,
      lastRun: "6 hours ago",
      owner: "Data Quality Team",
    } as DataProduct,
  },
];

const fallbackEdges: Edge[] = [
  {
    id: "e1-3",
    source: "1",
    target: "3",
    label: "transformation (95%)",
    style: { stroke: "#8b5cf6", strokeWidth: 3 },
    animated: true,
    type: "smoothstep",
    data: {
      sourceTable: "customer_orders",
      sourceColumn: "customer_id",
      targetTable: "order_enrichment",
      targetColumn: "customer_id",
      transformation: "join",
      confidence: 0.95,
      relationshipType: "transformation",
      isActive: true,
      metadata: {},
    },
  },
  {
    id: "e2-3",
    source: "2",
    target: "3",
    label: "transformation (90%)",
    style: { stroke: "#8b5cf6", strokeWidth: 3 },
    animated: true,
    type: "smoothstep",
    data: {
      sourceTable: "product_catalog",
      sourceColumn: "product_id",
      targetTable: "order_enrichment",
      targetColumn: "product_id",
      transformation: "join",
      confidence: 0.9,
      relationshipType: "transformation",
      isActive: true,
      metadata: {},
    },
  },
  {
    id: "e3-4",
    source: "3",
    target: "4",
    label: "aggregation (85%)",
    style: { stroke: "#06b6d4", strokeWidth: 2 },
    animated: true,
    type: "smoothstep",
    data: {
      sourceTable: "order_enrichment",
      sourceColumn: "order_total",
      targetTable: "sales_analytics",
      targetColumn: "total_sales",
      transformation: "sum",
      confidence: 0.85,
      relationshipType: "aggregation",
      isActive: true,
      metadata: {},
    },
  },
  {
    id: "e3-5",
    source: "3",
    target: "5",
    label: "filter (80%)",
    style: { stroke: "#ec4899", strokeWidth: 2 },
    animated: true,
    type: "smoothstep",
    data: {
      sourceTable: "order_enrichment",
      sourceColumn: "customer_id",
      targetTable: "customer_360",
      targetColumn: "customer_id",
      transformation: "distinct",
      confidence: 0.8,
      relationshipType: "filter",
      isActive: true,
      metadata: {},
    },
  },
  {
    id: "e2-6",
    source: "2",
    target: "6",
    label: "filter (70%)",
    style: { stroke: "#f59e0b", strokeWidth: 2 },
    animated: true,
    type: "smoothstep",
    data: {
      sourceTable: "product_catalog",
      sourceColumn: "is_active",
      targetTable: "data_quality_check",
      targetColumn: "validation_status",
      transformation: "validate",
      confidence: 0.7,
      relationshipType: "filter",
      isActive: true,
      metadata: {},
    },
  },
];

export function PipelineVisualization({
  onNodeClick,
  tableId,
  columnId,
}: PipelineVisualizationProps) {
  const { user } = useUserStore();
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    const selectedCompanyId = localStorage.getItem("selectedCompanyId");
    setCompanyId(selectedCompanyId || user?.active_company || null);
  }, [user]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<DataProduct>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [isManualToggle, setIsManualToggle] = useState(false);
  const { clearTableId } = useTableFetchedIdStore();

  // Fetch lineage data
  const fetchLineageData = useCallback(async () => {
    if (!companyId) {
      console.log("No company ID available, using fallback data");
      setUseFallback(true);
      setNodes(fallbackNodes);
      setEdges(fallbackEdges);
      return;
    }

    setIsLoading(true);
    setError(null);
    clearTableId();

    try {
      console.log("Fetching lineage data for company:", companyId);

      if (tableId) {
        console.log(`Fetching specific lineage for table: ${tableId}, column: ${columnId}`);
        try {
          const response = await fetchReactFlowGraph({
            company_id: companyId,
            table_id: tableId,
            column_id: columnId || undefined
          });

          console.log("Specific lineage response:", response);

          if (response) {
            // specific table lineage found (or empty valid response)
            let nodes = (response.nodes || []).map((node: any) => ({
              ...node,
              type: "dataProduct", // FORCE use of our custom component
              data: {
                ...node.data,
                id: node.id,
                name: node.data?.label || node.data?.name || node.id,
                type: node.data?.node_type || node.data?.type || "transform",
                status: node.data?.status || "success",
              } as DataProduct
            }));
            const edges = response.edges || [];

            // Apply DAG-based horizontal layout if nodes are stacked or missing positions
            const needsLayout = nodes.length > 0 && nodes.every((n: any) => n.position.x === 0 && n.position.y === 0);

            if (needsLayout) {
              const nodeMap = new Map();
              nodes.forEach((n: any) => nodeMap.set(n.id, { ...n, incoming: 0, depth: 0 }));

              // Calculate incoming edges for each node
              edges.forEach((e) => {
                if (nodeMap.has(e.target)) {
                  nodeMap.get(e.target).incoming++;
                }
              });

              // Calculate depth using BFS
              const queue: string[] = [];
              nodeMap.forEach((n, id) => {
                if (n.incoming === 0) queue.push(id);
              });

              let maxDepth = 0;
              while (queue.length > 0) {
                const currentId = queue.shift()!;
                const current = nodeMap.get(currentId);
                maxDepth = Math.max(maxDepth, current.depth);

                edges.forEach((e) => {
                  if (e.source === currentId && nodeMap.has(e.target)) {
                    const target = nodeMap.get(e.target);
                    target.depth = Math.max(target.depth, current.depth + 1);
                    queue.push(e.target);
                  }
                });
              }

              // Group by depth
              const depthGroups: any[][] = [];
              nodeMap.forEach((n) => {
                if (!depthGroups[n.depth]) depthGroups[n.depth] = [];
                depthGroups[n.depth].push(n);
              });

              const spacingX = 900;
              const spacingY = 350;
              const layoutedNodes: any[] = [];

              depthGroups.forEach((group, depth) => {
                if (!group) return;
                const startY = -((group.length - 1) * spacingY) / 2;
                group.forEach((node, index) => {
                  layoutedNodes.push({
                    ...node,
                    position: {
                      x: depth * spacingX,
                      y: startY + index * spacingY,
                    },
                  });
                });
              });
              nodes = layoutedNodes;
            } else {
              // Even if not all at (0,0), check for exact overlaps
              const positionMap = new Map();
              nodes = nodes.map((node) => {
                let { x, y } = node.position;
                const key = `${Math.round(x)},${Math.round(y)}`;
                const count = positionMap.get(key) || 0;
                positionMap.set(key, count + 1);

                if (count > 0) {
                  return {
                    ...node,
                    position: {
                      x: x + (count * 100),
                      y: y + (count * 150),
                    },
                  };
                }
                return node;
              });
            }

            setNodes(nodes as Node<DataProduct>[]);
            setEdges(edges.map(e => ({ ...e, type: 'smoothstep' })));
            setIsLoading(false);
            setUseFallback(false); // Ensure we are NOT in fallback mode
            return;
          }
        } catch (specificError) {
          console.error("Error fetching specific lineage:", specificError);
          // If specific fetch fails, we might still want to try global? 
          // Or better, just show error for this specific table.
          // User says "data is present", so let's treat this as the intended view.
          // If it fails, let the outer catch handle it, which triggers fallback.
          // But re-throw so we don't proceed to global fetch?
          throw specificError;
        }
      }

      const response = await getLineageTables({
        company_id: companyId,
        include_pipelines: true,
        include_quality_indicators: true,
        layout_algorithm: "hierarchical",
      });
      // console.log("Raw API response:", response);

      // The API now returns { nodes, edges, metadata } structure
      const apiNodes = response.nodes || [];
      const apiEdges = response.edges || [];
      if (!apiNodes.length && !apiEdges.length) {
        toast.error("No Lineage data for this company.");
      }

      // console.log("Received nodes:", apiNodes.length, "edges:", apiEdges.length);

      if (apiNodes.length > 0) {
        console.log("🔍 SAMPLE NODE STRUCTURE:");
        console.log("Full API node:", JSON.stringify(apiNodes[0], null, 2));
        console.log("Node data only:", JSON.stringify(apiNodes[0].data, null, 2));
      }
      if (apiEdges.length > 0) {
        console.log("🔍 SAMPLE EDGE STRUCTURE:");
        console.log("Full API edge:", JSON.stringify(apiEdges[0], null, 2));
      }

      if (apiNodes.length === 0) {
        console.log("No lineage data found, using fallback");
        setUseFallback(true);
        setNodes(fallbackNodes);
        setEdges(fallbackEdges);
        return;
      }

      // Map API nodes to ReactFlow nodes with DataProduct data
      const reactFlowNodes: Node<DataProduct>[] = apiNodes.map((apiNode: any, index: number) => {
        const nodeData = apiNode.data || {};

        // Extract position - handle the new data format structure
        let position = { x: 0, y: 0 };

        // Handle the new format where position is directly available
        if (apiNode.position && typeof apiNode.position === "object") {
          position = {
            x: apiNode.position.x || 0,
            y: apiNode.position.y || 0,
          };
        }

        console.log(`Node ${index} (${apiNode.id}):`, {
          originalPosition: apiNode.position,
          extractedPosition: position,
          label: nodeData.label,
          nodeData: nodeData,
        });

        // Determine node type based on the new data format
        let nodeType: "source" | "transform" | "destination" = "transform";
        let status: "success" | "running" | "error" | "pending" = "success";

        // Use node_type from the new data format
        const nodeTypeFromData = nodeData.node_type?.toLowerCase();

        if (nodeTypeFromData === "source" || nodeData.table_type === "source") {
          nodeType = "source";
        } else if (nodeTypeFromData === "destination" || nodeData.table_type === "destination") {
          nodeType = "destination";
        } else {
          nodeType = "transform"; // Default for tables and other types
        }

        // Set status based on row_count or other indicators from new format
        if (nodeData.row_count !== null && nodeData.row_count !== undefined) {
          if (nodeData.row_count === 0) {
            status = "pending";
          } else {
            status = "success";
          }
        }

        const nodeId = apiNode.id;

        return {
          id: nodeId,
          type: "dataProduct",
          position: position,
          data: {
            id: nodeId,
            name: nodeData.label || nodeData.name || nodeData.table_name || `Table ${nodeId}`,
            type: nodeType,
            status: status,
            description:
              nodeData.description ||
              `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} node - ${nodeData.schema_name || "Unknown schema"}`,
            recordCount: nodeData.row_count || nodeData.record_count || nodeData.count || 0,
            lastRun: nodeData.last_run || nodeData.updated_at || nodeData.created_at || "Unknown",
            owner: nodeData.owner || nodeData.table_owner || "Unknown",
            table_id: nodeData.table_id || nodeData.id || nodeData.tableId || nodeId, // Try multiple possible field names
          } as DataProduct,
          className: apiNode.className,
        };
      });

      // Map API edges to ReactFlow edges with enhanced edge data
      const reactFlowEdges: Edge[] = apiEdges.map((apiEdge: any) => {
        const edgeData = apiEdge.data || {};

        // Determine edge styling based on the new data format
        const confidence = edgeData.confidence || 0.8; // Default from the image data
        const isActive = edgeData.is_active !== false; // Default to true based on image data
        const relationshipType = edgeData.relationship_type || "default";
        const transformation = edgeData.transformation || null;

        // Color coding based on confidence and relationship type
        let strokeColor = "#3b82f6"; // Default blue
        let strokeWidth = 2;

        if (confidence >= 0.9) {
          strokeColor = "#10b981"; // Green for high confidence
          strokeWidth = 3;
        } else if (confidence >= 0.7) {
          strokeColor = "#f59e0b"; // Amber for medium confidence
          strokeWidth = 2;
        } else if (confidence >= 0.5) {
          strokeColor = "#ef4444"; // Red for lower confidence
          strokeWidth = 2;
        } else {
          strokeColor = "#6b7280"; // Gray for very low confidence
          strokeWidth = 1;
        }

        // Override colors based on relationship type
        if (relationshipType === "transformation") {
          strokeColor = "#8b5cf6"; // Purple for transformations
        } else if (relationshipType === "aggregation") {
          strokeColor = "#06b6d4"; // Cyan for aggregations
        } else if (relationshipType === "filter") {
          strokeColor = "#ec4899"; // Pink for filters
        }

        // Animation based on edge activity
        const animated = isActive;

        return {
          id: apiEdge.id,
          source: apiEdge.source,
          target: apiEdge.target,
          label: `${relationshipType} (${Math.round(confidence * 100)}%)`,
          animated: animated,
          type: "default",
          style: {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            strokeDasharray: !isActive ? "5,5" : undefined, // Dashed for inactive edges
          },
          data: {
            sourceTable: edgeData.source_table,
            sourceColumn: edgeData.source_column,
            targetTable: edgeData.target_table,
            targetColumn: edgeData.target_column,
            sourceSchema: edgeData.source_schema,
            targetSchema: edgeData.target_schema,
            transformation: transformation,
            confidence: confidence,
            relationshipType: relationshipType,
            isActive: isActive,
            createdAt: edgeData.created_at,
            metadata: edgeData.metadata || {},
            // Include all original edge data for compatibility
            ...edgeData,
          },
        };
      });

      // console.log(
      //   "Mapped ReactFlow nodes:",
      //   reactFlowNodes.length,
      //   "edges:",
      //   reactFlowEdges.length
      // );

      // Debug: Check for node/edge connectivity issues
      const nodeIds = new Set(reactFlowNodes.map((n) => n.id));
      const edgeSourceIds = new Set(reactFlowEdges.map((e) => e.source));
      const edgeTargetIds = new Set(reactFlowEdges.map((e) => e.target));

      // console.log("🔍 NODE/EDGE DEBUGGING:");
      // console.log("Node IDs:", Array.from(nodeIds));
      // console.log("Edge source IDs:", Array.from(edgeSourceIds));
      // console.log("Edge target IDs:", Array.from(edgeTargetIds));

      // Find missing nodes that are referenced in edges
      const missingSources = Array.from(edgeSourceIds).filter((id) => !nodeIds.has(id));
      const missingTargets = Array.from(edgeTargetIds).filter((id) => !nodeIds.has(id));

      // console.log("❌ Missing source nodes:", missingSources);
      // console.log("❌ Missing target nodes:", missingTargets);

      // Create missing nodes from edge information
      const createdNodes: Node<DataProduct>[] = [];
      const existingNodeIds = new Set(nodeIds);

      // Create nodes for missing sources
      missingSources.forEach((sourceId) => {
        if (!existingNodeIds.has(sourceId)) {
          const sourceEdges = reactFlowEdges.filter((e) => e.source === sourceId);
          const edgeData = sourceEdges[0]?.data;

          createdNodes.push({
            id: sourceId,
            type: "dataProduct",
            position: { x: 100, y: 100 }, // Default position
            data: {
              id: edgeData?.source_table_id || sourceId,
              name: edgeData?.source_table || `Source ${sourceId}`,
              type: "source" as const,
              status: "success" as const,
              description: `Source node - ${edgeData?.source_table || "Unknown table"}`,
              recordCount: 0,
              lastRun: "Unknown",
              owner: "Unknown",
            } as DataProduct,
          });
          existingNodeIds.add(sourceId);
        }
      });

      // Create nodes for missing targets
      missingTargets.forEach((targetId) => {
        if (!existingNodeIds.has(targetId)) {
          const targetEdges = reactFlowEdges.filter((e) => e.target === targetId);
          const edgeData = targetEdges[0]?.data;

          createdNodes.push({
            id: targetId,
            type: "dataProduct",
            position: { x: 400, y: 100 }, // Default position
            data: {
              id: edgeData?.target_table_id || targetId,
              name: edgeData?.target_table || `Target ${targetId}`,
              type: "destination" as const,
              status: "success" as const,
              description: `Target node - ${edgeData?.target_table || "Unknown table"}`,
              recordCount: 0,
              lastRun: "Unknown",
              owner: "Unknown",
            } as DataProduct,
          });
          existingNodeIds.add(targetId);
        }
      });

      // console.log(`🔧 Created ${createdNodes.length} missing nodes`);

      // Show detailed edge information for debugging
      console.log("📋 Detailed edge analysis:");
      reactFlowEdges.forEach((edge, index) => {
        const sourceExists = nodeIds.has(edge.source) || existingNodeIds.has(edge.source);
        const targetExists = nodeIds.has(edge.target) || existingNodeIds.has(edge.target);
        console.log(
          `Edge ${index}: ${edge.source} → ${edge.target} | Source exists: ${sourceExists} | Target exists: ${targetExists}`
        );
      });

      // Layout the created nodes in a reasonable pattern
      createdNodes.forEach((node, index) => {
        const cols = Math.ceil(Math.sqrt(createdNodes.length));
        const row = Math.floor(index / cols);
        const col = index % cols;
        node.position = {
          x: col * 250 + Math.random() * 50, // Add some randomness for better layout
          y: row * 150 + Math.random() * 30,
        };
      });

      // Combine original nodes with created nodes
      const allNodes = [...reactFlowNodes, ...createdNodes];

      if (missingSources.length > 0 || missingTargets.length > 0) {
        console.warn("🚨 Missing nodes referenced in edges - created placeholder nodes:", {
          missingSources,
          missingTargets,
          createdCount: createdNodes.length,
        });

        // All edges should now be valid since we created the missing nodes
        console.log(
          `✅ All ${reactFlowEdges.length} edges are now valid with ${allNodes.length} total nodes`
        );
        setNodes(allNodes);
        setEdges(reactFlowEdges);
      } else {
        console.log("✅ All edges are valid - no missing nodes");
        setNodes(reactFlowNodes);
        setEdges(reactFlowEdges);
      }

      // Additional debugging for specific nodes like "netsuite-customer"
      if (nodeIds.has("netsuite-customer")) {
        const netsuiteNode = reactFlowNodes.find((n) => n.id === "netsuite-customer");
        console.log("🎯 Found netsuite-customer node:", netsuiteNode);
        console.log("🎯 Netsuite-customer position:", netsuiteNode?.position);

        const connectedEdges = reactFlowEdges.filter(
          (e) => e.source === "netsuite-customer" || e.target === "netsuite-customer"
        );
        console.log(
          "🔗 Edges connected to netsuite-customer:",
          connectedEdges.length,
          connectedEdges
        );

        // Check if target node exists and its position
        if (connectedEdges.length > 0) {
          const targetNodeId = connectedEdges[0].target;
          const targetNode = reactFlowNodes.find((n) => n.id === targetNodeId);
          console.log("🎯 Target node:", targetNode);
          console.log("🎯 Target position:", targetNode?.position);

          // Check distance between nodes
          if (netsuiteNode?.position && targetNode?.position) {
            const distance = Math.sqrt(
              Math.pow(targetNode.position.x - netsuiteNode.position.x, 2) +
              Math.pow(targetNode.position.y - netsuiteNode.position.y, 2)
            );
            console.log("🎯 Distance between nodes:", distance);
          }
        }
      }

      // Check for any edges with very low confidence that might be invisible
      const lowConfidenceEdges = reactFlowEdges.filter((e) => (e.data as any)?.confidence < 0.1);
      if (lowConfidenceEdges.length > 0) {
        console.log("⚠️ Edges with very low confidence:", lowConfidenceEdges);
      }

      // Check edge styling
      // console.log("🎨 Sample edge styling:", reactFlowEdges[0]?.style);

      setUseFallback(false);
    } catch (err: any) {
      console.error("Error fetching lineage data:", err);
      setError(err.response?.data?.message || "Failed to fetch lineage data");
      // Fall back to sample data on error
      setUseFallback(true);
      setNodes(fallbackNodes);
      setEdges(fallbackEdges);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, tableId, columnId, setNodes, setEdges]);

  // Toggle between demo and real data
  const toggleDataSource = useCallback(() => {
    setIsManualToggle(true);
    if (useFallback) {
      // Currently showing demo data, switch to real data
      setUseFallback(false);
      fetchLineageData();
    } else {
      // Currently showing real data, switch to demo data
      setUseFallback(true);
      setNodes(fallbackNodes);
      setEdges(fallbackEdges);
      setError(null);
    }
  }, [useFallback, fetchLineageData]);

  // Fetch data when component mounts or dependencies change
  useEffect(() => {
    console.log("useEffect triggered - calling fetchLineageData");
    fetchLineageData();
  }, [fetchLineageData]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClickHandler = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (onNodeClick && node.data) {
        onNodeClick(node.data as DataProduct);
      }
    },
    [onNodeClick]
  );

  const onEdgeClickHandler = useCallback((event: React.MouseEvent, edge: Edge) => {
    console.log("Edge clicked:", edge);
    // You can add edge click functionality here if needed
    // For now, we'll just log the edge data for debugging
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full w-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading pipeline data...</p>
        </div>
      </div>
    );
  }

  // Error state (but still show fallback data)
  if (error && !useFallback) {
    return (
      <div className="h-full w-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-destructive font-medium">Failed to load pipeline</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={fetchLineageData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClickHandler}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Strict}
        fitView
        className="bg-background"
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        minZoom={0.3}
        maxZoom={1.5}
        fitViewOptions={{ padding: 100 }}
      >
        <Background color="hsl(var(--border))" gap={20} size={1} className="opacity-30" />
        <Controls
          className="bg-card/80 backdrop-blur-sm border border-border"
          showZoom={true}
          showFitView={true}
          showInteractive={false}
        />
        {/* Control buttons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {/* Data source toggle button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleDataSource}
                disabled={isLoading}
                className={`px-3 py-2 backdrop-blur-sm border rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${useFallback
                  ? "bg-yellow-100/80 text-yellow-800 border-yellow-300 hover:bg-yellow-100/60"
                  : "bg-card/80 text-card-foreground border-border hover:bg-card/60"
                  }`}
              >
                {useFallback ? (
                  <ToggleRight className="h-4 w-4" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {useFallback ? "Switch to real data" : "Switch to demo data"}
            </TooltipContent>
          </Tooltip>

          {/* Refresh button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={fetchLineageData}
                disabled={isLoading}
                className="px-3 py-2 bg-card/80 backdrop-blur-sm border border-border rounded-md hover:bg-card/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Refresh pipeline data</TooltipContent>
          </Tooltip>
        </div>

        {/* Data source indicator */}
        {useFallback && (
          <>
            <div className="absolute top-4 left-4 z-10">
              <div className="px-3 py-2 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-md text-sm">
                <Database className="inline w-4 h-4 mr-2" />
                Demo Data
              </div>
            </div>
            <div className="px-4 sm:px-6 py-4 w-[30%] absolute bottom-0 right-0 z-50">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <DatabaseZap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-2">Demo Data Detected</h3>
                    <p className="text-blue-800 text-sm mb-3">
                      You're currently viewing demo data. To see your actual data lineage, you need
                      to run the ELT pipeline to extract, transform, and load your real data.
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="flex items-center gap-2 text-blue-700">
                        <span className="font-medium">1. Start ELT Pipeline:</span>
                        <span>
                          Click the <DatabaseZap className="w-4 h-4 inline" /> button in the top
                          right
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-700">
                        <span className="font-medium">2. Check Progress:</span>
                        <span>
                          Click <List className="w-4 h-4 inline" /> "View ELT Pipeline Jobs" to
                          monitor completion
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </ReactFlow>
    </div >
  );
}
