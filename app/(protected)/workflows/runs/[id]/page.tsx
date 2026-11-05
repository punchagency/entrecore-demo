"use client";

import React, { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRunStatus, useWorkflow, useCancelRun, WorkflowNodeRun, workflowKeys } from "../../hooks/use-workflows";
import { useQueryClient } from "@tanstack/react-query";
import { workflowRunEvent, workflowRunFailureNotice } from "@/utils/workflow-run-event";
import { jobFailureMessage } from "@/utils/api-error";
import { CopyableId } from "@/components/copyable-id";
import { JobFailureReason } from "@/components/job-failure-reason";
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, Position, MarkerType, Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Copy, Terminal, CheckCircle2, XCircle, Clock, PauseCircle, Activity, ArrowLeft, StopCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { ensureAccessToken } from "@/app/config/session";
// Demo: run progress is played by demo/realtime instead of the API.
import { DemoWebSocket } from "@/demo/realtime/websocket";

// A failed node always gets a reason, even when the backend stored none (or an internal one).
function nodeFailureReason(nr: WorkflowNodeRun): string {
   return nr.status === "failed" ? jobFailureMessage(nr, "This step failed.") : jobFailureMessage(nr, "");
}

// Compute dag layout roughly. Since we don't have dagre, we'll try a basic list layout or just fetch original positions if they existed. 
// Wait, our backend doesn't store coordinates in nodes implicitly. 
// Let's position them sequentially if no coords exist.

interface RunNodeData extends Record<string, unknown> {
   label: React.ReactNode;
   type: string;
}
const getLayoutedElements = (nodes: any[], edges: any[]) => {
   // Minimal layout fallback
   const newNodes = nodes.map((n, i) => ({
      ...n,
      position: n.position || { x: 250, y: i * 150 }
   }));
   return { nodes: newNodes, edges };
};

export default function RunLiveExecutionPage({ params }: { params: Promise<{ id: string }> }) {
   const router = useRouter();
   const resolvedParams = use(params);
   const runId = resolvedParams.id;

   const queryClient = useQueryClient();
   const { data: run, isLoading: isRunLoading } = useRunStatus(runId);
   const { data: workflow, isLoading: isWfLoading } = useWorkflow(run?.workflow_id || "");
   const cancelMutation = useCancelRun();

   const [nodes, setNodes, onNodesChange] = useNodesState<Node<RunNodeData>>([]);
   const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
   
   const [liveNodeRuns, setLiveNodeRuns] = useState<Record<string, WorkflowNodeRun>>({});
   const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

   // Initialize the diagram when data loads
   useEffect(() => {
      if (!workflow || !run) return;

      const initialNodeRuns = (Array.isArray(run.node_runs) ? run.node_runs : []).reduce((acc, nr) => {
         acc[nr.node_key] = nr;
         return acc;
      }, {} as Record<string, WorkflowNodeRun>);

      setLiveNodeRuns(initialNodeRuns);

      const flowNodes: Node<RunNodeData>[] = workflow.nodes.map((n, i) => {
         return {
            id: n.node_key,
            type: "default",
            data: { 
               label: n.label, 
               type: n.node_type 
            },
            position: { x: 250 + (i % 2) * 50, y: i * 120 }
         };
      });

      const flowEdges = workflow.edges.map((e, i) => ({
         id: `e-${e.source_node_key}-${e.target_node_key}`,
         source: e.source_node_key,
         target: e.target_node_key,
         animated: true,
         markerEnd: { type: MarkerType.ArrowClosed }
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(flowNodes, flowEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

   }, [workflow, run, setNodes, setEdges]);

   // Decorate nodes with live status
   const displayNodes = useMemo(() => {
      return nodes.map(n => {
         const nodeRun = liveNodeRuns[n.id];
         const status = nodeRun?.status || 'pending';
         
         let bg = '#f1f5f9';
         let border = '#cbd5e1';
         let anim = "";

         if (status === 'running') {
            bg = '#e0e7ff';
            border = '#6366f1';
            anim = "animate-pulse ring-2 ring-indigo-400 shadow-lg shadow-indigo-200/50";
         } else if (status === 'completed') {
            bg = '#ecfdf5';
            border = '#10b981';
         } else if (status === 'failed') {
            bg = '#fef2f2';
            border = '#ef4444';
         } else if (status === 'skipped') {
            bg = '#f8fafc';
            border = '#94a3b8';
         }

         return {
            ...n,
            style: {
               background: bg,
               border: `2px solid ${border}`,
               borderRadius: '12px',
               padding: '12px',
               width: 180,
               transition: 'all 0.3s ease'
            },
            className: anim,
            data: {
               ...n.data,
               label: (
                  <div className="flex flex-col items-center text-center">
                     <span className="font-bold text-sm tracking-wide text-slate-800">{(n.data as any).label}</span>
                     <Badge variant="outline" className="text-[9px] uppercase mt-1 mb-2 bg-white/60">
                        {(n.data as any).type}
                     </Badge>
                     <div className="text-xs font-semibold capitalize flex items-center gap-1.5 mt-1 border-t border-black/10 pt-1 w-full justify-center">
                        {status === 'running' && <Activity className="h-3 w-3 text-indigo-600 animate-spin" />}
                        {status === 'completed' && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                        {status === 'failed' && <XCircle className="h-3 w-3 text-red-600" />}
                        {status === 'pending' && <Clock className="h-3 w-3 text-slate-400" />}
                        {status === 'skipped' && <PauseCircle className="h-3 w-3 text-slate-400" />}
                        <span className={
                           status === 'completed' ? 'text-emerald-700' :
                           status === 'failed' ? 'text-red-700' :
                           status === 'running' ? 'text-indigo-700' : 'text-slate-500'
                        }>{status}</span>
                     </div>
                  </div>
               )
            }
         };
      });
   }, [nodes, liveNodeRuns]);

   // Stop edges animating if status is terminal
   const displayEdges = useMemo(() => {
      const isGlobalTerminal = run?.status === "completed" || run?.status === "failed" || run?.status === "cancelled";
      return edges.map((e) => {
         const sourceRun = liveNodeRuns[e.source];
         if (isGlobalTerminal || sourceRun?.status === "completed") {
            return { ...e, animated: false, style: { stroke: '#10b981', strokeWidth: 2 } };
         }
         if (sourceRun?.status === "failed") {
            return { ...e, animated: false, style: { stroke: '#ef4444', strokeLinedasharray: '5,5' } };
         }
         return e;
      });
   }, [edges, liveNodeRuns, run?.status]);

   // WebSocket connection
   useEffect(() => {
      if (!runId) return;

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      const protocol = baseUrl.startsWith("https") ? "wss:" : "ws:";
      const host = baseUrl.replace(/^https?:\/\//, "");

      let ws: WebSocket | null = null;
      let cancelled = false;

      // EP-1043: the token is in memory (restored from the refresh cookie on a
      // fresh load), so the socket opens once it is available.
      void ensureAccessToken().then((accessToken) => {
         if (cancelled) return;
         const token = accessToken ?? "";
         const wsUrl = `${protocol}//${host}/api/v1/data/workflows/runs/${runId}/ws?token=${encodeURIComponent(token)}`;

         try {
            ws = new DemoWebSocket(wsUrl) as unknown as WebSocket;

            ws.onopen = () => setWsStatus("connected");

            ws.onmessage = (event) => {
               try {
                  const msg = JSON.parse(event.data);
                  const runEvent = workflowRunEvent(msg);
                  if (runEvent === "node_update" && msg.node_run) {
                     setLiveNodeRuns(prev => ({
                        ...prev,
                        [msg.node_run.node_key]: msg.node_run
                     }));
                  }
                  if (runEvent === "run_complete" || runEvent === "run_failed") {
                     // The run is over: reload its status so the running indicators stop.
                     queryClient.invalidateQueries({ queryKey: workflowKeys.runStatus(runId) });
                  }
                  if (runEvent === "run_complete") {
                     toast.success(msg.message || "Workflow execution completed");
                  }
                  if (runEvent === "run_failed") {
                     // Cancelled and rejected runs are finished, not successful (EP-1004).
                     const notice = workflowRunFailureNotice(msg);
                     if (notice.tone === "neutral") toast.message(notice.text);
                     else toast.error(notice.text);
                  }
               } catch (e) {
                  console.error("WS Parse Error:", e);
               }
            };

            ws.onerror = () => setWsStatus("disconnected");
            ws.onclose = () => setWsStatus("disconnected");
         } catch (err) {
            setWsStatus("disconnected");
         }
      });

      return () => {
         cancelled = true;
         if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
         }
      };
   }, [runId, queryClient]);

   const completedNodes = Object.values(liveNodeRuns).filter(n => n.status === "completed").length;
   const totalNodes = workflow?.nodes.length || 1;
   const progress = Math.round((completedNodes / totalNodes) * 100);

   const handleCancel = () => {
      cancelMutation.mutate(runId, {
         onSuccess: () => toast.success("Cancellation requested..."),
         onError: () => toast.error("Failed to cancel run")
      });
   };

   return (
      <div className="flex flex-col h-screen bg-[#F8FAFC]">
         {/* Topbar */}
         <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => router.push(`/workflows/${workflow?.id}`)} className="rounded-full hover:bg-slate-100">
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
               </Button>
               <div className="w-px h-6 bg-slate-200" />
               <div>
                  <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                     <Activity className={`h-5 w-5 ${wsStatus === 'connected' ? 'text-indigo-600' : 'text-slate-400'}`} />
                     Run Execution
                  </h1>
                  <CopyableId label="Run ID" value={runId} className="text-[10px] text-slate-500" />
               </div>
            </div>

            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2 text-sm text-slate-600 font-medium bg-slate-100 px-3 py-1.5 rounded-full">
                  <div className={`h-2.5 w-2.5 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  {wsStatus === "connected" ? "Live stream active" : "Stream disconnected"}
               </div>
               
               {(run?.status === "running" || run?.status === "pending") && (
                  <Button 
                     onClick={handleCancel}
                     disabled={cancelMutation.isPending}
                     variant="outline" 
                     className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl shadow-xs"
                  >
                     <StopCircle className="h-4 w-4 mr-2" /> Cancel Run
                  </Button>
               )}
            </div>
         </div>

         <div className="flex-1 flex overflow-hidden">
            {/* Visual Canvas */}
            <div className="flex-1 relative bg-slate-50">
               <ReactFlow
                  nodes={displayNodes}
                  edges={displayEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  fitView
               >
                  <Background color="#cbd5e1" gap={24} size={1.5} />
                  <Controls className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden" />
               </ReactFlow>

               {/* Absolute Tracker overlay */}
               <div className="absolute top-6 left-6 right-6 pointer-events-none">
                  <Card className="max-w-xl mx-auto shadow-xl ring-1 ring-slate-200/50 border-0 bg-white/90 backdrop-blur-md">
                     <CardContent className="p-4">
                        <div className="flex justify-between items-end mb-2">
                           <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Overall Progress</p>
                              <div className="text-2xl font-bold text-slate-800">
                                 {progress}% 
                                 <span className="text-sm font-medium text-slate-500 ml-2">
                                    ({completedNodes} / {totalNodes} nodes)
                                 </span>
                              </div>
                           </div>
                           <Badge className={`
                              ${run?.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : ''}
                              ${run?.status === 'failed' ? 'bg-red-100 text-red-700' : ''}
                              ${run?.status === 'running' ? 'bg-indigo-100 text-indigo-700' : ''}
                           `}>
                              {run?.status.toUpperCase()}
                           </Badge>
                        </div>
                        <Progress value={progress} className="h-2.5 bg-slate-200 [&>div]:bg-indigo-600" />
                        {(run?.status === "failed" || run?.status === "cancelled") && (
                           <JobFailureReason
                              className="mt-3 pointer-events-auto"
                              tone={run.status === "cancelled" ? "neutral" : "error"}
                              title={run.status === "cancelled" ? "This run was cancelled" : "Why this run failed"}
                              reason={jobFailureMessage(
                                 run,
                                 run.status === "cancelled"
                                    ? "The run was cancelled before it finished."
                                    : "This workflow run failed. Share the run ID with support to find the full error."
                              )}
                              runId={runId}
                           />
                        )}
                     </CardContent>
                  </Card>
               </div>
            </div>

            {/* Run Logs Sidebar */}
            <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col z-10 shadow-2xl text-slate-300">
               <div className="h-14 border-b border-slate-800 flex items-center px-4 bg-slate-950 shrink-0">
                  <Terminal className="h-4 w-4 mr-2 text-indigo-400" />
                  <span className="font-semibold text-sm tracking-wide text-white">Execution Logs</span>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide font-mono text-xs">
                  {Object.values(liveNodeRuns).map(nr => (
                     <div key={nr.id} className="border border-slate-800 rounded-lg p-3 bg-slate-900/50">
                        <div className="flex justify-between items-start mb-2 border-b border-slate-800 pb-2">
                           <div className="font-bold text-indigo-300">[{nr.node_key}]</div>
                           <div className={`
                              ${nr.status === 'running' ? 'text-amber-400' : ''}
                              ${nr.status === 'completed' ? 'text-emerald-400' : ''}
                              ${nr.status === 'failed' ? 'text-red-400' : ''}
                           `}>
                              {nr.status.toUpperCase()}
                           </div>
                        </div>
                        {nodeFailureReason(nr) && (
                           <div className="text-red-400 mt-1 whitespace-pre-wrap">Error: {nodeFailureReason(nr)}</div>
                        )}
                        {!nodeFailureReason(nr) && nr.logs && (
                           <div className="text-slate-400 mt-1 whitespace-pre-wrap">{nr.logs}</div>
                        )}
                        {!nodeFailureReason(nr) && !nr.logs && (
                           <div className="text-slate-600 italic">No logs emitted...</div>
                        )}
                        {(() => {
                           const outputParams = nr.node_metadata?.output_params || nr.output_params;
                           if (!outputParams || Object.keys(outputParams).length === 0) return null;
                           
                           return (
                              <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
                                 <div className="flex justify-between items-center mb-1">
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Output</div>
                                    {outputParams.needs_hitl && (
                                       <Badge variant="outline" className="text-[9px] uppercase bg-amber-500/10 text-amber-500 border-amber-500/30">
                                          Needs Review
                                       </Badge>
                                    )}
                                 </div>
                                 {outputParams.doc_id != null && (
                                    <div className="text-slate-300">
                                       <span className="text-slate-500">doc_id:</span> {String(outputParams.doc_id)}
                                    </div>
                                 )}
                                 {outputParams.sync_status != null && (
                                    <div className="text-slate-300">
                                       <span className="text-slate-500">sync_status:</span>{" "}
                                       <span className={outputParams.sync_status === 'failed' ? 'text-red-400' : 'text-emerald-400'}>
                                          {String(outputParams.sync_status)}
                                       </span>
                                    </div>
                                 )}
                                 {outputParams.gcs_path != null && (
                                    <div className="text-slate-300 flex flex-wrap items-center gap-1">
                                       <span className="text-slate-500">gcs_path:</span> 
                                       {String(outputParams.gcs_path).startsWith('gs://') ? (
                                          <a href={`https://console.cloud.google.com/storage/browser/${String(outputParams.gcs_path).replace('gs://', '')}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline hover:text-indigo-300 break-all" title="View in GCS Console">
                                             {String(outputParams.gcs_path)}
                                          </a>
                                       ) : (
                                          <span className="break-all">{String(outputParams.gcs_path)}</span>
                                       )}
                                    </div>
                                 )}
                                 {outputParams.error_message != null && (
                                    <div className="text-red-400">
                                       <span className="text-slate-500">error_message:</span>{" "}
                                       {jobFailureMessage(
                                          { error_message: outputParams.error_message },
                                          "Details hidden. Find them in the logs by run ID."
                                       )}
                                    </div>
                                 )}
                                 {outputParams.rule_matched != null && (
                                    <div className="text-slate-300">
                                       <span className="text-slate-500">rule_matched:</span> {String(outputParams.rule_matched)}
                                    </div>
                                 )}
                                 {outputParams.target_folder != null && (
                                    <div className="text-slate-300">
                                       <span className="text-slate-500">target_folder:</span> {String(outputParams.target_folder)}
                                    </div>
                                 )}
                                 {outputParams.matched_pattern != null && (
                                    <div className="text-slate-300">
                                       <span className="text-slate-500">matched_pattern:</span> {String(outputParams.matched_pattern)}
                                    </div>
                                 )}
                                 {outputParams.classification != null && (
                                    <div className="text-slate-300">
                                       <span className="text-slate-500">classification:</span>{" "}
                                       {typeof outputParams.classification === "object"
                                          ? JSON.stringify(outputParams.classification, null, 2)
                                          : String(outputParams.classification)}
                                    </div>
                                 )}
                                 {outputParams.route_key != null && (
                                    <div className="text-slate-300">
                                       <span className="text-slate-500">route_key:</span> {String(outputParams.route_key)}
                                    </div>
                                 )}
                                 {outputParams.routed_to != null && (
                                    <div className="text-slate-300">
                                       <span className="text-slate-500">routed_to:</span> {String(outputParams.routed_to)}
                                    </div>
                                 )}
                                 {Object.entries(outputParams)
                                    .filter(([key]) => !["doc_id", "rule_matched", "target_folder", "matched_pattern", "classification", "route_key", "routed_to", "needs_hitl", "sync_status", "gcs_path", "error_message"].includes(key))
                                    .map(([key, value]) => (
                                       <div key={key} className="text-slate-400">
                                          <span className="text-slate-500">{key}:</span>{" "}
                                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                                       </div>
                                    ))}
                              </div>
                           );
                        })()}
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
}
