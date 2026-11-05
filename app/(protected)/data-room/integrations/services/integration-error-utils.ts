export interface IntegrationCompileError {
  code: string;
  message: string;
}

export interface IntegrationApiErrorDetail {
  message?: string;
  compile_errors?: IntegrationCompileError[];
  preflight_errors?: string[];
}

export interface CompileErrorMappingRef {
  sourceColumn: string;
  destinationColumn: string;
}

function normalizeMappingColumnName(column: string): string {
  return column.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/** Pairs from messages like mapping[clause->Case]. */
export function getCompileErrorMappingRefs(
  errors: IntegrationCompileError[]
): CompileErrorMappingRef[] {
  const refs: CompileErrorMappingRef[] = [];
  const seen = new Set<string>();

  for (const error of errors) {
    const mappingMatch = error.message.match(/mapping\[([^->\]]+)->([^\]]+)\]/);
    if (!mappingMatch?.[1] || !mappingMatch?.[2]) continue;

    const sourceColumn = mappingMatch[1].trim();
    const destinationColumn = mappingMatch[2].trim();
    const key = `${sourceColumn}::${destinationColumn}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ sourceColumn, destinationColumn });
  }

  return refs;
}

/** Extract destination columns referenced in compiler error messages. */
export function getBlockedDestinationColumnsFromCompileErrors(
  errors: IntegrationCompileError[]
): string[] {
  const columns = new Set<string>();

  for (const ref of getCompileErrorMappingRefs(errors)) {
    columns.add(ref.destinationColumn);
  }

  for (const error of errors) {
    const fieldMatch = error.message.match(/destination_column '([^']+)'/);
    if (fieldMatch?.[1]) columns.add(fieldMatch[1]);

    const targetFieldMatch = error.message.match(/target field '([^']+)'/);
    if (targetFieldMatch?.[1]) columns.add(targetFieldMatch[1]);
  }

  return Array.from(columns);
}

export function isMappingBlockedByCompileErrors(
  mapping: { source_column: string; destination_column: string },
  errors: IntegrationCompileError[]
): boolean {
  const refs = getCompileErrorMappingRefs(errors);
  const normalizedDest = normalizeMappingColumnName(mapping.destination_column);
  const normalizedSource = normalizeMappingColumnName(mapping.source_column);

  for (const ref of refs) {
    const refDest = normalizeMappingColumnName(ref.destinationColumn);
    const refSource = normalizeMappingColumnName(ref.sourceColumn);

    if (normalizedDest === refDest && normalizedSource === refSource) return true;
    if (normalizedDest === refDest) return true;
  }

  for (const destination of getBlockedDestinationColumnsFromCompileErrors(errors)) {
    if (normalizedDest === normalizeMappingColumnName(destination)) return true;
  }

  return false;
}

export function filterMappingsBlockedByCompileErrors<
  T extends { source_column: string; destination_column: string },
>(mappings: T[], errors: IntegrationCompileError[]): T[] {
  return mappings.filter((mapping) => !isMappingBlockedByCompileErrors(mapping, errors));
}

export function findMappingsBlockedByCompileErrors<
  T extends { source_column: string; destination_column: string },
>(mappings: T[], errors: IntegrationCompileError[]): T[] {
  return mappings.filter((mapping) => isMappingBlockedByCompileErrors(mapping, errors));
}

export function filterMappingsToWritableDestinations<
  T extends { destination_column: string },
>(mappings: T[], blockedDestinations: string[]): T[] {
  if (!blockedDestinations.length) return mappings;
  const blocked = new Set(blockedDestinations.map(normalizeMappingColumnName));
  return mappings.filter(
    (mapping) => !blocked.has(normalizeMappingColumnName(mapping.destination_column))
  );
}

export function mappingsStillBlockedOnServer<
  T extends { source_column: string; destination_column: string },
>(mappings: T[], errors: IntegrationCompileError[]): boolean {
  return findMappingsBlockedByCompileErrors(mappings, errors).length > 0;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toCompileErrors(value: unknown): IntegrationCompileError[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is IntegrationCompileError =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as IntegrationCompileError).code === "string" &&
      typeof (item as IntegrationCompileError).message === "string"
  );
}

/**
 * Reads an integration API error (EP-1004 contract): `message` first, then `detail` (string,
 * 422 list or object), plus `compile_errors` / `preflight_errors`, which the platform keeps as
 * top-level extras on 4xx bodies (older responses nest them under `detail`). Preflight errors
 * replace the message, since they are the specific reasons. Returns null when the response
 * carries nothing usable, so callers fall back to the shared helpers.
 */
export function parseIntegrationApiError(
  error: unknown
): { message: string; compileErrors: IntegrationCompileError[] } | null {
  const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;
  if (data == null) return null;

  if (typeof data === "string") {
    // Short plain text only; never an HTML proxy page.
    const text = nonEmptyString(data);
    return text && !text.startsWith("<") && text.length <= 300 ? { message: text, compileErrors: [] } : null;
  }
  if (typeof data !== "object" || Array.isArray(data)) return null;

  const body = data as IntegrationApiErrorDetail & { detail?: unknown };
  const detail = body.detail;
  const detailObject = (
    detail && typeof detail === "object" && !Array.isArray(detail) ? detail : {}
  ) as IntegrationApiErrorDetail;

  const compileErrors = toCompileErrors(body.compile_errors ?? detailObject.compile_errors);
  const preflight = (Array.isArray(body.preflight_errors) ? body.preflight_errors : detailObject.preflight_errors ?? [])
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  const detailList = Array.isArray(detail)
    ? detail
        .map((item) => (typeof item === "string" ? item : (item as { msg?: unknown } | null)?.msg))
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .join("; ")
    : "";
  const message =
    nonEmptyString(body.message) ??
    nonEmptyString(detail) ??
    nonEmptyString(detailObject.message) ??
    nonEmptyString(detailList);

  if (preflight.length > 0) return { message: preflight.join("\n"), compileErrors };
  if (!message && compileErrors.length === 0) return null;
  // "Request failed" marks compile errors that arrived without a message.
  return { message: message ?? "Request failed", compileErrors };
}

export function formatIntegrationErrorForToast(
  error: unknown,
  fallbackMessage: string
): string {
  const parsed = parseIntegrationApiError(error);
  if (!parsed) return fallbackMessage;

  if (parsed.compileErrors.length > 0) {
    const lines = parsed.compileErrors.map((item) => `• [${item.code}] ${item.message}`);
    return `${parsed.message}\n${lines.join("\n")}`;
  }

  return parsed.message || fallbackMessage;
}
