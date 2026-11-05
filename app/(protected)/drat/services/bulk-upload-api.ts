/**
 * DRAT bulk intake API — EP-984.
 *
 * Two-phase so no file bytes reach the API:
 *   POST /data/drat/upload/batches                 -> batch + one signed PUT URL per file
 *   PUT  <signed url>                              -> browser uploads straight to GCS
 *   POST /data/drat/upload/batches/{id}/complete   -> API queues staging
 *
 * The API only ever receives filenames and sizes. Company scope comes from the JWT.
 */

import axios, { type AxiosProgressEvent } from "axios";

import { Axios } from "@/app/config/axios";

/** Mirrors the backend defaults (DRAT_BULK_MAX_FILES / DRAT_BULK_MAX_FILE_BYTES). */
export const DRAT_BULK_MAX_FILES = 30;
export const DRAT_BULK_MAX_FILE_MB = 100;
const DRAT_BULK_MAX_FILE_BYTES = DRAT_BULK_MAX_FILE_MB * 1024 * 1024;
const DRAT_BULK_MAX_FILENAME_LENGTH = 512;

/** Bulk is pdf/docx only — .doc stays on the single-file path. */
const BULK_ALLOWED_EXTENSIONS = [".pdf", ".docx"] as const;

export interface DratBulkUploadFileRequest {
  filename: string;
  size_bytes: number;
}

export interface DratBulkUploadItemTicket {
  item_id: string;
  filename: string;
  object_path: string;
  /** V4 signed PUT URL. */
  upload_url: string;
  /** Signed into the URL — must be sent as the Content-Type header. */
  content_type: string;
  expires_at: string;
}

export interface DratBulkUploadBatchCreatedResponse {
  batch_id: string;
  status: string;
  file_count: number;
  /** True when the Idempotency-Key matched an existing batch and it was re-signed. */
  replayed: boolean;
  items: DratBulkUploadItemTicket[];
}

export interface DratBulkUploadAcceptedResponse {
  status: string;
  batch_id: string;
  enqueued: boolean;
}

export function getDratBulkAcceptAttribute(): string {
  return ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Client-side pre-check matching the server's batch validation. Returns a
 * reason the file cannot go in a bulk batch, or null when it can. The server
 * rejects the whole batch if any one file fails, so bad files never reach it.
 */
export function getDratBulkFileRejection(file: File): string | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".doc")) {
    return "Wrong type: .doc isn't supported in bulk upload. Use single-file upload.";
  }
  if (!BULK_ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Wrong type: only .pdf and .docx files are accepted.";
  }
  if (file.size === 0) {
    return "Empty file (0 bytes).";
  }
  if (file.size > DRAT_BULK_MAX_FILE_BYTES) {
    return `Too large: ${formatBytes(file.size)}. The limit is ${DRAT_BULK_MAX_FILE_MB} MB.`;
  }
  if (file.name.length > DRAT_BULK_MAX_FILENAME_LENGTH) {
    return `Filename is longer than ${DRAT_BULK_MAX_FILENAME_LENGTH} characters.`;
  }
  return null;
}

/**
 * Create a batch and get one signed PUT URL per file.
 *
 * Sending the same Idempotency-Key and files again returns the same batch with
 * freshly signed URLs — that is how expired URLs are renewed for retries.
 */
export async function createDratUploadBatch(
  files: DratBulkUploadFileRequest[],
  idempotencyKey: string
): Promise<DratBulkUploadBatchCreatedResponse> {
  const response = await Axios.post<DratBulkUploadBatchCreatedResponse>(
    "/data/drat/upload/batches",
    { files },
    { headers: { "Idempotency-Key": idempotencyKey } }
  );
  return response.data;
}

/** Mark the batch uploaded and queue staging. Idempotent on the server. */
export async function completeDratUploadBatch(
  batchId: string
): Promise<DratBulkUploadAcceptedResponse> {
  const response = await Axios.post<DratBulkUploadAcceptedResponse>(
    `/data/drat/upload/batches/${encodeURIComponent(batchId)}/complete`
  );
  return response.data;
}

/**
 * Bare client for the signed PUTs. It must not be the app's `Axios` instance:
 * that one adds a Bearer token, and GCS rejects a signed URL that also carries
 * an Authorization header.
 */
const storageClient = axios.create();

/** PUT one file straight to GCS through its signed URL. */
export async function putDratUploadObject(
  ticket: Pick<DratBulkUploadItemTicket, "upload_url" | "content_type">,
  file: File,
  options: {
    onProgress?: (loaded: number) => void;
    signal?: AbortSignal;
  } = {}
): Promise<void> {
  await storageClient.put(ticket.upload_url, file, {
    headers: { "Content-Type": ticket.content_type },
    signal: options.signal,
    onUploadProgress: (event: AxiosProgressEvent) => {
      options.onProgress?.(event.loaded);
    },
  });
}

/** A per-file reason for a failed PUT, readable without opening devtools. */
export function getDratStorageUploadErrorMessage(error: unknown): string {
  if (axios.isCancel(error)) return "Upload cancelled.";
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "Upload failed.";
  }

  const status = error.response?.status;
  if (!status) {
    return "Network error: the file didn't reach storage. Check your connection and retry.";
  }

  // GCS answers with an XML <Error><Code>…</Code></Error> body.
  const body = typeof error.response?.data === "string" ? error.response.data : "";
  const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1];
  const label = code ? `${code}, HTTP ${status}` : `HTTP ${status}`;

  if (status >= 500) return `Storage is unavailable (${label}). Retry in a moment.`;
  return `Storage rejected the upload (${label}). Retry to get a fresh upload link.`;
}
