"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Network,
  Activity,
  Cpu,
  CheckCircle2,
  Workflow,
  Download,
  TrendingUp,
  RefreshCcw,
  SlidersHorizontal,
  Filter,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Clock,
  Wrench,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useTraces, useTraceStats, useExportTraces } from "../hooks/use-training";
import type { Trace } from "../services/training-api";

export function OrchestratorVisualizer() {
  const { data: stats, isLoading: statsLoading } = useTraceStats();
  const { data: tracesData, isLoading: tracesLoading, isError, refetch } = useTraces(1, 15, false);
  const exportMutation = useExportTraces();

  const traces = tracesData?.traces ?? [];

  // Derive strategy distribution from labelled traces
  const positiveCount = stats?.positive_traces ?? 0;
  const negativeCount = stats?.negative_traces ?? 0;
  const neutralCount = (stats?.labelled_traces ?? 0) - positiveCount - negativeCount;
  const totalLabelled = stats?.labelled_traces ?? 0;

  const strategies = totalLabelled > 0
    ? [
        { name: "Positive Rewards", count: positiveCount, prob: Math.round((positiveCount / totalLabelled) * 100), active: positiveCount >= negativeCount },
        { name: "Neutral Rewards", count: neutralCount, prob: Math.round((neutralCount / totalLabelled) * 100), active: false },
        { name: "Negative Rewards", count: negativeCount, prob: Math.round((negativeCount / totalLabelled) * 100), active: false },
      ]
    : [];

  const handleExport = () => {
    exportMutation.mutate(
      { limit: 2000, unusedOnly: false },
      {
        onSuccess: () => toast.success("Execution logs exported as JSON."),
        onError: () => toast.error("Failed to export logs."),
      }
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
      
      {/* Policy Distribution from Real Data */}
      <div className="space-y-6 flex flex-col h-full">
        
        <Card className="shadow-lg shadow-indigo-900/5 border-0 ring-1 ring-slate-200/60 bg-white rounded-3xl overflow-hidden flex flex-col">
          <CardHeader className="bg-indigo-50/50 pb-4 border-b border-indigo-100/50">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Reward Distribution</CardTitle>
              </div>
              {stats && (
                <Badge variant="outline" className="bg-white text-indigo-600 font-semibold shadow-sm">
                  {stats.labelled_traces} labelled
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Breakdown of reward signals across all labelled traces.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {statsLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-32 rounded" />
                      <Skeleton className="h-4 w-10 rounded" />
                    </div>
                    <Skeleton className="h-2.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : strategies.length === 0 ? (
              <div className="flex flex-col items-center text-center py-8">
                <Activity className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No labelled traces yet. Submit rewards to see the distribution.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
                    <span>Reward Signal Breakdown</span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-indigo-600" onClick={() => refetch()}>
                        <RefreshCcw className="h-3 w-3" />
                      </Button>
                      <SlidersHorizontal className="h-4 w-4 text-slate-400" />
                    </div>
                  </h4>
                  
                  <div className="space-y-5">
                    {strategies.map((strategy, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-semibold text-slate-700 flex items-center gap-2">
                            {strategy.active && <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />}
                            {!strategy.active && <div className="h-2 w-2 rounded-full bg-slate-200" />}
                            {strategy.name}
                            <span className="text-xs text-slate-400 font-normal">({strategy.count})</span>
                          </span>
                          <span className="font-bold text-indigo-700">{strategy.prob}%</span>
                        </div>
                        <Progress 
                          value={strategy.prob} 
                          className={`h-2.5 ${strategy.active ? 'bg-indigo-100' : 'bg-slate-100'}`}
                          indicatorClassName={
                            strategy.name.includes("Positive") ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                            strategy.name.includes("Negative") ? 'bg-gradient-to-r from-rose-400 to-rose-500' :
                            'bg-slate-400'
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <Card className="bg-slate-50 border-slate-100 shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                          <TrendingUp className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Reward Balance</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {positiveCount > negativeCount
                              ? `Positive signals lead by ${positiveCount - negativeCount} (${Math.round((positiveCount / Math.max(totalLabelled, 1)) * 100)}% positive rate)`
                              : negativeCount > positiveCount
                                ? `Negative signals lead by ${negativeCount - positiveCount}. Model may need improvement.`
                                : "Balanced reward signals across labelled traces."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Execution Timeline from Real Traces */}
      <div className="space-y-6 flex flex-col h-full">
        
        <Card className="flex-1 shadow-lg shadow-blue-900/5 border-0 ring-1 ring-slate-200/60 bg-gradient-to-br from-white to-blue-50/30 rounded-3xl overflow-hidden flex flex-col relative">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/4" />
          
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4 relative z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 mb-1">
                <Workflow className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Trace Timeline</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={handleExport}
                  disabled={exportMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs">
              Chronological view of orchestrator interactions from the database.
            </CardDescription>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-6 z-10">
            {tracesLoading && (
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pl-8 pb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[41px] h-5 w-5 rounded-full bg-slate-200 border-4 border-white" />
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <Skeleton className="h-4 w-2/3 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                      <Skeleton className="h-3 w-1/3 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isError && (
              <div className="flex flex-col items-center text-center py-12">
                <AlertCircle className="h-8 w-8 text-rose-400 mb-3" />
                <p className="text-sm text-slate-500">Unable to load trace timeline.</p>
              </div>
            )}

            {!tracesLoading && !isError && traces.length === 0 && (
              <div className="flex flex-col items-center text-center py-12">
                <Bot className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No traces recorded yet.</p>
              </div>
            )}

            {!tracesLoading && !isError && traces.length > 0 && (
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pl-8 pb-4">
                {traces.map((trace) => {
                  const hasReward = trace.reward !== null;
                  const isPositive = trace.reward === 1.0;
                  const isNegative = trace.reward === -1.0;

                  return (
                    <div key={trace.id} className="relative group">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[41px] h-5 w-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center
                        ${hasReward
                          ? isPositive ? 'bg-emerald-500' : isNegative ? 'bg-rose-500' : 'bg-amber-500'
                          : 'bg-blue-500 animate-pulse'
                        }
                      `} />

                      <Card className={`border-slate-200/60 shadow-sm transition-all hover:shadow-md ${
                        !hasReward ? 'bg-blue-50/40 border-blue-200' : 'bg-white'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                              <span className="line-clamp-1">{trace.user_message}</span>
                            </div>
                            <div className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-md shrink-0 ml-2">
                              {new Date(trace.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                          
                          <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                            {trace.agent_response}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                            {trace.tool_used && (
                              <div className="flex items-center gap-1">
                                <Wrench className="h-3 w-3" />
                                <span>{trace.tool_used}</span>
                              </div>
                            )}
                            {hasReward ? (
                              <div className={`flex items-center gap-1 ml-auto ${
                                isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-amber-600'
                              }`}>
                                {isPositive && <ThumbsUp className="h-3 w-3" />}
                                {isNegative && <ThumbsDown className="h-3 w-3" />}
                                {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
                                {isPositive ? 'Positive' : isNegative ? 'Negative' : 'Neutral'}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-blue-600 ml-auto bg-blue-50 px-2 py-0.5 rounded-full">
                                <Clock className="h-3 w-3" />
                                Awaiting Review
                              </div>
                            )}
                            {trace.used_for_training && (
                              <div className="flex items-center gap-1 text-purple-500">
                                <Sparkles className="h-3 w-3" />
                                Trained
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Card>

      </div>
    </div>
  );
}
