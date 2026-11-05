"use client";

// import { useColumnDataStore } from "@/app/store/columnDataStore";
// import { GitBranch, CheckCircle2, XCircle, ArrowRight, Database, Table2 } from "lucide-react";
// import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
// import { Button } from '@/components/ui/button';
// import { useParams } from 'next/navigation';
// import { startTableLineageCrawl, getLineageEdges, LineageEdge, startNetsuiteLineageDiscovery } from '@/utils/lineage-api';
// import { toast } from 'sonner';
// import { LineageJobsDialog } from '@/components/lineage-jobs-dialog';
// import {
//   ReactFlow,
//   Position,
//   useNodesState,
//   useEdgesState,
//   addEdge,
//   Edge,
//   Node,
//   OnConnect,
//   Background,
//   MarkerType,
//   Handle,
// } from '@xyflow/react';
// import '@xyflow/react/dist/style.css';

// // Custom node types for lineage visualization
// const SourceNode = ({ data }: { data: any }) => (
//   <div className="p-3 rounded-lg border-2 border-blue-400 bg-blue-100 min-w-[140px] text-center shadow-lg relative">
//     <Handle type="source" position={Position.Right} className="w-3 h-3" />
//     <Database className="h-4 w-4 mx-auto mb-1" />
//     <div className="font-medium text-sm truncate">{data.table}</div>
//     <div className="text-xs text-gray-500">{data.schema}</div>
//     <div className="text-xs text-blue-600 mt-1">
//       Source ({data.connections.out})
//     </div>
//          {data.showCollapse !== undefined && (
//        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
//          <div
//            className="w-6 h-6 rounded-full border-2 border-blue-400 bg-blue-100 flex items-center justify-center cursor-pointer hover:bg-blue-200 text-xs font-bold text-blue-700"
//            onClick={(e) => {
//              e.stopPropagation();
//              console.log('SourceNode button clicked, level:', data.level, 'showCollapse:', data.showCollapse);
//              if (data.onCollapse) {
//                data.onCollapse();
//              }
//            }}
//          >
//            {data.showCollapse ? '-' : '+'}
//          </div>
//        </div>
//      )}
//   </div>
//  );

// const TargetNode = ({ data }: { data: any }) => (
//   <div className="p-3 rounded-lg border-2 border-green-400 bg-green-100 min-w-[140px] text-center shadow-lg relative">
//     <Handle type="target" position={Position.Left} className="w-3 h-3" />
//     <Database className="h-4 w-4 mx-auto mb-1" />
//     <div className="font-medium text-sm truncate">{data.table}</div>
//     <div className="text-xs text-gray-500">{data.schema}</div>
//     <div className="text-xs text-green-600 mt-1">
//       Target ({data.connections.in})
//     </div>
//          {data.showCollapse !== undefined && (
//        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
//          <div
//            className="w-6 h-6 rounded-full border-2 border-green-400 bg-green-100 flex items-center justify-center cursor-pointer hover:bg-green-200 text-xs font-bold text-green-700"
//            onClick={(e) => {
//              e.stopPropagation();
//              console.log('TargetNode button clicked, level:', data.level, 'showCollapse:', data.showCollapse);
//              if (data.onCollapse) {
//                data.onCollapse();
//              }
//            }}
//          >
//            {data.showCollapse ? '-' : '+'}
//          </div>
//        </div>
//      )}
//   </div>
//  );

// const BothNode = ({ data }: { data: any }) => (
//   <div className="p-3 rounded-lg border-2 border-purple-400 bg-purple-100 min-w-[140px] text-center shadow-lg relative">
//     <Handle type="target" position={Position.Left} className="w-3 h-3" />
//     <Database className="h-4 w-4 mx-auto mb-1" />
//     <div className="font-medium text-sm truncate">{data.table}</div>
//     <div className="text-xs text-gray-500">{data.schema}</div>
//     <div className="text-xs text-purple-600 mt-1">
//       Source & Target
//     </div>
//     <Handle type="source" position={Position.Right} className="w-3 h-3" />
//          {data.showCollapse !== undefined && (
//        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
//          <div
//            className="w-6 h-6 rounded-full border-2 border-purple-400 bg-purple-100 flex items-center justify-center cursor-pointer hover:bg-purple-200 text-xs font-bold text-purple-700"
//            onClick={(e) => {
//              e.stopPropagation();
//              console.log('BothNode button clicked, level:', data.level, 'showCollapse:', data.showCollapse);
//              if (data.onCollapse) {
//                data.onCollapse();
//              }
//            }}
//          >
//            {data.showCollapse ? '-' : '+'}
//          </div>
//        </div>
//      )}
//   </div>
//  );

// // ExpandNode component removed - buttons are now on data nodes

// // Node types definition
// const nodeTypes = {
//   source: SourceNode,
//   target: TargetNode,
//   both: BothNode,
// };

// // ReactFlow lineage graph component with level-based expansion
// const LineageFlow = ({ edges: lineageEdges }: { edges: LineageEdge[] }) => {
//   if (lineageEdges.length === 0) return null;

//   // Start with only level 1 visible, expand progressively
//   const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([1]));

//   // No more toggleLevel function - we handle expansion/collapse per node now

//      // Create ReactFlow nodes and edges from lineage data with level-based layout
//    const reactFlowData = useMemo((): { nodes: Node[], edges: Edge[] } => {
//      console.log('useMemo recalculating - expandedLevels changed to:', Array.from(expandedLevels));
//      console.log('Input lineageEdges:', lineageEdges.length, 'edges');
//      console.log('Sample edge data:', lineageEdges.slice(0, 3));

//     const nodesMap = new Map<string, {
//       id: string,
//       table: string,
//       schema: string,
//       x: number,
//       y: number,
//       connections: { in: number, out: number },
//       level: number,
//       role: 'source' | 'target' | 'both' | 'expand',
//       showCollapse?: boolean
//     }>();

//     const flowEdges: Edge[] = [];

//     // First pass: identify all unique tables and count their connections
//     const tableConnections = new Map<string, { in: number, out: number, table: string, schema: string }>();

//     lineageEdges.forEach((edge) => {
//       const sourceId = edge.source_table_id || edge.source_table;
//       const targetId = edge.target_table_id || edge.target_table;

//       // Count incoming connections for target
//       if (targetId) {
//         if (!tableConnections.has(targetId)) {
//           tableConnections.set(targetId, { in: 0, out: 0, table: edge.target_table, schema: edge.target_schema || 'default' });
//         }
//         tableConnections.get(targetId)!.in++;
//       }

//       // Count outgoing connections for source
//       if (sourceId) {
//         if (!tableConnections.has(sourceId)) {
//           tableConnections.set(sourceId, { in: 0, out: 0, table: edge.source_table, schema: edge.source_schema || 'default' });
//         }
//         tableConnections.get(sourceId)!.out++;
//       }
//     });

//     // Find the table with highest incoming connections (final target) - Level 1
//     let highestTargetTable = '';
//     let maxInConnections = 0;

//     tableConnections.forEach((connections, tableId) => {
//       if (connections.in > maxInConnections) {
//         maxInConnections = connections.in;
//         highestTargetTable = tableId;
//       }
//     });

//               // Assign levels using a more sophisticated algorithm
//      const tableLevels = new Map<string, number>();
//      const processedTables = new Set<string>();

//      console.log('Starting level assignment for', lineageEdges.length, 'edges');
//      console.log('All unique tables found:', Array.from(tableConnections.keys()));
//      console.log('Highest target table:', highestTargetTable, 'with', maxInConnections, 'incoming connections');

//     // Level 1: Only the highest target table
//     if (highestTargetTable) {
//       tableLevels.set(highestTargetTable, 1);
//       processedTables.add(highestTargetTable);
//       console.log('Level 1 assigned to:', highestTargetTable);
//     }

//     // Level 2: Tables that directly connect to Level 1
//     const level2Tables = new Set<string>();
//     console.log('Looking for Level 2 tables that connect to:', highestTargetTable);

//     lineageEdges.forEach((edge) => {
//       const sourceId = edge.source_table_id || edge.source_table;
//       const targetId = edge.target_table_id || edge.target_table;

//       if (targetId === highestTargetTable && sourceId && !processedTables.has(sourceId)) {
//         tableLevels.set(sourceId, 2);
//         level2Tables.add(sourceId);
//         processedTables.add(sourceId);
//         console.log('Level 2 assigned to:', sourceId);
//       }
//     });

//     console.log('Level 2 tables found:', Array.from(level2Tables));

//     // Level 3+: Tables that connect to any previous level (allowing skipped connections)
//     let currentLevel = 3;
//     let hasChanges = true;

//     console.log('Starting Level 3+ assignment...');

//     while (hasChanges && currentLevel <= 10) { // Prevent infinite loops
//       hasChanges = false;
//       const currentLevelTables = new Set<string>();

//       console.log(`Processing Level ${currentLevel}, current processed tables:`, Array.from(processedTables));

//       lineageEdges.forEach((edge) => {
//         const sourceId = edge.source_table_id || edge.source_table;
//         const targetId = edge.target_table_id || edge.target_table;

//         // Check if source connects to any table in previous levels
//         if (sourceId && !processedTables.has(sourceId)) {
//           let shouldAddToCurrentLevel = false;

//           // Check if this source connects to any table in previous levels
//           for (let prevLevel = 1; prevLevel < currentLevel; prevLevel++) {
//             const prevLevelTables = Array.from(tableLevels.entries())
//               .filter(([_, level]) => level === prevLevel)
//               .map(([tableId, _]) => tableId);

//             // Check if source connects to any previous level table
//             const connectsToPrevLevel = lineageEdges.some(e =>
//               (e.source_table_id || e.source_table) === sourceId &&
//               prevLevelTables.includes(e.target_table_id || e.target_table)
//             );

//             if (connectsToPrevLevel) {
//               shouldAddToCurrentLevel = true;
//               break;
//             }
//           }

//           if (shouldAddToCurrentLevel) {
//             tableLevels.set(sourceId, currentLevel);
//             currentLevelTables.add(sourceId);
//             processedTables.add(sourceId);
//             hasChanges = true;
//             console.log(`Level ${currentLevel} assigned to:`, sourceId);
//           }
//         }
//       });

//       if (hasChanges) {
//         console.log(`Level ${currentLevel} completed with ${currentLevelTables.size} tables:`, Array.from(currentLevelTables));
//         currentLevel++;
//       } else {
//         console.log(`Level ${currentLevel} - no more tables to assign`);
//       }
//     }

//     // IMPORTANT: Assign levels to ALL remaining tables that weren't processed
//     const remainingTables = Array.from(tableConnections.keys()).filter(tableId => !processedTables.has(tableId));
//     console.log('Remaining tables without levels:', remainingTables);

//     if (remainingTables.length > 0) {
//       // Assign them to a special level (999) to show they exist but don't fit the hierarchy
//       remainingTables.forEach(tableId => {
//         tableLevels.set(tableId, 999);
//         console.log(`Assigned level 999 (standalone) to:`, tableId);
//       });
//     }

//      console.log('Final level assignments:', Object.fromEntries(tableLevels));
//      console.log('Total tables assigned levels:', tableLevels.size);
//      console.log('Total unique tables found:', tableConnections.size);
//      console.log('Tables without levels:', Array.from(tableConnections.keys()).filter(tableId => !tableLevels.has(tableId)));

//     // Second pass: create nodes with positioning
//     const levelWidth = 200;
//     const nodeHeight = 120;
//     const topMargin = 50;

//          // Group nodes by level for better positioning
//      const nodesByLevel = new Map<number, string[]>();
//      tableLevels.forEach((level, tableId) => {
//        if (!nodesByLevel.has(level)) {
//          nodesByLevel.set(level, []);
//        }
//        nodesByLevel.get(level)!.push(tableId);
//      });

//      console.log('Creating nodes for expanded levels:', Array.from(expandedLevels));

//      tableLevels.forEach((level, tableId) => {
//        const tableInfo = tableConnections.get(tableId);
//        if (tableInfo) {
//          // Determine role based on connections
//          let role: 'source' | 'target' | 'both' = 'source';
//          if (tableInfo.in > 0 && tableInfo.out > 0) role = 'both';
//          else if (tableInfo.in > 0) role = 'target';
//          else role = 'source';

//          // Position nodes by level
//          let x, y;

//          if (level === 999) {
//            // Standalone tables - position them in a separate area
//            const standaloneIndex = Array.from(tableLevels.entries()).filter(([_, l]) => l === 999).indexOf([tableId, level]);
//            x = 50; // Left side
//            y = topMargin + standaloneIndex * (nodeHeight + 20);
//          } else {
//            // Hierarchical levels - only show if expanded
//            if (!expandedLevels.has(level)) {
//              console.log(`Skipping ${tableId} at level ${level} - not in expanded levels`);
//              return;
//            }

//            // Position nodes by level (right to left: level 1 = rightmost)
//            x = 800 - (level - 1) * levelWidth;

//            // Better y positioning - distribute nodes evenly within each level
//            const nodesInThisLevel = nodesByLevel.get(level) || [];
//            const nodeIndex = nodesInThisLevel.indexOf(tableId);
//            y = topMargin + nodeIndex * (nodeHeight + 20); // Add spacing between nodes
//          }

//          nodesMap.set(tableId, {
//            id: tableId,
//            table: tableInfo.table,
//            schema: tableInfo.schema,
//            x,
//            y,
//            connections: { in: tableInfo.in, out: tableInfo.out },
//            level,
//            role
//          });

//          console.log(`Created node for ${tableId} at level ${level} with role ${role}`);
//        } else {
//          console.log(`Warning: No table info found for ${tableId} at level ${level}`);
//        }
//      });

//      console.log('Total nodes created:', nodesMap.size);

//          // No more expand nodes - buttons are now on the actual data nodes

//          // Determine which nodes should show collapse/expand indicators based on their connections
//      tableLevels.forEach((level, tableId) => {
//        if (nodesMap.has(tableId)) {
//          const node = nodesMap.get(tableId)!;

//          // Skip standalone tables (level 999) - they don't need buttons
//          if (level === 999) {
//            node.showCollapse = undefined;
//            console.log(`Node ${tableId} at level ${level} (standalone): no button needed`);
//            return;
//          }

//          // Only process nodes in expanded levels
//          if (!expandedLevels.has(level)) {
//            return;
//          }

//          // Find nodes that connect TO this node (are behind it)
//          const nodesBehindThis = lineageEdges
//            .filter(edge => (edge.target_table_id || edge.target_table) === tableId)
//            .map(edge => edge.source_table_id || edge.source_table)
//            .filter(sourceId => sourceId && tableLevels.has(sourceId));

//          // Check if any of the nodes behind this one are currently visible
//          const hasVisibleNodesBehind = nodesBehindThis.some(sourceId =>
//            expandedLevels.has(tableLevels.get(sourceId)!)
//          );

//          // Check if there are hidden nodes behind this one
//          const hasHiddenNodesBehind = nodesBehindThis.some(sourceId =>
//            !expandedLevels.has(tableLevels.get(sourceId)!)
//          );

//          // Show "-" if there are visible nodes behind, show "+" if there are hidden nodes behind
//          if (hasVisibleNodesBehind) {
//            node.showCollapse = true; // Show "-" to collapse
//          } else if (hasHiddenNodesBehind) {
//            node.showCollapse = false; // Show "+" to expand
//          } else {
//            node.showCollapse = undefined; // No button needed
//          }

//          console.log(`Node ${tableId} at level ${level}: showCollapse = ${node.showCollapse}, hasVisibleNodesBehind = ${hasVisibleNodesBehind}, hasHiddenNodesBehind = ${hasHiddenNodesBehind}`);
//        }
//      });

//     // Third pass: create edges between visible nodes
//     console.log('Creating edges between visible nodes...');
//     let edgesCreated = 0;
//     let edgesSkipped = 0;

//     lineageEdges.forEach((edge) => {
//       const sourceId = edge.source_table_id || edge.source_table;
//       const targetId = edge.target_table_id || edge.target_table;

//       if (sourceId && targetId &&
//           nodesMap.has(sourceId) && nodesMap.has(targetId)) {
//         flowEdges.push({
//           id: `edge-${edge.id || Math.random()}`,
//           source: sourceId,
//           target: targetId,
//           markerEnd: { type: MarkerType.ArrowClosed },
//           label: edge.relationship_type || 'lineage',
//           labelStyle: { fontSize: '12px', fontWeight: '500' },
//           style: { stroke: '#6b7280', strokeWidth: 2 },
//           animated: true
//         });
//         edgesCreated++;
//       } else {
//         edgesSkipped++;
//         if (!sourceId || !targetId) {
//           console.log(`Edge skipped - missing source or target:`, { sourceId, targetId, edge });
//         } else if (!nodesMap.has(sourceId)) {
//           console.log(`Edge skipped - source not in nodesMap:`, sourceId);
//         } else if (!nodesMap.has(targetId)) {
//           console.log(`Edge skipped - target not in nodesMap:`, targetId);
//         }
//       }
//     });

//     console.log(`Edges created: ${edgesCreated}, skipped: ${edgesSkipped}`);

//     // Convert to ReactFlow Node format
//     const reactFlowNodes: Node[] = Array.from(nodesMap.values()).map(node => {
//       let nodeType = 'target';
//       if (node.level === 999) {
//         nodeType = 'source'; // Use source node style for standalone tables
//       } else if (node.role === 'source') {
//         nodeType = 'source';
//       } else if (node.role === 'both') {
//         nodeType = 'both';
//       }

//       return {
//         id: node.id,
//         type: nodeType,
//         position: { x: node.x, y: node.y },
//         data: {
//           ...node,
//           onCollapse: () => {
//             if (node.showCollapse) {
//               // If showing "-", collapse nodes connected TO this node
//               console.log('Collapse button clicked for node:', node.id, 'level:', node.level);

//               // Find all nodes that connect TO this node and collapse them
//               const nodesToCollapse = lineageEdges
//                 .filter(edge => (edge.target_table_id || edge.target_table) === node.id)
//                 .map(edge => edge.source_table_id || edge.source_table)
//                 .filter(sourceId => sourceId && tableLevels.has(sourceId))
//                 .map(sourceId => tableLevels.get(sourceId)!);

//               console.log('Collapsing nodes connected to', node.id, ':', nodesToCollapse);

//               // Remove these levels from expanded levels
//               setExpandedLevels(prev => {
//                 const newSet = new Set(prev);
//                 nodesToCollapse.forEach(level => newSet.delete(level));
//                 return newSet;
//               });

//             } else {
//               // If showing "+", expand nodes connected TO this node
//               console.log('Expand button clicked for node:', node.id, 'level:', node.level);

//               // Find all nodes that connect TO this node and expand them
//               const nodesToExpand = lineageEdges
//                 .filter(edge => (edge.target_table_id || edge.target_table) === node.id)
//                 .map(edge => edge.source_table_id || edge.source_table)
//                 .filter(sourceId => sourceId && tableLevels.has(sourceId))
//                 .map(sourceId => tableLevels.get(sourceId)!);

//               console.log('Expanding nodes connected to', node.id, ':', nodesToExpand);

//               // Add these levels to expanded levels
//               setExpandedLevels(prev => {
//                 const newSet = new Set(prev);
//                 nodesToExpand.forEach(level => newSet.add(level));
//                 return newSet;
//               });
//             }
//           }
//         }
//       };
//     });

//          console.log('Final nodes created:', reactFlowNodes.length, 'edges:', flowEdges.length);
//      console.log('Expanded levels:', Array.from(expandedLevels));

//      return { nodes: reactFlowNodes, edges: flowEdges };
//         }, [lineageEdges, expandedLevels]);

//   const [nodes, setNodes, onNodesChange] = useNodesState(reactFlowData.nodes);
//   const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowData.edges);

//   // Update React Flow state when reactFlowData changes
//   useEffect(() => {
//     console.log('Updating React Flow state with new data:', reactFlowData.nodes.length, 'nodes,', reactFlowData.edges.length, 'edges');
//     console.log('New nodes:', reactFlowData.nodes.map(n => ({ id: n.id, type: n.type, level: n.data?.level })));
//     console.log('New edges:', reactFlowData.edges.map(e => ({ id: e.id, source: e.source, target: e.target })));
//     setNodes(reactFlowData.nodes);
//     setEdges(reactFlowData.edges);
//   }, [reactFlowData, setNodes, setEdges]);

//   const onConnect: OnConnect = useCallback(
//     (params) => {
//       // Handle new connections if needed
//       console.log('New connection:', params);
//     },
//     []
//   );

//   const onNodeClick = useCallback((event: any, node: Node) => {
//     console.log('Node clicked:', node.id, 'type:', node.type, 'data:', node.data);
//     const data = node.data as any;

//     if (data?.showCollapse !== undefined) {
//       console.log('Button clicked, calling onCollapse for node:', data.id, 'level:', data.level);
//       if (typeof data?.onCollapse === 'function') {
//         data.onCollapse();
//       }
//     }
//   }, []);

//     return (
//     <div className="bg-white p-6 rounded-lg border">
//              <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
//          <GitBranch className="h-5 w-5" />
//          Data Lineage Graph - Level {Math.max(...Array.from(expandedLevels))} to Level 1
//          <span className="text-sm text-gray-500 ml-2">
//            (Expanded: {Array.from(expandedLevels).sort((a, b) => a - b).join(', ')})
//          </span>
//        </h4>

//       {/* ReactFlow Graph Container */}
//       <div className="w-full h-[600px] border border-gray-200 rounded-lg bg-gray-50">
//                  <ReactFlow
//            key={`flow-${Array.from(expandedLevels).sort().join('-')}`}
//            nodes={nodes}
//            edges={edges}
//            onNodesChange={onNodesChange}
//            onEdgesChange={onEdgesChange}
//            onConnect={onConnect}
//            onNodeClick={onNodeClick}
//            nodeTypes={nodeTypes}
//            fitView
//            fitViewOptions={{ padding: 0.1 }}
//            attributionPosition="bottom-left"
//            minZoom={0.5}
//            maxZoom={1.5}
//          >
//           <Background />
//         </ReactFlow>
//       </div>

//       {/* Legend */}
//       <div className="mt-4 flex justify-center gap-4 text-sm">
//         <div className="flex items-center gap-2">
//           <div className="w-3 h-3 bg-green-100 border border-green-400 rounded"></div>
//           <span>Target Tables (Level 1)</span>
//         </div>
//         <div className="flex items-center gap-2">
//           <div className="w-3 h-3 bg-blue-100 border border-blue-400 rounded"></div>
//           <span>Source Tables (Level 2+)</span>
//         </div>
//         <div className="flex items-center gap-2">
//           <div className="w-3 h-3 bg-purple-100 border border-purple-400 rounded"></div>
//           <span>Source & Target</span>
//         </div>
//         <div className="flex items-center gap-2">
//           <div className="w-3 h-3 bg-gray-100 border border-gray-400 rounded"></div>
//           <span>Standalone Tables</span>
//         </div>
//         <div className="flex items-center gap-2">
//           <div className="w-6 h-6 bg-gray-100 border border-gray-400 rounded-full flex items-center justify-center text-xs font-bold">+/-</div>
//           <span>Expand/Collapse Connected Nodes</span>
//         </div>
//       </div>
//       </div>
//     );
// };

// export default function LineagePage() {
//   const { selectedColumnData, isLoading, hasColumns } = useColumnDataStore();
//   const params = useParams<{ id: string }>();
//   const tableId = params?.id as string;
//   const [isStartingCrawl, setIsStartingCrawl] = useState(false);
//   const [isStartingNetsuiteDiscovery, setIsStartingNetsuiteDiscovery] = useState(false);
//   const initialFetchAttemptedForTableRef = useRef<string | null>(null);
//   const [openJobs, setOpenJobs] = useState(false);
//   const [lineageEdges, setLineageEdges] = useState<LineageEdge[]>([]);
//   const [isLoadingEdges, setIsLoadingEdges] = useState(false);
//   const [crawlStatus, setCrawlStatus] = useState<'idle' | 'checking' | 'crawling' | 'completed' | 'empty'>('idle');

//   // Smart data fetching logic: fetch -> crawl if needed -> show empty if still none
//   const fetchLineageData = async () => {
//     const savedCompanyId = localStorage.getItem('selectedCompanyId');
//     if (!savedCompanyId || !tableId) return;

//     try {
//       setCrawlStatus('checking');
//       setIsLoadingEdges(true);

//       // First, try to fetch existing lineage data
//       const response = await getLineageEdges({
//               company_id: savedCompanyId,
//       });

//       console.log('Lineage edges response received:', response);

//       // Handle both direct array and paginated response formats
//       const edgesData = Array.isArray(response) ? response : (response as any)?.items || [];

//       console.log('Processed lineage edges:', edgesData);

//       if (edgesData && edgesData.length > 0) {
//         setLineageEdges(edgesData);
//         setCrawlStatus('completed');
//         toast.success(`Found ${edgesData.length} lineage relationships!`);
//         return;
//       }

//       // If no data found, start crawling
//       toast.info('No lineage data found. Starting crawl...');
//       setCrawlStatus('crawling');
//       setIsStartingCrawl(true);

//       await startTableLineageCrawl({ company_id: savedCompanyId, table_id: tableId });

//       // Wait a bit and try fetching again
//       setTimeout(async () => {
//         try {
//           const newResponse = await getLineageEdges({
//             company_id: savedCompanyId,
//           });

//           // Handle both direct array and paginated response formats
//           const newEdgesData = Array.isArray(newResponse) ? newResponse : (newResponse as any)?.items || [];

//           if (newEdgesData && newEdgesData.length > 0) {
//             setLineageEdges(newEdgesData);
//             setCrawlStatus('completed');
//             toast.success(`Lineage data crawled successfully! Found ${newEdgesData.length} relationships.`);
//           } else {
//             setCrawlStatus('empty');
//             toast.info('No lineage relationships found for this table.');
//           }
//         } catch (e) {
//           setCrawlStatus('empty');
//           toast.error('Failed to fetch lineage data after crawl.');
//         }
//       }, 3000);

//       } catch (e) {
//       console.error('Error fetching lineage data:', e);
//       setCrawlStatus('empty');
//       toast.error('Failed to fetch lineage data.');
//       } finally {
//         setIsLoadingEdges(false);
//       setIsStartingCrawl(false);
//     }
//   };

//   // Load lineage data on mount
//   useEffect(() => {
//     if (!tableId) return;
//     if (initialFetchAttemptedForTableRef.current === tableId) return;
//     initialFetchAttemptedForTableRef.current = tableId;

//     fetchLineageData();
//   }, [tableId, selectedColumnData?.id]);

//   const handleStartNetsuiteDiscovery = async () => {
//     try {
//       const savedCompanyId = localStorage.getItem('selectedCompanyId');
//       if (!savedCompanyId) {
//         toast.error('No company selected');
//         return;
//       }

//       const connectorId = process.env.NEXT_PUBLIC_NET_SUITE_CONNECTOR_ID;
//       if (!connectorId) {
//         toast.error('NetSuite connector ID not found');
//         return;
//       }

//       setIsStartingNetsuiteDiscovery(true);

//       const payload = {
//         company_id: savedCompanyId,
//         connector_id: connectorId,
//         table_name: tableId
//       };
//       console.log('Sending NetSuite discovery payload:', payload);

//       const response = await startNetsuiteLineageDiscovery(payload);
//       console.log(response, 'netsuite discovery response');
//       toast.success('NetSuite lineage discovery started');

//       // After starting NetSuite discovery, automatically refresh the data
//       setTimeout(() => {
//         handleRefreshData();
//       }, 2000);

//     } catch (err: any) {
//       console.error('NetSuite discovery error:', err);
//       let message = 'Failed to start NetSuite discovery';

//       if (err?.response?.data?.detail) {
//         // Handle string or object detail
//         if (typeof err.response.data.detail === 'string') {
//           message = err.response.data.detail;
//         } else if (Array.isArray(err.response.data.detail)) {
//           message = err.response.data.detail.map((e: any) => e.msg || e).join(', ');
//         } else {
//           message = JSON.stringify(err.response.data.detail);
//         }
//       } else if (err?.message) {
//         message = err.message;
//       }

//       toast.error(message);
//     } finally {
//       setIsStartingNetsuiteDiscovery(false);
//     }
//   };

//   const handleRefreshData = () => {
//     setCrawlStatus('idle');
//     setLineageEdges([]);
//     fetchLineageData();
//   };

//   if (isLoading || (!selectedColumnData && hasColumns !== false)) {
//     return (
//       <div className="space-y-6">
//         <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mx-auto"></div>
//         <div className="bg-white rounded-lg p-4">
//           <div className="h-[300px] border rounded-lg bg-gray-100 animate-pulse"></div>
//         </div>
//         <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mx-auto"></div>
//         <div className="bg-white rounded-lg p-4">
//           <div className="animate-pulse space-y-3">
//             <div className="bg-gray-50 p-4 rounded">
//               <div className="flex space-x-4">
//                 {[1, 2, 3, 4, 5, 6].map((i) => (
//                   <div key={i} className="h-6 bg-gray-200 rounded flex-1"></div>
//                 ))}
//               </div>
//             </div>
//             <div className="flex space-x-4">
//               {[1, 2, 3, 4, 5, 6].map((j) => (
//                 <div key={j} className="h-4 bg-gray-200 rounded flex-1"></div>
//               ))}
//             </div>

//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (hasColumns === false) {
//     return (
//       <div className="flex items-center justify-center min-h-[500px]">
//         <div className="text-center max-w-md mx-auto">
//           <div className="bg-gray-50 rounded-lg p-8">
//             <GitBranch className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//             <h3 className="text-xl font-semibold text-gray-700 mb-3">No Columns Found</h3>
//             <p className="text-gray-600 leading-relaxed">
//               This table doesn't have any columns to analyze for lineage.
//             </p>
//             <div className="mt-4 text-sm text-gray-500">
//               Please select a different table that contains column data.
//             </div>
//             <div className="mt-6 flex flex-wrap gap-2 justify-center">
//               <Button
//                 variant="secondary"
//                 onClick={handleStartNetsuiteDiscovery}
//                 disabled={isStartingNetsuiteDiscovery}
//               >
//                 {isStartingNetsuiteDiscovery ? 'Starting...' : 'NetSuite Discovery'}
//               </Button>
//               <Button variant="outline" onClick={() => setOpenJobs(true)}>View Jobs</Button>
//             </div>
//           </div>
//         </div>
//         <LineageJobsDialog open={openJobs} onOpenChange={setOpenJobs} />
//       </div>
//     );
//   }

//   if (!selectedColumnData) {
//     return (
//       <div className="flex items-center justify-center min-h-[500px]">
//         <div className="text-center max-w-md mx-auto">
//           <div className="bg-gray-50 rounded-lg p-8">
//             <GitBranch className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//             <h3 className="text-xl font-semibold text-gray-700 mb-3">No Column Selected</h3>
//             <p className="text-gray-600 leading-relaxed">
//               Select a column from the sidebar to view its data lineage and transformation history.
//             </p>
//             <div className="mt-4 text-sm text-gray-500">
//               Data lineage shows how data flows from source to target systems.
//             </div>
//             <div className="mt-6 flex flex-wrap gap-2 justify-center">
//               <Button
//                 variant="secondary"
//                 onClick={handleStartNetsuiteDiscovery}
//                 disabled={isStartingNetsuiteDiscovery}
//               >
//                 {isStartingNetsuiteDiscovery ? 'Starting...' : 'NetSuite Discovery'}
//               </Button>
//               <Button variant="outline" onClick={() => setOpenJobs(true)}>View Jobs</Button>
//             </div>
//           </div>
//         </div>
//         <LineageJobsDialog open={openJobs} onOpenChange={setOpenJobs} />
//       </div>
//     );
//   }

//   // Removed old handleStartCrawl function - now using fetchLineageData with auto-crawl logic

//   return (
//     <div className="space-y-6">
//       <h3 className="font-bold text-xl text-soft-black text-center">Data Lineage</h3>

//       {/* Status indicators */}
//       {crawlStatus === 'checking' && (
//         <div className="p-3 rounded-lg border bg-blue-50/50 border-blue-100">
//             <div className="flex items-center gap-2">
//             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
//             <span className="text-sm font-medium text-blue-700">Checking for existing lineage data...</span>
//             </div>
//           </div>
//         )}

//       {crawlStatus === 'crawling' && (
//         <div className="p-3 rounded-lg border bg-amber-50/50 border-amber-100">
//           <div className="flex items-center gap-2">
//             <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
//             <span className="text-sm font-medium text-amber-700">Crawling lineage data...</span>
//             </div>
//           </div>
//         )}

//       {crawlStatus === 'completed' && lineageEdges.length > 0 && (
//         <div className="p-3 rounded-lg border bg-emerald-50/50 border-emerald-100">
//           <div className="flex items-center gap-2 text-emerald-700">
//             <CheckCircle2 className="h-4 w-4" />
//             <span className="text-sm font-medium">Found {lineageEdges.length} lineage relationships</span>
//             </div>
//           </div>
//         )}

//       {/* Main content area */}
//       {crawlStatus === 'completed' && lineageEdges.length > 0 ? (
//         <>
//           {/* Simple lineage flow visualization */}
//           <LineageFlow edges={lineageEdges} />

//           {/* Detailed table */}
//           <div className="space-y-4">
//             <h4 className="font-bold text-lg text-soft-black text-center">Detailed Lineage Table</h4>
//             <div className="bg-white rounded-lg p-4 overflow-x-auto">
//                              <table className="w-full border-collapse border border-gray-300 min-w-[1200px]">
//                                  <thead>
//                    <tr className="bg-gray-50">
//                      <th className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap min-w-[120px]">Source Table ID</th>
//                      <th className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap min-w-[120px]">Source Column ID</th>
//                      <th className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap min-w-[120px]">Target Table ID</th>
//                      <th className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap min-w-[120px]">Target Column ID</th>
//                      <th className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap min-w-[100px]">Relationship</th>
//                      <th className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap min-w-[80px]">Confidence</th>
//                      <th className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap min-w-[80px]">Active</th>
//                      <th className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap min-w-[200px]">Transformation</th>
//                      <th className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap min-w-[120px]">Created At</th>
//                    </tr>
//                  </thead>
//                 <tbody>
//                                      {lineageEdges.map((edge) => (
//                      <tr key={edge.id} className="hover:bg-gray-50">
//                        <td className="border border-gray-300 p-2 text-center text-sm whitespace-nowrap">{edge.source_table_id || edge.source_table || '-'}</td>
//                        <td className="border border-gray-300 p-2 text-center text-sm font-medium whitespace-nowrap">{edge.source_column_id || edge.source_column || '-'}</td>
//                        <td className="border border-gray-300 p-2 text-center text-sm whitespace-nowrap">{edge.target_table_id || edge.target_table || '-'}</td>
//                        <td className="border border-gray-300 p-2 text-center text-sm font-medium whitespace-nowrap">{edge.target_column_id || edge.target_column || '-'}</td>
//                        <td className="border border-gray-300 p-2 text-center text-sm whitespace-nowrap">
//                          {edge.relationship_type ? (
//                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
//                              {edge.relationship_type}
//                            </span>
//                          ) : '-'}
//                        </td>
//                        <td className="border border-gray-300 p-2 text-center text-sm whitespace-nowrap">
//                          {edge.confidence !== undefined ? (
//                            <span className={`px-2 py-1 rounded-full text-xs ${
//                              edge.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
//                              edge.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
//                              'bg-red-100 text-red-800'
//                            }`}>
//                              {(edge.confidence * 100).toFixed(0)}%
//                            </span>
//                          ) : '-'}
//                        </td>
//                        <td className="border border-gray-300 p-2 text-center text-sm whitespace-nowrap">
//                          {edge.is_active !== undefined ? (
//                            <span className={`px-2 py-1 rounded-full text-xs ${
//                              edge.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
//                            }`}>
//                              {edge.is_active ? 'Active' : 'Inactive'}
//                            </span>
//                          ) : '-'}
//                        </td>
//                        <td className="border border-gray-300 p-2 text-left text-sm max-w-[200px]">
//                          {edge.transformation ? (
//                            <div className="truncate" title={edge.transformation}>
//                              {edge.transformation}
//                            </div>
//                          ) : '-'}
//                        </td>
//                        <td className="border border-gray-300 p-2 text-center text-sm whitespace-nowrap">
//                          {edge.created_at ? (
//                            new Date(edge.created_at).toLocaleDateString('en-US', {
//                              year: 'numeric',
//                              month: 'short',
//                              day: 'numeric',
//                              hour: '2-digit',
//                              minute: '2-digit'
//                            })
//                          ) : '-'}
//                        </td>
//                      </tr>
//                    ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </>
//       ) : crawlStatus === 'empty' ? (
//         <div className="bg-white rounded-lg p-8">
//           <div className="text-center">
//             <GitBranch className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//             <h4 className="text-xl font-semibold text-gray-700 mb-3">No Lineage Data Found</h4>
//             <p className="text-gray-600 mb-6">
//               No lineage relationships were found for this table, even after crawling.
//             </p>
//             <div className="flex flex-wrap gap-2 justify-center">
//               <Button onClick={handleRefreshData} disabled={isLoadingEdges}>
//                 Try Again
//                 </Button>
//                 <Button
//                   variant="secondary"
//                   onClick={handleStartNetsuiteDiscovery}
//                   disabled={isStartingNetsuiteDiscovery}
//                 >
//                   {isStartingNetsuiteDiscovery ? 'Starting...' : 'NetSuite Discovery'}
//                 </Button>
//                 <Button variant="outline" onClick={() => setOpenJobs(true)}>View Jobs</Button>
//               </div>
//             </div>
//         </div>
//       ) : (
//         <div className="bg-white rounded-lg p-8">
//           <div className="text-center">
//             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
//             <p className="text-gray-600">
//               {crawlStatus === 'checking' ? 'Checking for lineage data...' :
//                crawlStatus === 'crawling' ? 'Crawling lineage data...' :
//                'Loading...'}
//             </p>
//         </div>
//       </div>
//       )}

//       <LineageJobsDialog open={openJobs} onOpenChange={setOpenJobs} />
//     </div>
//   );
// }

// "use client";
import React, { useState, useEffect } from "react";
// import { useParams } from "next/navigation";
import { PipelineVisualization } from "@/components/pipeline-visualization";
import { DataProductSheet } from "@/components/data-product-sheet";
import { DataProduct } from "@/components/data-product-node";
import { DatabaseZap, GitBranch, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startTableLineageCrawl,
  startNetsuiteLineageDiscovery,
  fetchJobs,
  startELTPipeline,
} from "@/utils/lineage-api";
import { LineageJobsDialog } from "@/components/lineage-jobs-dialog";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  // const params = useParams();
  // const tableId = params?.id as string;
  const [mounted, setMounted] = useState(false);
  const [tableId, setTableId] = useState<string>("");
  const [selectedDataProduct, setSelectedDataProduct] = useState<DataProduct | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [jobsDialogOpen, setJobsDialogOpen] = useState(false);

  const handleNodeClick = (dataProduct: DataProduct) => {
    setSelectedDataProduct(dataProduct);
    setSheetOpen(true);
  };

  const handleDeepDive = (dataProduct: DataProduct) => {
    setSheetOpen(false);
  };

  const handleStartLineageDiscovery = async (action: "crawl" | "discovery" | "jobs") => {
    const companyId =
      typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") : null;
    if (!companyId) {
      toast.error("No company selected");
      return;
    }

    try {
      switch (action) {
        case "crawl":
          const existingJobs = await fetchJobs({ company_id: companyId });
          const activeLineageJobs = existingJobs.filter(
            (job) =>
              (job.pipeline_type === "crawl" ||
                job.pipeline_type?.toLowerCase().includes("lineage")) &&
              (job.status === "running" || job.status === "pending")
          );

          if (activeLineageJobs.length > 0) {
            toast.error(
              "A lineage crawl job is already running. Please wait for it to complete before starting a new one."
            );
            return;
          }

          toast.info("Starting ETL pipeline...");
          await startELTPipeline({
            company_id: companyId,
            entity: "customer",
            config: {
              extract_method: "full",
              transform_method: "dbt",
              load_method: "bigquery",
            },
          });
          toast.success("ELT pipeline started successfully");
          break;

        case "discovery":
          toast.info("Starting NetSuite lineage discovery...");
          const connectorId = process.env.NEXT_PUBLIC_NET_SUITE_CONNECTOR_ID;
          if (!connectorId) {
            toast.error("NetSuite connector ID not found");
            return;
          }

          await startNetsuiteLineageDiscovery({
            company_id: companyId,
            connector_id: connectorId,
            table_name: tableId,
          });
          toast.success("NetSuite lineage discovery started successfully");
          break;

        case "jobs":
          setJobsDialogOpen(true);
          break;
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(
        `Failed to ${action === "crawl" ? "start crawl" : action === "discovery" ? "start discovery" : "open jobs"}: ${error.message || "Unknown error"}`
      );
    }
  };

  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
    // Parse the ID from the URL directly
    const segments = window.location.pathname.split("/");
    const id = segments[segments.indexOf("lineage") - 1] ?? "";
    setTableId(id);
  }, []);

  if (!mounted) return null; // Skip rendering entirely during prerender

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
                Data Lineage Pipeline
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={() => handleStartLineageDiscovery("crawl")}
                  className="px-2 sm:px-4"
                >
                  {<DatabaseZap className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Start ELT Pipeline</TooltipContent>
            </Tooltip>
            {/* <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={() => handleStartLineageDiscovery("discovery")}
                  className="px-2 sm:px-4"
                >
                  {<Search className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Start Lineage Discovery</TooltipContent>
            </Tooltip> */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={() => handleStartLineageDiscovery("jobs")}
                  className="px-2 sm:px-4"
                >
                  {<List className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>View ELT Pipeline Jobs</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Demo Data Guide Box */}

      <div className="flex h-[calc(80vh-4rem)]">
        <main className="flex-1 relative">
          <PipelineVisualization onNodeClick={handleNodeClick} tableId={tableId} />
        </main>
      </div>

      <DataProductSheet
        dataProduct={selectedDataProduct}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDeepDive={handleDeepDive}
      />

      <LineageJobsDialog open={jobsDialogOpen} onOpenChange={setJobsDialogOpen} />
    </div>
  );
}
