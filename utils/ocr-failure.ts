import { jobFailureMessage } from "./api-error";

/**
 * Readable failure reasons for abstraction (OCR) documents. The backend stores no reason on the
 * document: a failure sets its status to "error in <stage it was in>", and the socket message
 * appends the raw exception (`str(e)`) to a fixed sentence. These turn both into text for users.
 */

// What the document was doing in each backend status (see `_get_file_status` in ocr_service.py).
const STAGE_DESCRIPTIONS: [status: string, description: string][] = [
  ["pending", "before processing started"],
  ["uploading", "uploading the file"],
  ["processing", "reading the document (OCR)"],
  ["extracting", "extracting its text"],
  ["initiate mapping", "mapping fields to the protocol"],
  ["mapping data", "mapping fields to the protocol"],
  ["finalize mapping", "mapping fields to the protocol"],
  ["needs review", "preparing it for review"],
];

/**
 * The reason for a failed document, from its raw backend status ("error in extracting"), or
 * null when the status isn't an error.
 */
export function documentFailureReason(rawStatus: unknown): string | null {
  if (typeof rawStatus !== "string") return null;
  const status = rawStatus.trim().toLowerCase();
  if (!status.includes("error")) return null;
  // A retried document that fails again becomes "error in error in …".
  const stage = status.replace(/^(error in\s+)+/, "");
  const description = STAGE_DESCRIPTIONS.find(([key]) => stage.includes(key))?.[1];
  return description
    ? `Processing failed while ${description}. Retry it, or share the document ID with support.`
    : "Processing failed. Retry it, or share the document ID with support.";
}

// "Error processing File <name> . Kindly retry the process or contact our support. <str(e)>"
const OCR_FAILURE_MESSAGE = /^Error processing File (.+?)\s*\.\s*Kindly retry the process or contact our support\./i;

/** The text for a failed `ocr_response` socket message, without the exception the backend appends. */
export function ocrFailureMessage(message: unknown): string {
  const text = typeof message === "string" ? message.trim() : "";
  const known = OCR_FAILURE_MESSAGE.exec(text);
  if (known) return `Couldn't process ${known[1]}. Retry it, or contact support.`;
  return jobFailureMessage({ message: text }, "OCR processing failed. Retry it, or contact support.");
}
