import type { ExtractionResult } from "@/app/store/abstractionStore";

export interface OcrEntityEntry {
  value?: string | number | null;
  confidence?: number;
  page?: number | null;
  source?: string;
  span?: { start?: number; end?: number };
  bbox?: Record<string, number | null | undefined>;
}

export function resolvePageNumber(
  page?: number | null,
  bboxPage?: number | null
): number | undefined {
  const raw = bboxPage ?? page;
  if (raw == null || Number.isNaN(Number(raw))) return undefined;
  const numeric = Number(raw);
  if (numeric <= 0) return undefined;
  return numeric;
}

export function normalizeEntityBbox(
  raw: unknown,
  page?: number,
  comment?: string
): ExtractionResult["bbox"] | undefined {
  if (raw == null || typeof raw !== "object") return undefined;

  const bbox = raw as Record<string, number | null | undefined>;
  const resolvedPage = resolvePageNumber(page, bbox.page);
  if (resolvedPage == null) return undefined;

  if (
    bbox.x0 != null &&
    bbox.y0 != null &&
    bbox.x1 != null &&
    bbox.y1 != null
  ) {
    return {
      x: bbox.x0,
      y: bbox.y0,
      width: bbox.x1 - bbox.x0,
      height: bbox.y1 - bbox.y0,
      page: resolvedPage,
      comment,
    };
  }

  if (
    bbox.x != null &&
    bbox.y != null &&
    bbox.width != null &&
    bbox.height != null
  ) {
    return {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
      page: resolvedPage,
      comment,
    };
  }

  return undefined;
}

export function findFieldMapEntry(
  record: Record<string, OcrEntityEntry>,
  entityId: string
): OcrEntityEntry | undefined {
  const direct = record[entityId];
  if (direct && typeof direct === "object") return direct;
  const match = Object.entries(record).find(
    ([key]) => key.toLowerCase() === entityId.toLowerCase()
  );
  return match?.[1];
}

export function parseFieldMapRecord(fieldMap: unknown): Record<string, OcrEntityEntry> | null {
  let parsed: unknown = fieldMap;
  if (typeof fieldMap === "string") {
    try {
      parsed = JSON.parse(fieldMap);
    } catch {
      return null;
    }
  }

  if (Array.isArray(parsed)) {
    const first = parsed.find((item) => item != null && typeof item === "object");
    return first && typeof first === "object" ? (first as Record<string, OcrEntityEntry>) : null;
  }

  if (parsed != null && typeof parsed === "object") {
    return parsed as Record<string, OcrEntityEntry>;
  }

  return null;
}

export function mergeEntityEntryIntoExtraction(
  extraction: ExtractionResult,
  entry: OcrEntityEntry
): ExtractionResult {
  const comment =
    extraction.bbox?.comment ?? `${extraction.entityId}:${extraction.correctedValue ?? extraction.value}`;
  const pageNumber = resolvePageNumber(entry.page, entry.bbox?.page) ?? extraction.pageNumber;
  const bbox =
    normalizeEntityBbox(entry.bbox, pageNumber, comment) ??
    (extraction.bbox && pageNumber != null
      ? { ...extraction.bbox, page: extraction.bbox.page ?? pageNumber }
      : extraction.bbox);

  return {
    ...extraction,
    pageNumber,
    confidence: entry.confidence ?? extraction.confidence,
    source: entry.source ?? extraction.source,
    bbox,
  };
}

export function hasHighlightBbox(extraction: ExtractionResult): boolean {
  const bbox = extraction.bbox;
  if (!bbox || typeof bbox !== "object") return false;
  return (
    bbox.x != null &&
    bbox.y != null &&
    bbox.width != null &&
    bbox.height != null &&
    bbox.width > 0 &&
    bbox.height > 0
  );
}

/**
 * CSV entities carry {value, column, row} instead of a PDF-style bbox — the
 * model reads the raw file directly, so row/column are the cell's absolute
 * spreadsheet position (row 1 = the file's literal first line, column 1 =
 * the leftmost column), not a page-relative pixel box.
 */
export function normalizeEntityCellPosition(
  raw: unknown
): { row: number; column: number } | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const cell = raw as Record<string, number | null | undefined>;
  if (cell.row == null || cell.column == null) return undefined;
  const row = Number(cell.row);
  const column = Number(cell.column);
  if (!Number.isFinite(row) || !Number.isFinite(column) || row <= 0 || column <= 0) {
    return undefined;
  }
  return { row, column };
}

export function hasCellPosition(extraction: ExtractionResult): boolean {
  return extraction.cell != null;
}

const PLACEHOLDER_SOURCE_PATTERNS = [
  /^look for\b/i,
  /^placeholder for\b/i,
  /^for purposes of this\b/i,
  /^all provisions requiring\b/i,
  /^match by same client\b/i,
];

export function isPlaceholderSource(source?: string): boolean {
  if (!source?.trim()) return true;
  return PLACEHOLDER_SOURCE_PATTERNS.some((pattern) => pattern.test(source.trim()));
}

/** Comma-joins a multi_select array for display (annotation comments, etc.);
 * every other value type passes through unchanged. */
export function formatExtractionValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

/** Array-aware equality — `!==` on two array instances is a reference
 * comparison, which would treat two identical-content multi_select arrays
 * as "different" (e.g. flagging a no-op correction as changed). */
export function extractionValuesEqual(
  a: string | string[] | undefined,
  b: string | string[] | undefined
): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
}

export function getExtractionSearchPhrase(extraction: ExtractionResult): string | undefined {
  const source = extraction.source?.trim();
  if (source && source.length > 8 && !isPlaceholderSource(source)) {
    return source.replace(/\s+/g, " ").trim().slice(0, 160);
  }

  // A multi_select value is an array — search on just its first element,
  // mirroring the backend's own enrich_with_bounding_boxes behavior (it
  // locates on the first selected value too), since a comma-joined phrase
  // like "Common, Preferred" is unlikely to appear verbatim in the source
  // document and would never match.
  const rawValue = extraction.correctedValue || extraction.value;
  const candidate = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const value = candidate?.trim();
  if (!value || value === "[]" || value.length < 4) return undefined;
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}
