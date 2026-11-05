/**
 * DRAT batch status API — EP-984.
 *
 * GET  /data/drat/upload/batches/{id}               → per-item pipeline states
 * POST /data/drat/upload/batches/{id}/retry-failed  → re-enqueue only failed items
 */

import { Axios } from "@/app/config/axios";

// ─── Item-level status ────────────────────────────────────────────────────────

/**
 * All states a batch item can be in once the batch is submitted.
 * States `pending_upload` and `uploaded` are early-pipeline states;
 * `done` is the terminal success; `duplicate`, `rejected`, and `failed`
 * are terminal failures.
 */
export type DratBatchItemStatus =
  | "pending_upload"
  | "uploaded"
  | "validating"
  | "queued"
  | "processing"
  | "done"
  | "duplicate"
  | "rejected"
  | "failed";

/** True when the item has reached a terminal state (no more polling needed). */
export function isDratItemTerminal(status: DratBatchItemStatus): boolean {
  return (
    status === "done" ||
    status === "duplicate" ||
    status === "rejected" ||
    status === "failed"
  );
}

/** True when the item needs visual attention (error / warning states). */
export function isDratItemBad(status: DratBatchItemStatus): boolean {
  return status === "duplicate" || status === "rejected" || status === "failed";
}

/** True when the item can be included in a retry-failed call. */
export function isDratItemRetryable(status: DratBatchItemStatus): boolean {
  return status === "failed";
}

export interface DratBatchItem {
  item_id: string;
  filename: string;
  status: DratBatchItemStatus;
  /** Human-readable reason for duplicate / rejected / failed states. */
  reason?: string | null;
  /** Workflow run ID once the item reaches the processing stage. */
  workflow_run_id?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Batch-level status ───────────────────────────────────────────────────────

export type DratBatchStatus =
  | "pending"
  | "uploading"
  | "complete"
  | "failed";

/** True while the batch is still moving through the pipeline. */
export function isDratBatchActive(status: DratBatchStatus): boolean {
  return status === "pending" || status === "uploading";
}

export interface DratBatchSummary {
  total: number;
  succeeded: number;
  failed: number;
  duplicate: number;
  /** Items in any in-progress state (pending_upload, uploaded, validating, queued, processing). */
  pending: number;
}

export interface DratBatchStatusResponse {
  batch_id: string;
  status: DratBatchStatus;
  file_count: number;
  summary: DratBatchSummary;
  items: DratBatchItem[];
  created_at: string;
  updated_at: string;
}

// ─── Retry response ───────────────────────────────────────────────────────────

export interface DratBatchItemRetryResponse {
  batch_id: string;
  item_id: string;
  status: string;
}

// ─── API functions ────────────────────────────────────────────────────────────

/** Fetch the current state of every item in a batch. */
export async function fetchDratBatchStatus(
  batchId: string
): Promise<DratBatchStatusResponse> {
  const response = await Axios.get<DratBatchStatusResponse>(
    `/data/drat/upload/batches/${encodeURIComponent(batchId)}`
  );
  return response.data;
}

/**
 * Re-enqueue a specific failed item in a batch.
 * POST /data/drat/upload/batches/{batch_id}/items/{item_id}/retry
 */
export async function retryDratBatchItem(
  batchId: string,
  itemId: string
): Promise<DratBatchItemRetryResponse> {
  const response = await Axios.post<DratBatchItemRetryResponse>(
    `/data/drat/upload/batches/${encodeURIComponent(batchId)}/items/${encodeURIComponent(itemId)}/retry`
  );
  return response.data;
}

/**
 * Re-enqueue all failed items in a batch.
 */
export async function retryDratBatchAllFailed(
  batchId: string,
  failedItemIds: string[]
): Promise<DratBatchItemRetryResponse[]> {
  return Promise.all(
    failedItemIds.map((itemId) => retryDratBatchItem(batchId, itemId))
  );
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const BATCH_ITEM_STATUS_LABEL: Record<DratBatchItemStatus, string> = {
  pending_upload: "Pending upload",
  uploaded: "Uploaded",
  validating: "Validating",
  queued: "Queued",
  processing: "Processing",
  done: "Done",
  duplicate: "Duplicate",
  rejected: "Rejected",
  failed: "Failed",
};
