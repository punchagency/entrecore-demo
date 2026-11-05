import type { OcrFetchedDocument } from "../services/ocr-api";

export interface ComputedPipelineMetrics {
  successRate: number | null;
  recordsProcessed: number;
  processingTimeMs: number | null;
  errorRate: number | null;
  hasData: boolean;
}

export function computePipelineMetrics(
  documents: OcrFetchedDocument[]
): ComputedPipelineMetrics {
  const safeDocuments = documents.filter(
    (doc): doc is OcrFetchedDocument => doc != null && typeof doc.id === "string"
  );
  const total = safeDocuments.length;
  if (total === 0) {
    return {
      successRate: null,
      recordsProcessed: 0,
      processingTimeMs: null,
      errorRate: null,
      hasData: false,
    };
  }

  const completed = safeDocuments.filter((d) => d.status === "completed").length;
  const failed = safeDocuments.filter((d) => d.status === "failed").length;
  const withAccuracy = safeDocuments.filter(
    (d) => typeof d.ocrAccuracy === "number" && d.ocrAccuracy > 0
  );

  const successRate =
    withAccuracy.length > 0
      ? withAccuracy.reduce((sum, d) => sum + (d.ocrAccuracy ?? 0), 0) / withAccuracy.length
      : (completed / total) * 100;

  const errorRate = (failed / total) * 100;

  return {
    successRate,
    recordsProcessed: total,
    processingTimeMs: null,
    errorRate,
    hasData: true,
  };
}

export function formatMetricPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

export function formatMetricCount(value: number): string {
  return String(value);
}

export function formatProcessingTime(ms: number | null): string {
  if (ms === null || ms <= 0) return "—";
  return `${Math.round(ms)}ms`;
}
