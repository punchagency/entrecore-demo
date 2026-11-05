"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Bot,
  Wrench,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Play,
  CheckCircle2,
  TrendingUp,
  Loader2,
  ClipboardList,
  Clock,
  Sparkles,
  Minus,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { TrainingProgressDialog } from "./training-progress-dialog";
import { useTraces, useTraceStats, useSubmitReward } from "../hooks/use-training";
import type { Trace } from "../services/training-api";

export function ScenarioWorkspace() {
  const [selectedTraceId, setSelectedTraceId] = useState<number | null>(null);
  const [insightFeedback, setInsightFeedback] = useState<string>("");
  const [selectedReward, setSelectedReward] = useState<"positive" | "adjusted" | "negative" | null>(null);
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  const { data: stats } = useTraceStats();
  const { data: tracesData, isLoading, isError } = useTraces(1, 10, true);
  const submitRewardMutation = useSubmitReward();

  const traces = tracesData?.traces ?? [];
  const selectedTrace = traces.find((t) => t.id === selectedTraceId) ?? traces[0] ?? null;

  const handleSubmit = () => {
    if (!selectedReward) {
      toast.error("Please select a reward signal first.");
      return;
    }

    if (!selectedTrace) {
      toast.error("No trace selected.");
      return;
    }

    const rewardValue = selectedReward === "positive" ? 1.0 : selectedReward === "negative" ? -1.0 : 0.0;
    submitRewardMutation.mutate(
      { traceId: selectedTrace.id, reward: rewardValue, reasoning: insightFeedback || undefined },
      {
        onSuccess: () => {
          toast.success(`Trace #${selectedTrace.id} rewarded as ${selectedReward}. Policy updating...`);
          setInsightFeedback("");
          setSelectedReward(null);
        },
        onError: () => {
          toast.error("Failed to submit reward.");
        },
      }
    );
  };

  const onTrainingComplete = () => {
    toast.success("Training feedback submitted successfully. Policy updating...");
    setInsightFeedback("");
    setSelectedReward(null);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full">

      {/* 1. Trace Selection Panel (Left Column) */}
      <div className="xl:col-span-1 space-y-6 flex flex-col h-full">
        <Card className="flex-1 shadow-lg shadow-blue-900/5 border-0 ring-1 ring-slate-200/60 bg-white/50 backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Unlabelled Traces</CardTitle>
              </div>
              {stats && stats.total_traces - stats.labelled_traces > 0 && (
                <Badge className="bg-orange-50 w-full text-orange-700 border border-orange-200 font-semibold text-[10px] px-2 py-0.5 hover:bg-orange-50">
                  {stats.total_traces - stats.labelled_traces} pending
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Select an orchestrator trace to review and provide reward feedback.
            </CardDescription>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                    <Skeleton className="h-3 w-1/3 rounded" />
                  </div>
                ))}
              </div>
            )}

            {isError && (
              <div className="flex flex-col items-center text-center py-8">
                <AlertCircle className="h-8 w-8 text-rose-400 mb-2" />
                <p className="text-sm text-slate-500">Unable to load traces</p>
              </div>
            )}

            {!isLoading && !isError && traces.length === 0 && (
              <div className="flex flex-col items-center text-center py-8">
                <Sparkles className="h-8 w-8 text-indigo-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                <p className="text-xs text-slate-500 mt-1">No unlabelled traces to review.</p>
              </div>
            )}

            {!isLoading && !isError && traces.length > 0 && (
              <div className="space-y-3">
                {traces.map((trace) => (
                  <div
                    key={trace.id}
                    onClick={() => setSelectedTraceId(trace.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 group ${(selectedTrace?.id === trace.id)
                        ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100"
                        : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 bg-white"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors line-clamp-2">
                        {trace.user_message}
                      </h4>
                      {selectedTrace?.id === trace.id && (
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 animate-in zoom-in shrink-0 ml-2" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      {trace.tool_used && (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium px-1.5 py-0 text-[10px]">
                          <Wrench className="h-2.5 w-2.5 mr-0.5" />{trace.tool_used}
                        </Badge>
                      )}
                      <span className="flex items-center gap-1 ml-auto text-[10px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {new Date(trace.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {trace.page && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                        <Activity className="h-3 w-3" />
                        {trace.page}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* 2. Scenario Detail & Reward Interface (Right Column) */}
      <div className="xl:col-span-3 space-y-6 flex flex-col h-full">

        {/* Selected Trace Detail */}
        {selectedTrace ? (
          <Card className="shadow-lg shadow-indigo-900/5 border-0 ring-1 ring-slate-200/60 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

            <CardHeader className="relative z-10 pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="outline" className="bg-white border-indigo-200 text-indigo-700 font-semibold shadow-sm mb-3">
                    Trace #{selectedTrace.id}
                  </Badge>
                  <CardTitle className="text-2xl font-bold text-slate-900">User Query</CardTitle>
                  <CardDescription className="text-sm mt-2 max-w-2xl leading-relaxed">
                    {selectedTrace.user_message}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTrace.tool_used && (
                    <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-[10px] px-2 uppercase tracking-wider">
                      <Wrench className="h-3 w-3 mr-1" />
                      {selectedTrace.tool_used}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl"><MessageSquare className="h-6 w-6 text-blue-500" /></div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Page Context</p>
                    <p className="text-lg font-bold text-slate-800">{selectedTrace.page || "N/A"}</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-xl"><Clock className="h-6 w-6 text-amber-500" /></div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Timestamp</p>
                    <p className="text-lg font-bold text-slate-800">{new Date(selectedTrace.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-xl"><TrendingUp className="h-6 w-6 text-emerald-500" /></div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Training Status</p>
                    <p className="text-lg font-bold text-slate-800">{selectedTrace.used_for_training ? "Used" : "Unused"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !isLoading ? (
          <Card className="shadow-lg border-0 ring-1 ring-slate-200/60 bg-white/50 rounded-3xl overflow-hidden">
            <CardContent className="p-12 flex flex-col items-center text-center">
              <div className="p-5 bg-indigo-50 rounded-full mb-5">
                <Bot className="h-10 w-10 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Trace</h3>
              <p className="text-sm text-slate-500 max-w-md">
                Choose an orchestrator trace from the left panel to review the agent&apos;s response and provide reward feedback.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Agent Response & Reward Interface */}
        {selectedTrace && (
          <div className="grid md:grid-cols-2 gap-6 flex-1">

            {/* Agent Response */}
            <Card className="shadow-lg shadow-purple-900/5 border-0 ring-1 ring-slate-200/60 bg-white rounded-3xl h-full flex flex-col">
              <CardHeader className="bg-purple-50/50 pb-4 border-b border-purple-100/50">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-lg">Agent Response</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  The orchestrator&apos;s full response for this interaction.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1 flex flex-col">
                <ScrollArea className="flex-1 max-h-[400px]">
                  <div className="bg-purple-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
                    <div className="relative z-10">
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 mb-3 px-2 py-0.5">
                        {selectedTrace.tool_used || "General"}
                      </Badge>
                      <p className="text-purple-50 text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedTrace.agent_response}
                      </p>
                    </div>
                  </div>
                </ScrollArea>

                {selectedTrace.conversation_id && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400 font-medium">
                      Conversation: {selectedTrace.conversation_id}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reward & Feedback Interface */}
            <Card className="shadow-lg shadow-emerald-900/5 border-0 ring-1 ring-slate-200/60 bg-white rounded-3xl h-full flex flex-col">
              <CardHeader className="bg-emerald-50/50 pb-4 border-b border-emerald-100/50">
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-lg">Reward & Feedback</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Train the RL engine by providing a reward signal for this decision.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1 flex flex-col space-y-6">

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-4">Provide Reward Signal</p>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedReward('positive')}
                      className={`h-auto flex-col gap-2 py-4 group transition-all rounded-2xl ${selectedReward === 'positive'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200'
                          : 'border-emerald-200 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700'
                        }`}
                    >
                      <div className={`p-2 rounded-full transition-colors ${selectedReward === 'positive' ? 'bg-emerald-200' : 'bg-emerald-100 group-hover:bg-emerald-200'}`}>
                        <ThumbsUp className={`h-5 w-5 ${selectedReward === 'positive' ? 'text-emerald-700' : 'text-emerald-600'}`} />
                      </div>
                      <span className="font-semibold text-xs">Positive (+1.0)</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setSelectedReward('adjusted')}
                      className={`h-auto flex-col gap-2 py-4 group transition-all rounded-2xl ${selectedReward === 'adjusted'
                          ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-200'
                          : 'border-amber-200 hover:bg-amber-50 hover:border-amber-500 hover:text-amber-700'
                        }`}
                    >
                      <div className={`p-2 rounded-full transition-colors ${selectedReward === 'adjusted' ? 'bg-amber-200' : 'bg-amber-100 group-hover:bg-amber-200'}`}>
                        <Minus className={`h-5 w-5 ${selectedReward === 'adjusted' ? 'text-amber-700' : 'text-amber-600'}`} />
                      </div>
                      <span className="font-semibold text-xs">Neutral (0.0)</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setSelectedReward('negative')}
                      className={`h-auto flex-col gap-2 py-4 group transition-all rounded-2xl ${selectedReward === 'negative'
                          ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-200'
                          : 'border-rose-200 hover:bg-rose-50 hover:border-rose-500 hover:text-rose-700'
                        }`}
                    >
                      <div className={`p-2 rounded-full transition-colors ${selectedReward === 'negative' ? 'bg-rose-200' : 'bg-rose-100 group-hover:bg-rose-200'}`}>
                        <ThumbsDown className={`h-5 w-5 ${selectedReward === 'negative' ? 'text-rose-700' : 'text-rose-600'}`} />
                      </div>
                      <span className="font-semibold text-xs">Negative (-1.0)</span>
                    </Button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Business Reasoning <span className="text-slate-400 font-normal">(Optional)</span></p>
                  <Textarea
                    placeholder="Explain why this decision was correct or incorrect in business terms..."
                    className="resize-none flex-1 min-h-[100px] border-slate-200 bg-slate-50/50 rounded-xl focus-visible:ring-emerald-500 text-sm"
                    value={insightFeedback}
                    onChange={(e) => setInsightFeedback(e.target.value)}
                  />
                </div>

              </CardContent>
              <CardFooter className="pt-0 pb-6 px-6">
                <Button
                  onClick={handleSubmit}
                  disabled={submitRewardMutation.isPending || !selectedReward}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-6 font-semibold shadow-lg shadow-slate-900/20 transition-all"
                >
                  {submitRewardMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting Reward...
                    </>
                  ) : (
                    "Submit Training Feedback"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>

      <TrainingProgressDialog
        open={isProgressOpen}
        onOpenChange={setIsProgressOpen}
        onComplete={onTrainingComplete}
      />
    </div>
  );
}
