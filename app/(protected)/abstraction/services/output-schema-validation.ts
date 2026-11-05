import type { InferredSchemaColumn } from "./connector-input-api";

export interface SchemaCompatibilityIssue {
  column: string;
  severity: "error" | "warning";
  message: string;
}

export interface SchemaCompatibilityResult {
  compatible: boolean;
  issues: SchemaCompatibilityIssue[];
  matchedColumns: number;
  totalTargetColumns: number;
}

const TYPE_GROUPS: Record<string, string[]> = {
  string: ["string", "text", "varchar", "char", "uuid", "json"],
  integer: ["integer", "int", "bigint", "smallint", "number"],
  float: ["float", "double", "decimal", "numeric", "real"],
  boolean: ["boolean", "bool"],
  datetime: ["datetime", "timestamp", "date", "timestamptz"],
};

function normalizeType(dataType: string): string {
  return dataType.toLowerCase().trim();
}

function typesCompatible(sourceType: string, targetType: string): boolean {
  const source = normalizeType(sourceType);
  const target = normalizeType(targetType);
  if (source === target) return true;

  for (const group of Object.values(TYPE_GROUPS)) {
    if (group.includes(source) && group.includes(target)) return true;
  }

  return false;
}

export function validateSchemaCompatibility(
  sourceColumns: InferredSchemaColumn[],
  targetColumns: InferredSchemaColumn[]
): SchemaCompatibilityResult {
  const issues: SchemaCompatibilityIssue[] = [];
  const sourceByName = new Map(
    sourceColumns.map((column) => [column.name.toLowerCase(), column])
  );

  let matchedColumns = 0;

  targetColumns.forEach((target) => {
    const source = sourceByName.get(target.name.toLowerCase());

    if (!source) {
      if (!target.nullable) {
        issues.push({
          column: target.name,
          severity: "error",
          message: `Required target column "${target.name}" is missing from pipeline output`,
        });
      } else {
        issues.push({
          column: target.name,
          severity: "warning",
          message: `Optional target column "${target.name}" has no matching pipeline field`,
        });
      }
      return;
    }

    matchedColumns += 1;

    if (!typesCompatible(source.data_type, target.data_type)) {
      issues.push({
        column: target.name,
        severity: "error",
        message: `Type mismatch: pipeline "${source.data_type}" → target "${target.data_type}"`,
      });
    }
  });

  const hasErrors = issues.some((issue) => issue.severity === "error");

  return {
    compatible: !hasErrors && targetColumns.length > 0,
    issues,
    matchedColumns,
    totalTargetColumns: targetColumns.length,
  };
}

export function parseStoredSchema(value: unknown): InferredSchemaColumn[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as InferredSchemaColumn[];
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
