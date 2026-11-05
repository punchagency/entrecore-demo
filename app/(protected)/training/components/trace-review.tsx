"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  MessageSquare,
  Bot,
  Wrench,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Loader2,
  Filter,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTraces, useSubmitReward, useTraceStats } from "../hooks/use-training";
import type { Trace } from "../services/training-api";

function TraceCard({
  trace,
  onRewardSubmit,
  isSubmitting,
  submittingId,
}: {
  trace: Trace;
  onRewardSubmit: (traceId: number, reward: number, reasoning?: string) => void;
  isSubmitting: boolean;
  submittingId: number | null;
}) {
  const [reasoning, setReasoning] = useState("");
  const [showReasoning, setShowReasoning] = useState(false);
  const isThisSubmitting = isSubmitting && submittingId === trace.id;

  const rewardLabel = trace.reward === 1.0
    ? "positive"
    : trace.reward === -1.0
      ? "negative"
      : trace.reward === 0.0
        ? "neutral"
        : null;

  const handleSubmit = (reward: number) => {
    onRewardSubmit(trace.id, reward, reasoning || undefined);
    setReasoning("");
    setShowReasoning(false);
  };

  return (
    <Card className="border-0 ring-1 ring-slate-200/60 bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group">
      <CardContent className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {trace.tool_used && (
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wider">
                <Wrench className="h-3 w-3 mr-1" />
                {trace.tool_used}
              </Badge>
            )}
            {trace.page && (
              <Badge variant="secondary" className="bg-slate-50 text-slate-600 border border-slate-100 font-medium px-2 py-0.5 text-[10px]">
                {trace.page}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {rewardLabel && (
              <Badge
                className={`font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wider border-0 ${
                  rewardLabel === "positive"
                    ? "bg-emerald-100 text-emerald-700"
                    : rewardLabel === "negative"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {rewardLabel}
              </Badge>
            )}
            {!rewardLabel && (
              <Badge className="bg-blue-50 text-blue-600 border border-blue-100 font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wider">
                <Clock className="h-3 w-3 mr-1" />
                Awaiting Review
              </Badge>
            )}
            {trace.used_for_training && (
              <Badge className="bg-purple-50 text-purple-600 border border-purple-100 font-semibold px-2 py-0.5 text-[10px]">
                <Sparkles className="h-3 w-3 mr-1" />
                Trained
              </Badge>
            )}
          </div>
        </div>

        {/* User Message */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">User Input</span>
          </div>
          <p className="text-sm text-slate-800 leading-relaxed pl-8 line-clamp-3">
            {trace.user_message}
          </p>
        </div>

        {/* Agent Response */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-50 rounded-lg">
              <Bot className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agent Response</span>
          </div>
          <div className="bg-slate-50/80 rounded-xl p-3 ml-8 border border-slate-100">
            <p className="text-sm text-slate-700 leading-relaxed line-clamp-4">
              {trace.agent_response}
            </p>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center text-[11px] text-slate-400 font-medium mb-4 pl-8">
          <Clock className="h-3 w-3 mr-1.5" />
          {new Date(trace.created_at).toLocaleString()}
          {trace.conversation_id && (
            <span className="ml-3 text-slate-300">
              Conv: {trace.conversation_id.slice(0, 8)}…
            </span>
          )}
        </div>

        {/* Reward Actions — Only show if not yet labelled */}
        {trace.reward === null && (
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-slate-600">Rate this decision</span>
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold ml-auto transition-colors"
              >
                {showReasoning ? "Hide reasoning" : "+ Add reasoning"}
              </button>
            </div>

            {showReasoning && (
              <Textarea
                placeholder="Explain why this decision was correct or incorrect..."
                className="resize-none h-20 border-slate-200 bg-slate-50/50 rounded-xl focus-visible:ring-blue-500 text-sm mb-3"
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
              />
            )}

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isThisSubmitting}
                onClick={() => handleSubmit(1.0)}
                className="h-10 rounded-xl border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 transition-all group/btn"
              >
                {isThisSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ThumbsUp className="h-4 w-4 mr-1.5 text-emerald-500 group-hover/btn:text-emerald-700 transition-colors" />
                    <span className="font-semibold text-xs">Positive</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isThisSubmitting}
                onClick={() => handleSubmit(0.0)}
                className="h-10 rounded-xl border-amber-200 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700 transition-all group/btn"
              >
                {isThisSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Minus className="h-4 w-4 mr-1.5 text-amber-500 group-hover/btn:text-amber-700 transition-colors" />
                    <span className="font-semibold text-xs">Neutral</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isThisSubmitting}
                onClick={() => handleSubmit(-1.0)}
                className="h-10 rounded-xl border-rose-200 hover:bg-rose-50 hover:border-rose-400 hover:text-rose-700 transition-all group/btn"
              >
                {isThisSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ThumbsDown className="h-4 w-4 mr-1.5 text-rose-500 group-hover/btn:text-rose-700 transition-colors" />
                    <span className="font-semibold text-xs">Negative</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TraceCardSkeleton() {
  return (
    <Card className="border-0 ring-1 ring-slate-100 bg-white rounded-2xl overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-5 w-28 rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TraceReview() {
  const [page, setPage] = useState(1);
  const [unlabelledOnly, setUnlabelledOnly] = useState(true);
  const pageSize = 10;

  const { data: tracesData, isLoading, isError } = useTraces(page, pageSize, unlabelledOnly);
  const { data: stats } = useTraceStats();
  const submitRewardMutation = useSubmitReward();
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const totalPages = tracesData ? Math.ceil(tracesData.total / pageSize) : 0;

  const handleRewardSubmit = (traceId: number, reward: number, reasoning?: string) => {
    setSubmittingId(traceId);
    submitRewardMutation.mutate(
      { traceId, reward, reasoning },
      {
        onSuccess: (data) => {
          const label = data.label ?? (reward === 1.0 ? "positive" : reward === -1.0 ? "negative" : "neutral");
          toast.success(`Trace #${traceId} marked as ${label}`);
          setSubmittingId(null);
        },
        onError: () => {
          toast.error("Failed to submit reward. Please try again.");
          setSubmittingId(null);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            Trace Review Queue
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Review orchestrator decisions and provide reward signals to improve the RL model.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Stats Badges */}
          {stats && (
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-100 font-bold px-3 py-1">
                {stats.total_traces} Total
              </Badge>
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border border-amber-100 font-bold px-3 py-1">
                {stats.total_traces - stats.labelled_traces} Unlabelled
              </Badge>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-3 py-1">
                {stats.labelled_traces} Labelled
              </Badge>
            </div>
          )}

          {/* Unlabelled Toggle */}
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-sm">
            <Switch
              id="unlabelled-toggle"
              checked={unlabelledOnly}
              onCheckedChange={(checked) => {
                setUnlabelledOnly(checked);
                setPage(1);
              }}
            />
            <Label htmlFor="unlabelled-toggle" className="text-xs font-semibold text-slate-600 cursor-pointer whitespace-nowrap">
              Unlabelled only
            </Label>
          </div>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <Card className="border-0 ring-1 ring-rose-200 bg-rose-50/50 rounded-2xl">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <div className="p-4 bg-rose-100 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-rose-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Unable to Load Traces</h3>
            <p className="text-sm text-slate-500 max-w-md">
              Could not connect to the training API. Make sure the backend is running and your session is authenticated.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <TraceCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && tracesData?.traces.length === 0 && (
        <Card className="border-0 ring-1 ring-slate-200/60 bg-white/50 backdrop-blur-xl rounded-2xl">
          <CardContent className="p-12 flex flex-col items-center text-center">
            <div className="p-5 bg-indigo-50 rounded-full mb-5">
              <Sparkles className="h-10 w-10 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">All Caught Up!</h3>
            <p className="text-sm text-slate-500 max-w-md leading-relaxed">
              {unlabelledOnly
                ? "There are no unlabelled traces to review. Try turning off the filter to see all traces."
                : "No traces have been recorded yet. Use the orchestrator to generate interaction traces."}
            </p>
            {unlabelledOnly && (
              <Button
                variant="outline"
                className="mt-4 rounded-xl"
                onClick={() => setUnlabelledOnly(false)}
              >
                Show all traces
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trace Cards */}
      {!isLoading && !isError && tracesData && tracesData.traces.length > 0 && (
        <div className="space-y-4">
          {tracesData.traces.map((trace) => (
            <TraceCard
              key={trace.id}
              trace={trace}
              onRewardSubmit={handleRewardSubmit}
              isSubmitting={submitRewardMutation.isPending}
              submittingId={submittingId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500 font-medium">
            Showing page {page} of {totalPages} ({tracesData?.total} traces)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl h-9 px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className={`h-9 w-9 rounded-xl p-0 ${
                      pageNum === page
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl h-9 px-3"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
