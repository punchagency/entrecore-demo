import { create } from "zustand";
import { mergeProtocolsPreservingEdits } from "@/app/(protected)/abstraction/utils/merge-protocols";
import {
  findFieldMapEntry,
  mergeEntityEntryIntoExtraction,
  normalizeEntityBbox,
  normalizeEntityCellPosition,
  parseFieldMapRecord,
  resolvePageNumber,
} from "@/app/(protected)/abstraction/utils/extraction-map-utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AbstractionDocument {
  id: string;
  name: string;
  type: "pdf" | "scanned_pdf" | "docx" | "image";
  protocolId?: string;
  protocolName?: string;
  size: number;
  uploadedAt: string;
  status: "uploading" | "ocr_processing" | "extracting" | "review" | "completed" | "failed";
  ocrAccuracy?: number;
  pageCount?: number;
  thumbnailUrl?: string;
  sourceUrl?: string;
  extractedText?: string;
  /** Present only for documents processed via the workflow engine (complete-review). */
  workflowRunId?: string;
  /** Why processing failed, for `status: "failed"`; readable, never exception text. */
  failureReason?: string;
}

export interface EntityDefinition {
  id: string;
  name: string;
  type:
    | "party_name"
    | "date"
    | "amount"
    | "address"
    | "obligation"
    | "term"
    | "percentage"
    | "reference_number"
    | "jurisdiction"
    | "custom";
  description: string;
  pattern?: string;
  dataType:
    | "text"
    | "long_text"
    | "single_select"
    | "multi_select"
    | "boolean"
    | "date"
    | "currency"
    | "integer"
    | "float";
  /** Only meaningful when dataType is "single_select" or "multi_select". */
  options?: string[];
  /**
   * Only meaningful when dataType is "single_select"/"multi_select". Points
   * at a connector/table/column to fetch allowed values from — this pointer
   * persists, but the fetched values themselves never do: the backend
   * resolves them fresh on every extraction run (apply_reasoning) instead of
   * writing them into optionList at save time, so they can't go stale
   * between when the config was set up and when a document is processed.
   * datasetName only applies to connectors with more than one dataset under
   * one connector config (currently just multi-dataset BigQuery).
   */
  dataSource?: { connectorConfigId: string; table: string; column: string; datasetName?: string };
  /** Shown as "N/A" placeholder in the editor when left empty. */
  defaultValue?: string;
  /**
   * Splits ONE document into MANY records: every occurrence of this field in
   * the document starts a new record, and the other fields are filled from
   * the content belonging to that occurrence. A 12-page PDF holding six
   * purchase orders extracts as six rows when po_number is the record key,
   * instead of one row for the whole file. Fields with no value for a given
   * record fall back to their own defaultValue, same as always.
   */
  isRecordKey?: boolean;
  /**
   * Only meaningful when dataType is "text" or "long_text" — every other type
   * is a normalised token the backend refuses to slice, so the editor hides
   * the control and resets this to false when the type changes away.
   *
   * Turning it ON is one of three signals the backend ORs together
   * (_verbatim_entities in ocr_service.py): the flag, a description containing
   * DO NOT TRUNCATE / FULL TEXT / VERBATIM, and the OCR_VERBATIM_ENTITIES env
   * override. Turning it OFF therefore only withdraws this signal — a field
   * whose description already says "FULL TEXT" stays verbatim regardless.
   */
  isVerbatim?: boolean;
  required: boolean;
  color: string;
}

export interface ClauseDefinition {
  id: string;
  name: string;
  type:
    | "termination"
    | "indemnification"
    | "confidentiality"
    | "governing_law"
    | "force_majeure"
    | "custom";
  description: string;
  parentId?: string;
  keywords: string[];
  color: string;
}

/**
 * How a protocol's documents split into records — see ExtractionMode in
 * abstraction/services/ocr-api.ts. Declared here rather than inferred by the
 * backend's structure classifier.
 */
export type ProtocolExtractionMode = "single" | "multi" | "single_split_multi";

export interface AbstractionProtocol {
  id: string;
  name: string;
  description: string;
  entities: EntityDefinition[];
  clauses: ClauseDefinition[];
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  /** Undefined leaves the split decision to the backend classifier. */
  extractionMode?: ProtocolExtractionMode;
}

export interface ExtractionResult {
  id: string;
  documentId: string;
  entityId: string;
  /** A multi_select entity's value is a real array — every other type is a plain string. */
  value: string | string[];
  confidence: number;
  /** Page where the value resolved; undefined when the mapping has no page info. */
  pageNumber?: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
  bbox?: { x: number; y: number; width: number; height: number; page: number; comment?: string };
  /** CSV entities' cell provenance — absolute spreadsheet (row, column), 1-indexed. */
  cell?: { row: number; column: number; comment?: string };
  status: "auto" | "reviewed" | "corrected" | "rejected" | "review";
  /** Last pending status before review; client-only, stripped before complete-review API. */
  preReviewStatus?: "auto" | "review";
  correctedValue?: string | string[];
  reviewedBy?: string;
  reviewedAt?: string;
  /** When true (default), this field is excluded from model training on correct/reject. */
  ignoreForTraining?: boolean;
  /** OCR source text snippet from the document, when provided by the backend. */
  source?: string;
}

export interface AgentStep {
  id: string;
  name: string;
  type:
    | "ocr"
    | "text_extract"
    | "entity_recognition"
    | "clause_classification"
    | "validation"
    | "human_review"
    | "output";
  config: Record<string, any>;
  position: { x: number; y: number };
}

export interface AgentConnection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  steps: AgentStep[];
  connections: AgentConnection[];
  status: "draft" | "active" | "paused";
}

export interface LearningMetric {
  date: string;
  accuracy: number;
  documentsProcessed: number;
  correctionsApplied: number;
  entityAccuracy: Record<string, number>;
}

export interface AgentLog {
  id: string;
  stepId: string;
  stepName: string;
  timestamp: string;
  inputs: string;
  outputs: string;
  confidence: number;
  error?: string;
  duration: number;
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface AbstractionState {
  // Documents
  documents: AbstractionDocument[];
  selectedDocumentId: string | null;
  selectedConnectorId: string | null;
  availableConnectors: any[];
  addDocument: (doc: AbstractionDocument) => void;
  updateDocument: (id: string, updates: Partial<AbstractionDocument>) => void;
  removeDocument: (id: string) => void;
  setSelectedDocument: (id: string | null) => void;
  setSelectedConnector: (id: string | null) => void;
  setAvailableConnectors: (connectors: any[]) => void;
  updateDocumentId: (oldId: string, newId: string) => void;

  // Protocols
  protocols: AbstractionProtocol[];
  activeProtocolId: string | null;
  /** Protocol IDs with local edits not yet reflected from a server refresh */
  editedProtocolIds: string[];
  addProtocol: (protocol: AbstractionProtocol) => void;
  updateProtocol: (id: string, updates: Partial<AbstractionProtocol>) => void;
  setActiveProtocol: (id: string | null) => void;
  setProtocols: (protocols: AbstractionProtocol[]) => void;
  clearProtocolEdits: (id: string) => void;

  // Extractions
  extractions: ExtractionResult[];
  addExtraction: (extraction: ExtractionResult) => void;
  updateExtraction: (id: string, updates: Partial<ExtractionResult>) => void;
  getExtractionsByDocument: (documentId: string) => ExtractionResult[];
  transformMappings: (mappings: any, documentId: string, ui_mappings: any[], protocolId?: string) => void;
  enrichExtractionsFromFieldMap: (fieldMap: unknown, documentId: string) => void;
  // Workflow
  workflow: AgentWorkflow | null;
  setWorkflow: (workflow: AgentWorkflow) => void;

  // Logs
  agentLogs: AgentLog[];
  addAgentLog: (log: AgentLog) => void;

  // Learning Metrics
  learningMetrics: LearningMetric[];
  addLearningMetric: (metric: LearningMetric) => void;

  // UI State
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// ─── Default Data ───────────────────────────────────────────────────────────

const SAMPLE_DOCUMENTS: AbstractionDocument[] = [];

const SAMPLE_EXTRACTIONS: ExtractionResult[] = [];

const SAMPLE_LOGS: AgentLog[] = [
  {
    id: "log-1",
    stepId: "s1",
    stepName: "OCR Engine",
    timestamp: "2026-03-31T09:01:12Z",
    inputs: "doc-1.pdf (18 pages)",
    outputs: "Raw text extracted",
    confidence: 0.962,
    duration: 4200,
  },
  {
    id: "log-2",
    stepId: "s2",
    stepName: "Layout Parser",
    timestamp: "2026-03-31T09:01:16Z",
    inputs: "Raw text (18 pages)",
    outputs: "12 sections, 3 tables identified",
    confidence: 0.94,
    duration: 1800,
  },
  {
    id: "log-3",
    stepId: "s3",
    stepName: "Entity Extractor",
    timestamp: "2026-03-31T09:01:18Z",
    inputs: "Structured text + 12 entity definitions",
    outputs: "9 entities extracted",
    confidence: 0.93,
    duration: 3200,
  },
  {
    id: "log-4",
    stepId: "s4",
    stepName: "Clause Classifier",
    timestamp: "2026-03-31T09:01:22Z",
    inputs: "Structured text + 7 clause types",
    outputs: "5 clauses classified",
    confidence: 0.91,
    duration: 2600,
  },
  {
    id: "log-5",
    stepId: "s5",
    stepName: "Validation Agent",
    timestamp: "2026-03-31T09:01:24Z",
    inputs: "9 entities + 5 clauses",
    outputs: "2 low-confidence flags",
    confidence: 0.95,
    duration: 800,
  },
];

const SAMPLE_METRICS: LearningMetric[] = [
  {
    date: "2026-03-24",
    accuracy: 82.3,
    documentsProcessed: 1,
    correctionsApplied: 4,
    entityAccuracy: { party_name: 85, date: 90, amount: 78, term: 75 },
  },
  {
    date: "2026-03-25",
    accuracy: 84.1,
    documentsProcessed: 2,
    correctionsApplied: 3,
    entityAccuracy: { party_name: 87, date: 91, amount: 80, term: 78 },
  },
  {
    date: "2026-03-26",
    accuracy: 86.5,
    documentsProcessed: 3,
    correctionsApplied: 2,
    entityAccuracy: { party_name: 89, date: 93, amount: 83, term: 81 },
  },
  {
    date: "2026-03-27",
    accuracy: 88.2,
    documentsProcessed: 4,
    correctionsApplied: 3,
    entityAccuracy: { party_name: 91, date: 94, amount: 85, term: 83 },
  },
  {
    date: "2026-03-28",
    accuracy: 90.8,
    documentsProcessed: 5,
    correctionsApplied: 1,
    entityAccuracy: { party_name: 93, date: 96, amount: 88, term: 86 },
  },
  {
    date: "2026-03-29",
    accuracy: 92.1,
    documentsProcessed: 6,
    correctionsApplied: 2,
    entityAccuracy: { party_name: 94, date: 97, amount: 89, term: 88 },
  },
  {
    date: "2026-03-30",
    accuracy: 93.5,
    documentsProcessed: 7,
    correctionsApplied: 1,
    entityAccuracy: { party_name: 95, date: 97, amount: 91, term: 90 },
  },
  {
    date: "2026-03-31",
    accuracy: 94.2,
    documentsProcessed: 8,
    correctionsApplied: 0,
    entityAccuracy: { party_name: 96, date: 98, amount: 92, term: 91 },
  },
];

const DEFAULT_WORKFLOW: AgentWorkflow = {
  id: "wf-1",
  name: "Legal Document Abstraction Pipeline",
  status: "active",
  steps: [
    {
      id: "s1",
      name: "OCR Engine",
      type: "ocr",
      config: { engine: "azure_vision", language: "en", enhanceDpi: true },
      position: { x: 50, y: 200 },
    },
    {
      id: "s2",
      name: "Layout Parser",
      type: "text_extract",
      config: { preserveTables: true, detectSections: true },
      position: { x: 300, y: 200 },
    },
    {
      id: "s3",
      name: "Entity Extractor",
      type: "entity_recognition",
      config: { model: "slm-legal-v2", minConfidence: 0.7 },
      position: { x: 550, y: 125 },
    },
    {
      id: "s4",
      name: "Clause Classifier",
      type: "clause_classification",
      config: { model: "slm-clause-v1", taxonomy: "standard" },
      position: { x: 550, y: 300 },
    },
    {
      id: "s5",
      name: "Validation Gate",
      type: "validation",
      config: { threshold: 0.85, flagLowConfidence: true },
      position: { x: 800, y: 200 },
    },
    {
      id: "s6",
      name: "Human Review",
      type: "human_review",
      config: { autoAssign: true, slaMinutes: 120 },
      position: { x: 1050, y: 200 },
    },
    {
      id: "s7",
      name: "Data Output",
      type: "output",
      config: { format: "structured_json", linkToSource: true },
      position: { x: 1300, y: 200 },
    },
  ],
  connections: [
    { id: "c1", sourceId: "s1", targetId: "s2" },
    { id: "c2", sourceId: "s2", targetId: "s3" },
    { id: "c3", sourceId: "s2", targetId: "s4" },
    { id: "c4", sourceId: "s3", targetId: "s5" },
    { id: "c5", sourceId: "s4", targetId: "s5" },
    { id: "c6", sourceId: "s5", targetId: "s6" },
    { id: "c7", sourceId: "s6", targetId: "s7" },
  ],
};

interface OCREntity {
  value: string | number | null;
  confidence?: number;
  page?: number | null;
  source?: string;
  bbox?: {
    x0?: number;
    y0?: number;
    x1?: number;
    y1?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    page?: number | null;
  };
  // CSV entities carry these flat instead of a nested bbox — the model reads
  // the raw file directly, so column/row are its absolute (row 1 = file's
  // literal first line, column 1 = leftmost column) spreadsheet position.
  column?: number;
  row?: number;
}

// ─── Create Store ───────────────────────────────────────────────────────────

export const useAbstractionStore = create<AbstractionState>((set, get) => ({
  // Documents
  documents: SAMPLE_DOCUMENTS,
  selectedDocumentId: null,
  selectedConnectorId: null,
  availableConnectors: [],
  addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    })),
  setSelectedDocument: (id) => set({ selectedDocumentId: id }),
  setSelectedConnector: (id) => set({ selectedConnectorId: id }),
  setAvailableConnectors: (connectors) => set({ availableConnectors: connectors }),
  updateDocumentId: (oldId, newId) =>
    set((state) => ({
      documents: state.documents.map((d) => (d.id === oldId ? { ...d, id: newId } : d)),
      extractions: state.extractions.map((e) =>
        e.documentId === oldId ? { ...e, documentId: newId } : e
      ),
      selectedDocumentId: state.selectedDocumentId === oldId ? newId : state.selectedDocumentId,
    })),

  // Protocols
  protocols: [],
  activeProtocolId: null,
  editedProtocolIds: [],
  addProtocol: (protocol) => set((state) => ({ protocols: [...state.protocols, protocol] })),
  updateProtocol: (id, updates) =>
    set((state) => ({
      protocols: state.protocols.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      editedProtocolIds: state.editedProtocolIds.includes(id)
        ? state.editedProtocolIds
        : [...state.editedProtocolIds, id],
    })),
  setActiveProtocol: (id) => set({ activeProtocolId: id }),
  setProtocols: (protocols) =>
    set((state) => ({
      protocols: mergeProtocolsPreservingEdits(protocols, state.protocols, state.editedProtocolIds),
    })),
  clearProtocolEdits: (id) =>
    set((state) => ({
      editedProtocolIds: state.editedProtocolIds.filter((editedId) => editedId !== id),
    })),

  // Extractions
  extractions: SAMPLE_EXTRACTIONS,
  addExtraction: (extraction) =>
    set((state) => ({ extractions: [...state.extractions, extraction] })),
  updateExtraction: (id, updates) => {
    set((state) => {
      if (
        updates.status === "rejected" ||
        updates.status === "corrected" ||
        updates.status === "reviewed"
      ) {
        const extractionToUpdate = state.extractions.find((e) => e.id === id);

        if (extractionToUpdate && extractionToUpdate.bbox instanceof Object) {
          updates.bbox = { ...extractionToUpdate.bbox };
          if (updates.bbox) {
            if (updates.status === "rejected") {
              updates.bbox.comment = (extractionToUpdate.bbox.comment || "") + " [REJECTED]";
            } else if (updates.status === "corrected") {
              const correctedText = Array.isArray(updates.correctedValue)
                ? updates.correctedValue.join(", ")
                : updates.correctedValue;
              updates.bbox.comment =
                (extractionToUpdate.bbox.comment || "") + ` [CORRECTED: ${correctedText}]`;
            } else if (updates.status === "reviewed") {
              updates.bbox.comment = (extractionToUpdate.bbox.comment || "") + " [REVIEWED]";
            }
          }
        }
      }

      return {
        extractions: state.extractions.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      };
    });
  },
  transformMappings: (mappings: any, documentId: string, ui_mappings: any[] = [], protocolId?: string) => {
    try {
      if (typeof mappings === "string") {
        mappings = JSON.parse(mappings);
      }
    } catch {
      mappings = null;
    }

    const RECORD_META_KEYS = new Set([
      "entities",
      "clauses",
      "id",
      "document_id",
      "documentId",
      "status",
      "mappings",
      "ui_mappings",
    ]);

    // entityId -> dataType, so multi_select values can be preserved as real
    // arrays below instead of the blanket String() coercion every other
    // entity type still gets. Resolve ONLY via the caller-supplied protocolId
    // (this document's own config_id) — NEVER fall back to the store's
    // globally "active" protocol, which has no guaranteed relationship to
    // whichever document is actually being transformed here. A wrong
    // fallback here wouldn't just show the wrong widget — it would make a
    // real multi_select array look like a plain string to this function,
    // which the human-review submit path then persists to the backend even
    // for fields the user never touched (get_updated_mappings overwrites
    // every field's value unconditionally). No match → entityDataType stays
    // empty → every value takes the safe (if not ideal) String() path
    // instead of a wrong dataType silently mis-encoding a real array.
    const targetProtocol = protocolId
      ? get().protocols.find((p) => p.id === protocolId)
      : undefined;
    const entityDataType: Record<string, string> = {};
    targetProtocol?.entities.forEach((e) => {
      entityDataType[e.id] = e.dataType;
      entityDataType[e.name] = e.dataType;
    });

    const resolveExtractionValue = (entityKey: string, rawValue: unknown): string | string[] => {
      if (entityDataType[entityKey] === "multi_select") {
        if (Array.isArray(rawValue)) {
          return rawValue.map((v) => String(v));
        }
        if (typeof rawValue === "string") {
          // Old documents (processed before multi_select stopped being
          // flattened) still carry a plain comma-joined string here — that's
          // not valid JSON, so this falls through to the plain-string return
          // below and keeps displaying/behaving exactly as it does today.
          try {
            const parsed = JSON.parse(rawValue);
            if (Array.isArray(parsed)) return parsed.map((v) => String(v));
          } catch {
            // not JSON — legacy joined string, fall through
          }
        }
      }
      return rawValue != null && rawValue !== undefined ? String(rawValue) : "";
    };

    const processBBOX = (bbox: any, key: string, type: string, comment?: string) => {
      if (bbox instanceof Object) {
        if (type == "bbox") {
          const { x0, y0, x1, y1, page } = bbox;
          return {
            id: key,
            type,
            page,
            comment,
            ...{
              x: x0, // Start X
              y: y0, // Start Y
              width: x1 - x0, // Difference between right and left
              height: y1 - y0,
              x0,
              y0,
              x1,
              y1,
            },
          };
        } else if (type == "cellValue") {
          const { searchValue } = bbox;
          return {
            id: key,
            type,
            searchValue,
            comment,
          };
        }
      }
      return null;
    };

    const resolveIgnoreForTraining = (record?: {
      ignoreForTraining?: boolean;
      ignore_for_training?: boolean;
    }): boolean => {
      if (record?.ignoreForTraining === false || record?.ignore_for_training === false) {
        return false;
      }
      return true;
    };

    const buildExtractionFromEntity = (
      entityKey: string,
      details: OCREntity | string | number | null,
      recordIndex: number,
      docId: string,
      existingId?: string
    ): ExtractionResult => {
      const normalized: OCREntity =
        details != null && typeof details === "object" && "value" in details
          ? (details as OCREntity)
          : { value: details ?? null, confidence: 0 };

      const value = resolveExtractionValue(entityKey, normalized.value);
      const pageNumber = resolvePageNumber(normalized.page, normalized.bbox?.page);
      const comment = `${entityKey}:${Array.isArray(value) ? value.join(", ") : value}`;

      // CSV entities carry {value, column, row} flat (no nested bbox) —
      // check that shape first so a CSV cell never falls through to the
      // PDF-bbox path below and gets a garbage {x: undefined, ...} box.
      const cellPosition = normalizeEntityCellPosition(normalized);

      return {
        id: existingId ?? `ex-${recordIndex}-${entityKey}`,
        documentId: docId,
        entityId: entityKey,
        value,
        confidence: normalized.confidence ?? 0,
        pageNumber,
        status: "auto" as const,
        ignoreForTraining: true,
        source: normalized.source,
        cell: cellPosition ? { ...cellPosition, comment } : undefined,
        bbox: cellPosition
          ? undefined
          : (normalizeEntityBbox(normalized.bbox, pageNumber, comment) ??
            (processBBOX(
              normalized.bbox,
              existingId ?? `ex-${recordIndex}-${entityKey}`,
              "bbox",
              comment
            ) as ExtractionResult["bbox"])),
      };
    };

    const isUiExtractionRecord = (record: any): boolean =>
      record != null &&
      typeof record === "object" &&
      (typeof record.id === "string" ||
        typeof record.entityId === "string" ||
        typeof record.entity_id === "string");

    const normalizeUiExtraction = (record: any, index: number, docId: string): ExtractionResult => {
      const entityId = record.entityId ?? record.entity_id ?? "unknown";
      const value = resolveExtractionValue(entityId, record.value);
      const status = record.status ?? "auto";
      return {
        id: record.id ?? `ex-ui-${index}-${entityId}`,
        documentId: record.documentId ?? record.document_id ?? docId,
        entityId,
        value,
        confidence: Number(record.confidence) || 0,
        pageNumber: resolvePageNumber(record.page, record.bbox?.page ?? record.pageNumber),
        status:
          status === "auto" ||
          status === "review" ||
          status === "reviewed" ||
          status === "corrected" ||
          status === "rejected"
            ? status
            : "auto",
        bbox: record.bbox,
        correctedValue:
          record.correctedValue !== undefined
            ? resolveExtractionValue(entityId, record.correctedValue)
            : undefined,
        reviewedBy: record.reviewedBy,
        reviewedAt: record.reviewedAt,
        preReviewStatus: record.preReviewStatus,
        ignoreForTraining: resolveIgnoreForTraining(record),
      };
    };

    const transformExtractions = (data: any[], docId: string): ExtractionResult[] => {
      if (!Array.isArray(data)) return [];

      return data.flatMap((record, recordIndex) => {
        if (record == null || typeof record !== "object") return [];

        if (isUiExtractionRecord(record)) {
          return [normalizeUiExtraction(record, recordIndex, docId)];
        }

        const entities = record.entities;
        if (entities != null && typeof entities === "object" && !Array.isArray(entities)) {
          return Object.entries(entities as Record<string, OCREntity | string | number | null>).map(
            ([entityKey, details]) =>
              buildExtractionFromEntity(entityKey, details, recordIndex, docId)
          );
        }

        const flatEntries = Object.entries(record as Record<string, unknown>).filter(
          ([key]) => !RECORD_META_KEYS.has(key)
        );

        if (flatEntries.length === 0) return [];

        return flatEntries.map(([entityKey, details]) =>
          buildExtractionFromEntity(entityKey, details as OCREntity, recordIndex, docId)
        );
      });
    };

    const transformToExtractionsObj = (
      data: Record<string, any>,
      docId: string
    ): ExtractionResult[] => {
      const extractions: ExtractionResult[] = [];
      let recordIdx = 0;
      for (let dataKey in data) {
        if (dataKey === "clauses") continue;
        const rawValue = data[dataKey];
        const value = resolveExtractionValue(dataKey, rawValue);
        const valueForComment = Array.isArray(value) ? value.join(", ") : value;
        extractions.push({
          id: `ex-${recordIdx}`,
          documentId: docId,
          entityId: dataKey,
          value,
          confidence: 0,
          pageNumber: undefined,
          status: "auto",
          ignoreForTraining: true,
          bbox: processBBOX(
            { searchValue: rawValue },
            `ex-${recordIdx}`,
            "cellValue",
            `${dataKey}:${valueForComment}`
          ) as ExtractionResult["bbox"],
        });
        recordIdx++;
      }

      return extractions;
    };

    let extractedMappings: ExtractionResult[] = [];

    try {
      if (Array.isArray(mappings)) {
        extractedMappings = transformExtractions(mappings, documentId);
      } else if (mappings && typeof mappings === "object") {
        extractedMappings = transformToExtractionsObj(mappings, documentId);
      }
    } catch (error) {
      console.error("[transformMappings] Failed to parse OCR mappings:", error, { mappings });
      extractedMappings = [];
    }

    const uiList = Array.isArray(ui_mappings) ? ui_mappings : [];

    if (extractedMappings.length === 0 && uiList.length > 0) {
      extractedMappings = uiList
        .filter((ui) => ui != null && typeof ui === "object")
        .map((ui, index) => normalizeUiExtraction(ui, index, documentId));
    } else if (uiList.length > 0) {
      extractedMappings = extractedMappings.map((extraction) => {
        const ui_mapping: any = uiList.find(
          (ui: any) =>
            ui?.id === extraction.id ||
            (ui?.entityId === extraction.entityId && ui?.documentId === extraction.documentId) ||
            ui?.entity_id === extraction.entityId
        );
        if (!ui_mapping) return extraction;

        if (
          ui_mapping.status === "rejected" ||
          ui_mapping.status === "corrected" ||
          ui_mapping.status === "reviewed"
        ) {
          if (extraction.bbox?.comment != null) {
            if (ui_mapping.status === "rejected") {
              extraction.bbox.comment += " [REJECTED]";
            } else if (ui_mapping.status === "corrected") {
              const correctedText = Array.isArray(ui_mapping.correctedValue)
                ? ui_mapping.correctedValue.join(", ")
                : ui_mapping.correctedValue;
              extraction.bbox.comment += ` [CORRECTED: ${correctedText}]`;
            } else if (ui_mapping.status === "reviewed") {
              extraction.bbox.comment += " [REVIEWED]";
            }
          }
        }
        return {
          ...extraction,
          status: ui_mapping.status || extraction.status,
          correctedValue: ui_mapping.correctedValue ?? extraction.correctedValue,
          reviewedBy: ui_mapping.reviewedBy ?? extraction.reviewedBy,
          reviewedAt: ui_mapping.reviewedAt ?? extraction.reviewedAt,
          ignoreForTraining: resolveIgnoreForTraining({
            ...extraction,
            ignoreForTraining: ui_mapping.ignoreForTraining ?? extraction.ignoreForTraining,
            ignore_for_training: ui_mapping.ignore_for_training,
          }),
        };
      });

      const filteredRejectedUiMappings = uiList
        .filter(
          (ui) =>
            ui?.status === "rejected" && !extractedMappings.some((ex) => ex && ex.id === ui.id)
        )
        .map((ui, index) => normalizeUiExtraction(ui, index, documentId));

      extractedMappings = [...extractedMappings, ...filteredRejectedUiMappings];
    }

    set((state) => {
      const preserved = state.extractions.filter((item) => item.documentId !== documentId);
      return {
        extractions: [...preserved, ...extractedMappings.filter(Boolean)],
      };
    });
  },
  enrichExtractionsFromFieldMap: (fieldMap, documentId) => {
    const record = parseFieldMapRecord(fieldMap);
    if (!record) return;

    set((state) => ({
      extractions: state.extractions.map((extraction) => {
        if (extraction.documentId !== documentId) return extraction;
        const entry = findFieldMapEntry(record, extraction.entityId);
        if (!entry) return extraction;
        return mergeEntityEntryIntoExtraction(extraction, entry);
      }),
    }));
  },
  getExtractionsByDocument: (documentId) =>
    get().extractions.filter((e) => e.documentId === documentId),

  // Workflow
  workflow: DEFAULT_WORKFLOW,
  setWorkflow: (workflow) => set({ workflow }),

  // Logs
  agentLogs: SAMPLE_LOGS,
  addAgentLog: (log) => set((state) => ({ agentLogs: [...state.agentLogs, log] })),

  // Learning Metrics
  learningMetrics: SAMPLE_METRICS,
  addLearningMetric: (metric) =>
    set((state) => ({ learningMetrics: [...state.learningMetrics, metric] })),

  // UI State
  activeTab: "pipeline",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
