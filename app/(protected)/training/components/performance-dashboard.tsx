"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TrendingUp,
  Target,
  Activity,
  ArrowUpRight,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wrench,
  Bot,
  MessageSquare,
  Cpu,
  Sparkles,
} from "lucide-react";
import { useTraceStats, useTraces, useRuns } from "../hooks/use-training";
import type { Trace, TrainingRun } from "../services/training-api";

function StatCardSkeleton() {
  return (
    <Card className="bg-white shadow-md border-0 ring-1 ring-slate-100 rounded-3xl overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-6 w-16 rounded-lg" />
        </div>
        <div>
          <Skeleton className="h-8 w-24 rounded mb-2" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function RecentTraceItem({ trace }: { trace: Trace }) {
  const rewardLabel = trace.reward === 1.0
    ? "positive"
    : trace.reward === -1.0
      ? "negative"
      : trace.reward === 0.0
        ? "neutral"
        : null;

  return (
    <div className="p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
            <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{trace.user_message}</p>
        </div>
        {rewardLabel ? (
          <Badge
            className={`shrink-0 ml-2 font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wider border-0 ${
              rewardLabel === "positive"
                ? "bg-emerald-100 text-emerald-700"
                : rewardLabel === "negative"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-amber-100 text-amber-700"
            }`}
          >
            {rewardLabel === "positive" && <ThumbsUp className="h-3 w-3 mr-1" />}
            {rewardLabel === "negative" && <ThumbsDown className="h-3 w-3 mr-1" />}
            {rewardLabel}
          </Badge>
        ) : (
          <Badge className="shrink-0 ml-2 bg-slate-100 text-slate-500 border border-slate-200 font-medium text-[10px] px-2 py-0.5">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium pl-8">
        {trace.tool_used && (
          <span className="flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            {trace.tool_used}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(trace.created_at).toLocaleString()}
        </span>
        {trace.used_for_training && (
          <span className="flex items-center gap-1 text-purple-500">
            <Sparkles className="h-3 w-3" />
            Trained
          </span>
        )}
      </div>
    </div>
  );
}

function RecentRunItem({ run }: { run: TrainingRun }) {
  const isCompleted = run.status === "completed";
  const isFailed = run.status === "failed";
  const isTraining = run.status === "training" || run.status === "pending";

  return (
    <div className="p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md transition-all duration-200 group flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${
          isCompleted ? "bg-emerald-50 text-emerald-600" :
          isFailed ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600 animate-pulse"
        }`}>
          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> :
           isFailed ? <AlertCircle className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">
            {run.model_name || "Auto-Tuner"} <span className="text-slate-400 font-normal">({run.steps_completed}/{run.total_steps} steps)</span>
          </h4>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(run.started_at).toLocaleTimeString()}
            </span>
            {run.duration_seconds && (
              <span className="flex items-center gap-1">
                • {run.duration_seconds.toFixed(1)}s
              </span>
            )}
            {run.scenarios_used > 0 && (
              <span className="flex items-center gap-1 text-purple-500">
                • {run.scenarios_used} scenarios
              </span>
            )}
          </div>
        </div>
      </div>
      <Badge className={`shrink-0 font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wider border-0 ${
        isCompleted ? "bg-emerald-100 text-emerald-700" :
        isFailed ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"
      }`}>
        {run.status}
      </Badge>
    </div>
  );
}

export function PerformanceDashboard() {
  const { data: stats, isLoading: statsLoading, isError: statsError } = useTraceStats();
  const { data: recentData, isLoading: tracesLoading } = useTraces(1, 10, false);
  const { data: runsData, isLoading: runsLoading } = useRuns(10);

  const labellingPercent = stats && stats.total_traces > 0
    ? Math.round((stats.labelled_traces / stats.total_traces) * 100)
    : 0;

  const positiveRate = stats && stats.labelled_traces > 0
    ? Math.round((stats.positive_traces / stats.labelled_traces) * 100)
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Overview Cards — Live from API */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {statsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : statsError ? (
          <div className="col-span-full">
            <Card className="border-0 ring-1 ring-rose-200 bg-rose-50/50 rounded-2xl">
              <CardContent className="p-8 flex flex-col items-center text-center">
                <AlertCircle className="h-8 w-8 text-rose-500 mb-3" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">Unable to Load Stats</h3>
                <p className="text-sm text-slate-500">Could not connect to the training API.</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Total Traces */}
            <Card className="bg-white shadow-md border-0 ring-1 ring-slate-100 rounded-3xl overflow-hidden relative group hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <Target className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 font-semibold px-2 border border-indigo-100">
                    Total
                  </Badge>
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900 mb-1">
                    {stats?.total_traces?.toLocaleString() ?? "0"}
                  </p>
                  <p className="text-sm font-medium text-slate-500">Total Traces Captured</p>
                </div>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
            </Card>

            {/* Labelled Traces */}
            <Card className="bg-white shadow-md border-0 ring-1 ring-slate-100 rounded-3xl overflow-hidden relative group hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="bg-amber-50 text-amber-700 font-semibold px-2 border border-amber-100">
                    {labellingPercent}% Done
                  </Badge>
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900 mb-1">
                    {stats?.labelled_traces?.toLocaleString() ?? "0"}
                  </p>
                  <p className="text-sm font-medium text-slate-500">Labelled Traces</p>
                </div>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-amber-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
            </Card>

            {/* Positive Traces */}
            <Card className="bg-white shadow-md border-0 ring-1 ring-slate-100 rounded-3xl overflow-hidden relative group hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                    <ThumbsUp className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-semibold px-2 border border-emerald-100">
                    <ArrowUpRight className="h-3 w-3 mr-1" /> {positiveRate}%
                  </Badge>
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900 mb-1">
                    {stats?.positive_traces?.toLocaleString() ?? "0"}
                  </p>
                  <p className="text-sm font-medium text-slate-500">Positive Rewards</p>
                </div>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
            </Card>

            {/* Negative Traces */}
            <Card className="bg-white shadow-md border-0 ring-1 ring-slate-100 rounded-3xl overflow-hidden relative group hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
                    <ThumbsDown className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="bg-rose-50 text-rose-700 font-semibold px-2 border border-rose-100">
                    Negative
                  </Badge>
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900 mb-1">
                    {stats?.negative_traces?.toLocaleString() ?? "0"}
                  </p>
                  <p className="text-sm font-medium text-slate-500">Negative Rewards</p>
                </div>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 to-rose-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
            </Card>
          </>
        )}
      </div>

      {/* Labelling Progress Bar */}
      {!statsLoading && !statsError && stats && stats.total_traces > 0 && (
        <Card className="bg-white shadow-md border-0 ring-1 ring-slate-100 rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-bold text-slate-800">Labelling Progress</span>
              </div>
              <span className="text-sm font-bold text-indigo-600">{labellingPercent}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${labellingPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-slate-400 font-medium">
              <span>{stats.labelled_traces} labelled</span>
              <span>{stats.unused_traces} awaiting review</span>
              <span>{stats.total_traces} total</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Section - Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Traces Activity Feed */}
        <Card className="shadow-lg shadow-blue-900/5 border-0 ring-1 ring-slate-200/60 bg-white rounded-3xl overflow-hidden flex flex-col h-[500px]">
        <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Recent Trace Activity</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Latest orchestrator interactions and their reward status.
              </CardDescription>
            </div>
            {stats && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-semibold px-2 border border-emerald-100 text-[10px]">
                  <ThumbsUp className="h-3 w-3 mr-1" /> {stats.positive_traces} positive
                </Badge>
                <Badge variant="secondary" className="bg-rose-50 text-rose-700 font-semibold px-2 border border-rose-100 text-[10px]">
                  <ThumbsDown className="h-3 w-3 mr-1" /> {stats.negative_traces} negative
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
          {tracesLoading && (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-100 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              ))}
            </div>
          )}
          
          {!tracesLoading && recentData && recentData.traces.length > 0 && (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {recentData.traces.map((trace) => (
                  <RecentTraceItem key={trace.id} trace={trace} />
                ))}
              </div>
            </ScrollArea>
          )}

          {!tracesLoading && (!recentData || recentData.traces.length === 0) && (
            <div className="p-12 flex flex-col items-center text-center">
              <Bot className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No traces recorded yet. Use the orchestrator to generate interactions.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Runs History */}
      <Card className="shadow-lg shadow-indigo-900/5 border-0 ring-1 ring-slate-200/60 bg-white rounded-3xl overflow-hidden flex flex-col h-[500px]">
        <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Training Runs</CardTitle>
              </div>
              <CardDescription className="text-xs">
                History of RL fine-tuning jobs on cloud GPUs.
              </CardDescription>
            </div>
            {runsData && runsData.length > 0 && (
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 font-semibold px-2 border border-indigo-100 text-[10px]">
                {runsData.length} Recent
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
          {runsLoading && (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-100 space-y-2">
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <Skeleton className="h-3 w-1/3 rounded" />
                </div>
              ))}
            </div>
          )}
          
          {!runsLoading && runsData && runsData.length > 0 && (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {runsData.map((run) => (
                  <RecentRunItem key={run.id} run={run} />
                ))}
              </div>
            </ScrollArea>
          )}

          {!runsLoading && (!runsData || runsData.length === 0) && (
            <div className="p-12 flex flex-col items-center text-center m-auto">
              <Cpu className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No training runs yet.</p>
              <p className="text-xs text-slate-400 mt-1">Runs are triggered automatically or by an admin.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      </div>
      
    </div>
  );
}
