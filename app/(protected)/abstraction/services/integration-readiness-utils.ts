import type { IntegrationColumnMapping } from "@/app/(protected)/data-room/integrations/services/data-integration-api";
import type { IntegrationCompileError } from "@/app/(protected)/data-room/integrations/services/integration-error-utils";
import type { MappingReviewItem } from "../components/integration-mapping-review";

export interface IntegrationReadinessMetrics {
  mappingCompleteness: number;
  validationStatus: "pass" | "warn" | "fail";
  transformationStatus: "pass" | "warn" | "fail";
  constraintValidation: "pass" | "warn" | "fail";
  exceptionCount: number;
  readinessScore: number;
  mappedCount: number;
  requiredMappedCount: number;
  requiredTotal: number;
  transformCount: number;
  failedValidationCount: number;
}

export function computeIntegrationReadiness(options: {
  mappings: IntegrationColumnMapping[];
  compileErrors: IntegrationCompileError[];
  unmatchedSourceColumns: string[];
  unmatchedTargetColumns: string[];
  reviewItems: MappingReviewItem[];
}): IntegrationReadinessMetrics {
  const {
    mappings,
    compileErrors,
    unmatchedSourceColumns,
    unmatchedTargetColumns,
    reviewItems,
  } = options;

  const mappedCount = mappings.length;
  const requiredMappings = mappings.filter((m) => m.is_required);
  const requiredTotal = requiredMappings.length || mappings.length;
  const requiredMappedCount = requiredMappings.filter((m) => m.source_column?.trim()).length;
  const mappingCompleteness =
    requiredTotal > 0 ? Math.round((requiredMappedCount / requiredTotal) * 100) : mappedCount > 0 ? 100 : 0;

  const transformCount = mappings.filter((m) => m.transformation?.trim()).length;
  const transformRatio = mappedCount > 0 ? transformCount / mappedCount : 0;
  const transformationStatus: IntegrationReadinessMetrics["transformationStatus"] =
    mappedCount === 0 ? "fail" : transformRatio >= 0.5 || transformCount === 0 ? "pass" : "warn";

  const constraintIssues =
    compileErrors.length +
    reviewItems.filter((i) => i.hasConstraintViolation || i.hasTypeMismatch).length;
  const constraintValidation: IntegrationReadinessMetrics["constraintValidation"] =
    compileErrors.length > 0 ? "fail" : constraintIssues > 0 ? "warn" : "pass";

  const validationFailures =
    compileErrors.length +
    unmatchedSourceColumns.length +
    unmatchedTargetColumns.length +
    reviewItems.filter(
      (i) =>
        i.reviewStatus === "rejected" ||
        i.matchConfidence === "unmatched" ||
        i.hasTypeMismatch ||
        i.hasConstraintViolation
    ).length;

  const validationStatus: IntegrationReadinessMetrics["validationStatus"] =
    compileErrors.length > 0 || validationFailures > 3
      ? "fail"
      : validationFailures > 0
        ? "warn"
        : "pass";

  const exceptionCount =
    compileErrors.length +
    unmatchedSourceColumns.length +
    unmatchedTargetColumns.length +
    reviewItems.filter(
      (i) =>
        i.reviewStatus === "rejected" ||
        i.hasTypeMismatch ||
        i.hasConstraintViolation ||
        i.matchConfidence === "unmatched"
    ).length;

  const failedValidationCount = validationFailures;

  const completenessWeight = 0.35;
  const validationWeight = 0.3;
  const constraintWeight = 0.2;
  const reviewWeight = 0.15;

  const validationScore =
    validationStatus === "pass" ? 100 : validationStatus === "warn" ? 60 : 20;
  const constraintScore =
    constraintValidation === "pass" ? 100 : constraintValidation === "warn" ? 55 : 15;
  const transformScore =
    transformationStatus === "pass" ? 100 : transformationStatus === "warn" ? 70 : 30;
  const reviewApprovedRatio =
    reviewItems.length > 0
      ? reviewItems.filter((i) => i.reviewStatus === "approved" || i.reviewStatus === "corrected")
          .length / reviewItems.length
      : mappedCount > 0
        ? 0.5
        : 0;
  const reviewScore = Math.round(reviewApprovedRatio * 100);

  const readinessScore = Math.round(
    mappingCompleteness * completenessWeight +
      validationScore * validationWeight +
      constraintScore * constraintWeight +
      Math.max(reviewScore, transformScore) * reviewWeight
  );

  return {
    mappingCompleteness,
    validationStatus,
    transformationStatus,
    constraintValidation,
    exceptionCount,
    readinessScore: Math.min(100, Math.max(0, readinessScore)),
    mappedCount,
    requiredMappedCount,
    requiredTotal,
    transformCount,
    failedValidationCount,
  };
}

export function statusLabel(status: "pass" | "warn" | "fail"): string {
  switch (status) {
    case "pass":
      return "Pass";
    case "warn":
      return "Warning";
    case "fail":
      return "Failed";
  }
}

export function statusColorClass(status: "pass" | "warn" | "fail"): string {
  switch (status) {
    case "pass":
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "warn":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "fail":
      return "text-rose-700 bg-rose-50 border-rose-200";
  }
}

export function readinessScoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}
