"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { IntegrationMappingReviewPanel } from "@/app/(protected)/data-room/integrations/components/mapping-review-panel";
import type { IntegrationColumnMapping } from "@/app/(protected)/data-room/integrations/services/data-integration-api";
import type { IntegrationCompileError } from "@/app/(protected)/data-room/integrations/services/integration-error-utils";
import { cn } from "@/lib/utils";
import {
  Activity,
  CheckCircle2,
  GitBranch,
  Layers,
  ShieldCheck,
  Target,
} from "lucide-react";
import {
  IntegrationMappingReview,
  type MappingReviewItem,
} from "./integration-mapping-review";
import { IntegrationExceptionsPanel } from "./integration-exceptions-panel";
import { IntegrationSimulationPanel } from "./integration-simulation-panel";
import {
  computeIntegrationReadiness,
  readinessScoreColor,
  statusColorClass,
  statusLabel,
} from "../services/integration-readiness-utils";
import {
  deriveIntegrationExceptions,
  type IntegrationException,
} from "../services/integration-exception-store";
import type { IntegrationMappingReview as IntegrationMappingReviewRecord } from "@/app/(protected)/data-room/integrations/services/data-integration-api";

type ReviewSection = "overview" | "mappings" | "exceptions" | "simulation";

interface IntegrationGovernanceReviewProps {
  workflowId?: string;
  jobId: string | null;
  jobName: string;
  jobLocked: boolean;
  mappings: IntegrationColumnMapping[];
  compileErrors: IntegrationCompileError[];
  unmatchedSourceColumns: string[];
  unmatchedTargetColumns: string[];
  reviewItems: MappingReviewItem[];
  isReadOnly: boolean;
  reviewSuggestedCount: number;
  unmatchedCount: number;
  reviewRefreshNonce: number;
  onReviewApprove: (id: string) => void;
  onReviewReject: (id: string, note?: string) => void;
  onReviewCorrect: (id: string, correctedValue: string, note?: string) => void;
  onReviewUndo: (id: string) => void;
  onReviewApproveAll: () => void;
  onExceptionRuleChange?: (id: string, rule: MappingReviewItem["nullHandling"], defaultValue?: string) => void;
  onReviewStateChange?: (state: {
    pendingReview: IntegrationMappingReviewRecord | null;
    latestReview: IntegrationMappingReviewRecord | null;
  }) => void;
  onJobUpdated?: () => void;
  onReviewApproved?: () => void;
  onGoToMap?: () => void;
}

export function IntegrationGovernanceReview({
  workflowId,
  jobId,
  jobName,
  jobLocked,
  mappings,
  compileErrors,
  unmatchedSourceColumns,
  unmatchedTargetColumns,
  reviewItems,
  isReadOnly,
  reviewSuggestedCount,
  unmatchedCount,
  reviewRefreshNonce,
  onReviewApprove,
  onReviewReject,
  onReviewCorrect,
  onReviewUndo,
  onReviewApproveAll,
  onExceptionRuleChange,
  onReviewStateChange,
  onJobUpdated,
  onReviewApproved,
  onGoToMap,
}: IntegrationGovernanceReviewProps) {
  const [section, setSection] = useState<ReviewSection>("overview");
  const [highlightMappingId, setHighlightMappingId] = useState<string | null>(null);
  const [exceptions, setExceptions] = useState<IntegrationException[]>([]);

  const readiness = useMemo(
    () =>
      computeIntegrationReadiness({
        mappings,
        compileErrors,
        unmatchedSourceColumns,
        unmatchedTargetColumns,
        reviewItems,
      }),
    [mappings, compileErrors, unmatchedSourceColumns, unmatchedTargetColumns, reviewItems]
  );

  useEffect(() => {
    if (!jobId) {
      setExceptions([]);
      return;
    }
    setExceptions(
      deriveIntegrationExceptions({
        jobId,
        compileErrors,
        unmatchedSourceColumns,
        unmatchedTargetColumns,
        reviewItems,
      })
    );
  }, [jobId, compileErrors, unmatchedSourceColumns, unmatchedTargetColumns, reviewItems]);

  const openExceptionCount = exceptions.filter((e) => e.status === "open").length;

  if (mappings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <div className="p-3 bg-slate-100 rounded-2xl">
          <GitBranch className="h-7 w-7 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600">No integration to review yet</p>
        <p className="text-xs text-slate-400 max-w-sm">
          Run <strong>Suggest Mappings</strong> on the Integration Map tab first, then return here to
          assess readiness, resolve exceptions, and obtain approval before production execution.
        </p>
        {onGoToMap && (
          <button
            type="button"
            onClick={onGoToMap}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mt-2"
          >
            Go to Integration Map →
          </button>
        )}
      </div>
    );
  }

  const sections: { id: ReviewSection; label: string; badge?: number }[] = [
    { id: "overview", label: "Readiness & Approval" },
    { id: "mappings", label: "Mapping Review", badge: reviewItems.filter((i) => i.reviewStatus === "pending").length },
    { id: "exceptions", label: "Exceptions", badge: openExceptionCount || undefined },
    { id: "simulation", label: "Simulation" },
  ];

  return (
    <div className="space-y-4">
      {/* Readiness dashboard — always visible */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Integration Readiness
            </p>
            <p className="text-sm text-slate-600">
              Governance review prior to production execution
            </p>
          </div>
          <div className="text-center px-4">
            <p className={cn("text-4xl font-bold tabular-nums", readinessScoreColor(readiness.readinessScore))}>
              {readiness.readinessScore}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Readiness score</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <ReadinessMetric
            icon={Target}
            label="Mapping completeness"
            value={`${readiness.mappingCompleteness}%`}
            detail={`${readiness.requiredMappedCount}/${readiness.requiredTotal} required`}
          />
          <ReadinessMetric
            icon={ShieldCheck}
            label="Validation status"
            value={statusLabel(readiness.validationStatus)}
            statusClass={statusColorClass(readiness.validationStatus)}
            highlight={readiness.validationStatus === "fail"}
          />
          <ReadinessMetric
            icon={Layers}
            label="Transformation status"
            value={statusLabel(readiness.transformationStatus)}
            statusClass={statusColorClass(readiness.transformationStatus)}
          />
          <ReadinessMetric
            icon={CheckCircle2}
            label="Constraint validation"
            value={statusLabel(readiness.constraintValidation)}
            statusClass={statusColorClass(readiness.constraintValidation)}
            highlight={readiness.constraintValidation === "fail"}
          />
          <ReadinessMetric
            icon={Activity}
            label="Exception count"
            value={String(readiness.exceptionCount)}
            highlight={readiness.exceptionCount > 0}
            detail={`${openExceptionCount} open`}
          />
          <ReadinessMetric
            icon={GitBranch}
            label="Failed validations"
            value={String(readiness.failedValidationCount)}
            highlight={readiness.failedValidationCount > 0}
            onClick={
              readiness.failedValidationCount > 0
                ? () => setSection("exceptions")
                : undefined
            }
          />
        </div>

        {readiness.failedValidationCount > 0 && (
          <p className="text-xs text-rose-700 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
            {readiness.failedValidationCount} validation issue
            {readiness.failedValidationCount === 1 ? "" : "s"} detected — failed items are highlighted below.
            Production execution is blocked until approval is complete.
          </p>
        )}
      </div>

      {/* Section navigation */}
      <div className="flex items-center gap-1 flex-wrap bg-slate-100/70 rounded-2xl p-1 w-fit">
        {sections.map(({ id, label, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
              section === id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {label}
            {badge !== undefined && badge > 0 && (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {section === "overview" && jobId && (
        <IntegrationMappingReviewPanel
          jobId={jobId}
          jobLocked={jobLocked}
          compileErrorCount={compileErrors.length}
          reviewSuggestedCount={reviewSuggestedCount}
          unmatchedCount={unmatchedCount}
          refreshTrigger={reviewRefreshNonce}
          onReviewStateChange={onReviewStateChange}
          onJobUpdated={onJobUpdated}
          onReviewApproved={onReviewApproved}
        />
      )}

      {section === "mappings" && (
        <IntegrationMappingReview
          items={reviewItems}
          isReadOnly={isReadOnly}
          onApprove={onReviewApprove}
          onReject={onReviewReject}
          onCorrect={onReviewCorrect}
          onUndo={onReviewUndo}
          onApproveAll={onReviewApproveAll}
          onExceptionRuleChange={onExceptionRuleChange}
          highlightMappingId={highlightMappingId}
          showFailedOnlyToggle
        />
      )}

      {section === "exceptions" && jobId && (
        <IntegrationExceptionsPanel
          jobId={jobId}
          exceptions={exceptions}
          onExceptionsChange={setExceptions}
          onDrillIntoMapping={(mappingId) => {
            setHighlightMappingId(mappingId);
            setSection("mappings");
          }}
        />
      )}

      {section === "simulation" && (
        <IntegrationSimulationPanel workflowId={workflowId} mappings={mappings} jobName={jobName} />
      )}
    </div>
  );
}

function ReadinessMetric({
  icon: Icon,
  label,
  value,
  detail,
  statusClass,
  highlight,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail?: string;
  statusClass?: string;
  highlight?: boolean;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-left transition-all",
        highlight ? "border-rose-200 bg-rose-50/50 ring-1 ring-rose-100" : "border-slate-200 bg-white",
        onClick && "hover:border-indigo-300 cursor-pointer"
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("h-3 w-3", highlight ? "text-rose-500" : "text-slate-400")} />
        <p className="text-[9px] text-slate-400 uppercase tracking-wide font-medium leading-tight">{label}</p>
      </div>
      {statusClass ? (
        <Badge variant="outline" className={cn("text-[10px] rounded-full font-semibold", statusClass)}>
          {value}
        </Badge>
      ) : (
        <p className={cn("text-lg font-bold tabular-nums", highlight ? "text-rose-600" : "text-slate-800")}>
          {value}
        </p>
      )}
      {detail && <p className="text-[9px] text-slate-400 mt-0.5">{detail}</p>}
    </Wrapper>
  );
}
