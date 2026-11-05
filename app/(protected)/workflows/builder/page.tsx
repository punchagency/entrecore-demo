"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Node,
  Handle,
  Position,
  MarkerType,
  ConnectionMode
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Save,
  ArrowLeft,
  GripHorizontal,
  Settings2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Info,
  RefreshCcw,
  Filter,
  Columns,
  GitMerge,
  Layers,
  Calculator,
  BarChart2
} from "lucide-react";
import { useCreateWorkflow, useWorkflowValidation } from "../hooks/use-workflows";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { ValidationIssue } from "../services/workflow-api";
import {
  SelectNodeConfig,
  FilterNodeConfig,
  JoinNodeConfig,
  UnionNodeConfig,
  AggregateNodeConfig,
  CalculatedFieldNodeConfig,
} from "../components/transform-node-configs";

const LOOP_MAX_ITERATIONS = 1000;

const NODE_TYPE_ICONS: Record<string, typeof GripHorizontal> = {
  select: Columns,
  filter: Filter,
  join: GitMerge,
  union: Layers,
  aggregate: BarChart2,
  calculated_field: Calculator,
};

const CONTROL_NODE_BRANCHES: Record<string, string[]> = {
  if_else: ["true", "false"],
  switch_case: ["case_a", "case_b", "default"],
  loop: ["body", "exit"],
};

// Custom Node Component to show validation issues
const WorkflowNode = ({ id, data, selected }: any) => {
  const hasIssues = data?.issues && data.issues.length > 0;
  const errorCount = data?.issues?.filter((i: any) => i.severity === 'error').length || 0;
  const warnCount = data?.issues?.filter((i: any) => i.severity === 'warning').length || 0;

  return (
    <div className={`
      relative p-4 rounded-2xl border-2 transition-all min-w-[180px] shadow-sm
      ${selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
      ${errorCount > 0 ? 'border-red-500 bg-red-50/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
        warnCount > 0 ? 'border-amber-400 bg-amber-50/30' :
        'border-slate-200 bg-white hover:border-indigo-300'}
    `}>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-black !border-0" />

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className={`text-[8px] uppercase tracking-tighter px-1.5 py-0 border-0 bg-slate-100 text-slate-500`}>
            {data?.customType || 'node'}
          </Badge>
          {hasIssues && (
            <div className={`p-1 rounded-full ${errorCount > 0 ? 'bg-red-500' : 'bg-amber-400'} text-white animate-pulse`}>
              {errorCount > 0 ? <AlertCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            </div>
          )}
        </div>

        <div className="font-bold text-slate-900 text-sm">{data?.nodeLabel || 'Untitled Node'}</div>
        <div className="text-[10px] text-slate-400 font-mono italic flex items-center gap-1">
          <Info className="h-2 w-2" /> {id?.substring(0, 8) || 'unknown'}
        </div>
      </div>

      {data?.customType === "if_else" && (
        <>
          <Handle id="branch_true" type="source" position={Position.Bottom} style={{ left: "30%" }} className="!w-2.5 !h-2.5 !bg-black !border-0" />
          <Handle id="branch_false" type="source" position={Position.Bottom} style={{ left: "70%" }} className="!w-2.5 !h-2.5 !bg-black !border-0" />
          <div className="mt-2 flex justify-between text-[9px] font-semibold text-slate-500">
            <span>T</span>
            <span>F</span>
          </div>
        </>
      )}
      {data?.customType === "switch_case" && (
        <>
          <Handle id="branch_case_a" type="source" position={Position.Bottom} style={{ left: "20%" }} className="!w-2.5 !h-2.5 !bg-black !border-0" />
          <Handle id="branch_case_b" type="source" position={Position.Bottom} style={{ left: "50%" }} className="!w-2.5 !h-2.5 !bg-black !border-0" />
          <Handle id="branch_default" type="source" position={Position.Bottom} style={{ left: "80%" }} className="!w-2.5 !h-2.5 !bg-black !border-0" />
          <div className="mt-2 flex justify-between text-[8px] font-semibold text-slate-500">
            <span>A</span>
            <span>B</span>
            <span>D</span>
          </div>
        </>
      )}
      {data?.customType === "loop" && (
        <>
          <Handle id="branch_body" type="source" position={Position.Bottom} style={{ left: "35%" }} className="!w-2.5 !h-2.5 !bg-black !border-0" />
          <Handle id="branch_exit" type="source" position={Position.Bottom} style={{ left: "65%" }} className="!w-2.5 !h-2.5 !bg-black !border-0" />
          <div className="mt-2 flex justify-between text-[8px] font-semibold text-slate-500">
            <span>Body</span>
            <span>Exit</span>
          </div>
        </>
      )}
      {!["if_else", "switch_case", "loop"].includes(data?.customType) && (
        <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-black !border-0" />
      )}
    </div>
  );
};

interface WorkflowNodeData extends Record<string, unknown> {
  label: React.ReactNode;
  customType: string;
  nodeLabel: string;
  config: Record<string, any>;
  issues?: ValidationIssue[];
}

function getMissingControlBranches(
  node: Node<WorkflowNodeData>,
  allEdges: Edge[]
): string[] {
  const requiredBranches = CONTROL_NODE_BRANCHES[node.data.customType] || [];
  if (requiredBranches.length === 0) return [];

  const connectedHandles = new Set(
    allEdges
      .filter((edge) => edge.source === node.id)
      .map((edge) => edge.sourceHandle)
      .filter((handle): handle is string => Boolean(handle))
  );

  return requiredBranches.filter((branch) => !connectedHandles.has(`branch_${branch}`));
}

const nodeTypes = {
  default: WorkflowNode,
};

// Node group separator labels for the sidebar
const NODE_GROUPS: { group: string; nodes: { type: string; label: string; color: string; icon?: string }[] }[] = [
  {
    group: "Data I/O",
    nodes: [
      { type: "extract", label: "Extract Data", color: "bg-blue-100 text-blue-700 border-blue-200" },
      { type: "load", label: "Load Data", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
      { type: "integration", label: "Integration", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
    ],
  },
  {
    group: "Transformers",
    nodes: [
      { type: "select", label: "Select Columns", color: "bg-violet-100 text-violet-700 border-violet-200" },
      { type: "filter", label: "Filter Rows", color: "bg-orange-100 text-orange-700 border-orange-200" },
      { type: "join", label: "Join", color: "bg-teal-100 text-teal-700 border-teal-200" },
      { type: "union", label: "Union", color: "bg-lime-100 text-lime-700 border-lime-200" },
      { type: "aggregate", label: "Aggregate", color: "bg-pink-100 text-pink-700 border-pink-200" },
      { type: "calculated_field", label: "Calculated Field", color: "bg-amber-100 text-amber-700 border-amber-200" },
      { type: "transform", label: "Custom Transform", color: "bg-purple-100 text-purple-700 border-purple-200" },
    ],
  },
  {
    group: "Quality & Models",
    nodes: [
      { type: "dq_check", label: "Data Quality Check", color: "bg-orange-100 text-orange-700 border-orange-200" },
      { type: "dbt", label: "dbt Model", color: "bg-rose-100 text-rose-700 border-rose-200" },
    ],
  },
  {
    group: "Control Flow",
    nodes: [
      { type: "if_else", label: "If / Else", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
      { type: "switch_case", label: "Switch / Case", color: "bg-violet-100 text-violet-700 border-violet-200" },
      { type: "loop", label: "Loop", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    ],
  },
  {
    group: "DRAT",
    nodes: [
      { type: "drat_classify", label: "DRAT Classify", color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" },
      { type: "drat_route", label: "DRAT Route", color: "bg-pink-100 text-pink-700 border-pink-200" },
      { type: "drat_approval", label: "DRAT Approval", color: "bg-amber-100 text-amber-700 border-amber-200" },
      { type: "drat_extraction_handoff", label: "DRAT Extraction", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
    ],
  },
  {
    group: "Utilities",
    nodes: [
      { type: "notification", label: "Notification", color: "bg-sky-100 text-sky-700 border-sky-200" },
      { type: "custom", label: "Custom Task", color: "bg-slate-100 text-slate-700 border-slate-200" },
    ],
  },
];

export default function WorkflowBuilder() {
  const router = useRouter();
  const createWf = useCreateWorkflow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("New Pipeline");
  const [description, setDescription] = useState("");

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const { mutate: validate } = useWorkflowValidation();

  // Debounced Validation Logic
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (nodes.length === 0) {
        setValidationIssues([]);
        return;
      }

      setIsValidating(true);
      const payload = {
        nodes: nodes.map(n => ({
          node_key: n.id,
          node_type: n.data.customType as any,
          label: n.data.nodeLabel,
          config: n.data.config
        })),
        edges: edges.map(e => ({
          source_node_key: e.source,
          target_node_key: e.target
        }))
      };

      const clientIssues: ValidationIssue[] = nodes.flatMap((node) => {
        const missingBranches = getMissingControlBranches(node, edges);
        return missingBranches.map((branchName) => ({
          severity: "warning",
          code: "unconnected_branch",
          message: `Branch "${branchName}" is not connected.`,
          node_key: node.id,
          field: "branch",
        }));
      });

      validate(payload, {
        onSuccess: (data) => {
          const mergedIssues = [...data.issues, ...clientIssues];
          setValidationIssues(mergedIssues);

          // Inject issues specifically into each node's data for visual feedback
          setNodes(nds => nds.map(n => ({
            ...n,
            data: {
              ...n.data,
              issues: mergedIssues.filter(i => i.node_key === n.id)
            }
          })));
        },
        onSettled: () => setIsValidating(false)
      });
    }, 1000); // 1s debounce

    return () => clearTimeout(timeout);
  }, [nodes, edges, validate, setNodes]);

  const onConnect = useCallback((params: Connection | Edge) => {
    if (!params.source || !params.target) return;

    const branchLabel = "sourceHandle" in params && params.sourceHandle
      ? params.sourceHandle.replace("branch_", "")
      : undefined;

    const nextEdge: Edge = {
      id: `edge_${params.source}_${params.sourceHandle || "default"}_${params.target}_${params.targetHandle || "default"}`,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle || null,
      targetHandle: params.targetHandle || null,
      label: branchLabel,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
      },
      style: {
        strokeWidth: 2,
        stroke: "#111827",
      },
      labelStyle: {
        fill: "#4338ca",
        fontSize: 10,
        fontWeight: 700,
      },
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 1,
      },
    };

    setEdges((eds) =>
      addEdge(nextEdge, eds)
    );
  }, [setEdges]);

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify({ type: nodeType, label }));
    event.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeDataStr = event.dataTransfer.getData("application/reactflow");

      if (!nodeDataStr || !reactFlowBounds) return;

      const nodeData = JSON.parse(nodeDataStr);
      const position = {
         // rudimentary position offset
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const nodeId = `node_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
      const newNode: Node<WorkflowNodeData> = {
        id: nodeId,
        type: 'default', // Using default reactflow node for simplicity, passing styling via data
        position,
        data: {
           label: (
             <div className="flex flex-col gap-1 items-center">
               <div className="font-bold text-sm tracking-wide bg-white px-2 py-1 rounded shadow-sm">
                 {nodeData.label}
               </div>
               <Badge variant="outline" className={`text-[9px] uppercase font-mono border-0 px-1 py-0`}>
                 {nodeData.type}
               </Badge>
             </div>
           ),
           customType: nodeData.type,
           nodeLabel: nodeData.label,
           config: nodeData.type === "loop"
             ? { max_iterations: 10 }
             : nodeData.type === "integration"
               ? { job_id: "", triggered_by: "workflow" }
             : nodeData.type === "drat_classify"
               ? { confidence_threshold: 0.8 }
             : nodeData.type === "drat_route"
               ? { route_key: "" }
             : nodeData.type === "drat_approval"
               ? { require_human_review: true }
             : nodeData.type === "if_else"
               ? { condition: "" }
             : nodeData.type === "switch_case"
               ? { expression: "", cases: ["case_a", "case_b"], has_default: true }
             // --- Transformer node defaults ---
             : nodeData.type === "select"
               ? { columns: [] as string[] }
             : nodeData.type === "filter"
               ? { expression: "", language: "sql" }
             : nodeData.type === "join"
               ? { join_type: "inner", left_key: "", right_key: "", right_node_key: "" }
             : nodeData.type === "union"
               ? { all: true }
             : nodeData.type === "aggregate"
               ? { group_by: [] as string[], aggregations: [] as { column: string; func: string; alias: string }[] }
             : nodeData.type === "calculated_field"
               ? { fields: [] as { name: string; expression: string }[] }
             : {}
        },
        style: {
           background: '#f8fafc',
           border: '2px solid #cbd5e1',
           borderRadius: '12px',
           padding: '10px',
           minWidth: '150px',
           boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
        }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
  };

  const handleSave = () => {
    if (nodes.length === 0) {
      toast.error("Pipeline must have at least one node");
      return;
    }

    const payloadNodes = nodes.map(n => ({
      node_key: n.id,
      node_type: n.data.customType as any,
      label: n.data.nodeLabel,
      config: n.data.config
    }));

    const payloadEdges = edges.map(e => ({
      source_node_key: e.source,
      target_node_key: e.target
    }));

    createWf.mutate(
      {
        company_id: "test-company-001", // Default test company
        name,
        description,
        nodes: payloadNodes,
        edges: payloadEdges
      },
      {
         onSuccess: () => {
            toast.success("Workflow deployed successfully!");
            router.push("/workflows");
         },
         onError: (error: any) => {
            toast.error(error?.response?.data?.detail || "Failed to deploy workflow");
         }
      }
    );
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const updateNodeConfig = (key: string, value: string) => {
     if(!selectedNode) return;
     const normalizedValue = key === "max_iterations"
       ? String(Math.max(1, Math.min(LOOP_MAX_ITERATIONS, Number(value) || 1)))
       : key === "confidence_threshold"
         ? Math.max(0, Math.min(1, Number(value) || 0))
         : value;
     setNodes(nds => nds.map(n => {
        if(n.id === selectedNodeId) {
           return {
              ...n,
              data: {
                 ...n.data,
                 config: { ...(n.data.config as any), [key]: normalizedValue }
              }
           };
        }
        return n;
     }));
  };

  const updateNodeLabel = (value: string) => {
     if(!selectedNode) return;
     setNodes(nds => nds.map(n => {
        if(n.id === selectedNodeId) {
           return {
              ...n,
              data: {
                 ...n.data,
                 nodeLabel: value,
                 label: (
                   <div className="flex flex-col gap-1 items-center">
                     <div className="font-bold text-sm tracking-wide bg-white px-2 py-1 rounded shadow-sm">
                       {value}
                     </div>
                     <Badge variant="outline" className={`text-[9px] uppercase font-mono border-0 px-1 py-0`}>
                       {n.data.customType as string}
                     </Badge>
                   </div>
                 )
              }
           };
        }
        return n;
     }));
  };

  const deleteNode = () => {
     if(!selectedNodeId) return;
     setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
     setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
     setSelectedNodeId(null);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC]">
      <style jsx global>{`
        .react-flow__pane {
          cursor: default !important;
        }

        .react-flow__pane.dragging {
          cursor: move !important;
        }

        .react-flow__node {
          cursor: pointer !important;
        }

        .react-flow__node.selected {
          cursor: move !important;
        }

        .react-flow__handle {
          background: #000 !important;
          border: 1px solid #000 !important;
          width: 10px !important;
          height: 10px !important;
        }

        .react-flow__handle:hover,
        .react-flow__handle:focus,
        .react-flow__handle-connecting,
        .react-flow__handle-valid {
          background: #000 !important;
          border-color: #000 !important;
        }

        .react-flow__resize-control.handle {
          background: #111827 !important;
          border: 1px solid #111827 !important;
          width: 9px !important;
          height: 9px !important;
          border-radius: 9999px !important;
        }

        .react-flow__resize-control.handle:hover,
        .react-flow__resize-control.handle:focus {
          background: #000 !important;
          border-color: #000 !important;
        }

        .react-flow__minimap-mask {
          fill: rgba(17, 24, 39, 0.18) !important;
        }
      `}</style>
      {/* Topbar */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 relative">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/workflows")} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-px h-6 bg-slate-200" />
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-lg font-bold border-0 focus-visible:ring-1 focus-visible:ring-indigo-500 h-9 px-2 bg-transparent shadow-none w-64"
            placeholder="Pipeline Name"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
            {isValidating ? (
              <RefreshCcw className="h-4 w-4 text-indigo-500 animate-spin" />
            ) : validationIssues.length === 0 ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : validationIssues.some(i => i.severity === 'error') ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            <span className="text-xs font-bold text-slate-600">
              {isValidating ? 'Validating...' :
               validationIssues.length === 0 ? 'Pipeline Valid' :
               `${validationIssues.length} Issues Found`}
            </span>
          </div>
          <Button
            onClick={handleSave}
            disabled={createWf.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md border-0 px-6"
          >
            <Save className="h-4 w-4 mr-2" />
            Deploy Pipeline
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
         {/* Node Library Sidebar */}
         <div className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col z-10 relative">
           <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Node Library</h3>
           <p className="text-xs text-slate-400 mb-4">Drag components onto the canvas to build your workflow.</p>

           <div className="space-y-4 flex-1 overflow-y-auto pr-1">
             {NODE_GROUPS.map(group => (
               <div key={group.group}>
                 <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">{group.group}</div>
                 <div className="space-y-1.5">
                   {group.nodes.map(nt => {
                     const Icon = NODE_TYPE_ICONS[nt.type] || GripHorizontal;
                     return (
                     <div
                       key={nt.type}
                       draggable
                       onDragStart={(e) => onDragStart(e, nt.type, nt.label)}
                       className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all cursor-move flex items-center gap-2.5 group"
                     >
                       <Icon className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                       <div className="min-w-0">
                         <div className="text-xs font-semibold text-slate-700 leading-tight">{nt.label}</div>
                         <div className="text-[9px] font-mono text-slate-400 truncate">{nt.type}</div>
                       </div>
                     </div>
                     );
                   })}
                 </div>
               </div>
             ))}
           </div>
         </div>

         {/* Canvas */}
         <div className="flex-1 relative" ref={reactFlowWrapper}>
           <ReactFlow
             nodes={nodes}
             edges={edges}
             onNodesChange={onNodesChange}
             onEdgesChange={onEdgesChange}
             onConnect={onConnect}
             connectionMode={ConnectionMode.Loose}
             connectionLineStyle={{ stroke: "#000000", strokeWidth: 2 }}
             defaultEdgeOptions={{
               markerEnd: {
                 type: MarkerType.ArrowClosed,
                 width: 16,
                 height: 16,
                 color: "#111827",
               },
             }}
             onDrop={onDrop}
             onDragOver={onDragOver}
             onNodeClick={onNodeClick}
             onPaneClick={onPaneClick}
             nodeTypes={nodeTypes}
             fitView
           >
             <Background color="#cbd5e1" gap={20} size={1} />
             <MiniMap nodeStrokeWidth={3} className="rounded-xl border border-slate-200 shadow-sm" />
             <Controls className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden" />
           </ReactFlow>
         </div>

         {/* Configuration Sidebar */}
         {selectedNode && (
            <div className="w-80 bg-white border-l border-slate-200 flex flex-col z-10 relative shadow-xl">
               <div className="h-14 border-b border-slate-100 flex items-center px-4 justify-between bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                     <Settings2 className="h-4 w-4" /> Node Settings
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={deleteNode}>
                     <Trash2 className="h-4 w-4" />
                  </Button>
               </div>

               <div className="p-4 space-y-6 overflow-y-auto">
                  <div className="space-y-3">
                     <Label className="text-xs font-bold uppercase text-slate-500">Identity</Label>
                     <div className="space-y-1">
                        <Label className="text-[11px] text-slate-400">Node ID (Internal)</Label>
                        <Input value={selectedNode.id} disabled className="h-8 text-xs bg-slate-50 font-mono" />
                     </div>
                     <div className="space-y-1">
                        <Label className="text-[11px] text-slate-400">Display Label</Label>
                        <Input
                           value={selectedNode.data.nodeLabel as string}
                           onChange={e => updateNodeLabel(e.target.value)}
                           className="h-9 text-sm"
                        />
                     </div>
                  </div>

                  <div className="space-y-3">
                     <Label className="text-xs font-bold uppercase text-slate-500">Configuration</Label>
                     <p className="text-xs text-slate-400">Set JSON config keys for engine injection.</p>

                     {/* Validation Sub-section in Sidebar */}
                     {selectedNode.data.issues && (selectedNode.data.issues as any[]).length > 0 && (
                       <div className="space-y-2 mb-4 p-3 bg-red-50/50 rounded-xl border border-red-100">
                         <Label className="text-[11px] font-bold text-red-600 flex items-center gap-1 uppercase tracking-tighter">
                           <AlertCircle className="h-3 w-3" /> Node Integrity Issues
                         </Label>
                         <div className="space-y-1.5 mt-2">
                           {(selectedNode.data.issues as any[]).map((issue: any, idx: number) => (
                             <div key={idx} className="flex gap-2 text-[11px] leading-relaxed text-red-800">
                               <div className="mt-1 w-1 h-1 rounded-full bg-red-400 shrink-0" />
                               {issue.message}
                             </div>
                           ))}
                         </div>
                       </div>
                     )}

                      {/* ── Extract / Load ── */}
                      {(selectedNode.data.customType === "extract" || selectedNode.data.customType === "load") && (
                         <div className="space-y-1">
                            <Label className="text-[11px] text-slate-400">Connector ID</Label>
                            <Input
                               placeholder="conn-xxx"
                               value={((selectedNode.data.config as any)?.connector_id || (selectedNode.data.config as any)?.source_connector_id) || ""}
                               onChange={e => updateNodeConfig(selectedNode.data.customType === "extract" ? "source_connector_id" : "destination_connector_id", e.target.value)}
                               className="h-9 text-sm"
                            />
                         </div>
                      )}

                      {/* ── Integration ── */}
                      {selectedNode.data.customType === "integration" && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-400">Integration Job ID</Label>
                            <Input
                              placeholder="integration-job-uuid"
                              value={((selectedNode.data.config as any)?.job_id) || ""}
                              onChange={e => updateNodeConfig("job_id", e.target.value)}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-400">Triggered By</Label>
                            <Input
                              placeholder="workflow"
                              value={((selectedNode.data.config as any)?.triggered_by) || "workflow"}
                              onChange={e => updateNodeConfig("triggered_by", e.target.value)}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-2 pt-3 border-t border-slate-100">
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Executes the configured integration job and waits for completion before proceeding.
                            </p>
                          </div>
                        </>
                      )}

                      {/* ══════════════════════════════════════════
                           TRANSFORMER NODES  (EP-183 / EP-188)
                          ══════════════════════════════════════════ */}

                      {/* ── Select Columns ── */}
                      {selectedNode.data.customType === "select" && (
                        <SelectNodeConfig
                          config={selectedNode.data.config as any}
                          onUpdate={(key, val) => updateNodeConfig(key, val)}
                          onUpdateRaw={(key, val) => setNodes(nds => nds.map(n =>
                            n.id === selectedNodeId
                              ? { ...n, data: { ...n.data, config: { ...(n.data.config as any), [key]: val } } }
                              : n
                          ))}
                        />
                      )}

                      {/* ── Filter Rows ── */}
                      {selectedNode.data.customType === "filter" && (
                        <FilterNodeConfig
                          config={selectedNode.data.config as any}
                          onUpdate={(key, val) => updateNodeConfig(key, val)}
                        />
                      )}

                      {/* ── Join ── */}
                      {selectedNode.data.customType === "join" && (
                        <JoinNodeConfig
                          config={selectedNode.data.config as any}
                          nodeId={selectedNode.id}
                          allNodes={nodes}
                          onUpdate={(key, val) => updateNodeConfig(key, val)}
                        />
                      )}

                      {/* ── Union ── */}
                      {selectedNode.data.customType === "union" && (
                        <UnionNodeConfig
                          config={selectedNode.data.config as any}
                          onUpdate={(key, val) => updateNodeConfig(key, val)}
                        />
                      )}

                      {/* ── Aggregate ── */}
                      {selectedNode.data.customType === "aggregate" && (
                        <AggregateNodeConfig
                          config={selectedNode.data.config as any}
                          onUpdateRaw={(key, val) => setNodes(nds => nds.map(n =>
                            n.id === selectedNodeId
                              ? { ...n, data: { ...n.data, config: { ...(n.data.config as any), [key]: val } } }
                              : n
                          ))}
                        />
                      )}

                      {/* ── Calculated Field ── */}
                      {selectedNode.data.customType === "calculated_field" && (
                        <CalculatedFieldNodeConfig
                          config={selectedNode.data.config as any}
                          onUpdateRaw={(key, val) => setNodes(nds => nds.map(n =>
                            n.id === selectedNodeId
                              ? { ...n, data: { ...n.data, config: { ...(n.data.config as any), [key]: val } } }
                              : n
                          ))}
                        />
                      )}

                      {/* ── DRAT Classify ── */}
                      {selectedNode.data.customType === "drat_classify" && (
                        <div className="space-y-1">
                           <Label className="text-[11px] text-slate-400">Confidence Threshold</Label>
                           <Input
                             type="number"
                             min={0}
                             max={1}
                             step={0.05}
                             value={String((selectedNode.data.config as any)?.confidence_threshold ?? 0.8)}
                             onChange={e => updateNodeConfig("confidence_threshold", e.target.value)}
                             className="h-9 text-sm"
                           />
                           <p className="text-[10px] text-slate-400">
                             Classifications below this confidence are routed to human review. Values are clamped between 0 and 1.
                           </p>
                        </div>
                      )}

                      {/* ── DRAT Route ── */}
                      {selectedNode.data.customType === "drat_route" && (
                        <div className="space-y-1">
                           <Label className="text-[11px] text-slate-400">Route Path / Key</Label>
                           <Input
                             placeholder="e.g. /destination/folder"
                             value={((selectedNode.data.config as any)?.route_key) || ""}
                             onChange={e => updateNodeConfig("route_key", e.target.value)}
                             className="h-9 text-sm"
                           />
                           <p className="text-[10px] text-slate-400">
                             Specify the routing destination path or queue identifier for documents matching this route.
                           </p>
                        </div>
                      )}

                      {/* ── DRAT Approval ── */}
                      {selectedNode.data.customType === "drat_approval" && (
                        <div className="space-y-1">
                           <Label className="text-[11px] text-slate-400">Human review gate</Label>
                           <p className="text-[10px] text-slate-500 leading-relaxed">
                             Pauses the workflow when classify or routing flags a document for review.
                             Reviewers approve corrections in the DRAT Review Queue; the run resumes automatically.
                           </p>
                           <p className="text-[10px] text-slate-400">
                             Place after <span className="font-mono">drat_route</span> in your pipeline DAG.
                           </p>
                        </div>
                      )}

                      {/* ── DRAT Extraction Handoff ── */}
                      {selectedNode.data.customType === "drat_extraction_handoff" && (
                        <div className="space-y-4">
                           <div className="space-y-1">
                              <Label className="text-[11px] text-slate-400">Document Type</Label>
                              <Input
                                placeholder="e.g. invoice, receipt"
                                value={((selectedNode.data.config as any)?.document_type) || ""}
                                onChange={e => updateNodeConfig("document_type", e.target.value)}
                                className="h-9 text-sm"
                              />
                           </div>
                           <div className="space-y-1">
                              <Label className="text-[11px] text-slate-400">OCR Config ID</Label>
                              <Input
                                placeholder="e.g. ocr-template-123"
                                value={((selectedNode.data.config as any)?.ocr_config_id) || ""}
                                onChange={e => updateNodeConfig("ocr_config_id", e.target.value)}
                                className="h-9 text-sm"
                              />
                           </div>
                           <div className="space-y-1">
                              <Label className="text-[11px] text-slate-400">Entity Filter (Optional)</Label>
                              <Input
                                placeholder="e.g. amount, date, vendor"
                                value={((selectedNode.data.config as any)?.entity_filter) || ""}
                                onChange={e => updateNodeConfig("entity_filter", e.target.value)}
                                className="h-9 text-sm"
                              />
                           </div>
                           <div className="flex items-center justify-between pt-2">
                              <Label className="text-[11px] text-slate-400">Enabled</Label>
                              <Switch
                                checked={((selectedNode.data.config as any)?.enabled) !== false}
                                onCheckedChange={checked => setNodes(nds => nds.map(n =>
                                  n.id === selectedNodeId
                                    ? { ...n, data: { ...n.data, config: { ...(n.data.config as any), enabled: checked } } }
                                    : n
                                ))}
                              />
                           </div>
                           <p className="text-[10px] text-slate-400">
                             Maps a classified document type to a specific OCR extraction workflow.
                           </p>
                        </div>
                      )}

                      {/* ── If / Else ── */}
                      {selectedNode.data.customType === "if_else" && (
                        <div className="space-y-1">
                           <Label className="text-[11px] text-slate-400">Condition Expression</Label>
                           <Input
                             placeholder="e.g. payload.score > 0.8"
                             value={((selectedNode.data.config as any)?.condition) || ""}
                             onChange={e => updateNodeConfig("condition", e.target.value)}
                             className="h-9 text-sm"
                           />
                        </div>
                      )}

                      {/* ── Switch / Case ── */}
                      {selectedNode.data.customType === "switch_case" && (
                        <div className="space-y-1">
                           <Label className="text-[11px] text-slate-400">Switch Expression</Label>
                           <Input
                             placeholder="e.g. payload.category"
                             value={((selectedNode.data.config as any)?.expression) || ""}
                             onChange={e => updateNodeConfig("expression", e.target.value)}
                             className="h-9 text-sm"
                           />
                        </div>
                      )}

                      {/* ── Loop ── */}
                      {selectedNode.data.customType === "loop" && (
                        <div className="space-y-1">
                           <Label className="text-[11px] text-slate-400">Max Iterations (safe limit)</Label>
                           <Input
                             type="number"
                             min={1}
                             max={LOOP_MAX_ITERATIONS}
                             value={String(((selectedNode.data.config as any)?.max_iterations) || 10)}
                             onChange={e => updateNodeConfig("max_iterations", e.target.value)}
                             className="h-9 text-sm"
                           />
                           <p className="text-[10px] text-slate-400">
                             Values are clamped between 1 and {LOOP_MAX_ITERATIONS}.
                           </p>
                        </div>
                      )}
                  </div>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
