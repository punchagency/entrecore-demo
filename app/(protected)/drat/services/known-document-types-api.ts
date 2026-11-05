import { Axios } from "@/app/config/axios";

/**
 * Known document-type values used to suggest stable routing values in the
 * condition editor. Per the DRAT deterministic-routing design these are the
 * union of `ocr_documents.document_type` and `identity_documents.doc_metadata`.
 *
 * The backend endpoint ships with a separate story. Until then (and on any
 * failure) this returns `[]`, so the editor simply falls back to a free-text
 * `document_type` input. The path is assumed to mirror the other DRAT settings
 * endpoints — confirm it when the backend lands.
 */
const KNOWN_DOCUMENT_TYPES_URL = "/data/drat-entities/settings/known-document-types";

type KnownTypeEntry = string | { document_type?: unknown; name?: unknown } | null;

function coerceType(entry: KnownTypeEntry): string {
  if (typeof entry === "string") return entry.trim();
  if (entry && typeof entry === "object") {
    const value = entry.document_type ?? entry.name;
    return typeof value === "string" ? value.trim() : "";
  }
  return "";
}

export async function getKnownDocumentTypes(): Promise<string[]> {
  try {
    const response = await Axios.get<unknown>(KNOWN_DOCUMENT_TYPES_URL);
    const data = response.data;
    const raw = Array.isArray(data)
      ? data
      : (data as { document_types?: unknown; items?: unknown } | null)?.document_types ??
        (data as { items?: unknown } | null)?.items;
    if (!Array.isArray(raw)) return [];
    // De-duplicate while preserving order.
    return Array.from(
      new Set((raw as KnownTypeEntry[]).map(coerceType).filter(Boolean))
    );
  } catch {
    // Endpoint not available yet (or any transient failure) — degrade to free text.
    return [];
  }
}
