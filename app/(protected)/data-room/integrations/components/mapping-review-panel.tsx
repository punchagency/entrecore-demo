"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  IntegrationAPI,
  IntegrationMappingReview,
  IntegrationMappingReviewStatus,
  formatIntegrationReviewTimestamp,
  getIntegrationReviewSortTime,
} from "../services/data-integration-api";
import { parseIntegrationApiError } from "../services/integration-error-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Lock,
  LockOpen,
  MessageSquare,
  ShieldCheck,
  XCircle,
} from "lucide-react";

interface IntegrationMappingReviewPanelProps {
  jobId: string | null;
  jobLocked?: boolean;
  compileErrorCount?: number;
  reviewSuggestedCount?: number;
  unmatchedCount?: number;
  onJobUpdated?: () => void;
  onReviewApproved?: () => void;
  onReviewStateChange?: (state: {
    pendingReview: IntegrationMappingReview | null;
    latestReview: IntegrationMappingReview | null;
  }) => void;
  /** Increment to reload review history after automated review actions elsewhere. */
  refreshTrigger?: number;
}

const STATUS_LABELS: Record<IntegrationMappingReviewStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes requested",
};

const STATUS_DESCRIPTIONS: Record<IntegrationMappingReviewStatus, string> = {
  pending: "Waiting for a reviewer to approve, reject, or request changes.",
  approved: "Mappings accepted — job was locked and ready to activate.",
  rejected: "Mappings rejected — edit mappings and submit a new review.",
  changes_requested: "Reviewer asked for fixes — edit mappings and submit again.",
};

function statusBadgeClass(status: IntegrationMappingReviewStatus): string {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "changes_requested":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export function IntegrationMappingReviewPanel({
  jobId,
  jobLocked = false,
  compileErrorCount = 0,
  reviewSuggestedCount = 0,
  unmatchedCount = 0,
  onJobUpdated,
  onReviewApproved,
  onReviewStateChange,
  refreshTrigger = 0,
}: IntegrationMappingReviewPanelProps) {
  const [reviews, setReviews] = useState<IntegrationMappingReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pendingReview = useMemo(
    () => reviews.find((review) => review.status === "pending") ?? null,
    [reviews]
  );

  const latestReview = useMemo(() => {
    if (reviews.length === 0) return null;
    return [...reviews].sort(
      (a, b) => getIntegrationReviewSortTime(b) - getIntegrationReviewSortTime(a)
    )[0];
  }, [reviews]);

  useEffect(() => {
    onReviewStateChange?.({ pendingReview, latestReview });
  }, [latestReview, onReviewStateChange, pendingReview]);

  const loadReviews = useCallback(async () => {
    if (!jobId) {
      setReviews([]);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const list = await IntegrationAPI.getMappingReviews(jobId);
      setReviews(list);
    } catch (error) {
      const parsed = parseIntegrationApiError(error);
      setErrorMessage(parsed?.message || "Failed to load mapping reviews.");
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews, refreshTrigger]);

  const canOpenReview =
    Boolean(jobId) && !jobLocked && !pendingReview && compileErrorCount === 0;

  const handleOpenReview = async () => {
    if (!jobId) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await IntegrationAPI.openMappingReview(jobId, {
        notes: reviewNotes.trim() || undefined,
      });
      setReviewNotes("");
      await loadReviews();
      onJobUpdated?.();
      toast.success("Mappings submitted for review.");
    } catch (error) {
      setErrorMessage(
        parseIntegrationApiError(error)?.message || "Failed to open mapping review."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecide = async (
    decision: "approved" | "rejected" | "changes_requested"
  ) => {
    if (!pendingReview) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await IntegrationAPI.decideMappingReview(pendingReview.id, {
        decision,
        notes: decisionNotes.trim() || undefined,
      });
      setDecisionNotes("");
      await loadReviews();
      onJobUpdated?.();
      if (decision === "approved") onReviewApproved?.();
    } catch (error) {
      setErrorMessage(
        parseIntegrationApiError(error)?.message || "Failed to submit review decision."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlock = async () => {
    if (!jobId) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await IntegrationAPI.unlockJob(jobId);
      await loadReviews();
      onJobUpdated?.();
    } catch (error) {
      setErrorMessage(parseIntegrationApiError(error)?.message || "Failed to unlock job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!jobId) return null;

  const showResubmitHint =
    latestReview &&
    !pendingReview &&
    !jobLocked &&
    (latestReview.status === "rejected" || latestReview.status === "changes_requested");

  return (
    <Card className="border-0 shadow-sm ring-1 ring-indigo-200/60 overflow-hidden">
      <CardHeader className="py-3 border-b border-indigo-100 bg-indigo-50/40">
        <CardTitle className="text-sm font-bold text-indigo-900 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Step 3–4 — Human-in-the-Loop Mapping Review
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <p className="text-xs text-slate-600">
          Save your mappings, submit for review, then wait for a reviewer to approve. After
          approval the job locks and Step 5 (Activate) becomes available. Rejected or
          changes-requested reviews return you to editing.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {pendingReview && (
            <Badge className={cn("rounded-full border", statusBadgeClass("pending"))}>
              <Clock className="h-3 w-3 mr-1" />
              Awaiting Review
            </Badge>
          )}
          {jobLocked && (
            <Badge className="rounded-full bg-emerald-100 text-emerald-800 border-emerald-200">
              <Lock className="h-3 w-3 mr-1" />
              Approved — ready to activate
            </Badge>
          )}
          {latestReview && !pendingReview && !jobLocked && (
            <Badge
              className={cn("rounded-full border", statusBadgeClass(latestReview.status))}
            >
              Latest: {STATUS_LABELS[latestReview.status]}
            </Badge>
          )}
          {compileErrorCount > 0 && (
            <Badge className="rounded-full bg-rose-100 text-rose-800 border-rose-200">
              {compileErrorCount} compile error{compileErrorCount === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        {errorMessage && (
          <p className="text-xs text-rose-700 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
            {errorMessage}
          </p>
        )}

        {showResubmitHint && latestReview && (
          <div
            className={cn(
              "rounded-xl border px-3 py-2 text-xs",
              latestReview.status === "rejected"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            )}
          >
            <p className="font-semibold">
              {latestReview.status === "rejected" ? "Review rejected" : "Changes requested"}
            </p>
            {(latestReview.reviewer_notes || latestReview.notes) && (
              <p className="mt-1">
                {latestReview.reviewer_notes || latestReview.notes}
              </p>
            )}
            <p className="mt-1 text-[11px] opacity-80">
              Update mappings (Step 2), save, then submit a new review.
            </p>
          </div>
        )}

        {pendingReview && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-3 text-xs text-amber-900">
            <p className="font-semibold">Mappings are read-only while review is pending.</p>
            {pendingReview.notes && (
              <p className="mt-1 text-slate-700">
                <span className="font-medium">Submitted notes:</span> {pendingReview.notes}
              </p>
            )}
          </div>
        )}

        {!jobLocked && !pendingReview && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Submit mappings for review
            </p>
            <Textarea
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              placeholder="Optional notes for the reviewer (e.g. verify entity_type mapping)"
              className="min-h-[72px] rounded-xl border-slate-200 bg-white text-xs"
            />
            <Button
              size="sm"
              className="rounded-xl"
              onClick={handleOpenReview}
              disabled={isSubmitting || !canOpenReview}
            >
              {isSubmitting ? "Submitting..." : "Submit for Review"}
            </Button>
            {!canOpenReview && compileErrorCount > 0 && (
              <p className="text-[11px] text-slate-500">
                Fix compile errors before submitting for review.
              </p>
            )}
            {canOpenReview && (reviewSuggestedCount > 0 || unmatchedCount > 0) && (
              <p className="text-[11px] text-slate-500">
                Tip: confirm or skip review-suggested rows and unmatched columns before submitting.
              </p>
            )}
          </div>
        )}

        {pendingReview && (
          <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-3">
            <p className="text-xs font-semibold text-indigo-900">Reviewer actions (admin)</p>
            <div className="text-xs text-slate-700 space-y-1">
              <p>Review opened {formatIntegrationReviewTimestamp(pendingReview.opened_at)}</p>
            </div>
            <Textarea
              value={decisionNotes}
              onChange={(event) => setDecisionNotes(event.target.value)}
              placeholder="Decision notes (optional)"
              className="min-h-[64px] rounded-xl border-slate-200 bg-white text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleDecide("approved")}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl border-amber-300 bg-white"
                onClick={() => handleDecide("changes_requested")}
                disabled={isSubmitting}
              >
                Request changes
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl border-rose-300 bg-white text-rose-700"
                onClick={() => handleDecide("rejected")}
                disabled={isSubmitting}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {jobLocked && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl border-indigo-300 bg-white"
              onClick={handleUnlock}
              disabled={isSubmitting}
            >
              <LockOpen className="h-3.5 w-3.5 mr-1" />
              Unlock for editing (admin)
            </Button>
            <p className="text-[11px] text-slate-500">
              Proceed to Activate (Step 5). Unlock only if compile errors require mapping fixes.
            </p>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Review history
            </p>
            <p className="text-[11px] text-slate-500">
              Newest first. Only the latest decision affects whether you can activate.
            </p>
            <ul className="space-y-2 max-h-48 overflow-auto">
              {[...reviews]
                .sort(
                  (a, b) => getIntegrationReviewSortTime(b) - getIntegrationReviewSortTime(a)
                )
                .map((review) => (
                <li
                  key={review.id}
                  className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-600">
                      {formatIntegrationReviewTimestamp(
                        review.reviewed_at ?? review.opened_at ?? review.created_at
                      )}
                    </span>
                    <Badge className={cn("border shrink-0", statusBadgeClass(review.status))}>
                      {STATUS_LABELS[review.status]}
                    </Badge>
                  </div>
                  {review.reviewed_by && (
                    <p className="text-[11px] text-slate-500">
                      Approver: <span className="font-medium text-slate-700">{review.reviewed_by}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    {STATUS_DESCRIPTIONS[review.status]}
                  </p>
                  {(review.reviewer_notes || review.notes) && (
                    <p className="text-[11px] text-slate-600 italic">
                      “{review.reviewer_notes || review.notes}”
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isLoading && reviews.length === 0 && (
          <p className="text-xs text-slate-400">Loading reviews...</p>
        )}
      </CardContent>
    </Card>
  );
}
