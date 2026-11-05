"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Pencil,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Clock,
  Save,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Undo2,
  Zap,
  Loader2,
  FlaskConical,
  Plus,
  X,
  // @ts-ignore
} from "lucide-react";
import { toast } from "sonner";
import {
  useAbstractionStore,
  AbstractionDocument,
  ExtractionResult,
  EntityDefinition,
} from "@/app/store/abstractionStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  extractWorkflowRunId,
  fetchAllOcrDocuments,
  fetchOcrDocument,
  isWorkflowRunIdError,
  listOcrConfigurations,
  OcrConfiguration,
  submitHumanReview,
  submitOcrReview,
} from "../services/ocr-api";
import { fetchCompanyConnectors, ConnectorConfig } from "../../workflows/services/integration-api";
import { useCompaniesStore } from "@/app/store/companiesStore";
import dynamic from "next/dynamic";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Annotation } from "@/components/document-viewer";
import { StyledDocumentPreview, isLeaseStyledPreviewDocument } from "./styled-document-preview";
import { FieldTestModal } from "./field-test-modal";
import {
  hasHighlightBbox,
  hasCellPosition,
  getExtractionSearchPhrase,
  formatExtractionValue,
  extractionValuesEqual,
} from "../utils/extraction-map-utils";
import { showApiErrorToast } from "@/utils/api-error";

const VALID_ENTITY_DATA_TYPES: EntityDefinition["dataType"][] = [
  "text",
  "long_text",
  "single_select",
  "multi_select",
  "boolean",
  "date",
  "currency",
  "integer",
  "float",
];

/** Mirrors document-pipeline.tsx's/protocol-editor.tsx's mapConfigToProtocol.
 * Human Review needs its own copy of this fetch: it's reachable directly (a
 * tab click, a deep link, a refresh) without either of those components ever
 * mounting first, so `protocols` in the store can be empty here with no
 * visible error — it just silently disables entity-dataType-dependent UI
 * like the multi_select chip widget. Confirmed via runtime debug log:
 * protocolsCount: 0 when Human Review is reached this way. */
function mapConfigToProtocol(config: OcrConfiguration) {
  return {
    id: config.id || config.name,
    name: config.name,
    description: config.description,
    entities: (config.entities_config || []).map((e, index) => ({
      id: `e-${config.id || config.name}-${index}`,
      name: e.name,
      description: e.description,
      type: "custom" as const,
      dataType: (VALID_ENTITY_DATA_TYPES as readonly string[]).includes(e.dataType)
        ? (e.dataType as EntityDefinition["dataType"])
        : "text",
      options: e.optionList ?? [],
      dataSource: e.dataSource ?? undefined,
      defaultValue: e.defaultValue ?? "",
      // Unused by this view, but these protocols land in the shared store the
      // protocol editor deploys from — dropping it here would wipe the flag
      // off any config saved after Human Review populated the store.
      isRecordKey: e.isRecordKey ?? false,
      required: false,
      color: `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`,
    })),
    clauses: Object.entries(config.clauses_config || {}).map(([name, description], index) => ({
      id: `c-${config.id || config.name}-${index}`,
      name,
      description,
      type: "custom" as const,
      keywords: [],
      color: `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    documentCount: 0,
  };
}

function stripReviewTagFromComment(
  comment: string | undefined,
  status: "reviewed" | "corrected"
): string | undefined {
  if (comment == null) return comment;
  if (status === "reviewed") return comment.replace(/ \[REVIEWED]$/, "");
  const marker = " [CORRECTED: ";
  const idx = comment.lastIndexOf(marker);
  if (idx !== -1) return comment.slice(0, idx);
  return comment;
}

const DocumentViewer = dynamic(() => import("@/components/document-viewer"), {
  ssr: false,
});

function getConfidenceConfig(confidence: number) {
  if (confidence >= 0.95)
    return {
      label: "High",
      color: "text-emerald-600",
      bg: "bg-emerald-500",
      ring: "ring-emerald-200",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  if (confidence >= 0.85)
    return {
      label: "Medium",
      color: "text-blue-600",
      bg: "bg-blue-500",
      ring: "ring-blue-200",
      badge: "bg-blue-50 text-blue-700 border-blue-200",
    };
  if (confidence >= 0.7)
    return {
      label: "Low",
      color: "text-amber-600",
      bg: "bg-amber-500",
      ring: "ring-amber-200",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
    };
  return {
    label: "Very Low",
    color: "text-red-600",
    bg: "bg-red-500",
    ring: "ring-red-200",
    badge: "bg-red-50 text-red-700 border-red-200",
  };
}

const STATUS_STYLES: Record<
  ExtractionResult["status"],
  { label: string; color: string; bg: string }
> = {
  auto: { label: "Auto-extracted", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  reviewed: {
    label: "Reviewed ✓",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
  },
  corrected: { label: "Corrected", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  rejected: { label: "Rejected", color: "text-red-600", bg: "bg-red-50 border-red-200" },
  review: { label: "Needs Review", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
};

interface ReviewDocumentLabelProps {
  name: string;
  className?: string;
}

function ReviewDocumentLabel({ name, className }: ReviewDocumentLabelProps) {
  return (
    <span className={cn("block truncate", className)} title={name}>
      {name}
    </span>
  );
}

interface MultiSelectEditorProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}

/** Constrained checkbox picker for a multi_select entity's value — a human
 * toggles real options instead of typing free text, so a correction can
 * never break the array shape (no delimiter to preserve). Also carries an
 * input+add row (same affordance as MultiSelectTagEditor) so a reviewer can
 * still add a value the admin's option list didn't anticipate — it renders
 * as one more checkable item, not a separate freeform text field. */
function MultiSelectEditor({ options, value, onChange }: MultiSelectEditorProps) {
  const [draft, setDraft] = useState("");

  const toggle = (option: string, checked: boolean) => {
    if (checked) {
      if (!value.includes(option)) onChange([...value, option]);
    } else {
      onChange(value.filter((v) => v !== option));
    }
  };

  const addDraft = () => {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  };

  // A value added via the input below won't be in `options` — still render
  // it as a checked item so the reviewer can see and un-toggle it, same as
  // any configured option.
  const displayOptions = [...options, ...value.filter((v) => !options.includes(v))];

  return (
    <div className="flex flex-1 flex-col gap-2 rounded-lg border border-slate-200 p-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {displayOptions.map((option) => (
          <label key={option} className="flex items-center gap-1.5 text-sm text-slate-700">
            <Checkbox
              checked={value.includes(option)}
              onCheckedChange={(checked) => toggle(option, checked === true)}
            />
            {option}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
          placeholder="Add a value…"
          className="h-7 text-xs rounded-md"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={addDraft}
          className="h-7 w-7 p-0 shrink-0 rounded-md hover:bg-emerald-50 hover:text-emerald-600"
          aria-label="Add value"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface MultiSelectTagEditorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

/** Free-form chip/tag editor for a multi_select entity that has no static
 * option list — e.g. a Data Source-driven field. Unlike MultiSelectEditor,
 * this never fetches the Data Source's full set of possible values (that
 * could be an unbounded/expensive query); it only shows the currently
 * selected values as removable chips, plus a text input to add new ones. */
function MultiSelectTagEditor({ value, onChange }: MultiSelectTagEditorProps) {
  const [draft, setDraft] = useState("");

  const addDraft = () => {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  };

  const remove = (v: string) => onChange(value.filter((item) => item !== v));

  return (
    <div className="flex flex-1 flex-col gap-1.5 rounded-lg border border-slate-200 p-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((v) => (
            <Badge
              key={v}
              variant="outline"
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border-slate-200 bg-slate-50 text-slate-700"
            >
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                className="hover:text-red-600"
                aria-label={`Remove ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
          placeholder="Add a value…"
          className="h-7 text-xs rounded-md"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={addDraft}
          className="h-7 w-7 p-0 shrink-0 rounded-md hover:bg-emerald-50 hover:text-emerald-600"
          aria-label="Add value"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Read-only chip display for a multi_select value. */
function MultiSelectChips({ value }: { value: string[] }) {
  if (value.length === 0) {
    return <p className="text-sm text-slate-400">N/A</p>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {value.map((v) => (
        <Badge
          key={v}
          variant="outline"
          className="text-xs px-2 py-0.5 rounded-full border-slate-200 bg-slate-50 text-slate-700"
        >
          {v}
        </Badge>
      ))}
    </div>
  );
}

export function HumanReview() {
  const {
    documents,
    extractions,
    protocols,
    activeProtocolId,
    selectedDocumentId,
    setSelectedDocument,
    updateExtraction,
    updateDocument,
    availableConnectors,
    selectedConnectorId,
    setAvailableConnectors,
    setSelectedConnector,
    transformMappings,
    setProtocols,
  } = useAbstractionStore();

  const { companies } = useCompaniesStore();
  const companyId = localStorage.getItem("selectedCompanyId") || companies[0]?.id;
  const pendingScrollId = useRef<string | null>(null);
  const pendingTargetPage = useRef<number | null>(null);

  // Human Review can be reached directly (tab click, deep link, refresh)
  // without the Pipeline or Protocol tabs ever mounting — those are the only
  // other places that populate `protocols`. Without this, entity dataType/
  // options lookups (e.g. the multi_select chip widget) silently no-op
  // because there's nothing in the store to find, regardless of which
  // protocol id is being searched for.
  useEffect(() => {
    listOcrConfigurations()
      .then((configs) => {
        if (Array.isArray(configs) && configs.length > 0) {
          setProtocols(configs.map(mapConfigToProtocol));
        }
      })
      .catch((error) => {
        console.error("[OCR Review] Failed to load configurations:", error);
        showApiErrorToast(error, "Couldn't load protocol configurations", { id: "review-configs" });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fieldRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const documentViewerRef = useRef<{
    scrollToAnnotation: (id: string) => void;
    scrollToPage: () => void;
    scrollToTextHighlight: () => void;
    isReady: (expectedPage?: number) => boolean;
  }>(null);

  // Load connectors
  useEffect(() => {
    if (companyId) {
      fetchCompanyConnectors(companyId).then((connectors) => {
        setAvailableConnectors(connectors);
        if (connectors.length > 0 && !selectedConnectorId) {
          const connector = connectors.find((item) => item.erp_type === "bigquery");
          connector && setSelectedConnector(connector.id);
        }
      });
    }
  }, [companyId, setAvailableConnectors, setSelectedConnector, selectedConnectorId]);

  const [backendReviewDocs, setBackendReviewDocs] = useState<AbstractionDocument[]>([]);
  const reviewDocs = useMemo(() => {
    const merged = [...documents];
    backendReviewDocs.forEach((doc) => {
      if (!merged.some((localDoc) => localDoc.id === doc.id)) merged.push(doc);
    });
    return merged
      .filter((doc) => doc.status === "review" || doc.status === "completed")
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }, [backendReviewDocs, documents]);

  const currentDoc = reviewDocs.find((d) => d.id === selectedDocumentId) || reviewDocs[0];
  // Resolve via the document's OWN protocol (config_id, mapped to protocolId
  // by fetchAllOcrDocuments) — NEVER fall back to the globally "active"
  // protocol. activeProtocolId reflects whatever was last selected in the
  // Protocol editor or Pipeline tab elsewhere in the app, with no guaranteed
  // relationship to whichever document is being reviewed here. Falling back
  // to it would silently show/submit a WRONG protocol's entity dataType —
  // e.g. get_updated_mappings (backend) overwrites every field's stored
  // value with whatever the client sends on every Complete Review, even for
  // untouched fields, so a wrong dataType here can silently corrupt an
  // already-correct multi_select array back into a flattened string. Failing
  // to `undefined` instead means every dataType-dependent path (the
  // multi_select widgets, the array-preserving transform) correctly treats
  // this document as "protocol unresolved" rather than guessing.
  const protocol = currentDoc?.protocolId
    ? protocols.find((p) => p.id === currentDoc.protocolId)
    : undefined;
  // True once we can be confident entity dataType info for THIS document is
  // either correctly loaded, or genuinely doesn't apply (no protocolId at
  // all — legacy/malformed document, nothing to resolve against anyway).
  // False only in the dangerous window: protocolId exists but hasn't
  // resolved against `protocols` yet (still loading, or a real mismatch) —
  // that's exactly the state Complete Review must not submit from.
  const protocolResolutionSafe = !currentDoc?.protocolId || Boolean(protocol);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string | string[]>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileType, setFileType] = useState<"text" | "pdf" | "csv" | "image">("text");
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [highlightSearchText, setHighlightSearchText] = useState<string | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const [loadedDocument, setLoadedDocument] = useState<Record<string, any> | null>({});

  const stableUrl = useMemo(
    () => loadedDocument?.document_url,
    [loadedDocument?.id] // ← key on ID not the URL itself
  );

  useEffect(() => {
    const getFileType = () => {
      // console.log({ loadedDocument });

      if (loadedDocument?.mappings && process.env.NODE_ENV === "development") {
        try {
          console.debug("[OCR Review] mappings", JSON.parse(loadedDocument.mappings));
        } catch {
          /* ignore */
        }
      }
      if (loadedDocument?.document_type === "application/pdf") return "pdf";
      if (String(loadedDocument?.document_type).trim().startsWith("image")) return "image";
      if (String(loadedDocument?.document_type).trim().endsWith("csv")) return "csv";
      return "text";
    };

    setFileType(getFileType());

    if (!loadedDocument?.mappings) return;

    const docId = String(currentDoc?.id ?? loadedDocument.document_id ?? loadedDocument.id ?? "");
    if (!docId) return;

    let uiMappings: unknown = loadedDocument.ui_mappings;
    if (typeof uiMappings === "string") {
      try {
        uiMappings = JSON.parse(uiMappings);
      } catch {
        uiMappings = [];
      }
    }

    // Pass this document's own protocol explicitly — loadedDocument.config_id
    // (raw from the fetch-document response) is the most direct source, with
    // currentDoc.protocolId (same value, from the document list fetch) as a
    // fallback. Without this, transformMappings falls back to the globally
    // "active" protocol, which may not be the one this document belongs to.
    transformMappings(
      loadedDocument.mappings,
      docId,
      Array.isArray(uiMappings) ? uiMappings : [],
      loadedDocument.config_id ?? currentDoc?.protocolId
    );
    // `protocols` is a dependency on purpose: the config fetch (a separate
    // effect) and this one race independently. If protocols finishes loading
    // AFTER this effect already ran once, docExtractions would otherwise
    // stay built from the empty-entityDataType pass forever — a multi_select
    // array flattened to a string at that first pass, with nothing to ever
    // recompute it. Re-running once protocols populates (or changes) closes
    // that gap; transformMappings is idempotent so the extra call is cheap.
  }, [currentDoc?.id, currentDoc?.protocolId, loadedDocument, transformMappings, protocols]);

  // currentDoc already merges the Zustand `documents` store with
  // `backendReviewDocs` (see `reviewDocs` above), so its own `status` is the
  // authoritative source — checking `documents` directly missed documents
  // that only exist in `backendReviewDocs` (the normal case when Human
  // Review is reached directly, since updateDocument() is a no-op for ids
  // it doesn't already have), leaving the button stuck on "Complete Review"
  // after a successful submit. loadedDocument?.status is kept as a fallback
  // for a hard refresh, where it reflects the backend's persisted status.
  const isCompleted = useMemo(
    () => currentDoc?.status === "completed" || loadedDocument?.status === "completed",
    [currentDoc?.status, loadedDocument?.status]
  );

  useEffect(() => {
    const loadAllDocuments = async () => {
      try {
        const docs = await fetchAllOcrDocuments();
        if (!docs?.length) return;

        const normalized: AbstractionDocument[] = docs
          .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc?.id))
          .map((doc) => {
            const protocol = protocols.find((p) => p.id === doc.protocolId);
            return {
              id: doc.id,
              name: doc.name,
              type: doc.type ?? "pdf",
              size: doc.size ?? 0,
              uploadedAt: doc.uploadedAt ?? new Date().toISOString(),
              status: doc.status ?? "review",
              ocrAccuracy: doc.ocrAccuracy,
              pageCount: doc.pageCount,
              sourceUrl: doc.sourceUrl,
              protocolId: doc.protocolId,
              protocolName: protocol?.name || doc.protocolName,
              workflowRunId: doc.workflowRunId,
            };
          });

        setBackendReviewDocs(normalized);
      } catch (error) {
        console.error("[OCR] Failed to fetch documents list:", error);
        showApiErrorToast(error, "Couldn't load the documents to review", { id: "review-documents" });
      }
    };

    loadAllDocuments();
  }, []);

  // Fetch document details when focus changes
  useEffect(() => {
    if (currentDoc?.id) {
      const loadDocData = async () => {
        try {
          const data = await fetchOcrDocument(currentDoc.id);
          console.log(`[OCR] Fetched metadata for doc ${currentDoc.id}:`, data);
          setLoadedDocument(data);
          const runId = extractWorkflowRunId(data);
          if (runId) {
            updateDocument(currentDoc.id, { workflowRunId: runId });
          }
        } catch (error) {
          console.error("[OCR] Error fetching document metadata:", error);
          showApiErrorToast(error, "Couldn't load this document's details", { id: "review-document-meta" });
        }
      };
      loadDocData();
    }
  }, [currentDoc?.id]);

  const docExtractions = useMemo(
    () => (currentDoc ? extractions.filter((e) => e.documentId === currentDoc.id) : []),
    [extractions, currentDoc]
  );

  const attemptScrollToExtraction = useCallback(
    (extraction: ExtractionResult, searchText: string | null, expectedPage: number) => {
      const viewer = documentViewerRef.current;
      if (!viewer?.isReady(expectedPage)) return false;
      if (hasHighlightBbox(extraction) || hasCellPosition(extraction)) {
        viewer.scrollToAnnotation(extraction.id);
      } else if (searchText) {
        viewer.scrollToTextHighlight();
      } else {
        viewer.scrollToPage();
      }
      pendingScrollId.current = null;
      pendingTargetPage.current = null;
      return true;
    },
    []
  );

  const focusExtractionInViewer = useCallback(
    async (extraction: ExtractionResult) => {
      const searchText = getExtractionSearchPhrase(extraction) ?? null;
      let page = extraction.pageNumber;

      if (!page && searchText && stableUrl && fileType === "pdf") {
        const { findPageForText } = await import("../utils/pdf-text-search");
        page = await findPageForText(stableUrl, searchText);
      }

      setActiveHighlightId(extraction.id);
      setHighlightSearchText(searchText);

      // CSV cells have no page concept — scroll straight to the annotation.
      if (!page && fileType === "csv" && hasCellPosition(extraction)) {
        requestAnimationFrame(() => {
          attemptScrollToExtraction(extraction, searchText, currentPage);
        });
        return;
      }

      if (!page) return;

      const targetPage = page;
      pendingScrollId.current = extraction.id;
      pendingTargetPage.current = targetPage;

      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
        return;
      }

      requestAnimationFrame(() => {
        attemptScrollToExtraction(extraction, searchText, targetPage);
      });
    },
    [attemptScrollToExtraction, currentPage, fileType, stableUrl]
  );

  // Retry scroll after the PDF finishes rendering the target page.
  useEffect(() => {
    const pendingId = pendingScrollId.current;
    const targetPage = pendingTargetPage.current;
    if (!pendingId || !targetPage || targetPage !== currentPage) return;

    const extraction = docExtractions.find((item) => item.id === pendingId);
    if (!extraction) return;

    const searchText = highlightSearchText;
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (attemptScrollToExtraction(extraction, searchText, targetPage) || attempts >= 50) {
        window.clearInterval(interval);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [attemptScrollToExtraction, currentPage, docExtractions, highlightSearchText]);

  // Bidirectional sync: when the active field changes (from a field click or a
  // bbox click in the viewer), scroll the matching card into view.
  useEffect(() => {
    if (!activeHighlightId) return;
    const el = fieldRefs.current.get(activeHighlightId);
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
    return () => cancelAnimationFrame(raf);
  }, [activeHighlightId, currentPage]);

  const entityMap = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        color: string;
        type?: string;
        description?: string;
        dataType?: EntityDefinition["dataType"];
        options?: string[];
      }
    >();
    protocol?.entities.forEach((e) => {
      const meta = {
        name: e.name,
        color: e.color,
        type: e.type,
        description: e.description,
        dataType: e.dataType,
        options: e.options,
      };
      map.set(e.id, meta);
      map.set(e.name, meta);
    });
    return map;
  }, [protocol]);

  const useStyledLeasePreview = isLeaseStyledPreviewDocument(currentDoc?.name);

  const previewAnnotations = useMemo(() => {
    const bboxAnnotations = docExtractions
      .filter((item) => hasHighlightBbox(item) && item.pageNumber != null)
      .map((item) => {
        const entity = entityMap.get(item.entityId);
        return {
          ...item.bbox!,
          id: item.id,
          type: "bbox" as const,
          page: item.pageNumber,
          confidence: item.confidence,
          entityColor: entity?.color,
          comment:
            item.bbox?.comment ||
            `${entity?.name || item.entityId}: ${formatExtractionValue(item.correctedValue || item.value)}`,
        };
      });

    const cellAnnotations = docExtractions
      .filter((item) => hasCellPosition(item))
      .map((item) => {
        const entity = entityMap.get(item.entityId);
        return {
          id: item.id,
          type: "cell" as const,
          row: item.cell!.row,
          col: item.cell!.column,
          comment:
            item.cell?.comment ||
            `${entity?.name || item.entityId}: ${formatExtractionValue(item.correctedValue || item.value)}`,
        };
      });

    return [...bboxAnnotations, ...cellAnnotations];
  }, [docExtractions, entityMap]);

  const pendingReviewCount = docExtractions.filter(
    (e) => e.status === "auto" || e.status === "review"
  ).length;
  const reviewedCount = docExtractions.filter(
    (e) => e.status === "reviewed" || e.status === "corrected"
  ).length;
  const autoFieldCount = docExtractions.filter((e) => e.status === "auto").length;
  const approvedFromAutoCount = docExtractions.filter(
    (e) => e.status === "reviewed" && e.preReviewStatus === "auto"
  ).length;
  const showUndoAll = autoFieldCount === 0 && approvedFromAutoCount > 0;

  const handleApprove = (extraction: ExtractionResult) => {
    const preReviewStatus =
      extraction.status === "auto" || extraction.status === "review" ? extraction.status : "auto";
    updateExtraction(extraction.id, {
      status: "reviewed",
      reviewedAt: new Date().toISOString(),
      preReviewStatus,
    });
  };

  const handleReject = (extraction: ExtractionResult) => {
    updateExtraction(extraction.id, { status: "rejected" });
  };

  const handleApproveAll = () => {
    const reviewedAt = new Date().toISOString();
    docExtractions
      .filter((extraction) => extraction.status === "auto")
      .forEach((extraction) => {
        updateExtraction(extraction.id, {
          status: "reviewed",
          reviewedAt,
          preReviewStatus: "auto",
        });
      });
  };

  const handleUndoAll = () => {
    docExtractions
      .filter(
        (extraction) => extraction.status === "reviewed" && extraction.preReviewStatus === "auto"
      )
      .forEach((extraction) => {
        const cleanedComment = stripReviewTagFromComment(extraction.bbox?.comment, "reviewed");
        const bboxUpdate =
          extraction.bbox && typeof extraction.bbox === "object"
            ? { ...extraction.bbox, comment: cleanedComment }
            : undefined;

        updateExtraction(extraction.id, {
          status: "auto",
          reviewedAt: undefined,
          reviewedBy: undefined,
          preReviewStatus: undefined,
          ...(bboxUpdate ? { bbox: bboxUpdate } : {}),
        });
      });
  };

  const handleToggleIgnoreForTraining = (extraction: ExtractionResult, ignore: boolean) => {
    updateExtraction(extraction.id, { ignoreForTraining: ignore });
  };

  const handleRevertToPending = (extraction: ExtractionResult) => {
    if (extraction.status !== "reviewed" && extraction.status !== "corrected") return;

    const nextStatus = extraction.preReviewStatus ?? "auto";
    const cleanedComment = stripReviewTagFromComment(extraction.bbox?.comment, extraction.status);

    const bboxUpdate =
      extraction.bbox && typeof extraction.bbox === "object"
        ? { ...extraction.bbox, comment: cleanedComment }
        : undefined;

    updateExtraction(extraction.id, {
      status: nextStatus,
      reviewedAt: undefined,
      reviewedBy: undefined,
      preReviewStatus: undefined,
      correctedValue: undefined,
      ...(bboxUpdate ? { bbox: bboxUpdate } : {}),
    });
  };

  const handleStartEdit = (extraction: ExtractionResult) => {
    setEditingId(extraction.id);
    setEditValue(extraction.correctedValue || extraction.value);
  };

  const handleSaveCorrection = (extraction: ExtractionResult) => {
    const preReviewStatus =
      extraction.status === "auto" || extraction.status === "review" ? extraction.status : "auto";
    updateExtraction(extraction.id, {
      status: "corrected",
      correctedValue: editValue,
      reviewedAt: new Date().toISOString(),
      preReviewStatus,
    });
    setEditingId(null);
  };

  const handleTrainFromCorrection = (extraction: ExtractionResult) => {
    // In production, this would send the correction to the learning system
    updateExtraction(extraction.id, {
      status: "corrected",
      reviewedAt: new Date().toISOString(),
    });
  };

  // updateDocument() only touches the Zustand `documents` store — a no-op
  // for a document that only exists in `backendReviewDocs` (the normal case
  // here, see the comment on `isCompleted`). Update both so `currentDoc`
  // (which merges the two, see `reviewDocs`) actually reflects "completed".
  const markDocumentCompleted = (docId: string) => {
    updateDocument(docId, { status: "completed" });
    setBackendReviewDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: "completed" } : d))
    );
  };

  const handleCompleteReview = async () => {
    if (!currentDoc) return;

    // Refuse to submit while this document's protocol hasn't resolved.
    // get_updated_mappings (backend) overwrites every field's stored value
    // with whatever this submit sends, even untouched ones — if entity
    // dataType info isn't reliably loaded, a real multi_select array could
    // get silently flattened to a string here and permanently corrupt
    // already-correct data on the very next Complete Review click.
    if (!protocolResolutionSafe) {
      toast.error(
        "This document's protocol hasn't finished loading yet — please wait a moment and try again."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Map extractions to the format expected by the human-review endpoint
      // Using entityId and document_id as per developer's feedback
      // const updated_mappings = docExtractions.map((ext) => {
      //   return {
      //     [ext.entityId]: ext.correctedValue || ext.value,
      //   };
      // });

      // await submitHumanReview(currentDoc.id, {
      //   document_id: currentDoc.id,
      //   updated_mappings,
      //   connector_id: selectedConnectorId,
      // });

      if (!selectedConnectorId) {
        toast.error("Please select a connector before completing the review.");
        setIsSubmitting(false);
        return;
      }

      const uiMappings = docExtractions.map((ext) => {
        const { preReviewStatus, ignoreForTraining, ...mapping } = ext;
        return {
          ...mapping,
          ignore_for_training: ignoreForTraining !== false,
          ignoreForTraining: ignoreForTraining !== false,
        };
      });

      try {
        const { endpoint } = await submitOcrReview(currentDoc.id, {
          connector_id: selectedConnectorId,
          ui_mappings: uiMappings,
          documentMetadata: loadedDocument,
        });
        markDocumentCompleted(currentDoc.id);
        toast.success(
          endpoint === "human-review"
            ? "Review submitted (legacy OCR path)."
            : "Document review submitted and finalized!"
        );
      } catch (primaryError: unknown) {
        const detail = (primaryError as { response?: { data?: { detail?: unknown } } })?.response
          ?.data?.detail;
        if (!isWorkflowRunIdError(detail)) throw primaryError;

        const updated_mappings = docExtractions.map((ext) => ({
          [ext.entityId]: ext.correctedValue || ext.value,
        }));
        await submitHumanReview(currentDoc.id, {
          document_id: currentDoc.id,
          updated_mappings,
          connector_id: selectedConnectorId,
        });
        markDocumentCompleted(currentDoc.id);
        toast.success("Review submitted (legacy OCR path).");
      }
    } catch (error: unknown) {
      console.error("Failed to submit human review:", error);
      showApiErrorToast(error, "Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentDoc) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
          <ClipboardCheck className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-lg font-semibold text-slate-600">No documents pending review</p>
        <p className="text-sm text-slate-500">
          Upload and process documents to begin reviewing extractions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center shadow-sm shrink-0">
            <FileText className="h-5 w-5 text-violet-600" />
          </div>

          <div className="min-w-[320px] max-w-[640px] flex-1">
            <Select
              value={currentDoc.id}
              onValueChange={(id) => {
                setSelectedDocument(id);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-auto w-full overflow-hidden rounded-xl border-slate-200 bg-white/50 px-3 py-2.5 backdrop-blur-sm transition-all hover:border-violet-300">
                <div className="min-w-0 w-full pr-2 text-left">
                  <div className="min-w-0 space-y-0.5 leading-tight">
                    <ReviewDocumentLabel
                      name={currentDoc.name}
                      className="text-sm font-bold text-slate-800"
                    />
                    <span
                      className="block truncate text-xs text-slate-500"
                      title={currentDoc.protocolName}
                    >
                      {currentDoc.protocolName}
                    </span>
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 max-h-[300px]">
                {reviewDocs.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id} className="rounded-lg focus:bg-violet-50">
                    <div className="flex min-w-0 flex-col gap-0.5 py-1">
                      <ReviewDocumentLabel
                        name={doc.name}
                        className="max-w-[320px] font-semibold text-slate-800"
                      />
                      <span
                        className="max-w-[320px] truncate text-xs text-slate-500"
                        title={doc.protocolName}
                      >
                        {doc.protocolName}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{doc.pageCount} pages</span>
                        <span>•</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1.5 py-0 rounded-full border-0 lowercase",
                            doc.status === "completed"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-rose-50 text-rose-600"
                          )}
                        >
                          {doc.status}
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-50 text-emerald-700 border-0 rounded-full text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {reviewedCount} reviewed
          </Badge>
          <Badge className="bg-rose-50 text-rose-700 border-0 rounded-full text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            {pendingReviewCount} pending
          </Badge>

          {/* Staging Connector Selector */}
          <div className="flex items-center gap-2 ml-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Staging
            </span>
            <Select value={selectedConnectorId || ""} onValueChange={setSelectedConnector}>
              <SelectTrigger className="h-8 px-3 border-slate-200 bg-white/50 text-xs font-bold rounded-xl min-w-[150px] hover:border-violet-300 transition-all shadow-sm">
                <SelectValue placeholder="Select Connector" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                {availableConnectors
                  .filter((item) => item.erp_type === "bigquery")
                  .map((conn: ConnectorConfig) => (
                    <SelectItem
                      key={conn.id}
                      value={conn.id}
                      className="text-xs font-medium py-2.5 rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full shadow-sm",
                            conn.erp_type === "netsuite"
                              ? "bg-orange-500"
                              : conn.erp_type === "bigquery"
                                ? "bg-blue-500"
                                : conn.erp_type === "airtable"
                                  ? "bg-emerald-500"
                                  : "bg-slate-400"
                          )}
                        />
                        {conn.connector_name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsTestModalOpen(true)}
            className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
          >
            <FlaskConical className="h-4 w-4 mr-2" />
            Test
          </Button>

          {isCompleted ? (
            "Staged"
          ) : (
            <Button
              onClick={handleCompleteReview}
              size="sm"
              disabled={pendingReviewCount > 0 || isSubmitting || !protocolResolutionSafe}
              title={!protocolResolutionSafe ? "Protocol still loading — please wait" : undefined}
              className="bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-200"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? "Submitting..." : "Complete Review"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* ── Inline Document Viewer ─────────────────────── */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Eye className="h-4 w-4 text-violet-500" />
                Document Preview — Page {currentPage}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-7 w-7 p-0 rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-slate-500 px-2">
                  {currentPage} / {currentDoc.pageCount || 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(currentDoc.pageCount || 1, p + 1))}
                  className="h-7 w-7 p-0 rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="relative bg-white rounded-xl border border-slate-200 shadow-inner max-h-[80vh] overflow-y-auto scrollbar-hide min-h-[500px] p-8">
              {useStyledLeasePreview ? (
                <StyledDocumentPreview
                  extractions={docExtractions}
                  entityMap={entityMap}
                  activeExtractionId={activeHighlightId}
                  onHighlightClick={(id) => {
                    setActiveHighlightId(id);
                    const extraction = docExtractions.find((item) => item.id === id);
                    if (extraction?.pageNumber) setCurrentPage(extraction.pageNumber);
                  }}
                />
              ) : (
                <DocumentViewer
                  ref={documentViewerRef}
                  fileUrl={stableUrl}
                  fileType={fileType}
                  pageNumber={currentPage}
                  annotations={previewAnnotations}
                  activeAnnotationId={activeHighlightId}
                  highlightSearchText={highlightSearchText}
                  onAnnotationClick={(id) => {
                    const extraction = docExtractions.find((item) => item.id === id);
                    if (extraction) void focusExtractionInViewer(extraction);
                  }}
                  onPageReady={() => {
                    const pendingId = pendingScrollId.current;
                    const targetPage = pendingTargetPage.current;
                    if (!pendingId || !targetPage || targetPage !== currentPage) return;
                    const extraction = docExtractions.find((item) => item.id === pendingId);
                    if (extraction) {
                      attemptScrollToExtraction(extraction, highlightSearchText, targetPage);
                    }
                  }}
                />
              )}

              <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-3 rounded-lg border border-slate-100 bg-white/90 p-2 text-[10px] text-slate-500 shadow-sm backdrop-blur-sm">
                <span className="font-semibold">Confidence:</span>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-3 rounded-full bg-emerald-500" />
                  <span>High</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-3 rounded-full bg-blue-500" />
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-3 rounded-full bg-amber-500" />
                  <span>Low</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Extraction Review Panel ────────────────────── */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
            <CardHeader className="pb-2 border-b border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Extracted Fields
                </CardTitle>
                {docExtractions.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs"
                    disabled={showUndoAll ? approvedFromAutoCount === 0 : autoFieldCount === 0}
                    onClick={showUndoAll ? handleUndoAll : handleApproveAll}
                  >
                    {showUndoAll ? (
                      <>
                        <Undo2 className="h-3.5 w-3.5" />
                        Undo All
                      </>
                    ) : (
                      <>
                        <ThumbsUp className="h-3.5 w-3.5" />
                        Approve All
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2 max-h-[560px] overflow-y-auto scrollbar-hide">
              {docExtractions.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
                  <Sparkles className="h-5 w-5 text-slate-300" />
                  <p className="text-xs font-medium text-slate-500">
                    No extracted fields for this document.
                  </p>
                </div>
              )}
              {docExtractions.map((extraction) => {
                const entity = entityMap.get(extraction.entityId);
                const confConfig = getConfidenceConfig(extraction.confidence);
                const statusStyle = STATUS_STYLES[extraction.status] || STATUS_STYLES.auto;
                const isEditing = editingId === extraction.id;
                const recordId = (Number(extraction.id.split("-").slice(-2)[0]) || 0) + 1; // Assuming ID format allows this
                const displayValue = extraction.correctedValue || extraction.value;
                // Any real array on a multi_select entity renders as chips —
                // a multi_select entity on an old (pre-fix) document still has
                // a plain joined string here and correctly falls through to
                // the text path unchanged. Whether editing uses the
                // constrained checkbox picker or the free-form tag editor
                // depends separately on whether entity.options is configured
                // (see the edit-mode branch below).
                const isMultiSelectValue =
                  entity?.dataType === "multi_select" && Array.isArray(displayValue);

                return (
                  <div
                    key={extraction.id}
                    ref={(el) => {
                      if (el) fieldRefs.current.set(extraction.id, el);
                      else fieldRefs.current.delete(extraction.id);
                    }}
                    style={{ cursor: extraction.pageNumber ? "pointer" : "default" }}
                    className={cn(
                      "p-3 rounded-xl border transition-all",
                      activeHighlightId === extraction.id &&
                        "ring-2 ring-violet-400 ring-offset-1 shadow-md",
                      extraction.pageNumber != null &&
                        extraction.pageNumber !== currentPage &&
                        "opacity-70",
                      extraction.status === "auto" || extraction.status === "review"
                        ? "border-amber-200 bg-amber-50/30"
                        : extraction.status === "corrected"
                          ? "border-amber-200 bg-amber-50/20"
                          : extraction.status === "rejected"
                            ? "border-red-200 bg-red-50/20"
                            : "border-emerald-200 bg-emerald-50/20"
                    )}
                    onClick={() => {
                      void focusExtractionInViewer(extraction);
                    }}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {extraction.entityId && (
                          <div
                            className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm"
                            style={{
                              backgroundColor:
                                entity?.color ||
                                (extraction.confidence >= 0.95
                                  ? "#10b981"
                                  : extraction.confidence >= 0.85
                                    ? "#3b82f6"
                                    : "#f59e0b"),
                            }}
                          />
                        )}
                        <span className="text-xs font-bold text-slate-700">
                          {entity?.name || extraction.entityId || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1.5 py-0 rounded-full border",
                            confConfig.badge
                          )}
                        >
                          Record {recordId}
                        </Badge>

                        {extraction.confidence != null && !isNaN(Number(extraction.confidence)) ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1.5 py-0 rounded-full border",
                              confConfig.badge
                            )}
                          >
                            {(extraction.confidence * 100).toFixed(0)}% OCR
                          </Badge>
                        ) : (
                          ""
                        )}

                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1.5 py-0 rounded-full border",
                            statusStyle.bg,
                            statusStyle.color
                          )}
                        >
                          {statusStyle.label}
                        </Badge>
                        {extraction.ignoreForTraining !== false && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 rounded-full border-slate-200 bg-slate-100 text-slate-600"
                          >
                            No training
                          </Badge>
                        )}
                      </div>
                    </div>
                    {
                      <>
                        {/* Value */}
                        {isEditing && !isCompleted ? (
                          <div
                            className="flex items-start gap-2 mt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {entity?.dataType === "multi_select" ? (
                              (entity.options?.length ?? 0) > 0 ? (
                                <MultiSelectEditor
                                  options={entity.options!}
                                  value={Array.isArray(editValue) ? editValue : []}
                                  onChange={setEditValue}
                                />
                              ) : (
                                // No static options — e.g. a Data Source-driven
                                // field. Free-form chip entry instead of a
                                // constrained checkbox list; never fetches the
                                // Data Source's full value set.
                                <MultiSelectTagEditor
                                  value={Array.isArray(editValue) ? editValue : []}
                                  onChange={setEditValue}
                                />
                              )
                            ) : (
                              <Textarea
                                value={Array.isArray(editValue) ? editValue.join(", ") : editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                autoFocus
                                className="text-sm rounded-lg flex-1 min-h-20 max-h-48 resize-y"
                              />
                            )}
                            <div className="flex shrink-0 flex-col gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleSaveCorrection(extraction)}
                                className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-500 rounded-lg"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                                className="h-8 w-8 p-0 rounded-lg"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {isMultiSelectValue ? (
                              <MultiSelectChips value={displayValue as string[]} />
                            ) : (
                              <p className="text-sm font-medium text-slate-800">
                                {formatExtractionValue(displayValue)}
                              </p>
                            )}
                            {extraction.correctedValue &&
                              !extractionValuesEqual(extraction.correctedValue, extraction.value) && (
                                <p className="text-xs text-slate-400 line-through">
                                  {formatExtractionValue(extraction.value)}
                                </p>
                              )}
                            {extraction.pageNumber && (
                              <p className="text-[10px] text-slate-400">
                                Page {extraction.pageNumber}
                              </p>
                            )}
                          </div>
                        )}

                        {!isCompleted && (
                          <div
                            className="hidden flex items-center gap-2 mt-2 pt-2 border-t border-slate-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              id={`ignore-training-${extraction.id}`}
                              checked={extraction.ignoreForTraining !== false}
                              onCheckedChange={(checked) =>
                                handleToggleIgnoreForTraining(extraction, checked === true)
                              }
                            />
                            <Label
                              htmlFor={`ignore-training-${extraction.id}`}
                              className="text-[10px] text-slate-600 font-normal cursor-pointer"
                            >
                              Ignore for training
                            </Label>
                          </div>
                        )}
                        {/* Actions */}
                        {!isEditing &&
                          !isCompleted &&
                          (extraction.status === "auto" || extraction.status === "review") && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(extraction)}
                                className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500 rounded-lg flex-1"
                              >
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartEdit(extraction)}
                                className="h-7 text-[10px] border-amber-200 text-amber-600 hover:bg-amber-50 rounded-lg flex-1"
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Correct
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(extraction)}
                                className="h-7 text-[10px] border-red-200 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        {!isEditing &&
                          !isCompleted &&
                          (extraction.status === "reviewed" ||
                            extraction.status === "corrected" ||
                            extraction.status === "rejected") && (
                            <div
                              className="flex items-center justify-end mt-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRevertToPending(extraction)}
                                    className="h-7 w-7 p-0 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg"
                                    aria-label="Undo review and return field to pending"
                                  >
                                    <Undo2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Undo review — return to pending (auto) state
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                      </>
                    }

                    {/* Train from Correction Button */}
                    {
                      // extraction.status === "corrected" && (
                      //   <div className="mt-2 pt-2 border-t border-slate-100">
                      //     <Button
                      //       size="sm"
                      //       onClick={() => handleTrainFromCorrection(extraction)}
                      //       className="h-7 text-[10px] w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg shadow-sm"
                      //     >
                      //       <Zap className="h-3 w-3 mr-1" />
                      //       Train from Correction
                      //     </Button>
                      //   </div>
                      // )
                    }
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Review Timer */}
          <Card className="border-0 shadow-sm ring-1 ring-emerald-200/50 overflow-hidden bg-gradient-to-r from-emerald-50/50 to-green-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">Review Time Target</p>
                  <p className="text-xs text-slate-500">Under 2 minutes per document</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 rounded-full text-xs font-bold">
                  ~1:30
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <FieldTestModal
        open={isTestModalOpen}
        onOpenChange={setIsTestModalOpen}
        fileName={currentDoc.name}
        docId={currentDoc.id}
        configId={
          currentDoc.protocolId ??
          (typeof loadedDocument?.config_id === "string" ? loadedDocument.config_id : null) ??
          activeProtocolId
        }
        extractions={docExtractions}
        entityMap={entityMap}
      />
    </div>
  );
}
