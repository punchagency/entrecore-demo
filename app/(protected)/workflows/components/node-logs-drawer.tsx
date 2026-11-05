"use client";

import { useNodeLogs } from "../hooks/use-workflows";
import { QueryErrorState } from "@/components/query-error-state";
import { JobFailureReason } from "@/components/job-failure-reason";
import { HIDDEN_LOG_LINE, jobFailureMessage, redactLogOutput } from "@/utils/api-error";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, CheckCircle2, Info } from "lucide-react";

interface NodeLogsDrawerProps {
  nodeRunId: string | null;
  isOpen: boolean;
  onClose: () => void;
  nodeName: string;
}

export function NodeLogsDrawer({ nodeRunId, isOpen, onClose, nodeName }: NodeLogsDrawerProps) {
  const { data: logs, isLoading, isError, error, refetch, isFetching } = useNodeLogs(nodeRunId || "");
  // A short reason for operators; older records may still hold a traceback (EP-1004).
  const failure = logs?.error_message
    ? jobFailureMessage(logs, "This step failed. Use the node run ID to find the full error in the logs.")
    : "";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl border-l border-slate-200 p-0 overflow-hidden flex flex-col">
        <SheetHeader className="p-6 bg-slate-50/80 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 text-white rounded-lg">
              <Terminal className="h-5 w-5" />
            </div>
            <SheetTitle className="text-xl font-bold">Execution Logs</SheetTitle>
          </div>
          <SheetDescription className="flex items-center gap-2">
            Node: <span className="font-bold text-slate-900">{nodeName}</span>
            <Badge variant="outline" className="font-mono text-[10px] ml-2">
              {nodeRunId?.substring(0, 8)}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : isError ? (
            <QueryErrorState
              variant="inline"
              className="m-6"
              error={error}
              title="Couldn't load this node's logs"
              onRetry={() => refetch()}
              isRetrying={isFetching}
            />
          ) : (
            <>
              {failure && (
                <JobFailureReason
                  className="m-6"
                  title="Why this step failed"
                  reason={failure}
                  runId={nodeRunId}
                  runIdLabel="Node run ID"
                />
              )}

              <ScrollArea className="flex-1 px-6 pb-6">
                <div className="space-y-2 py-4">
                  {logs?.log_output ? (
                    <div className="bg-slate-900 rounded-xl p-6 font-mono text-[13px] leading-relaxed text-indigo-200 shadow-2xl overflow-x-auto min-h-[400px]">
                      {/* Tracebacks are hidden; the node run ID above finds them in the logs. */}
                      {redactLogOutput(logs.log_output).map((line, i) => (
                        <div key={i} className="flex gap-4 hover:bg-white/5 px-2 -mx-2 transition-colors">
                          <span className="text-slate-600 select-none w-6 text-right shrink-0">{i + 1}</span>
                          <span className={line === HIDDEN_LOG_LINE ? "italic text-slate-400" : "whitespace-pre-wrap"}>{line}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-slate-400">
                      <Info className="h-8 w-8 mx-auto mb-3 opacity-20" />
                      <p>No console output captured for this node.</p>
                    </div>
                  )}
                </div>

                {logs?.node_metadata && Object.keys(logs.node_metadata).length > 0 && (
                   <div className="mt-6 space-y-4 pb-12">
                     <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                       <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                       Node Metadata
                     </h4>
                     <div className="grid grid-cols-2 gap-3">
                       {Object.entries(logs.node_metadata).map(([key, val]) => (
                         <div key={key} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mb-1">{key}</p>
                           <p className="text-xs text-slate-700 font-mono truncate">{String(val)}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
