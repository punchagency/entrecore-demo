"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  SkipForward,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { parseApiUtcDate } from "@/lib/datetime";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { DratSectionNav } from "../components/drat-section-nav";
import { DratEntityCombobox } from "../components/drat-entity-combobox";
import { DratReviewPreview } from "../components/drat-review-preview";
import { useDecideReviewTask, usePendingReviewTasks, DratReviewTask } from "../hooks/use-drat-review";
import { useRoutingRules } from "../hooks/use-routing-rules";
import { reasonLabel, getReviewFailureDetail } from "../services/review-api";
import { PageWrapper } from "@/components/page-wrapper";
import { QueryErrorState } from "@/components/query-error-state";
import { showApiErrorToast } from "@/utils/api-error";

/** Strip HITL queue marker so the filename input starts clean; queue display keeps the original. */
function stripNeedsReviewMarker(filename: string): string {
  return filename
    .replace(/\s*\[NEEDS\s+REVIEW\]\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+(\.[^.]+)$/, "$1");
}

function confidenceBadge(confidence?: number | null) {
  if (confidence == null) return null;
  const low = confidence < 90;
  return (
    <Badge
      variant="outline"
      className={
        low
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200"
      }
    >
      {confidence.toFixed(1)}% confidence
    </Badge>
  );
}

export default function DratReviewQueuePage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isFetching } = usePendingReviewTasks({ limit: 50 });
  const decideMutation = useDecideReviewTask();

  const [selectedTask, setSelectedTask] = useState<DratReviewTask | null>(null);
  const [entityName, setEntityName] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>();
  const [suggestedFilename, setSuggestedFilename] = useState("");
  const [targetFolder, setTargetFolder] = useState("");
  const [notes, setNotes] = useState("");

  // Target-folder suggestions. Reviewers were typing the full Drive path by
  // hand (Luke, Sep 2026). Routing rules already hold every path in use and
  // are readable by any reviewer (require_viewer), so they are the one source
  // we can offer without the admin-only Drive browse endpoint.
  const routingRulesQuery = useRoutingRules({ limit: 200 });
  const targetFolderSuggestions = useMemo(() => {
    const rules = routingRulesQuery.data?.rules ?? [];
    const seen = new Set<string>();
    for (const rule of rules) {
      const value = (rule.target_folder ?? "").trim();
      if (value) seen.add(value);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [routingRulesQuery.data]);

  const openTask = (task: DratReviewTask) => {
    setSelectedTask(task);
    setEntityName(task.entity_name ?? "");
    setSelectedEntityId(task.entity_id ?? undefined);
    setSuggestedFilename(stripNeedsReviewMarker(task.suggested_filename ?? ""));
    setTargetFolder(task.target_folder ?? "");
    setNotes(task.notes ?? "");
  };

  const closeDialog = () => {
    setSelectedTask(null);
    setSelectedEntityId(undefined);
    setNotes("");
  };

  const submitDecision = (decision: "approved" | "rejected" | "skipped") => {
    if (!selectedTask) return;

    decideMutation.mutate(
      {
        taskId: selectedTask.id,
        payload: {
          decision,
          entity_id: selectedEntityId,
          entity_name: entityName || undefined,
          suggested_filename: suggestedFilename || undefined,
          target_folder: targetFolder.trim() || undefined,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            decision === "approved"
              ? targetFolder.trim()
                ? "Approved with manual folder — workflow continuing"
                : "Approved — routing rules will be re-evaluated"
              : decision === "rejected"
                ? "Review rejected"
                : "Review skipped"
          );
          closeDialog();
        },
        onError: (error) => showApiErrorToast(error, "Failed to submit review decision"),
      }
    );
  };

  const tasks = data?.items ?? [];

  return (
    <PageWrapper title="Review">
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="w-full p-6 space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                <ShieldAlert className="h-6 w-6 text-amber-300" />
              </div>
              <Badge
                variant="outline"
                className="border-amber-400/60 text-amber-200 font-medium tracking-wide bg-amber-950/20"
              >
                DRAT Human Review
              </Badge>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-amber-100">
              Review queue
            </h1>
            <p className="text-indigo-100/80 leading-relaxed max-w-2xl">
              Documents flagged during classify or routing. Override entity, filename, or
              target folder before approving — the workflow resumes automatically via the
              DRAT Approval node.
            </p>
          </div>
        </div>

        <DratSectionNav active="review" />

        <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : isError ? (
              <QueryErrorState
                error={error}
                title="Couldn't load the review queue"
                onRetry={() => refetch()}
                isRetrying={isFetching}
              />
            ) : tasks.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">Queue is clear</h3>
                <p className="text-slate-500 text-sm">
                  No documents are waiting for human review.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => openTask(task)}
                    className="w-full text-left p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="font-semibold text-slate-900 truncate">
                          {task.suggested_filename || task.original_filename || task.doc_id}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">{task.doc_id}</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            {reasonLabel(task.reason)}
                          </Badge>
                          {confidenceBadge(task.confidence)}
                          {task.entity_name && (
                            <Badge variant="outline" className="text-[10px]">
                              {task.entity_name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed pt-1 line-clamp-2">
                          {getReviewFailureDetail(task)}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 shrink-0">
                      {formatDistanceToNow(parseApiUtcDate(task.created_at), { addSuffix: true })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[min(96vw,1400px)] sm:max-w-[min(96vw,1400px)] max-h-[92vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Review document
            </DialogTitle>
            <DialogDescription>
              {selectedTask?.doc_id} · {reasonLabel(selectedTask?.reason ?? "")}
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)] gap-6 py-2">
              <div className="space-y-4 min-w-0">
                <DratReviewPreview taskId={selectedTask.id} />

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    router.push(`/drat/logs?run=${encodeURIComponent(selectedTask.workflow_run_id)}`)
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open filing log
                </Button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Why this needs review
                  </p>
                  <p className="text-sm text-amber-950 leading-relaxed">
                    {getReviewFailureDetail(selectedTask)}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Original file</span>
                    <p className="font-medium truncate">{selectedTask.original_filename ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Suggested filename</span>
                    <p className="font-medium truncate">{selectedTask.suggested_filename ?? "—"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Entity</Label>
                  <DratEntityCombobox
                    value={entityName}
                    onValueChange={setEntityName}
                    onEntitySelect={(entity) => setSelectedEntityId(entity?.id)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Suggested filename</Label>
                  <Input
                    value={suggestedFilename}
                    onChange={(e) => setSuggestedFilename(e.target.value)}
                    placeholder="2025-01-01 - Client - Document Type.pdf"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target folder</Label>
                  <Input
                    list="drat-target-folder-options"
                    value={targetFolder}
                    onChange={(e) => setTargetFolder(e.target.value)}
                    placeholder="Start typing or pick a folder"
                  />
                  {targetFolderSuggestions.length > 0 && (
                    <datalist id="drat-target-folder-options">
                      {targetFolderSuggestions.map((folder) => (
                        <option key={folder} value={folder} />
                      ))}
                    </datalist>
                  )}
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pick a folder already used by a routing rule, or type a new one.
                    Leave empty after updating routing rules — approve re-evaluates rules
                    automatically. Fill in only for a manual override.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Reviewer notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes for audit trail"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => submitDecision("skipped")}
              disabled={decideMutation.isPending}
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Skip
            </Button>
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => submitDecision("rejected")}
              disabled={decideMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-500"
              onClick={() => submitDecision("approved")}
              disabled={decideMutation.isPending}
            >
              {decideMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PageWrapper>
  );
}
