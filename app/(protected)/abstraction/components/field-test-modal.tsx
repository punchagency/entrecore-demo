"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, FileText, FlaskConical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractionResult } from "@/app/store/abstractionStore";
import {
  testExtraction,
  type TestExtractionResponse,
} from "../services/ocr-api";
import { formatExtractionValue } from "../utils/extraction-map-utils";

interface FieldTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  docId: string;
  configId?: string | null;
  extractions: ExtractionResult[];
  entityMap: Map<string, { name: string; color: string; type?: string; description?: string }>;
}

function truncateText(text: string, maxLength = 96): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

function parseFieldMap(fieldMap: unknown): unknown {
  if (typeof fieldMap === "string") {
    try {
      return JSON.parse(fieldMap);
    } catch {
      return fieldMap;
    }
  }
  return fieldMap;
}

function getEntityEntry(parsedMap: unknown, entityName: string): unknown {
  if (parsedMap == null || typeof parsedMap !== "object" || Array.isArray(parsedMap)) {
    return parsedMap;
  }

  const record = parsedMap as Record<string, unknown>;
  return (
    record[entityName] ??
    Object.entries(record).find(([key]) => key.toLowerCase() === entityName.toLowerCase())?.[1]
  );
}

function formatEntityResult(entityName: string, entityEntry: unknown): string {
  if (entityEntry === undefined) {
    return `Field: ${entityName}\nNo extraction result returned for this field.`;
  }

  return [`Field: ${entityName}`, "Result:", JSON.stringify(entityEntry, null, 2)].join("\n");
}

function formatTestResults(
  response: TestExtractionResponse,
  entityNames: string[]
): string {
  const parsedMap = parseFieldMap(response.field_map);
  const header = [
    `Document status: ${response.document_status || "—"}`,
    `Extracted at: ${
      response.extraction_at
        ? new Date(response.extraction_at).toLocaleString()
        : "—"
    }`,
    `Fields tested: ${entityNames.length}`,
    "",
  ];

  const sections = entityNames.map((entityName) => {
    const entityEntry = getEntityEntry(parsedMap, entityName);
    return formatEntityResult(entityName, entityEntry);
  });

  return [...header, ...sections].join("\n\n");
}

function getErrorMessage(error: unknown): string {
  const err = error as {
    response?: { status?: number; data?: { detail?: unknown } };
    message?: string;
  };

  if (err.response?.status === 404) {
    return "Process document with OCR/any reader to stage structured data.";
  }

  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg ?? String(item)).join("; ");
  }

  return err.message || "Test extraction failed.";
}

export function FieldTestModal({
  open,
  onOpenChange,
  fileName,
  docId,
  configId,
  extractions,
  entityMap,
}: FieldTestModalProps) {
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(new Set());
  const [resultText, setResultText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const sortedExtractions = useMemo(() => {
    // A multi-record document (e.g. an invoice with several line items)
    // re-extracts the same entity once per record, so `extractions` can
    // carry several ExtractionResults that share an entityId but differ
    // only by which record they came from. This field picker tests by
    // entity name, not by record, so only the first occurrence of each
    // entityId is kept — otherwise the same field shows up repeated.
    const seenEntityIds = new Set<string>();
    const uniqueByEntity = extractions.filter((extraction) => {
      if (seenEntityIds.has(extraction.entityId)) return false;
      seenEntityIds.add(extraction.entityId);
      return true;
    });

    return uniqueByEntity.sort((a, b) => {
      const nameA = entityMap.get(a.entityId)?.name ?? a.entityId;
      const nameB = entityMap.get(b.entityId)?.name ?? b.entityId;
      return nameA.localeCompare(nameB);
    });
  }, [extractions, entityMap]);

  useEffect(() => {
    if (!open) {
      setSelectedFieldIds(new Set());
      setResultText("");
      setErrorText(null);
      setIsLoading(false);
    }
  }, [open]);

  const toggleFieldSelection = useCallback((fieldId: string) => {
    setSelectedFieldIds((current) => {
      const next = new Set(current);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  }, []);

  const runTestForSelection = useCallback(
    async (fieldIdsOverride?: Iterable<string>) => {
      const targetFieldIds = fieldIdsOverride
        ? Array.from(fieldIdsOverride)
        : Array.from(selectedFieldIds);

      if (targetFieldIds.length === 0) return;

      const entityNames = targetFieldIds
        .map((fieldId) => {
          const extraction = sortedExtractions.find((item) => item.id === fieldId);
          if (!extraction) return null;
          return entityMap.get(extraction.entityId)?.name ?? extraction.entityId;
        })
        .filter((name): name is string => Boolean(name));

      if (entityNames.length === 0) return;

      if (!configId) {
        setErrorText("No OCR configuration is linked to this document.");
        setResultText("");
        return;
      }

      setIsLoading(true);
      setErrorText(null);
      setResultText("");

      try {
        const response = await testExtraction({
          doc_id: docId,
          config_id: configId,
          entity_names: entityNames,
          include_corrections: true,
          evaluate_clauses: true,
        });
        setResultText(formatTestResults(response, entityNames));
      } catch (error) {
        setErrorText(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [configId, docId, entityMap, selectedFieldIds, sortedExtractions]
  );

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || isLoading) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-field-test-ignore-enter]")) return;
      event.preventDefault();
      void runTestForSelection();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isLoading, runTestForSelection]);

  const selectedCount = selectedFieldIds.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-slate-100 px-6 py-4 text-left">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <FileText className="h-5 w-5 text-violet-600" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-bold text-slate-900" title={fileName}>
                {fileName}
              </DialogTitle>
              <DialogDescription className="mt-1 line-clamp-2 text-xs text-slate-500">
                Select one or more fields, then press Enter to run a read-only extraction test.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-slate-100 px-6 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Fields ({sortedExtractions.length})
              </p>
              <div className="flex items-center gap-2">
                {selectedCount > 0 && (
                  <Badge variant="outline" className="rounded-full text-[10px]">
                    {selectedCount} selected
                  </Badge>
                )}
                <Badge variant="outline" className="rounded-full text-[10px]">
                  Enter to test
                </Badge>
              </div>
            </div>
          </div>

          <div
            ref={listRef}
            className="max-h-[240px] overflow-y-auto px-4 py-3 scrollbar-hide"
            role="listbox"
            aria-label="Extracted fields"
            aria-multiselectable="true"
          >
            {sortedExtractions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <FlaskConical className="h-6 w-6 text-slate-300" />
                <p className="text-sm text-slate-500">No extracted fields for this document.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {sortedExtractions.map((extraction) => {
                  const entity = entityMap.get(extraction.entityId);
                  const label = entity?.name ?? extraction.entityId;
                  const preview =
                    entity?.description ||
                    formatExtractionValue(extraction.correctedValue || extraction.value) ||
                    "—";
                  const isSelected = selectedFieldIds.has(extraction.id);

                  return (
                    <button
                      key={extraction.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={isLoading}
                      onClick={() => toggleFieldSelection(extraction.id)}
                      onDoubleClick={() => {
                        void runTestForSelection([extraction.id]);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                        isSelected
                          ? "border-violet-300 bg-violet-50 ring-1 ring-violet-200"
                          : "border-slate-100 bg-white hover:border-violet-200 hover:bg-slate-50",
                        isLoading && "opacity-60"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          isSelected
                            ? "border-violet-500 bg-violet-500 text-white"
                            : "border-slate-300 bg-white"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: entity?.color ?? "#94a3b8" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm font-semibold text-slate-800"
                          title={label}
                        >
                          {label}
                        </p>
                        <p
                          className="mt-0.5 line-clamp-2 text-xs text-slate-500"
                          title={preview}
                        >
                          {truncateText(preview, 120)}
                        </p>
                      </div>
                      {extraction.pageNumber != null && (
                        <span className="shrink-0 pt-0.5 text-[10px] text-slate-400">
                          p.{extraction.pageNumber}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Result
            </p>
            <div
              className={cn(
                "min-h-[140px] max-h-[280px] overflow-y-auto rounded-xl border bg-white p-4 shadow-inner scrollbar-hide",
                errorText
                  ? "border-rose-200"
                  : resultText
                    ? "border-violet-200"
                    : "border-slate-200 border-dashed"
              )}
            >
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running extraction test...
                </div>
              ) : errorText ? (
                <div className="flex items-start gap-2 text-sm text-rose-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{errorText}</p>
                </div>
              ) : resultText ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-700">
                  {resultText}
                </pre>
              ) : (
                <p className="text-sm text-slate-400">
                  Select one or more fields above and press Enter to run the extraction test.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
