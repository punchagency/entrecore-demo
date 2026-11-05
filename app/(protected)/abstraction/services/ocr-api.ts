import { Axios } from "@/app/config/axios";
import { documentFailureReason } from "@/utils/ocr-failure";

// ---------- Types ----------

export interface EntityConfigPayloadItem {
  name: string;
  description: string;
  dataType: string;
  optionList: string[];
  defaultValue: string;
  /**
   * Only meaningful when dataType is "single_select"/"multi_select". This
   * pointer persists in entities_config, but the backend never writes
   * fetched values back into optionList here — it resolves them fresh on
   * every extraction run instead, so optionList round-trips through this
   * API exactly as typed, never pre-populated from the data source.
   */
  dataSource?: { connectorConfigId: string; table: string; column: string; datasetName?: string };
  /**
   * Marks this field as the one a document is split on: the backend emits one
   * record per occurrence of it (see _record_key_entities in ocr_service.py),
   * instead of leaving single-vs-multi record to a classifier that only reads
   * the document's first 2000 chars. Optional — omitted/false means the
   * previous behaviour, unchanged.
   */
  isRecordKey?: boolean;
  /**
   * Marks this field as one the backend must COPY out of the document rather
   * than write in its own words: the value is replaced by a slice of the
   * source text, anchored by the verbatim pass (see _verbatim_entities and
   * _apply_verbatim_slicing in ocr_service.py). No backend schema carries this
   * key — entities_config is typed `list[dict]`, so it round-trips through the
   * JSON column untouched, exactly like isRecordKey.
   *
   * Only honoured for dataType "text"/"long_text"; the backend drops it for
   * normalised types (date, currency, single_select, …) via
   * _VERBATIM_EXCLUDED_TYPES. Optional — omitted/false leaves the field to the
   * description-keyword and env-var signals, which this flag does not override.
   */
  isVerbatim?: boolean;
}

/**
 * How documents under a protocol split into records. Declared by the protocol
 * author so the backend never has to ask an LLM classifier, which reads only
 * the first 2000 chars and gets it wrong on long single documents (a charter
 * misread as "multi" is extracted in one call and its full-text fields come
 * back truncated).
 *
 *  single             one file = one record
 *  multi              a table/list of independent rows = N records
 *  single_split_multi one file split into one record per occurrence of the
 *                     entity flagged isRecordKey. Needs such an entity — the
 *                     backend falls back to `single` if none is flagged.
 *
 * null/undefined leaves the decision to the classifier (previous behaviour).
 */
export type ExtractionMode = "single" | "multi" | "single_split_multi";

export interface OcrConfiguration {
  id?: string;
  name: string;
  description: string;
  entities_config: EntityConfigPayloadItem[];
  clauses_config: Record<string, string>;
  extraction_mode?: ExtractionMode | null;
  /**
   * The BigQuery table this protocol stages extracted rows into. Nullable, and
   * empty for every protocol predating the column — resolve it through
   * `effectiveStagingTable` in ./staging-table rather than reading it directly,
   * or you will disagree with the backend for those rows.
   */
  staging_table_name?: string | null;
}

export interface CreateOcrConfigurationRequest {
  name: string;
  description: string;
  entities_config: EntityConfigPayloadItem[];
  clauses_config: Record<string, string>;
  extraction_mode?: ExtractionMode | null;
}

export interface UpdateOcrConfigurationRequest {
  name: string;
  description: string;
  entities_config: EntityConfigPayloadItem[];
  clauses_config: Record<string, string>;
  extraction_mode?: ExtractionMode | null;
}

export interface HumanReviewMapping {
  [key: string]: any;
}

export interface HumanReviewRequest {
  document_id: string;
  updated_mappings: HumanReviewMapping[];
  connector_id?: string | null;
}

export interface CompleteReviewRequest {
  document_id: string;
  ui_mappings: HumanReviewMapping[];
  connector_id: string;
  /** Only sent when present on the document; backend resolves from document_id otherwise. */
  workflow_run_id?: string;
}

/** Resolve workflow run id from OCR document payloads (fetch-document / list). */
export function extractWorkflowRunId(
  source: Record<string, unknown> | null | undefined
): string | null {
  if (!source || typeof source !== "object") return null;

  const directKeys = [
    "workflow_run_id",
    "workflow_run_Id",
    "workflowRunId",
    "workflow_runid",
    "run_id",
  ];
  for (const key of directKeys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const nested = source.workflow_run ?? source.workflowRun;
  if (nested && typeof nested === "object") {
    const nestedRecord = nested as Record<string, unknown>;
    const nestedId = nestedRecord.id ?? nestedRecord.run_id;
    if (typeof nestedId === "string" && nestedId.trim()) return nestedId.trim();
  }

  return null;
}

export interface OcrFetchedDocument {
  id: string;
  name: string;
  status?: "uploading" | "ocr_processing" | "extracting" | "review" | "completed" | "failed";
  type?: "pdf" | "scanned_pdf" | "docx" | "image";
  pageCount?: number;
  ocrAccuracy?: number;
  size?: number;
  uploadedAt?: string;
  sourceUrl?: string;
  protocolId?: string;
  protocolName?: string;
  workflowRunId?: string;
  /** Readable reason for a failed document (the backend stores only the stage it failed in). */
  failureReason?: string;
  raw?: Record<string, any>;
}

// ---------- API Functions ----------

/**
 * Upload a document for OCR processing.
 * POST /api/v1/data/ocr/upload/{config_id}
 *
 * @param configId - The target OCR configuration id
 * @param file - The file to upload (PDF, DOCX, PNG, JPEG, TIFF)
 * @returns The server response string (structured data staged by OCR)
 */
export async function uploadOcrDocument(
  configId: string,
  file: File
): Promise<Record<string, string>> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await Axios.post<Record<string, string>>(
    `/data/ocr/upload/${configId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

/**
 * List all OCR configurations for the company.
 * GET /api/v1/data/ocr/configurations
 */
export async function listOcrConfigurations(): Promise<OcrConfiguration[]> {
  const response = await Axios.get<OcrConfiguration[]>("/data/ocr/configurations");
  return response.data;
}

/** One entity proposed by Auto Create Protocol. Same shape as
 *  EntityConfigPayloadItem so it can go straight back out on Deploy. */
export interface InferredEntity {
  name: string;
  description: string;
  dataType: string;
  optionList: string[];
  defaultValue: string;
  isRecordKey: boolean;
  isVerbatim: boolean;
  dataSource?: EntityConfigPayloadItem["dataSource"] | null;
}

/** A destination column that was deliberately NOT turned into an entity. */
export interface SkippedField {
  name: string;
  airtable_type: string;
  /** "computed" — Airtable calculates it, writing to it fails the whole batch.
   *  "unsupported" — writable, but not producible from document text
   *  (attachments, collaborators). */
  reason: "computed" | "unsupported";
}

export interface InferEntitiesRequest {
  connector_config_id: string;
  /** CATALOG table name, as /catalog-browse returns it — not the Airtable
   *  display name. The backend resolves it to the API name itself. */
  table: string;
  /** For Airtable this is the base id, which the crawler stores as the table's
   *  dataset_name. Supplying it lets the backend skip base discovery. */
  dataset_name?: string | null;
  /** Opt in to AI-drafted descriptions for fields that have none. Fields that
   *  already carry an Airtable description always keep it verbatim. */
  draft_descriptions?: boolean;
}

export interface InferEntitiesResponse {
  table: string;
  entities: InferredEntity[];
  skipped_fields: SkippedField[];
  warnings: string[];
  descriptions_drafted: number;
}

/**
 * Auto Create Protocol — read an Airtable table's schema and propose entities.
 * POST /api/v1/data/ocr/configurations/infer-entities
 *
 * Persists NOTHING. The response prefills the protocol form; the user reviews
 * it and saves through createOcrConfiguration/updateOcrConfiguration as usual.
 */
export async function inferProtocolEntities(
  payload: InferEntitiesRequest
): Promise<InferEntitiesResponse> {
  const response = await Axios.post<InferEntitiesResponse>(
    "/data/ocr/configurations/infer-entities",
    payload
  );
  return response.data;
}

/**
 * Create a new OCR configuration.
 * POST /api/v1/data/ocr/configurations
 *
 * @param payload - Configuration object with name, description, entities_config, clauses_config
 */
export async function createOcrConfiguration(
  payload: CreateOcrConfigurationRequest
): Promise<OcrConfiguration> {
  const response = await Axios.post<OcrConfiguration>("/data/ocr/configurations", payload);
  return response.data;
}

/**
 * Update an existing OCR configuration.
 * PUT /api/v1/data/ocr/configurations/{config_id}
 *
 * @param configId - Existing configuration id
 * @param payload - Configuration object with name, description, entities_config, clauses_config
 */
export async function updateOcrConfiguration(
  configId: string,
  payload: UpdateOcrConfigurationRequest
): Promise<OcrConfiguration> {
  const response = await Axios.put<OcrConfiguration>(
    `/data/ocr/configurations/${configId}`,
    payload
  );
  return response.data;
}

/**
 * Fetch the document description.
 * GET /api/v1/data/ocr/fetch-document/{document_id}
 *
 * @param documentId - The ID of the document to fetch
 */
export async function fetchOcrDocument(documentId: string): Promise<Record<string, any> | null> {
  const response = await Axios.get<Record<string, any> | null>(
    `/data/ocr/fetch-document/${documentId}`
  );
  return response.data;
}

function normalizeStatus(status: unknown): OcrFetchedDocument["status"] {
  if (typeof status !== "string") return "review";
  const normalizedStatus = status.trim().toLowerCase().replace(/[_-]/g, " ");
  if (normalizedStatus === "uploading") return "uploading";
  if (normalizedStatus === "ocr processing") return "ocr_processing";
  if (normalizedStatus === "extracting") return "extracting";
  if (normalizedStatus === "completed") return "completed";
  if (normalizedStatus.includes("error")) return "failed";
  if (normalizedStatus === "needs review" || normalizedStatus === "review") return "review";
  return "ocr_processing";
}

function normalizeType(mimeType: unknown): OcrFetchedDocument["type"] {
  if (typeof mimeType !== "string") return "pdf";
  const normalizedType = mimeType.toLowerCase();
  if (normalizedType.includes("pdf")) return "pdf";
  if (normalizedType.includes("word") || normalizedType.includes("docx")) return "docx";
  if (normalizedType.startsWith("image/")) return "image";
  return "pdf";
}
/**
 * Fetch all company OCR documents.
 * GET /api/v1/data/ocr/fetch-all-documents
 */
export async function fetchAllOcrDocuments(): Promise<OcrFetchedDocument[] | void> {
  try {
    const response = await Axios.get<any>("/data/ocr/fetch-all-documents");
    const payload = response.data;

    const documents = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.documents)
        ? payload.documents
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

    return documents
      .map((item: Record<string, any>, index: number): OcrFetchedDocument | null => {
        const idCandidate = item?.document_id ?? item?.id ?? item?.doc_id;
        if (!idCandidate) return null;

        const statusPercentage =
          typeof item?.status_percentage === "number" ? item.status_percentage : undefined;
        const normalizedStatus = normalizeStatus(item?.status);

        return {
          id: String(idCandidate),
          name: String(
            item?.file_name ?? item?.document_name ?? item?.name ?? `Document ${index + 1}`
          ),
          status: normalizedStatus,
          type: normalizeType(item?.document_type),
          pageCount:
            typeof item?.page_count === "number"
              ? item.page_count
              : typeof item?.pages === "number"
                ? item.pages
                : undefined,
          ocrAccuracy:
            typeof item?.ocr_accuracy === "number"
              ? item.ocr_accuracy
              : typeof item?.accuracy === "number"
                ? item.accuracy
                : typeof statusPercentage === "number"
                  ? statusPercentage
                  : undefined,
          size:
            typeof item?.file_size === "number"
              ? item.file_size
              : typeof item?.size === "number"
                ? item.size
                : undefined,
          uploadedAt:
            typeof item?.uploaded_at === "string"
              ? item.uploaded_at
              : typeof item?.created_at === "string"
                ? item.created_at
                : undefined,
          sourceUrl:
            typeof item?.file_url === "string"
              ? item.file_url
              : typeof item?.raw_ocr_url === "string"
                ? item.raw_ocr_url
                : undefined,
          protocolId: typeof item?.config_id === "string" ? item.config_id : undefined,
          workflowRunId: extractWorkflowRunId(item) ?? undefined,
          failureReason: documentFailureReason(item?.status) ?? undefined,
          raw: item,
        };
      })
      .filter((item: OcrFetchedDocument | null): item is OcrFetchedDocument => item !== null);
  } catch (e) {
    throw e;
  }
}

/**
 * Submit human review for a document.
 * POST /api/v1/data/ocr/human-review/{document_id}
 *
 * @param documentId - The ID of the document
 * @param payload - The updated mappings
 */
export async function submitHumanReview(
  documentId: string,
  payload: HumanReviewRequest
): Promise<string> {
  const response = await Axios.post<string>(`/data/ocr/human-review/${documentId}`, payload);
  return response.data;
}

/**
 * Submit human review for a document.
 * POST /api/v1/data/ocr/complete-review/{document_id}
 *
 * @param documentId - The ID of the document
 * @param payload - The ui mappings and connector_id
 */
export async function submitCompleteReview(
  documentId: string,
  payload: CompleteReviewRequest
): Promise<string> {
  const response = await Axios.post<string>(`/data/ocr/complete-review/${documentId}`, payload);
  return response.data;
}

export type OcrReviewEndpoint = "human-review" | "complete-review";

/**
 * New UI + correct API for the document:
 * - Legacy OCR uploads (no workflow run) → human-review (old path)
 * - Workflow-engine documents (has workflow_run_id) → complete-review (new path)
 */
export async function submitOcrReview(
  documentId: string,
  params: {
    connector_id: string;
    ui_mappings: HumanReviewMapping[];
    documentMetadata?: Record<string, unknown> | null;
  }
): Promise<{ endpoint: OcrReviewEndpoint }> {
  const workflowRunId = extractWorkflowRunId(params.documentMetadata);

  if (workflowRunId) {
    await submitCompleteReview(documentId, {
      document_id: documentId,
      ui_mappings: params.ui_mappings,
      connector_id: params.connector_id,
      workflow_run_id: workflowRunId,
    });
    return { endpoint: "complete-review" };
  }

  const legacyKeyMappings = params.ui_mappings.map((mapping) => {
    const entityKey =
      typeof mapping.entityId === "string"
        ? mapping.entityId
        : typeof mapping.entity_id === "string"
          ? mapping.entity_id
          : null;
    if (!entityKey) return mapping;
    const value =
      typeof mapping.correctedValue === "string" || Array.isArray(mapping.correctedValue)
        ? mapping.correctedValue
        : typeof mapping.value === "string" || Array.isArray(mapping.value)
          ? mapping.value
          : typeof mapping.value === "number"
            ? String(mapping.value)
            : "";
    return { [entityKey]: value };
  });

  await submitHumanReview(documentId, {
    document_id: documentId,
    updated_mappings: legacyKeyMappings,
    connector_id: params.connector_id,
  });
  return { endpoint: "human-review" };
}

export function isWorkflowRunIdError(detail: unknown): boolean {
  if (typeof detail !== "string") return false;
  const normalized = detail.toLowerCase();
  return (
    normalized.includes("run id") || normalized.includes("run_id") || /worl?k?flow/.test(normalized)
  );
}

export interface TestExtractionRequest {
  doc_id: string;
  config_id: string;
  entity_names?: string[];
  include_corrections?: boolean;
  evaluate_clauses?: boolean;
}

export interface TestExtractionResponse {
  doc_id: string;
  config_id: string;
  document_status: string;
  field_map: unknown;
  extraction_at: string;
}

/**
 * Read-only extraction dry-run using cached OCR output.
 * POST /api/v1/data/ocr/test-extraction
 */
export async function testExtraction(
  payload: TestExtractionRequest
): Promise<TestExtractionResponse> {
  const response = await Axios.post<TestExtractionResponse>("/data/ocr/test-extraction", {
    doc_id: payload.doc_id,
    config_id: payload.config_id,
    entity_names: payload.entity_names,
    include_corrections: payload.include_corrections ?? true,
    evaluate_clauses: payload.evaluate_clauses ?? true,
  });
  return response.data;
}
