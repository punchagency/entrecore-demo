"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Network,
  Database,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Wrench,
  Clock,
  Sparkles,
  MessageSquare,
  AlertCircle,
  Activity,
} from "lucide-react";
import { useTraces, useTraceStats } from "../hooks/use-training";
import type { Trace } from "../services/training-api";

// Group traces by tool_used to show which tools/agents are invoked most
function useToolDistribution(traces: Trace[]) {
  return useMemo(() => {
    const map = new Map<string, { total: number; positive: number; negative: number; neutral: number }>();
    
    for (const trace of traces) {
      const tool = trace.tool_used || "general";
      const current = map.get(tool) || { total: 0, positive: 0, negative: 0, neutral: 0 };
      current.total++;
      if (trace.reward === 1.0) current.positive++;
      else if (trace.reward === -1.0) current.negative++;
      else if (trace.reward === 0.0) current.neutral++;
      map.set(tool, current);
    }

    return Array.from(map.entries())
      .map(([tool, data]) => ({ tool, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [traces]);
}

// Group traces by page context
function usePageDistribution(traces: Trace[]) {
  return useMemo(() => {
    const map = new Map<string, number>();
    for (const trace of traces) {
      const page = trace.page || "unknown";
      map.set(page, (map.get(page) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count);
  }, [traces]);
}

function ToolCard({ tool, total, positive, negative, neutral }: {
  tool: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
}) {
  const positiveRate = total > 0 ? Math.round((positive / total) * 100) : 0;
  
  return (
    <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
            <Wrench className="h-4 w-4 text-indigo-600 group-hover:text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">{tool}</h4>
            <p className="text-[10px] text-slate-400 font-medium">{total} interactions</p>
          </div>
        </div>
        <Badge
          className={`text-[10px] font-bold px-2 py-0 border-0 ${
            positiveRate >= 70 ? "bg-emerald-100 text-emerald-700" :
            positiveRate >= 40 ? "bg-amber-100 text-amber-700" :
            positiveRate > 0 ? "bg-rose-100 text-rose-700" :
            "bg-slate-100 text-slate-500"
          }`}
        >
          {positiveRate}% positive
        </Badge>
      </div>
      
      {/* Mini bar chart */}
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
        {positive > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${(positive / total) * 100}%` }}
          />
        )}
        {neutral > 0 && (
          <div
            className="bg-amber-400 transition-all duration-500"
            style={{ width: `${(neutral / total) * 100}%` }}
          />
        )}
        {negative > 0 && (
          <div
            className="bg-rose-500 transition-all duration-500"
            style={{ width: `${(negative / total) * 100}%` }}
          />
        )}
      </div>
      
      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-medium">
        <span className="flex items-center gap-1"><ThumbsUp className="h-2.5 w-2.5 text-emerald-500" /> {positive}</span>
        <span className="flex items-center gap-1"><Minus className="h-2.5 w-2.5 text-amber-500" /> {neutral}</span>
        <span className="flex items-center gap-1"><ThumbsDown className="h-2.5 w-2.5 text-rose-500" /> {negative}</span>
        <span className="flex items-center gap-1 ml-auto"><Clock className="h-2.5 w-2.5" /> {total - positive - neutral - negative} unlabelled</span>
      </div>
    </div>
  );
}

export function IntelligenceHub() {
  const { data: stats, isLoading: statsLoading } = useTraceStats();
  const { data: tracesData, isLoading: tracesLoading } = useTraces(1, 100, false);

  const traces = tracesData?.traces ?? [];
  const toolDistribution = useToolDistribution(traces);
  const pageDistribution = usePageDistribution(traces);
  
  const isLoading = statsLoading || tracesLoading;

  return (
    <div className="space-y-6 h-full flex flex-col min-h-[750px] animate-in fade-in duration-700">
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
        
        {/* Tool/Agent Distribution */}
        <div className="xl:col-span-2">
          <Card className="h-full shadow-lg shadow-purple-900/5 border-0 ring-1 ring-slate-200/60 bg-gradient-to-br from-slate-50 to-purple-50/20 rounded-3xl overflow-hidden flex flex-col relative group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 z-0" />
            
            <CardHeader className="bg-white/80 backdrop-blur-md border-b border-slate-100 pb-4 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Network className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-lg">Tool & Agent Intelligence</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Performance breakdown by orchestrator tool/agent across all traces.
                  </CardDescription>
                </div>
                {stats && (
                  <Badge variant="outline" className="bg-white text-purple-600 font-semibold shadow-sm border-purple-200">
                    {traces.length} traces analyzed
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <ScrollArea className="flex-1 p-6 relative z-10">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-slate-100 bg-white space-y-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24 rounded" />
                          <Skeleton className="h-3 w-16 rounded" />
                        </div>
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : toolDistribution.length === 0 ? (
                <div className="flex flex-col items-center text-center py-12">
                  <Bot className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">No trace data available yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Interact with the orchestrator to generate intelligence data.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {toolDistribution.map((item) => (
                    <ToolCard key={item.tool} {...item} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>

        {/* Right Sidebar — Page Context & Summary */}
        <div className="space-y-6 flex flex-col">
          
          {/* Page Context Distribution */}
          <Card className="shadow-lg border-0 ring-1 ring-slate-200/60 bg-white rounded-3xl overflow-hidden flex-1">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Database className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Page Context</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Which Entrecore pages trigger the most orchestrator interactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="h-4 w-8 rounded" />
                    </div>
                  ))}
                </div>
              ) : pageDistribution.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400">No page context data yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pageDistribution.map((item, i) => (
                    <div key={item.page} className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${
                          i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-cyan-500' : 'bg-slate-300'
                        }`} />
                        <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">{item.page}</span>
                      </div>
                      <Badge variant="secondary" className="bg-slate-50 text-slate-600 font-bold text-[10px] px-2">
                        {item.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Summary */}
          <Card className="shadow-lg border-0 ring-1 ring-slate-200/60 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-800">Intelligence Summary</h4>
              </div>
              
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                </div>
              ) : stats ? (
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-500" />
                    <span><strong>{stats.total_traces}</strong> orchestrator traces captured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-emerald-500" />
                    <span><strong>{stats.positive_traces}</strong> positive / <strong>{stats.negative_traces}</strong> negative signals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span><strong>{stats.unused_traces}</strong> traces awaiting review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-purple-500" />
                    <span><strong>{toolDistribution.length}</strong> unique tools/agents used</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No data available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
