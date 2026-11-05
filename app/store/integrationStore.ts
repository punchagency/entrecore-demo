import { create } from "zustand";
import {
  ColumnMapping,
  SourceColumn,
  TargetColumn,
  ExceptionRule,
  PreviewRow,
  MappingValidationIssue,
  TransformationRule,
} from "@/app/(protected)/workflows/services/integration-api";

interface IntegrationState {
  // Core data
  mappings: ColumnMapping[];
  sourceColumns: SourceColumn[];
  targetColumns: TargetColumn[];
  sourceTable: string;
  targetTable: string;

  // Selection
  selectedMappingId: string | null;
  selectedConnectorId: string | null;
  availableConnectors: any[];

  // Preview
  sourcePreviewData: PreviewRow[];
  transformedPreviewData: PreviewRow[];

  // State flags
  isDirty: boolean;
  isPreviewStale: boolean;

  // Actions
  setInitialData: (data: {
    mappings: ColumnMapping[];
    sourceColumns: SourceColumn[];
    targetColumns: TargetColumn[];
    sourceTable: string;
    targetTable: string;
    sourcePreviewData: PreviewRow[];
  }) => void;

  setSelectedMapping: (id: string | null) => void;
  setSelectedConnector: (id: string | null) => void;
  setAvailableConnectors: (connectors: any[]) => void;

  updateMappingSource: (mappingId: string, sourceColumn: string | null) => void;
  updateMappingTransformation: (mappingId: string, transformation: TransformationRule) => void;
  updateMappingException: (mappingId: string, exceptionRule: ExceptionRule) => void;

  addMapping: (targetColumn: string) => void;
  removeMapping: (mappingId: string) => void;

  setTransformedPreview: (data: PreviewRow[]) => void;
  markClean: () => void;
  resetStore: () => void;

  // Computed
  getUnmappedTargetColumns: () => TargetColumn[];
  getValidationSummary: () => {
    errors: number;
    warnings: number;
    unmappedRequired: number;
  };
}

export const useIntegrationStore = create<IntegrationState>((set, get) => ({
  mappings: [],
  sourceColumns: [],
  targetColumns: [],
  sourceTable: "",
  targetTable: "",
  selectedMappingId: null,
  selectedConnectorId: null,
  availableConnectors: [],
  sourcePreviewData: [],
  transformedPreviewData: [],
  isDirty: false,
  isPreviewStale: false,

  setInitialData: (data) =>
    set({
      mappings: data.mappings,
      sourceColumns: data.sourceColumns,
      targetColumns: data.targetColumns,
      sourceTable: data.sourceTable,
      targetTable: data.targetTable,
      sourcePreviewData: data.sourcePreviewData,
      isDirty: false,
      isPreviewStale: true,
    }),

  setSelectedMapping: (id) => set({ selectedMappingId: id }),
  setSelectedConnector: (id) => set({ selectedConnectorId: id }),
  setAvailableConnectors: (connectors) => set({ availableConnectors: connectors }),

  updateMappingSource: (mappingId, sourceColumn) =>
    set((state) => {
      const source = state.sourceColumns.find((c) => c.name === sourceColumn);
      const mapping = state.mappings.find((m) => m.id === mappingId);
      if (!mapping) return state;

      const target = state.targetColumns.find((c) => c.name === mapping.target_column);

      // Re-validate
      const issues: MappingValidationIssue[] = [];
      if (source && target && source.data_type !== target.data_type) {
        issues.push({
          severity: "warning",
          code: "TYPE_MISMATCH",
          message: `Source type '${source.data_type}' differs from target type '${target.data_type}'`,
        });
      }
      if (target && !target.nullable && source?.nullable) {
        issues.push({
          severity: "warning",
          code: "NULLABLE_MISMATCH",
          message: `Source allows nulls but target column is NOT NULL`,
        });
      }

      return {
        mappings: state.mappings.map((m) =>
          m.id === mappingId
            ? {
                ...m,
                source_column: sourceColumn,
                human_modified: true,
                confidence: 1.0,
                validation_issues: issues,
                transformation:
                  source && target && source.data_type !== target.data_type
                    ? { type: "cast" as const, cast_to: target.data_type }
                    : { type: "direct" as const },
              }
            : m
        ),
        isDirty: true,
        isPreviewStale: true,
      };
    }),

  updateMappingTransformation: (mappingId, transformation) =>
    set((state) => ({
      mappings: state.mappings.map((m) =>
        m.id === mappingId
          ? { ...m, transformation, human_modified: true, confidence: 1.0 }
          : m
      ),
      isDirty: true,
      isPreviewStale: true,
    })),

  updateMappingException: (mappingId, exceptionRule) =>
    set((state) => ({
      mappings: state.mappings.map((m) =>
        m.id === mappingId ? { ...m, exception_rule: exceptionRule } : m
      ),
      isDirty: true,
    })),

  addMapping: (targetColumn) =>
    set((state) => {
      const target = state.targetColumns.find((c) => c.name === targetColumn);
      const issues: MappingValidationIssue[] = [];
      if (target && !target.nullable) {
        issues.push({
          severity: "error",
          code: "UNMAPPED_REQUIRED",
          message: `Required target field '${targetColumn}' has no source mapping`,
        });
      }

      const newMapping: ColumnMapping = {
        id: `map-new-${Date.now()}`,
        source_column: null,
        target_column: targetColumn,
        transformation: { type: "direct" },
        confidence: 0,
        ai_generated: false,
        human_modified: false,
        validation_issues: issues,
      };

      return {
        mappings: [...state.mappings, newMapping],
        isDirty: true,
        isPreviewStale: true,
        selectedMappingId: newMapping.id,
      };
    }),

  removeMapping: (mappingId) =>
    set((state) => ({
      mappings: state.mappings.filter((m) => m.id !== mappingId),
      isDirty: true,
      isPreviewStale: true,
      selectedMappingId:
        state.selectedMappingId === mappingId ? null : state.selectedMappingId,
    })),

  setTransformedPreview: (data) =>
    set({ transformedPreviewData: data, isPreviewStale: false }),

  markClean: () => set({ isDirty: false }),
  resetStore: () =>
    set({
      mappings: [],
      sourceColumns: [],
      targetColumns: [],
      sourceTable: "",
      targetTable: "",
      selectedMappingId: null,
      selectedConnectorId: null,
      availableConnectors: [],
      sourcePreviewData: [],
      transformedPreviewData: [],
      isDirty: false,
      isPreviewStale: false,
    }),

  getUnmappedTargetColumns: () => {
    const state = get();
    const mappedTargets = new Set(state.mappings.map((m) => m.target_column));
    return state.targetColumns.filter((c) => !mappedTargets.has(c.name));
  },

  getValidationSummary: () => {
    const state = get();
    let errors = 0;
    let warnings = 0;

    state.mappings.forEach((m) => {
      m.validation_issues.forEach((issue) => {
        if (issue.severity === "error") errors++;
        if (issue.severity === "warning") warnings++;
      });
    });

    // Count unmapped required fields
    const mappedTargets = new Set(
      state.mappings
        .filter((m) => m.source_column !== null)
        .map((m) => m.target_column)
    );
    const unmappedRequired = state.targetColumns.filter(
      (c) => !c.nullable && !mappedTargets.has(c.name)
    ).length;

    errors += unmappedRequired;

    return { errors, warnings, unmappedRequired };
  },
}));
