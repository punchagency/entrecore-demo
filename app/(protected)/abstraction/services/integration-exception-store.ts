import {
  getCompileErrorMappingRefs,
  type IntegrationCompileError,
} from "@/app/(protected)/data-room/integrations/services/integration-error-utils";
import type { MappingReviewItem } from "../components/integration-mapping-review";

export type IntegrationExceptionStatus = "open" | "in_review" | "resolved" | "approved_exception";

export type IntegrationExceptionSeverity = "critical" | "high" | "medium" | "low";

export interface IntegrationException {
  id: string;
  sourceRecord: string;
  failureReason: string;
  validationRule: string;
  severity: IntegrationExceptionSeverity;
  suggestedRemediation: string;
  status: IntegrationExceptionStatus;
  mappingId?: string;
  targetColumn?: string;
  sourceColumn?: string;
}

export interface IntegrationExceptionAuditEntry {
  id: string;
  exceptionId: string;
  timestamp: string;
  actor: string;
  action: string;
  previousStatus?: IntegrationExceptionStatus;
  newStatus?: IntegrationExceptionStatus;
  note?: string;
}

const EXCEPTIONS_KEY = (jobId: string) => `integration-exceptions-${jobId}`;
const AUDIT_KEY = (jobId: string) => `integration-exception-audit-${jobId}`;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadStoredExceptions(jobId: string): IntegrationException[] {
  return readJson<IntegrationException[]>(EXCEPTIONS_KEY(jobId), []);
}

export function saveStoredExceptions(jobId: string, exceptions: IntegrationException[]): void {
  writeJson(EXCEPTIONS_KEY(jobId), exceptions);
}

export function loadExceptionAuditLog(jobId: string): IntegrationExceptionAuditEntry[] {
  return readJson<IntegrationExceptionAuditEntry[]>(AUDIT_KEY(jobId), []);
}

function appendAuditEntry(jobId: string, entry: Omit<IntegrationExceptionAuditEntry, "id">): void {
  const log = loadExceptionAuditLog(jobId);
  log.unshift({ ...entry, id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` });
  writeJson(AUDIT_KEY(jobId), log.slice(0, 200));
}

export function updateExceptionStatus(
  jobId: string,
  exceptionId: string,
  status: IntegrationExceptionStatus,
  actor: string,
  note?: string
): IntegrationException[] {
  const exceptions = loadStoredExceptions(jobId);
  const next = exceptions.map((ex) => {
    if (ex.id !== exceptionId) return ex;
    appendAuditEntry(jobId, {
      exceptionId,
      timestamp: new Date().toISOString(),
      actor,
      action: "status_change",
      previousStatus: ex.status,
      newStatus: status,
      note,
    });
    return { ...ex, status };
  });
  saveStoredExceptions(jobId, next);
  return next;
}

function severityFromCompileError(code: string): IntegrationExceptionSeverity {
  if (code.includes("NOT_NULL") || code.includes("PK") || code.includes("REQUIRED")) return "critical";
  if (code.includes("TYPE") || code.includes("FORMULA")) return "high";
  return "medium";
}

export function deriveIntegrationExceptions(options: {
  jobId: string;
  compileErrors: IntegrationCompileError[];
  unmatchedSourceColumns: string[];
  unmatchedTargetColumns: string[];
  reviewItems: MappingReviewItem[];
}): IntegrationException[] {
  const stored = loadStoredExceptions(options.jobId);
  const storedById = new Map(stored.map((e) => [e.id, e]));
  const derived: IntegrationException[] = [];

  options.compileErrors.forEach((error, index) => {
    const refs = getCompileErrorMappingRefs([error]);
    const ref = refs[0];
    const fieldMatch = error.message.match(/destination_column '([^']+)'/);
    const targetColumn = ref?.destinationColumn ?? fieldMatch?.[1];
    const id = `compile-${error.code}-${index}`;
    derived.push({
      id,
      sourceRecord: ref ? `${ref.sourceColumn} → ${ref.destinationColumn}` : "mapping",
      failureReason: error.message,
      validationRule: error.code,
      severity: severityFromCompileError(error.code),
      suggestedRemediation:
        error.code.includes("FORMULA") || error.code.includes("READ_ONLY")
          ? "Remove mapping to read-only or formula destination fields."
          : "Edit mapping or adjust transformation to satisfy compile constraints.",
      status: storedById.get(id)?.status ?? "open",
      sourceColumn: ref?.sourceColumn,
      targetColumn,
    });
  });

  options.unmatchedSourceColumns.forEach((col, index) => {
    const id = `unmatched-src-${col}-${index}`;
    derived.push({
      id,
      sourceRecord: col,
      failureReason: `Source column "${col}" has no target mapping.`,
      validationRule: "mapping_completeness",
      severity: "medium",
      suggestedRemediation: "Map to a destination column or exclude from integration scope.",
      status: storedById.get(id)?.status ?? "open",
      sourceColumn: col,
    });
  });

  options.unmatchedTargetColumns.forEach((col, index) => {
    const id = `unmatched-tgt-${col}-${index}`;
    derived.push({
      id,
      sourceRecord: "(no source)",
      failureReason: `Required target column "${col}" is unmapped.`,
      validationRule: "required_field_coverage",
      severity: "high",
      suggestedRemediation: "Add a source mapping or set a default value for this target field.",
      status: storedById.get(id)?.status ?? "open",
      targetColumn: col,
    });
  });

  options.reviewItems.forEach((item) => {
    if (!item.hasTypeMismatch && !item.hasConstraintViolation && item.matchConfidence !== "unmatched")
      return;
    const id = `review-${item.id}`;
    derived.push({
      id,
      sourceRecord: item.sourceColumn,
      failureReason:
        item.constraintNote ??
        (item.hasTypeMismatch
          ? `Type mismatch${item.typeCast ? ` (${item.typeCast})` : ""}.`
          : "Mapping requires manual review."),
      validationRule: item.hasConstraintViolation ? "constraint_validation" : "type_compatibility",
      severity: item.isRequired ? "high" : "medium",
      suggestedRemediation: item.hasTypeMismatch
        ? "Add a cast transformation or correct the target column mapping."
        : "Review mapping confidence and approve, correct, or reject.",
      status: storedById.get(id)?.status ?? "open",
      mappingId: item.id,
      sourceColumn: item.sourceColumn,
      targetColumn: item.targetColumn,
    });
  });

  if (derived.length > 0) saveStoredExceptions(options.jobId, derived);
  return derived;
}
