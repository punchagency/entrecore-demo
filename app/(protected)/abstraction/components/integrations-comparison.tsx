"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import {
  IntegrationAPI,
  IntegrationColumnMapping,
  IntegrationJob,
  IntegrationRunResponse,
  finalizeMappingFixReviewFlow,
  normalizeIntegrationColumnMappings,
  resolveUpsertKeys,
  serializeColumnMappingsForPatch,
} from "@/app/(protected)/data-room/integrations/services/data-integration-api";
import { IntegrationMappingEditor } from "@/app/(protected)/data-room/integrations/components/mapping-editor";
import { UpsertReviewPanel } from "@/app/(protected)/data-room/integrations/components/upsert-review/upsert-review-panel";
// Same cross-import as UpsertReviewPanel above, and for the same reason: an
// integration job is one entity whichever screen created it, so the editor for
// its matching rules is shared rather than duplicated. Only the entry point
// differs — this workflow never sends anyone to /data-room.
import { RulesEditor } from "@/app/(protected)/data-room/integrations/components/rules-editor/rules-editor";
import {
  TemplateBar,
  jobAlias,
} from "@/app/(protected)/data-room/integrations/components/rules-editor/template-bar";
import { useUpsertReviewRuns } from "@/app/(protected)/data-room/integrations/hooks/use-data-integrations";
import { useJobRules } from "@/app/(protected)/data-room/integrations/hooks/use-integration-rules";
import {
  fetchCompanyConnectors,
  type ConnectorConfig,
} from "@/app/(protected)/workflows/services/integration-api";
import { fetchTableNamesForConnectorType } from "../services/integration-panel-catalog-api";
import { fetchAllOcrDocuments } from "../services/ocr-api";
import {
  getWorkflowIntegrationStage,
  setWorkflowIntegrationStage,
  slugifyJobName,
} from "../services/workflow-integration-context";
import type { WorkflowIntegrationDefaults } from "@/types/abstraction";
import {
  ArrowRightLeft,
  Play,
  AlertCircle,
  Trash2,
  Pencil,
  Plus,
  Check,
  CheckCircle2,
  LockOpen,
  BookmarkPlus,
  AlertTriangle,
  GitBranch,
  LayoutList,
  Map as MapIcon,
  ChevronDown,
  ChevronUp,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivateJobDialog } from "./activate-job-dialog";
import { IntegrationSankeyMap, type SankeyMappingRow } from "./integration-sankey-map";
import { IntegrationMappingTable } from "./integration-mapping-table";
import { IntegrationSchemaLineage } from "./integration-schema-lineage";
import { IntegrationTargetsBar } from "./integration-targets-bar";
import { IntegrationBundlePanel } from "./integration-bundle-panel";
import { Combobox } from "@/components/ui/combobox";
import {
  getIntegrationTargets,
  upsertIntegrationTarget,
  removeIntegrationTarget,
  clearIntegrationTargets,
  syncPrimaryTarget,
  createTargetId,
  type IntegrationTargetLink,
} from "../services/integration-targets";
import { type MappingReviewItem, type MappingReviewStatus } from "./integration-mapping-review";
import { IntegrationGovernanceReview } from "./integration-governance-review";
import {
  saveMappingTemplate,
  findBestTemplate,
  type MappingTemplate,
} from "../services/mapping-template-service";
import {
  filterMappingsBlockedByCompileErrors,
  filterMappingsToWritableDestinations,
  findMappingsBlockedByCompileErrors,
  getBlockedDestinationColumnsFromCompileErrors,
  getCompileErrorMappingRefs,
  isMappingBlockedByCompileErrors,
  mappingsStillBlockedOnServer,
  parseIntegrationApiError,
  type IntegrationCompileError,
} from "@/app/(protected)/data-room/integrations/services/integration-error-utils";
import {
  getActivateBlockedReason,
  getCurrentFlowStepId,
  getIntegrationJobStatusLabel,
  INTEGRATION_FLOW_STEPS,
} from "@/app/(protected)/data-room/integrations/services/integration-flow-utils";
import type { IntegrationMappingReview } from "@/app/(protected)/data-room/integrations/services/data-integration-api";

interface ComparisonRow {
  sourceColumn: string;
  targetColumn: string;
  status: "auto" | "review_suggested" | "unmatched";
  score?: number;
}

interface IntegrationsComparisonProps {
  workflowId?: string;
  workflowName?: string;
  integrationDefaults?: WorkflowIntegrationDefaults;
  /** Bumped when Pipeline stages data for this workflow */
  stageRevision?: number;
}

/** Default destination connector on Integrate setup. */
const DEFAULT_DESTINATION_CONNECTOR = "airtable";

// Integration errors can carry preflight and compile errors (parseIntegrationApiError); keep
// those specifics in the toast. Anything else goes through the shared helper's message.
function toastIntegrationError(error: unknown, fallback: string) {
  const parsed = parseIntegrationApiError(error);
  const count = parsed?.compileErrors.length ?? 0;
  // "Request failed" is the parser's placeholder for compile errors without a message.
  const base = parsed && parsed.message !== "Request failed" ? parsed.message : count > 0 ? fallback : null;
  const message = base
    ? count > 0
      ? `${base} (${count} compile error${count === 1 ? "" : "s"})`
      : base
    : undefined;
  showApiErrorToast(error, fallback, { message });
}

export function IntegrationsComparison({
  workflowId,
  workflowName,
  integrationDefaults,
  stageRevision = 0,
}: IntegrationsComparisonProps) {
  const [jobName, setJobName] = useState("ocr_staging_to_target");
  const [sourceTableName, setSourceTableName] = useState("");
  const [destinationTable, setDestinationTable] = useState("");
  const [sourceConnectorName, setSourceConnectorName] = useState("bigquery");
  const [destinationConnectorName, setDestinationConnectorName] = useState(
    DEFAULT_DESTINATION_CONNECTOR
  );
  const [availableConnectors, setAvailableConnectors] = useState<string[]>([]);
  // Full connector configs behind availableConnectors — needed because
  // catalog-browse is addressed by connector_config_id, while the dropdowns
  // (and the suggest-mappings payload) still work in connector-type names.
  const [connectorConfigs, setConnectorConfigs] = useState<ConnectorConfig[]>([]);
  const [availableSourceTables, setAvailableSourceTables] = useState<string[]>([]);
  const [availableDestinationTables, setAvailableDestinationTables] = useState<string[]>([]);
  const [isLoadingSourceTables, setIsLoadingSourceTables] = useState(false);
  const [isLoadingDestinationTables, setIsLoadingDestinationTables] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  // EP-947: activation asks for an optional destination reference name, so the job
  // can be used as a DRAT abstraction pipeline step.
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const router = useRouter();
  const [run, setRun] = useState<IntegrationRunResponse | null>(null);
  // Runs of this job parked on an ambiguous upsert key. Queried rather than
  // read off `run`, so a conflict parked in an earlier session still surfaces
  // after a reload.
  const { data: writeConflicts, refetch: refetchWriteConflicts } =
    useUpsertReviewRuns(currentJobId || undefined);
  const writeConflictCount = writeConflicts?.items?.length ?? 0;
  const [mappings, setMappings] = useState<IntegrationColumnMapping[]>([]);
  const [unmatchedSourceColumns, setUnmatchedSourceColumns] = useState<string[]>([]);
  const [unmatchedTargetColumns, setUnmatchedTargetColumns] = useState<string[]>([]);
  const [matchMethod, setMatchMethod] = useState<string>("-");
  const [compileErrors, setCompileErrors] = useState<IntegrationCompileError[]>([]);
  const [compileErrorMessage, setCompileErrorMessage] = useState<string | null>(null);
  const [pipelineStageHint, setPipelineStageHint] = useState<string | null>(null);
  const [isEditingMappings, setIsEditingMappings] = useState(false);
  const [jobLocked, setJobLocked] = useState(false);
  const [jobStatus, setJobStatus] = useState<IntegrationJob["status"] | null>(null);
  /** Destination columns this job matches rows on. [] means Append. */
  const [upsertKeys, setUpsertKeys] = useState<string[]>([]);
  const [hasPendingReview, setHasPendingReview] = useState(false);
  const [reviewRefreshNonce, setReviewRefreshNonce] = useState(0);
  const [savedJobDestinationTable, setSavedJobDestinationTable] = useState("");
  const [savedJobSourceTable, setSavedJobSourceTable] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [blockedDestinationHints, setBlockedDestinationHints] = useState<string[]>([]);
  const [pairSourceColumn, setPairSourceColumn] = useState("");
  const [pairTargetColumn, setPairTargetColumn] = useState("");
  // Integration Map / Integration Review sub-navigation
  const [integrateSubTab, setIntegrateSubTab] = useState<"map" | "review" | "conflicts">("map");
  const [mapView, setMapView] = useState<"tabular" | "graphical" | "schema">("tabular");
  const [integrationTargets, setIntegrationTargets] = useState<IntegrationTargetLink[]>([]);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<MappingReviewItem[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [loadedTemplate, setLoadedTemplate] = useState<MappingTemplate | null>(null);
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [bundleJobActivatedNonce, setBundleJobActivatedNonce] = useState(0);
  const destinationTableManuallyEditedRef = useRef(false);
  const sourceTableManuallyEditedRef = useRef(false);
  const previousRunStatusRef = useRef<IntegrationRunResponse["status"] | null>(null);
  const previousCompletedStagesRef = useRef<number>(0);

  const handleDestinationTableChange = useCallback((value: string) => {
    destinationTableManuallyEditedRef.current = true;
    setDestinationTable(value);
  }, []);

  const applyServerDestinationTable = useCallback((value: string) => {
    destinationTableManuallyEditedRef.current = false;
    setDestinationTable(value);
  }, []);

  const applyServerSourceTable = useCallback((value: string) => {
    sourceTableManuallyEditedRef.current = false;
    setSourceTableName(value);
  }, []);

  const persistWorkflowStage = useCallback(
    (partial: Parameters<typeof setWorkflowIntegrationStage>[1]) => {
      if (!workflowId) return;
      setWorkflowIntegrationStage(workflowId, {
        sourceTable: partial.sourceTable ?? sourceTableName,
        destinationTable: partial.destinationTable ?? destinationTable,
        sourceConnector: partial.sourceConnector ?? sourceConnectorName,
        destinationConnector: partial.destinationConnector ?? destinationConnectorName,
        jobId: partial.jobId ?? currentJobId ?? undefined,
        jobName: partial.jobName ?? jobName,
        stagedFrom: partial.stagedFrom ?? "integrate",
      });
    },
    [
      currentJobId,
      destinationConnectorName,
      destinationTable,
      jobName,
      sourceConnectorName,
      sourceTableName,
      workflowId,
    ]
  );

  const handleSourceTableChange = useCallback(
    (value: string) => {
      sourceTableManuallyEditedRef.current = true;
      setSourceTableName(value);
      if (workflowId) {
        setWorkflowIntegrationStage(workflowId, {
          sourceTable: value,
          destinationTable,
          sourceConnector: sourceConnectorName,
          destinationConnector: destinationConnectorName,
          jobId: currentJobId ?? undefined,
          jobName,
          stagedFrom: "integrate",
        });
      }
    },
    [
      currentJobId,
      destinationConnectorName,
      destinationTable,
      jobName,
      sourceConnectorName,
      workflowId,
    ]
  );

  const extractApiErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    const parsed = parseIntegrationApiError(error);
    if (!parsed) return fallbackMessage;
    if (parsed.compileErrors.length > 0) {
      return `${parsed.message} (${parsed.compileErrors.length} compile error${parsed.compileErrors.length === 1 ? "" : "s"})`;
    }
    return parsed.message || fallbackMessage;
  }, []);

  const blockedDestinationColumns = useMemo(
    () => getBlockedDestinationColumnsFromCompileErrors(compileErrors),
    [compileErrors]
  );

  const refreshJobState = useCallback(async (jobId: string) => {
    const job = await IntegrationAPI.getJob(jobId);
    return job;
  }, []);

  const syncJobFromApiResponse = useCallback(
    (requestedJobId: string, job: IntegrationJob): string => {
      const nextJobId = job.id?.trim() || requestedJobId;

      if (nextJobId !== requestedJobId) {
        setCurrentJobId(nextJobId);
        if (typeof window !== "undefined") {
          const previousKey = `integration-blocked-dest-${requestedJobId}`;
          const stored = sessionStorage.getItem(previousKey);
          if (stored) {
            sessionStorage.setItem(`integration-blocked-dest-${nextJobId}`, stored);
            sessionStorage.removeItem(previousKey);
          }
        }
        persistWorkflowStage({ jobId: nextJobId, stagedFrom: "integrate" });
      }

      setMappings(normalizeIntegrationColumnMappings(job.column_mappings));
      setJobLocked(Boolean(job.locked));
      setJobStatus(job.status);
      // Destination write mode. Without this the editor is handed [] on every
      // open and always shows Append, whatever the job is actually set to.
      setUpsertKeys(resolveUpsertKeys(job));
      if (job.source_table) {
        setSourceTableName((previousSourceTable) => {
          if (
            sourceTableManuallyEditedRef.current &&
            previousSourceTable.trim() &&
            previousSourceTable !== savedJobSourceTable
          ) {
            return previousSourceTable;
          }
          sourceTableManuallyEditedRef.current = false;
          return job.source_table!;
        });
        setSavedJobSourceTable(job.source_table);
      }
      if (job.destination_table) {
        setDestinationTable((previousDestinationTable) => {
          if (
            destinationTableManuallyEditedRef.current &&
            previousDestinationTable.trim() &&
            previousDestinationTable !== savedJobDestinationTable
          ) {
            return previousDestinationTable;
          }
          destinationTableManuallyEditedRef.current = false;
          return job.destination_table;
        });
        setSavedJobDestinationTable(job.destination_table);
      }
      if (job.name) setJobName(job.name);

      return nextJobId;
    },
    [persistWorkflowStage, savedJobDestinationTable, savedJobSourceTable]
  );

  const patchJobColumnMappings = useCallback(
    async (
      requestedJobId: string,
      nextMappings: IntegrationColumnMapping[],
      // The destination write key. `undefined` means "not part of this save" and
      // is omitted from the request, so the job's existing key is left alone —
      // the backend distinguishes an omitted field from an explicit [], and only
      // [] means Append.
      nextUpsertKeys?: string[]
    ): Promise<{
      jobId: string;
      job: IntegrationJob;
      payload: IntegrationColumnMapping[];
    }> => {
      const payload = serializeColumnMappingsForPatch(nextMappings);
      const job = await IntegrationAPI.updateJob(requestedJobId, {
        column_mappings: payload,
        ...(nextUpsertKeys !== undefined ? { upsert_fields: nextUpsertKeys } : {}),
      });
      const jobId = syncJobFromApiResponse(requestedJobId, job);
      persistWorkflowStage({ jobId, stagedFrom: "integrate" });
      return { jobId, job, payload };
    },
    [persistWorkflowStage, syncJobFromApiResponse]
  );

  const effectiveUnmatchedSourceColumns = useMemo(
    () =>
      unmatchedSourceColumns.filter(
        (column) => !mappings.some((mapping) => mapping.source_column === column)
      ),
    [mappings, unmatchedSourceColumns]
  );

  const effectiveUnmatchedTargetColumns = useMemo(
    () =>
      unmatchedTargetColumns.filter(
        (column) => !mappings.some((mapping) => mapping.destination_column === column)
      ),
    [mappings, unmatchedTargetColumns]
  );

  const reviewSuggestedCount = useMemo(
    () => mappings.filter((mapping) => mapping.match_confidence === "review_suggested").length,
    [mappings]
  );

  const unmatchedCount =
    effectiveUnmatchedSourceColumns.length + effectiveUnmatchedTargetColumns.length;

  const mappingsAreReadOnly = jobLocked || hasPendingReview;

  // Whether this job matches with rules rather than an upsert key. Read here
  // rather than inside the mapping editor because the write-mode BADGE needs it
  // too — and a badge naming the upsert key while rules actually decide is a
  // screen that lies about what the next run will do.
  const { data: jobRules } = useJobRules(currentJobId || "");
  const jobHasRules = Boolean(jobRules?.document);
  const canEditMappings = Boolean(currentJobId) && !mappingsAreReadOnly && !isSaving;
  const canActivate =
    Boolean(currentJobId) &&
    jobLocked &&
    !hasPendingReview &&
    compileErrors.length === 0 &&
    !isActivating &&
    jobStatus !== "active";
  const canRun = Boolean(currentJobId) && jobStatus === "active" && !isRunning;
  const activateBlockedReason = getActivateBlockedReason({
    hasJob: Boolean(currentJobId),
    jobLocked,
    hasPendingReview,
    compileErrorCount: compileErrors.length,
    jobStatus,
  });
  const currentFlowStep = getCurrentFlowStepId({
    hasJob: Boolean(currentJobId),
    hasPendingReview,
    jobLocked,
    jobStatus,
    hasRun: Boolean(run?.id),
  });
  const jobStatusLabel = getIntegrationJobStatusLabel(jobStatus, {
    locked: jobLocked,
    pendingReview: hasPendingReview,
  });

  const setupChangedFromJob = useMemo(() => {
    if (!currentJobId) return false;
    return (
      (savedJobDestinationTable && destinationTable !== savedJobDestinationTable) ||
      (savedJobSourceTable && sourceTableName !== savedJobSourceTable)
    );
  }, [
    currentJobId,
    destinationTable,
    savedJobDestinationTable,
    sourceTableName,
    savedJobSourceTable,
  ]);

  const suggestBlockedReason = hasPendingReview
    ? "Awaiting review — mappings are read-only until a reviewer decides."
    : jobLocked
      ? "Job is locked after approval. Unlock to change destination and re-suggest mappings."
      : null;

  const rememberBlockedDestinations = useCallback(
    (errors: IntegrationCompileError[]) => {
      const columns = getBlockedDestinationColumnsFromCompileErrors(errors);
      if (columns.length === 0) return;
      setBlockedDestinationHints((previous) => {
        const merged = Array.from(new Set([...previous, ...columns]));
        if (currentJobId) {
          sessionStorage.setItem(
            `integration-blocked-dest-${currentJobId}`,
            JSON.stringify(merged)
          );
        }
        return merged;
      });
    },
    [currentJobId]
  );

  const finalizeSuggestedMappings = useCallback(
    async (
      jobId: string,
      suggested: IntegrationColumnMapping[]
    ): Promise<{
      mappings: IntegrationColumnMapping[];
      jobId: string;
      skippedSourceColumns: string[];
      skippedDestinationColumns: string[];
    }> => {
      const filtered = filterMappingsToWritableDestinations(suggested, blockedDestinationHints);
      // filterMappingsToWritableDestinations returns a subset of the same
      // objects (Array.filter preserves references), so reference equality
      // correctly identifies which were stripped even if two suggested
      // mappings happen to share a destination_column.
      const filteredSet = new Set(filtered);
      // A mapping stripped here was matched by the backend, so neither its
      // source nor its destination column ever made the unmatched lists —
      // without surfacing both back out, they vanish everywhere: not in the
      // mapping table, not in either "unmatched" list.
      const skipped = suggested.filter((m) => !filteredSet.has(m));
      const skippedSourceColumns = skipped.map((m) => m.source_column);
      const skippedDestinationColumns = skipped.map((m) => m.destination_column);

      if (skipped.length > 0) {
        const { payload, jobId: nextJobId } = await patchJobColumnMappings(jobId, filtered);
        toast.message(
          `Skipped ${skipped.length} mapping(s) to previously-blocked destination fields: ` +
            `${skippedSourceColumns.join(", ")}. Moved to "unmatched" — remap manually if needed.`
        );
        return { mappings: payload, jobId: nextJobId, skippedSourceColumns, skippedDestinationColumns };
      }

      return { mappings: filtered, jobId, skippedSourceColumns: [], skippedDestinationColumns: [] };
    },
    [blockedDestinationHints, patchJobColumnMappings]
  );

  const handleReviewStateChange = useCallback(
    (state: {
      pendingReview: IntegrationMappingReview | null;
      latestReview: IntegrationMappingReview | null;
    }) => {
      setHasPendingReview(Boolean(state.pendingReview));
      if (state.pendingReview) {
        setJobStatus("pending_review");
      } else if (jobLocked) {
        setJobStatus((previous) => (previous === "active" ? "active" : "pending_mapping_approval"));
      }
    },
    [jobLocked]
  );

  useEffect(() => {
    if (!workflowId) return;
    const stage = getWorkflowIntegrationStage(workflowId);
    const defaults = integrationDefaults;

    if (stage?.jobName) setJobName(stage.jobName);
    else if (workflowName) setJobName(slugifyJobName(workflowName));

    if (stage?.sourceTable) {
      setSourceTableName((previous) => (previous.trim() ? previous : (stage.sourceTable ?? "")));
    } else if (defaults?.sourceTable) {
      setSourceTableName((previous) => (previous.trim() ? previous : (defaults.sourceTable ?? "")));
    }

    if (stage?.destinationTable) {
      setDestinationTable((previous) =>
        previous.trim() ? previous : (stage.destinationTable ?? "")
      );
    } else if (defaults?.destinationTable) {
      setDestinationTable((previous) =>
        previous.trim() ? previous : (defaults.destinationTable ?? "")
      );
    }

    if (stage?.sourceConnector) setSourceConnectorName(stage.sourceConnector);
    else if (defaults?.sourceConnector) setSourceConnectorName(defaults.sourceConnector);

    if (stage?.destinationConnector) {
      setDestinationConnectorName(stage.destinationConnector);
    } else if (defaults?.destinationConnector) {
      setDestinationConnectorName(defaults.destinationConnector);
    } else {
      setDestinationConnectorName(DEFAULT_DESTINATION_CONNECTOR);
    }

    if (stage?.stagedFrom === "pipeline" && stage.sourceTable) {
      setPipelineStageHint(
        `Staged from Pipeline (${new Date(stage.stagedAt).toLocaleString()}): ${stage.sourceTable}`
      );
    } else {
      setPipelineStageHint(null);
    }
  }, [workflowId, workflowName, integrationDefaults, stageRevision]);

  useEffect(() => {
    if (!workflowId) return;
    const stored = getIntegrationTargets(workflowId);
    if (stored.length > 0) {
      setIntegrationTargets(stored);
      const match = stored.find((t) => t.destinationTable === destinationTable) ?? stored[0];
      setActiveTargetId(match.id);
      return;
    }
    if (destinationTable) {
      const primary = syncPrimaryTarget(workflowId, {
        destinationTable,
        destinationConnector: destinationConnectorName,
        relationship: "1:1",
        linkColumn: "id",
        jobId: currentJobId ?? undefined,
      });
      setIntegrationTargets(primary);
      setActiveTargetId(primary[0]?.id ?? null);
    }
  }, [workflowId]); // eslint-disable-line react-hooks/exhaustive-deps -- init once per workflow

  useEffect(() => {
    if (!workflowId || !destinationTable.trim()) return;
    // syncPrimaryTarget matches by destinationTable+connector, so this
    // usually resolves to a target that already exists (e.g. after
    // switching to it) — preserve ITS relationship/linkColumn instead of
    // forcing the "1:1"/"id" defaults, otherwise every target switch would
    // silently discard a real 1:N relationship or custom link column the
    // user configured when adding that target.
    const existingMatch = integrationTargets.find(
      (t) =>
        t.destinationTable === destinationTable && t.destinationConnector === destinationConnectorName
    );
    const next = syncPrimaryTarget(workflowId, {
      destinationTable,
      destinationConnector: destinationConnectorName,
      relationship: existingMatch?.relationship ?? "1:1",
      linkColumn: existingMatch?.linkColumn ?? "id",
      jobId: currentJobId ?? undefined,
    });
    setIntegrationTargets(next);
    if (!activeTargetId) setActiveTargetId(next[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- integrationTargets read for lookup only; listing it would loop (setIntegrationTargets always returns a new array reference)
  }, [workflowId, destinationTable, destinationConnectorName, currentJobId, activeTargetId]);

  const persistActiveTargetJob = useCallback(
    (jobId: string, mappingCount: number) => {
      if (!workflowId || !activeTargetId) return;
      const updated = upsertIntegrationTarget(workflowId, {
        id: activeTargetId,
        destinationTable,
        destinationConnector: destinationConnectorName,
        relationship:
          integrationTargets.find((t) => t.id === activeTargetId)?.relationship ?? "1:1",
        linkColumn: integrationTargets.find((t) => t.id === activeTargetId)?.linkColumn ?? "id",
        jobId,
        label: integrationTargets.find((t) => t.id === activeTargetId)?.label,
      });
      setIntegrationTargets(updated);
    },
    [workflowId, activeTargetId, destinationTable, destinationConnectorName, integrationTargets]
  );

  // Fully clears every piece of per-job state so a target with no job yet
  // (freshly added, or its job failed to load) never inherits leftover
  // status — e.g. `jobLocked` from whichever target was previously active,
  // which would otherwise render "Unlock & re-suggest" instead of "Suggest
  // Mappings" for a target that was never suggested in the first place.
  const resetJobState = useCallback(() => {
    setCurrentJobId(null);
    setMappings([]);
    setUnmatchedSourceColumns([]);
    setUnmatchedTargetColumns([]);
    setMatchMethod("-");
    setJobLocked(false);
    setJobStatus(null);
    setHasPendingReview(false);
    setCompileErrors([]);
    setCompileErrorMessage(null);
    setSavedJobSourceTable("");
    setSavedJobDestinationTable("");
  }, []);

  /**
   * Load a job the user picked out of the list.
   *
   * The only other routes into `currentJobId` are Suggest Mappings and the
   * localStorage stage, which between them meant a job made on one machine was
   * unreachable from another: nothing was lost, but there was no way back to it
   * short of suggesting mappings all over again.
   */
  const openExistingJob = useCallback(
    async (jobId: string) => {
      const job = await refreshJobState(jobId);

      // Clear first. syncJobFromApiResponse does NOT touch the unmatched-column
      // lists, the match method, the compile errors or the pending-review flag,
      // so without this the screen keeps showing the outgoing job's numbers over
      // the incoming job's mappings — which looks exactly like nothing happened.
      resetJobState();

      // The user asked for THIS job, so its own tables win over anything typed
      // into the boxes earlier — without clearing these, syncJobFromApiResponse
      // honours the manual edits and the screen shows one job's tables with
      // another job's mappings.
      sourceTableManuallyEditedRef.current = false;
      destinationTableManuallyEditedRef.current = false;

      setCurrentJobId(jobId);
      syncJobFromApiResponse(jobId, job);

      // Every field passed explicitly, none left to default. persistWorkflowStage
      // falls back to the CURRENT state values, and setState has not flushed
      // yet — so the fallbacks are still the outgoing job's, and the stage would
      // be written with the new job id beside the old job's tables. That is the
      // one that survives a reload and comes back wrong.
      persistWorkflowStage({
        jobId,
        jobName: job.name,
        sourceTable: job.source_table ?? undefined,
        destinationTable: job.destination_table,
        stagedFrom: "integrate",
      });

      // Point the active target card at this job. Written out rather than routed
      // through persistActiveTargetJob for the same stale-closure reason: that
      // helper reads `destinationTable` from state, which is still the previous
      // job's, and would file this job under the wrong destination.
      if (workflowId && activeTargetId) {
        const existing = integrationTargets.find((t) => t.id === activeTargetId);
        setIntegrationTargets(
          upsertIntegrationTarget(workflowId, {
            id: activeTargetId,
            destinationTable: job.destination_table,
            destinationConnector: destinationConnectorName,
            relationship: existing?.relationship ?? "1:1",
            linkColumn: existing?.linkColumn ?? "id",
            jobId,
            label: existing?.label,
          })
        );
      }

      setIntegrateSubTab("map");
      toast.success(`Opened “${jobAlias(job)}”.`);
    },
    [
      activeTargetId,
      destinationConnectorName,
      integrationTargets,
      persistWorkflowStage,
      refreshJobState,
      resetJobState,
      syncJobFromApiResponse,
      workflowId,
    ]
  );

  const handleSelectTarget = useCallback(
    // `targetOverride` lets a caller that just created/knows the target
    // object pass it directly instead of looking it up in `integrationTargets`
    // — that state won't reflect a target created earlier in the same tick
    // (setState is async), so the lookup would silently miss it and no-op.
    async (targetId: string, targetOverride?: IntegrationTargetLink) => {
      if (!workflowId) return;
      const target = targetOverride ?? integrationTargets.find((t) => t.id === targetId);
      if (!target) return;

      if (activeTargetId && currentJobId) {
        upsertIntegrationTarget(workflowId, {
          id: activeTargetId,
          destinationTable,
          destinationConnector: destinationConnectorName,
          relationship:
            integrationTargets.find((t) => t.id === activeTargetId)?.relationship ?? "1:1",
          linkColumn: integrationTargets.find((t) => t.id === activeTargetId)?.linkColumn ?? "id",
          jobId: currentJobId,
        });
      }

      setActiveTargetId(targetId);
      applyServerDestinationTable(target.destinationTable);
      setDestinationConnectorName(target.destinationConnector);

      if (target.jobId) {
        try {
          const job = await refreshJobState(target.jobId);
          syncJobFromApiResponse(target.jobId, job);
          persistWorkflowStage({ jobId: target.jobId, destinationTable: target.destinationTable });
        } catch {
          resetJobState();
        }
      } else {
        resetJobState();
      }
    },
    [
      workflowId,
      integrationTargets,
      activeTargetId,
      currentJobId,
      destinationTable,
      destinationConnectorName,
      applyServerDestinationTable,
      refreshJobState,
      syncJobFromApiResponse,
      persistWorkflowStage,
      resetJobState,
    ]
  );

  const handleAddTarget = useCallback(
    (target: Omit<IntegrationTargetLink, "id">) => {
      if (!workflowId) return;
      const created: IntegrationTargetLink = {
        ...target,
        destinationConnector: target.destinationConnector || destinationConnectorName,
        id: createTargetId(),
      };
      const next = upsertIntegrationTarget(workflowId, created);
      setIntegrationTargets(next);
      void handleSelectTarget(created.id, created);
    },
    [workflowId, destinationConnectorName, handleSelectTarget]
  );

  const handleRemoveTarget = useCallback(
    (targetId: string) => {
      if (!workflowId) return;
      const next = removeIntegrationTarget(workflowId, targetId);
      setIntegrationTargets(next);
      if (activeTargetId === targetId && next.length > 0) {
        void handleSelectTarget(next[0].id);
      }
    },
    [workflowId, activeTargetId, handleSelectTarget]
  );

  const handleRemoveAllTargets = useCallback(() => {
    if (!workflowId) return;
    const keepId =
      integrationTargets.find((t) => t.id === activeTargetId)?.id ?? integrationTargets[0]?.id;
    const next = clearIntegrationTargets(workflowId, keepId ? [keepId] : []);
    setIntegrationTargets(next);
    if (next.length > 0) {
      if (activeTargetId !== next[0].id) void handleSelectTarget(next[0].id);
    } else {
      setActiveTargetId(null);
    }
  }, [workflowId, integrationTargets, activeTargetId, handleSelectTarget]);

  const targetMappingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const target of integrationTargets) {
      counts[target.id] = target.id === activeTargetId ? mappings.length : target.jobId ? 0 : 0;
    }
    if (activeTargetId) counts[activeTargetId] = mappings.length;
    return counts;
  }, [integrationTargets, activeTargetId, mappings.length]);

  const sourceColumnsForSchema = useMemo(
    () =>
      Array.from(new Set(mappings.map((m) => m.source_column).filter(Boolean))).map((name) => ({
        name,
        isPrimaryKey: name === "id" || name.endsWith("_id"),
      })),
    [mappings]
  );

  // Restores the workflow-level "last touched job" on real mount / when
  // Pipeline stages new data (stageRevision bump) — NOT on every render
  // where some unrelated setup field changes. `getWorkflowIntegrationStage`
  // is a single per-workflow slot, not per-target: `refreshJobState` and
  // `syncJobFromApiResponse` are deliberately left out of the dependency
  // array because their identity changes on almost every keystroke/target
  // switch (syncJobFromApiResponse depends on savedJobSourceTable/
  // savedJobDestinationTable). Reacting to those would re-fire this restore
  // mid-session and silently overwrite whatever target the user just
  // switched to with the OTHER target's stale job — exactly the bug where
  // selecting a fresh second target snapped back to the first target's
  // locked job a moment later.
  useEffect(() => {
    if (!workflowId) return;
    const stage = getWorkflowIntegrationStage(workflowId);
    if (!stage?.jobId) return;

    const restoreJob = async () => {
      try {
        const job = await refreshJobState(stage.jobId!);
        syncJobFromApiResponse(stage.jobId!, job);
      } catch {
        // User can suggest mappings again if job was deleted.
      }
    };
    restoreJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore only on mount/stageRevision, see comment above
  }, [workflowId, stageRevision]);

  useEffect(() => {
    if (!currentJobId) return;
    try {
      const stored = sessionStorage.getItem(`integration-blocked-dest-${currentJobId}`);
      if (!stored) return;
      const columns = JSON.parse(stored) as string[];
      if (Array.isArray(columns) && columns.length > 0) {
        setBlockedDestinationHints((previous) => Array.from(new Set([...previous, ...columns])));
      }
    } catch {
      // ignore invalid session storage
    }
  }, [currentJobId]);

  useEffect(() => {
    const loadSetupOptions = async () => {
      try {
        const selectedCompanyId = localStorage.getItem("selectedCompanyId");

        if (selectedCompanyId) {
          const connectorConfigs = await fetchCompanyConnectors(selectedCompanyId);
          const activeConfigs = connectorConfigs.filter((connector) => connector?.is_active);
          // Keep the configs, not just their type names: catalog-browse is
          // scoped by connector_config_id, and the id is the only thing that
          // identifies WHICH connector of a given type to browse.
          setConnectorConfigs(activeConfigs);
          const connectorNames = Array.from(
            new Set(
              activeConfigs
                .map((connector) => connector.erp_type || connector.connector_name)
                .filter((name): name is string => Boolean(name))
                .map((name) => name.toLowerCase())
            )
          );
          setAvailableConnectors(connectorNames);
          if (connectorNames.length > 0) {
            setSourceConnectorName((previousConnectorName) =>
              connectorNames.includes(previousConnectorName)
                ? previousConnectorName
                : connectorNames[0]
            );
            setDestinationConnectorName((previousConnectorName) => {
              if (connectorNames.includes(previousConnectorName)) return previousConnectorName;
              if (connectorNames.includes(DEFAULT_DESTINATION_CONNECTOR)) {
                return DEFAULT_DESTINATION_CONNECTOR;
              }
              return connectorNames[0];
            });
          }
        }

        const documents = await fetchAllOcrDocuments();
        const sourceTables = Array.from(
          new Set(
            (documents || [])
              .map((doc) => {
                if (!doc.raw || typeof doc.raw !== "object") return "";
                const rawDocument = doc.raw as Record<string, unknown>;
                const tableName =
                  rawDocument.data_product_table_name ??
                  rawDocument.source_table_name ??
                  rawDocument.source_table;
                return typeof tableName === "string" ? tableName : "";
              })
              .filter(Boolean)
          )
        );
        if (sourceTables.length > 0)
          setSourceTableName((previousTableName) =>
            previousTableName.trim() ? previousTableName : sourceTables[0]
          );
      } catch {
        // UI keeps working with manual fallback values.
      }
    };
    loadSetupOptions();
  }, []);

  useEffect(() => {
    const loadSourceTables = async () => {
      // Same move as the destination loader below: connector-scoped
      // catalog-browse instead of the company-wide /data/catalog/. It matters
      // more here — the source list is then filtered down to ocr_staging_*
      // names, so any staging table lost to that endpoint's 500-row default
      // silently disappeared from the picker.
      if (!sourceConnectorName || connectorConfigs.length === 0) {
        setAvailableSourceTables([]);
        return;
      }

      setIsLoadingSourceTables(true);
      try {
        const sourceTables = await fetchTableNamesForConnectorType(
          connectorConfigs,
          sourceConnectorName
        );

        setAvailableSourceTables(sourceTables);
        if (sourceTables.length > 0) {
          setSourceTableName((previousTableName) =>
            previousTableName.trim() ? previousTableName : sourceTables[0]
          );
        }
      } catch (error) {
        setAvailableSourceTables([]);
        showApiErrorToast(error, "Couldn't load source tables", { id: "source-tables" });
      } finally {
        setIsLoadingSourceTables(false);
      }
    };

    loadSourceTables();
  }, [sourceConnectorName, connectorConfigs]);

  useEffect(() => {
    const loadDestinationTables = async () => {
      // No localStorage company id needed any more — catalog-browse scopes by
      // connector config and takes the company from the caller's token. The
      // configs arrive from loadSetupOptions, so this re-runs once they land.
      if (!destinationConnectorName || connectorConfigs.length === 0) {
        setAvailableDestinationTables([]);
        return;
      }
      setIsLoadingDestinationTables(true);
      try {
        // catalog-browse (connector-scoped) rather than the company-wide
        // /data/catalog/. Same names either way — both resolve to
        // db_tables.table_name, which is exactly what suggest-mappings takes as
        // `destination_table` — but this is scoped server-side to the connector
        // instead of pulling the whole company catalog and filtering by
        // erp_type here, so nothing is lost to that endpoint's 500-row default.
        // Every config of the selected type is queried and merged, so the list
        // matches what the client-side type filter produced before.
        const destinationTables = await fetchTableNamesForConnectorType(
          connectorConfigs,
          destinationConnectorName
        );

        setAvailableDestinationTables(destinationTables);
        if (destinationTables.length > 0)
          setDestinationTable((previousTableName: any) =>
            previousTableName && destinationTables.includes(previousTableName)
              ? previousTableName
              : destinationTables[0]
          );
      } catch (error) {
        setAvailableDestinationTables([]);
        showApiErrorToast(error, "Couldn't load destination tables", { id: "destination-tables" });
      } finally {
        setIsLoadingDestinationTables(false);
      }
    };
    loadDestinationTables();
  }, [destinationConnectorName, connectorConfigs]);

  const handleSuggestMappings = useCallback(async () => {
    if (!sourceTableName || !destinationTable) {
      toast.error("Source table and destination table are required.");
      return;
    }
    setIsSuggesting(true);
    try {
      const response = await IntegrationAPI.suggestMappings({
        job_name: jobName,
        source_table_name: sourceTableName,
        source_connector_name: sourceConnectorName,
        destination_table: destinationTable,
        destination_connector_name: destinationConnectorName,
      });
      setCurrentJobId(response.job_id);
      const normalized = normalizeIntegrationColumnMappings(response.suggested_mappings);
      const {
        mappings: mappingsForJob,
        jobId: activeJobId,
        skippedSourceColumns,
        skippedDestinationColumns,
      } = await finalizeSuggestedMappings(response.job_id, normalized);
      setCurrentJobId(activeJobId);
      setMappings(mappingsForJob);
      setUnmatchedSourceColumns(
        Array.from(new Set([...(response.unmatched_source_columns || []), ...skippedSourceColumns]))
      );
      setUnmatchedTargetColumns(
        Array.from(
          new Set([...(response.unmatched_target_columns || []), ...skippedDestinationColumns])
        )
      );
      setMatchMethod(response.match_method || "-");
      setJobLocked(false);
      setJobStatus((response.status as IntegrationJob["status"]) || "pending_mapping_approval");
      if (response.source_table) applyServerSourceTable(response.source_table);
      if (response.destination_table) applyServerDestinationTable(response.destination_table);
      setSavedJobSourceTable(response.source_table || sourceTableName);
      setSavedJobDestinationTable(response.destination_table || destinationTable);
      persistWorkflowStage({
        sourceTable: response.source_table || sourceTableName,
        destinationTable: response.destination_table || destinationTable,
        jobId: activeJobId,
        stagedFrom: "integrate",
      });
      persistActiveTargetJob(activeJobId, mappingsForJob.length);
      toast.success("Mappings suggested successfully.");
    } catch (error) {
      toastIntegrationError(error, "Failed to suggest mappings.");
    } finally {
      setIsSuggesting(false);
    }
  }, [
    applyServerDestinationTable,
    applyServerSourceTable,
    destinationConnectorName,
    destinationTable,
    finalizeSuggestedMappings,
    jobName,
    sourceConnectorName,
    sourceTableName,
    persistWorkflowStage,
    persistActiveTargetJob,
  ]);

  const ensureJobUnlockedFromServer = useCallback(async (): Promise<{
    ok: boolean;
    jobId: string | null;
  }> => {
    if (!currentJobId) return { ok: false, jobId: null };
    try {
      let activeJobId = currentJobId;
      const job = await IntegrationAPI.getJob(activeJobId);
      activeJobId = syncJobFromApiResponse(activeJobId, job);
      if (!job.locked) return { ok: true, jobId: activeJobId };

      const unlocked = await IntegrationAPI.unlockJob(activeJobId);
      activeJobId = syncJobFromApiResponse(activeJobId, unlocked);
      setHasPendingReview(false);
      return { ok: !unlocked.locked, jobId: activeJobId };
    } catch {
      return { ok: false, jobId: currentJobId };
    }
  }, [currentJobId, syncJobFromApiResponse]);

  const handleUnlockJob = useCallback(async () => {
    if (!currentJobId) return;
    setIsUnlocking(true);
    try {
      const unlockResult = await ensureJobUnlockedFromServer();
      if (!unlockResult.ok) {
        toast.error("Could not unlock job. Admin role is required.");
        return;
      }
      setCompileErrors([]);
      setCompileErrorMessage(null);
      toast.success("Job unlocked. You can edit setup and suggest mappings again.");
    } catch (error) {
      toastIntegrationError(error, "Failed to unlock job. Admin role may be required.");
    } finally {
      setIsUnlocking(false);
    }
  }, [currentJobId, ensureJobUnlockedFromServer]);

  const handleUnlockAndSuggest = useCallback(async () => {
    if (!sourceTableName || !destinationTable) {
      toast.error("Source table and destination table are required.");
      return;
    }
    if (currentJobId) {
      setIsUnlocking(true);
      try {
        const unlockResult = await ensureJobUnlockedFromServer();
        if (!unlockResult.ok) {
          toast.error("Could not unlock job. Admin role may be required.");
          setIsUnlocking(false);
          return;
        }
        setCompileErrors([]);
        setCompileErrorMessage(null);
      } catch (error) {
        toastIntegrationError(error, "Failed to unlock job. Admin role may be required.");
        setIsUnlocking(false);
        return;
      }
      setIsUnlocking(false);
    }
    setIsSuggesting(true);
    try {
      const response = await IntegrationAPI.suggestMappings({
        job_name: jobName,
        source_table_name: sourceTableName,
        source_connector_name: sourceConnectorName,
        destination_table: destinationTable,
        destination_connector_name: destinationConnectorName,
      });
      setCurrentJobId(response.job_id);
      const normalized = normalizeIntegrationColumnMappings(response.suggested_mappings);
      const {
        mappings: mappingsForJob,
        jobId: activeJobId,
        skippedSourceColumns,
        skippedDestinationColumns,
      } = await finalizeSuggestedMappings(response.job_id, normalized);
      setCurrentJobId(activeJobId);
      setMappings(mappingsForJob);
      setUnmatchedSourceColumns(
        Array.from(new Set([...(response.unmatched_source_columns || []), ...skippedSourceColumns]))
      );
      setUnmatchedTargetColumns(
        Array.from(
          new Set([...(response.unmatched_target_columns || []), ...skippedDestinationColumns])
        )
      );
      setMatchMethod(response.match_method || "-");
      setJobLocked(false);
      setJobStatus((response.status as IntegrationJob["status"]) || "pending_mapping_approval");
      if (response.source_table) applyServerSourceTable(response.source_table);
      if (response.destination_table) applyServerDestinationTable(response.destination_table);
      setSavedJobSourceTable(response.source_table || sourceTableName);
      setSavedJobDestinationTable(response.destination_table || destinationTable);
      persistWorkflowStage({
        sourceTable: response.source_table || sourceTableName,
        destinationTable: response.destination_table || destinationTable,
        jobId: activeJobId,
        stagedFrom: "integrate",
      });
      toast.success("Job unlocked and mappings re-suggested for the new destination.");
    } catch (error) {
      toastIntegrationError(error, "Failed to suggest mappings.");
    } finally {
      setIsSuggesting(false);
    }
  }, [
    currentJobId,
    applyServerDestinationTable,
    applyServerSourceTable,
    destinationConnectorName,
    destinationTable,
    ensureJobUnlockedFromServer,
    finalizeSuggestedMappings,
    jobName,
    persistWorkflowStage,
    sourceConnectorName,
    sourceTableName,
  ]);

  const handleSaveMappings = useCallback(async () => {
    if (!currentJobId || mappingsAreReadOnly) return;
    setIsSaving(true);
    try {
      await patchJobColumnMappings(currentJobId, mappings);
      toast.success("Mappings updated.");
    } catch (error) {
      toastIntegrationError(error, "Failed to update mappings.");
    } finally {
      setIsSaving(false);
    }
  }, [currentJobId, mappings, mappingsAreReadOnly, patchJobColumnMappings]);

  const saveMappingsToJob = useCallback(
    async (nextMappings: IntegrationColumnMapping[], nextUpsertKeys?: string[]) => {
      if (!currentJobId || mappingsAreReadOnly) return null;
      const result = await patchJobColumnMappings(
        currentJobId,
        nextMappings,
        nextUpsertKeys
      );
      setMappings(result.payload);
      return result;
    },
    [currentJobId, mappingsAreReadOnly, patchJobColumnMappings]
  );

  const persistColumnMappings = useCallback(
    async (nextMappings: IntegrationColumnMapping[], requestedJobId?: string) => {
      const jobId = requestedJobId ?? currentJobId;
      if (!jobId) return null;
      const result = await patchJobColumnMappings(jobId, nextMappings);
      setMappings(result.payload);
      return result;
    },
    [currentJobId, patchJobColumnMappings]
  );

  const buildMappingsWithoutCompileErrors = useCallback(
    (workingMappings: IntegrationColumnMapping[], errors: IntegrationCompileError[]) => {
      const blockedDestinations = getBlockedDestinationColumnsFromCompileErrors(errors);
      return filterMappingsToWritableDestinations(
        filterMappingsBlockedByCompileErrors(workingMappings, errors),
        blockedDestinations
      );
    },
    []
  );

  const resolveMappingsForCompileFix = useCallback(async () => {
    if (!currentJobId) {
      return normalizeIntegrationColumnMappings(mappings);
    }
    try {
      const job = await IntegrationAPI.getJob(currentJobId);
      syncJobFromApiResponse(currentJobId, job);
      return normalizeIntegrationColumnMappings(job.column_mappings);
    } catch {
      return normalizeIntegrationColumnMappings(mappings);
    }
  }, [currentJobId, mappings, syncJobFromApiResponse]);

  const applyCompileErrorFix = useCallback(
    async (errors: IntegrationCompileError[]) => {
      if (!currentJobId) return { ok: false as const, removedCount: 0 };

      let activeJobId = currentJobId;
      const initialJob = await IntegrationAPI.getJob(activeJobId);
      activeJobId = syncJobFromApiResponse(activeJobId, initialJob);
      const initialMappings = normalizeIntegrationColumnMappings(initialJob.column_mappings);
      const nextMappings = buildMappingsWithoutCompileErrors(initialMappings, errors);
      const removedCount = initialMappings.length - nextMappings.length;

      if (removedCount === 0) {
        return {
          ok: false as const,
          removedCount: 0,
          blockedOnServer: findMappingsBlockedByCompileErrors(initialMappings, errors),
        };
      }

      const wasLocked = Boolean(initialJob.locked);
      const unlockResult = await ensureJobUnlockedFromServer();
      if (!unlockResult.ok) {
        return {
          ok: false as const,
          removedCount,
          unlockFailed: true,
          wasLocked,
        };
      }

      activeJobId = unlockResult.jobId ?? activeJobId;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const patched = await patchJobColumnMappings(activeJobId, nextMappings);
        activeJobId = patched.jobId;

        const verifiedJob = await IntegrationAPI.getJob(activeJobId);
        const verifiedJobId = syncJobFromApiResponse(activeJobId, verifiedJob);
        activeJobId = verifiedJobId;
        const verifiedMappings = normalizeIntegrationColumnMappings(verifiedJob.column_mappings);

        if (!mappingsStillBlockedOnServer(verifiedMappings, errors)) {
          rememberBlockedDestinations(errors);

          let reviewApproved = false;
          try {
            const { job, jobId } = await finalizeMappingFixReviewFlow(
              activeJobId,
              `Removed ${removedCount} incompatible formula mapping(s) (e.g. charter_id→charter_id).`
            );
            syncJobFromApiResponse(activeJobId, job);
            activeJobId = jobId;
            setHasPendingReview(false);
            reviewApproved = Boolean(job.locked);
            setReviewRefreshNonce((previous) => previous + 1);
          } catch {
            // Approve requires admin — mappings are saved; reviewer can decide in HITL panel.
          }

          return { ok: true as const, removedCount, wasLocked, reviewApproved, jobId: activeJobId };
        }
      }

      const finalJob = await IntegrationAPI.getJob(activeJobId);
      syncJobFromApiResponse(activeJobId, finalJob);
      const finalMappings = normalizeIntegrationColumnMappings(finalJob.column_mappings);
      rememberBlockedDestinations(errors);

      return {
        ok: false as const,
        removedCount,
        stillBlocked: findMappingsBlockedByCompileErrors(finalMappings, errors),
        wasLocked,
      };
    },
    [
      buildMappingsWithoutCompileErrors,
      currentJobId,
      ensureJobUnlockedFromServer,
      patchJobColumnMappings,
      rememberBlockedDestinations,
      syncJobFromApiResponse,
    ]
  );

  /**
   * `referenceName` (EP-947) optionally gives the job a stable handle so a DRAT
   * abstraction pipeline step can point at it — see ActivateJobDialog for why that
   * cannot be the job id, and why it is offered at activation rather than earlier.
   * Undefined means the user skipped naming, which activates exactly as before.
   */
  const handleActivateJob = useCallback(async (referenceName?: string) => {
    if (!currentJobId) return;
    setIsActivating(true);
    setCompileErrors([]);
    setCompileErrorMessage(null);
    try {
      const job = await IntegrationAPI.activateJob(currentJobId, referenceName);
      syncJobFromApiResponse(currentJobId, job);
      persistActiveTargetJob(currentJobId, mappings.length);
      setBundleJobActivatedNonce((previous) => previous + 1);
      setCompileErrors([]);
      setCompileErrorMessage(null);
      setIsActivateDialogOpen(false);
      toast.success(
        referenceName
          ? `Integration job activated as "${referenceName}" — it can now be used as a pipeline step.`
          : "Integration job activated."
      );
    } catch (error) {
      const parsed = parseIntegrationApiError(error);
      if (parsed?.compileErrors.length) {
        const fixResult = await applyCompileErrorFix(parsed.compileErrors);

        if (fixResult.ok) {
          setCompileErrors([]);
          setCompileErrorMessage(null);
          toast.success(
            fixResult.reviewApproved
              ? `Removed ${fixResult.removedCount} incompatible mapping(s) and approved review — click Activate.`
              : fixResult.wasLocked
                ? `Removed ${fixResult.removedCount} incompatible mapping(s) on the server. Approve the review in HITL (admin), then activate.`
                : `Removed ${fixResult.removedCount} incompatible mapping(s). Click Activate again.`
          );
          setIsActivating(false);
          return;
        }

        if (fixResult.removedCount > 0 && fixResult.unlockFailed) {
          showApiErrorToast(
            error,
            "Could not unlock the job to save mapping fixes. Ask an admin to unlock, then remove charter_id→charter_id in Edit Mappings.",
          );
        } else if (fixResult.removedCount > 0 && fixResult.stillBlocked?.length) {
          toast.error(
            `PATCH did not remove: ${fixResult.stillBlocked
              .map((m) => `${m.source_column}→${m.destination_column}`)
              .join(
                ", "
              )}. Open Edit Mappings, delete charter_id row, Save, then Submit for Review.`
          );
        }

        setCompileErrors(parsed.compileErrors);
        setCompileErrorMessage(parsed.message);
        rememberBlockedDestinations(parsed.compileErrors);
      } else {
        setCompileErrors([]);
        setCompileErrorMessage(null);
      }
      toastIntegrationError(error, "Failed to activate integration job.");
    } finally {
      setIsActivating(false);
    }
  }, [
    applyCompileErrorFix,
    currentJobId,
    mappings.length,
    persistActiveTargetJob,
    rememberBlockedDestinations,
    syncJobFromApiResponse,
  ]);

  const handleRemoveBlockedMappings = useCallback(async () => {
    if (compileErrors.length === 0) return;

    setIsSaving(true);
    try {
      const fixResult = await applyCompileErrorFix(compileErrors);

      if (fixResult.ok) {
        setCompileErrors([]);
        setCompileErrorMessage(null);
        toast.success(
          fixResult.reviewApproved
            ? `Removed ${fixResult.removedCount} blocked mapping(s), review approved — click Activate.`
            : fixResult.wasLocked
              ? `Removed ${fixResult.removedCount} blocked mapping(s) on the server. Approve in HITL (admin), then activate.`
              : `Removed ${fixResult.removedCount} blocked mapping(s) and saved. Try Activate again.`
        );
        return;
      }

      if (fixResult.unlockFailed) {
        toast.error(
          "Could not unlock the job. Admin must unlock before removing formula-field mappings like charter_id."
        );
        return;
      }

      if (fixResult.removedCount === 0) {
        const refs = getCompileErrorMappingRefs(compileErrors)
          .map((ref) => `${ref.sourceColumn}→${ref.destinationColumn}`)
          .join(", ");
        toast.error(
          `Could not find mappings to remove (${refs || blockedDestinationColumns.join(", ")}). Run Suggest Mappings again.`
        );
        return;
      }

      if (fixResult.stillBlocked?.length) {
        toast.error(
          `Server still has: ${fixResult.stillBlocked
            .map((m) => `${m.source_column}→${m.destination_column}`)
            .join(", ")}. Use Edit Mappings → delete charter_id row → Save Mappings.`
        );
      }
    } catch (error) {
      toastIntegrationError(error, "Failed to save after removing mappings.");
    } finally {
      setIsSaving(false);
    }
  }, [applyCompileErrorFix, blockedDestinationColumns, compileErrors]);

  const handleOpenEditorToFixBlocked = useCallback(async () => {
    if (!currentJobId || compileErrors.length === 0) return;
    setIsSaving(true);
    try {
      const unlockResult = await ensureJobUnlockedFromServer();
      if (!unlockResult.ok) {
        toast.error("Admin must unlock the job before you can edit mappings.");
        return;
      }
      const job = await IntegrationAPI.getJob(unlockResult.jobId ?? currentJobId);
      const fixed = buildMappingsWithoutCompileErrors(
        normalizeIntegrationColumnMappings(job.column_mappings),
        compileErrors
      );
      setMappings(fixed);
      setIsEditingMappings(true);
      setJobLocked(false);
      toast.message(
        "Editor opened without charter_id (formula) mapping. Save Mappings → Submit for Review → Approve → Activate."
      );
    } catch (error) {
      toastIntegrationError(error, "Failed to open mapping editor.");
    } finally {
      setIsSaving(false);
    }
  }, [
    buildMappingsWithoutCompileErrors,
    compileErrors,
    currentJobId,
    ensureJobUnlockedFromServer,
  ]);

  // suggestMappings() only ever populates unmatchedSourceColumns/
  // unmatchedTargetColumns for columns that were unmatched at suggestion
  // time — a column that WAS auto-matched never appears in those lists in
  // the first place. So removing a mapping (here, or from the Edit Mappings
  // editor) has to explicitly add its source/destination column back,
  // otherwise a deleted mapping for an originally-auto-matched pair just
  // vanishes instead of reappearing as unmatched. Matched-elsewhere columns
  // are still correctly filtered back out by effectiveUnmatchedSource/
  // TargetColumns, so it's safe to always add here.
  const restoreUnmatchedForRemovedMappings = useCallback(
    (
      previousMappings: IntegrationColumnMapping[],
      nextMappings: IntegrationColumnMapping[]
    ) => {
      const remainingSourceColumns = new Set(nextMappings.map((m) => m.source_column));
      const remainingTargetColumns = new Set(nextMappings.map((m) => m.destination_column));
      const removedSourceColumns = previousMappings
        .filter((m) => !remainingSourceColumns.has(m.source_column))
        .map((m) => m.source_column);
      const removedTargetColumns = previousMappings
        .filter((m) => !remainingTargetColumns.has(m.destination_column))
        .map((m) => m.destination_column);

      if (removedSourceColumns.length > 0) {
        setUnmatchedSourceColumns((previous) =>
          Array.from(new Set([...previous, ...removedSourceColumns]))
        );
      }
      if (removedTargetColumns.length > 0) {
        setUnmatchedTargetColumns((previous) =>
          Array.from(new Set([...previous, ...removedTargetColumns]))
        );
      }
    },
    []
  );

  const handleRemoveMapping = useCallback(
    async (sourceColumn: string, destinationColumn: string) => {
      const isCompileBlocked = isMappingBlockedByCompileErrors(
        { source_column: sourceColumn, destination_column: destinationColumn },
        compileErrors
      );
      if (mappingsAreReadOnly && !isCompileBlocked) return;

      const nextMappings = normalizeIntegrationColumnMappings(mappings).filter(
        (mapping) =>
          !(
            mapping.source_column === sourceColumn &&
            mapping.destination_column === destinationColumn
          )
      );
      const nextCompileErrors = compileErrors.filter(
        (error) =>
          !isMappingBlockedByCompileErrors(
            { source_column: sourceColumn, destination_column: destinationColumn },
            [error]
          )
      );

      restoreUnmatchedForRemovedMappings(mappings, nextMappings);
      setMappings(nextMappings);
      setCompileErrors(nextCompileErrors);

      if (!isCompileBlocked || !currentJobId || nextCompileErrors.length > 0) return;

      setIsSaving(true);
      try {
        const unlockResult = await ensureJobUnlockedFromServer();
        if (!unlockResult.ok) {
          toast.error("Admin must unlock the job before saving mapping removal.");
          return;
        }

        const patchResult = await persistColumnMappings(
          nextMappings,
          unlockResult.jobId ?? undefined
        );
        if (!patchResult) return;
        setCompileErrorMessage(null);

        let reviewApproved = false;
        try {
          const { job, jobId } = await finalizeMappingFixReviewFlow(
            patchResult.jobId,
            `Removed incompatible mapping ${sourceColumn}→${destinationColumn} (formula/read-only target).`
          );
          syncJobFromApiResponse(patchResult.jobId, job);
          setHasPendingReview(false);
          reviewApproved = Boolean(job.locked);
          setReviewRefreshNonce((previous) => previous + 1);
        } catch (error) {
          toast.message(
            extractApiErrorMessage(
              error,
              "Mapping saved. An admin must approve the review in HITL before activating."
            )
          );
          return;
        }

        toast.success(
          reviewApproved
            ? `Removed ${sourceColumn}→${destinationColumn} and approved review — click Activate.`
            : `Removed ${sourceColumn}→${destinationColumn} and saved mappings.`
        );
      } catch (error) {
        toastIntegrationError(error, "Failed to save after removing mapping.");
      } finally {
        setIsSaving(false);
      }
    },
    [
      compileErrors,
      currentJobId,
      ensureJobUnlockedFromServer,
      extractApiErrorMessage,
      mappings,
      mappingsAreReadOnly,
      persistColumnMappings,
      restoreUnmatchedForRemovedMappings,
      syncJobFromApiResponse,
    ]
  );

  const handleConfirmMapping = useCallback(
    (sourceColumn: string, destinationColumn: string) => {
      if (mappingsAreReadOnly) return;
      setMappings((previous) =>
        previous.map((mapping) =>
          mapping.source_column === sourceColumn && mapping.destination_column === destinationColumn
            ? { ...mapping, match_confidence: "auto" as const }
            : mapping
        )
      );
    },
    [mappingsAreReadOnly]
  );

  const handleConfirmAllReviewSuggested = useCallback(() => {
    if (mappingsAreReadOnly) return;
    setMappings((previous) =>
      previous.map((mapping) =>
        mapping.match_confidence === "review_suggested"
          ? { ...mapping, match_confidence: "auto" as const }
          : mapping
      )
    );
    toast.success("All review-suggested mappings confirmed.");
  }, [mappingsAreReadOnly]);

  const handleAddUnmatchedMapping = useCallback(() => {
    if (mappingsAreReadOnly || !pairSourceColumn || !pairTargetColumn) return;

    const alreadyMapped = mappings.some(
      (mapping) =>
        mapping.source_column === pairSourceColumn ||
        mapping.destination_column === pairTargetColumn
    );
    if (alreadyMapped) {
      toast.error("Source or target column is already mapped.");
      return;
    }

    setMappings((previous) => [
      ...previous,
      {
        source_column: pairSourceColumn,
        destination_column: pairTargetColumn,
        data_type: "string",
        is_required: false,
        order_index: previous.length,
        match_confidence: "auto",
      },
    ]);
    setPairSourceColumn("");
    setPairTargetColumn("");
    toast.success(`Mapped ${pairSourceColumn} → ${pairTargetColumn}`);
  }, [mappings, mappingsAreReadOnly, pairSourceColumn, pairTargetColumn]);

  const handleDismissUnmatchedSource = useCallback((column: string) => {
    setUnmatchedSourceColumns((previous) => previous.filter((entry) => entry !== column));
  }, []);

  const handleDismissUnmatchedTarget = useCallback((column: string) => {
    setUnmatchedTargetColumns((previous) => previous.filter((entry) => entry !== column));
  }, []);

  const handleSkipAllUnmatchedSources = useCallback(() => {
    if (effectiveUnmatchedSourceColumns.length === 0) return;
    const skipSet = new Set(effectiveUnmatchedSourceColumns);
    setUnmatchedSourceColumns((previous) => previous.filter((entry) => !skipSet.has(entry)));
    setPairSourceColumn("");
    toast.success(`Skipped ${effectiveUnmatchedSourceColumns.length} unmatched source column(s).`);
  }, [effectiveUnmatchedSourceColumns]);

  const handleSkipAllUnmatchedTargets = useCallback(() => {
    if (effectiveUnmatchedTargetColumns.length === 0) return;
    const skipSet = new Set(effectiveUnmatchedTargetColumns);
    setUnmatchedTargetColumns((previous) => previous.filter((entry) => !skipSet.has(entry)));
    setPairTargetColumn("");
    toast.success(`Skipped ${effectiveUnmatchedTargetColumns.length} unmatched target column(s).`);
  }, [effectiveUnmatchedTargetColumns]);

  const handleSkipAllUnmatched = useCallback(() => {
    const sourceCount = effectiveUnmatchedSourceColumns.length;
    const targetCount = effectiveUnmatchedTargetColumns.length;
    if (sourceCount + targetCount === 0) return;

    if (sourceCount > 0) {
      const sourceSkipSet = new Set(effectiveUnmatchedSourceColumns);
      setUnmatchedSourceColumns((previous) =>
        previous.filter((entry) => !sourceSkipSet.has(entry))
      );
    }
    if (targetCount > 0) {
      const targetSkipSet = new Set(effectiveUnmatchedTargetColumns);
      setUnmatchedTargetColumns((previous) =>
        previous.filter((entry) => !targetSkipSet.has(entry))
      );
    }
    setPairSourceColumn("");
    setPairTargetColumn("");
    toast.success(`Skipped ${sourceCount + targetCount} unmatched column(s).`);
  }, [effectiveUnmatchedSourceColumns, effectiveUnmatchedTargetColumns]);

  const handleEditorSave = useCallback(
    async (nextMappings: IntegrationColumnMapping[], nextUpsertKeys: string[]) => {
      if (!currentJobId || mappingsAreReadOnly) return;
      restoreUnmatchedForRemovedMappings(mappings, nextMappings);
      setIsSaving(true);
      try {
        // nextUpsertKeys is always sent, [] included — [] is how the editor
        // expresses Append, and dropping it here is what made the write mode
        // silently revert on reopen.
        const patchResult = await saveMappingsToJob(nextMappings, nextUpsertKeys);
        setIsEditingMappings(false);
        if (!patchResult) return;

        const clearedCompileErrors =
          compileErrors.length > 0 && !mappingsStillBlockedOnServer(nextMappings, compileErrors);

        if (clearedCompileErrors) {
          setCompileErrors([]);
          setCompileErrorMessage(null);

          try {
            const { job } = await finalizeMappingFixReviewFlow(
              patchResult.jobId,
              "Removed incompatible formula mappings from editor (e.g. charter_id→charter_id)."
            );
            syncJobFromApiResponse(patchResult.jobId, job);
            setHasPendingReview(false);
            setReviewRefreshNonce((previous) => previous + 1);
            toast.success(
              job.locked
                ? "Mappings saved and review approved — click Activate."
                : "Mappings saved from editor."
            );
            return;
          } catch (error) {
            toast.message(
              extractApiErrorMessage(
                error,
                "Mappings saved. An admin must approve the review in HITL before activating."
              )
            );
            return;
          }
        }

        toast.success("Mappings saved from editor.");
      } catch (error) {
        toastIntegrationError(error, "Failed to save mappings.");
      } finally {
        setIsSaving(false);
      }
    },
    [
      compileErrors,
      currentJobId,
      extractApiErrorMessage,
      mappings,
      mappingsAreReadOnly,
      restoreUnmatchedForRemovedMappings,
      saveMappingsToJob,
      syncJobFromApiResponse,
    ]
  );

  const handleRunJob = useCallback(async () => {
    if (!currentJobId || jobStatus !== "active") return;
    setIsRunning(true);
    try {
      const nextRun = await IntegrationAPI.triggerRun(currentJobId, {
        triggered_by: "abstraction_ui",
        idempotency_key: `${currentJobId}-run-${Date.now()}`,
      });
      setRun(nextRun);
      toast.success("Integration run started.");
    } catch (error) {
      toastIntegrationError(error, "Failed to start integration run.");
    } finally {
      setIsRunning(false);
    }
  }, [currentJobId, jobStatus]);

  useEffect(() => {
    if (!run?.id) return;
    if (!["pending", "running"].includes(run.status)) return;
    const interval = window.setInterval(async () => {
      try {
        const latest = await IntegrationAPI.getRun(run.id);
        setRun(latest);
      } catch {
        window.clearInterval(interval);
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [run]);

  useEffect(() => {
    if (!run) return;

    const hasStatusChanged = previousRunStatusRef.current !== run.status;
    const completedStages = run.stages.filter((stage) => stage.status === "completed").length;
    const totalStages = run.stages.length || 4;
    const hasStageProgressed = completedStages !== previousCompletedStagesRef.current;

    if (run.status === "running" && (hasStatusChanged || hasStageProgressed)) {
      const remainingStages = Math.max(totalStages - completedStages, 0);
      toast.message(
        `Run in progress: ${completedStages}/${totalStages} stages completed, ${remainingStages} remaining.`
      );
    }

    if (run.status === "completed" && hasStatusChanged) {
      toast.success("Integration run completed successfully.");
    }

    // The run stopped rather than guess which record to overwrite. Not an
    // error and not a success — some rows landed, the ambiguous ones are
    // waiting on a person. Sticky (no auto-dismiss) with a direct action,
    // because this one needs acting on rather than acknowledging.
    if (run.status === "awaiting_review" && hasStatusChanged) {
      const waiting = run.review_records ?? 0;
      const written = run.processed_records ?? 0;
      toast.warning(
        waiting
          ? `${waiting} row(s) matched more than one existing record and need your decision. ${written} row(s) were written as normal.`
          : "Some rows matched more than one existing record and need your decision.",
        {
          duration: Infinity,
          action: {
            label: "Pick records",
            // Stays in this tab — resolving a conflict hit while running a job
            // should not throw the user across the app into /data-room.
            onClick: () => {
              refetchWriteConflicts();
              setIntegrateSubTab("conflicts");
            },
          },
        }
      );
    }

    if (run.status === "failed" && hasStatusChanged) {
      toast.error(run.error || "Integration run failed.");
    }

    previousRunStatusRef.current = run.status;
    previousCompletedStagesRef.current = completedStages;
  }, [run, router]);

  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    return mappings.map((mapping) => ({
      sourceColumn: mapping.source_column || "(unmapped)",
      targetColumn: mapping.destination_column,
      status: mapping.match_confidence || "review_suggested",
      score: mapping.match_score,
    }));
  }, [mappings]);

  const sankeyRows = useMemo<SankeyMappingRow[]>(
    () =>
      mappings.map((m) => ({
        sourceColumn: m.source_column || "(unmapped)",
        targetColumn: m.destination_column,
        status: (m.match_confidence as SankeyMappingRow["status"]) || "review_suggested",
        score: m.match_score,
        transformation: m.transformation ?? undefined,
      })),
    [mappings]
  );

  const mappingStats = useMemo(
    () => ({
      total: mappings.length,
      auto: mappings.filter((m) => m.match_confidence === "auto").length,
      review: mappings.filter((m) => m.match_confidence === "review_suggested").length,
      unmatched: mappings.filter((m) => m.match_confidence === "unmatched").length,
      required: mappings.filter((m) => m.is_required).length,
      withTransform: mappings.filter((m) => m.transformation).length,
    }),
    [mappings]
  );

  const reviewPendingCount = useMemo(
    () => reviewItems.filter((i) => i.reviewStatus === "pending").length,
    [reviewItems]
  );

  // Derive base review items from mappings; preserve existing review state when mappings change
  const derivedReviewItems = useMemo<MappingReviewItem[]>(
    () =>
      mappings.map((m, i) => {
        const blocked = isMappingBlockedByCompileErrors(m, compileErrors);
        return {
          id: `${m.source_column ?? "unmapped"}-${m.destination_column}-${i}`,
          sourceColumn: m.source_column || "(unmapped)",
          targetColumn: m.destination_column,
          transformation: m.transformation ?? undefined,
          typeCast: m.data_type ? `${m.data_type}` : undefined,
          matchConfidence:
            (m.match_confidence as MappingReviewItem["matchConfidence"]) || "review_suggested",
          matchScore: m.match_score,
          isRequired: m.is_required,
          defaultValue: m.default_value ?? undefined,
          hasConstraintViolation: blocked,
          constraintNote: blocked
            ? "Compile constraint blocks this mapping from activation."
            : undefined,
          hasTypeMismatch:
            m.match_confidence === "review_suggested" &&
            Boolean(m.transformation?.toLowerCase().includes("cast")),
          reviewStatus: "pending" as MappingReviewStatus,
        };
      }),
    [mappings, compileErrors]
  );

  useEffect(() => {
    setReviewItems((prev) => {
      const prevMap = new Map(prev.map((item) => [item.id, item]));
      return derivedReviewItems.map((item) => {
        const existing = prevMap.get(item.id);
        if (!existing) return item;
        return {
          ...item,
          reviewStatus: existing.reviewStatus,
          reviewNote: existing.reviewNote,
          correctedValue: existing.correctedValue,
          nullHandling: existing.nullHandling,
          defaultValue: existing.defaultValue,
        };
      });
    });
  }, [derivedReviewItems]);

  const handleReviewApprove = useCallback((id: string) => {
    setReviewItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, reviewStatus: "approved" as MappingReviewStatus } : item
      )
    );
  }, []);

  const handleReviewReject = useCallback((id: string, note?: string) => {
    setReviewItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, reviewStatus: "rejected" as MappingReviewStatus, reviewNote: note }
          : item
      )
    );
  }, []);

  const handleReviewCorrect = useCallback((id: string, correctedValue: string, note?: string) => {
    setReviewItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              reviewStatus: "corrected" as MappingReviewStatus,
              correctedValue,
              reviewNote: note,
            }
          : item
      )
    );
  }, []);

  const handleReviewUndo = useCallback((id: string) => {
    setReviewItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              reviewStatus: "pending" as MappingReviewStatus,
              reviewNote: undefined,
              correctedValue: undefined,
            }
          : item
      )
    );
  }, []);

  const handleReviewApproveAll = useCallback(() => {
    setReviewItems((prev) =>
      prev.map((item) =>
        item.reviewStatus === "pending" && item.matchConfidence === "auto"
          ? { ...item, reviewStatus: "approved" as MappingReviewStatus }
          : item
      )
    );
  }, []);

  const handleExceptionRuleChange = useCallback(
    (id: string, rule: MappingReviewItem["nullHandling"], defaultValue?: string) => {
      setReviewItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, nullHandling: rule, defaultValue } : item))
      );
    },
    []
  );

  const handleSaveAsTemplate = useCallback(async () => {
    setIsSavingTemplate(true);
    try {
      const protocolKey = workflowId ?? slugifyJobName(workflowName ?? "default");
      const saved = saveMappingTemplate({
        name: jobName || "Mapping Template",
        protocolKey,
        sourceConnector: sourceConnectorName,
        destinationConnector: destinationConnectorName,
        sourceTable: sourceTableName,
        destinationTable,
        mappings: mappings.map((m) => ({
          sourceColumn: m.source_column ?? "",
          targetColumn: m.destination_column,
          matchConfidence:
            (m.match_confidence as MappingReviewItem["matchConfidence"]) || "review_suggested",
          matchScore: m.match_score,
        })),
      });
      setLoadedTemplate(saved);
      toast.success(`Template saved (v${saved.version}) — auto-loads on next Suggest Mappings`);
    } finally {
      setIsSavingTemplate(false);
    }
  }, [
    workflowId,
    workflowName,
    jobName,
    sourceConnectorName,
    destinationConnectorName,
    sourceTableName,
    destinationTable,
    mappings,
  ]);

  const connectorOptions = useMemo(() => {
    const baseConnectors =
      availableConnectors.length > 0
        ? availableConnectors
        : [sourceConnectorName, destinationConnectorName];
    return Array.from(new Set([...baseConnectors.filter(Boolean), DEFAULT_DESTINATION_CONNECTOR]));
  }, [availableConnectors, destinationConnectorName, sourceConnectorName]);

  const sourceTableOptions = useMemo(() => {
    if (!sourceTableName.trim()) return availableSourceTables;
    if (availableSourceTables.includes(sourceTableName)) return availableSourceTables;
    return [sourceTableName, ...availableSourceTables];
  }, [availableSourceTables, sourceTableName]);

  const formatOcrLabel = useCallback((str: string) => {
    return str
      .replace(/^ocr_staging_/, "")
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }, []);

  const sourceTableComboboxOptions = useMemo(
    () =>
      sourceTableOptions
        .filter((tableName) => String(tableName).trim().startsWith("ocr_staging_"))
        .map((tableName) => ({ value: tableName, label: formatOcrLabel(tableName) })),
    [sourceTableOptions]
  );

  const destinationTableOptions = useMemo(() => {
    if (!destinationTable.trim()) return availableDestinationTables;
    if (availableDestinationTables.includes(destinationTable)) return availableDestinationTables;
    return [destinationTable, ...availableDestinationTables];
  }, [availableDestinationTables, destinationTable]);

  const destinationTableComboboxOptions = useMemo(
    () => destinationTableOptions.map((tableName) => ({ value: tableName, label: tableName })),
    [destinationTableOptions]
  );

  return (
    <div className="space-y-6">
      {pipelineStageHint && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {pipelineStageHint}. Follow: Suggest → edit/save mappings → submit HITL review → approve →
          activate → run.
        </div>
      )}

      {/* Reuse a whole setup. Sits above the sub-tabs because it is about which
          job exists at all, not about configuring the one you are looking at.

          Rendered unconditionally: creating a job FROM a template is most
          useful when there is no job yet, so gating this on currentJobId hid
          the feature at exactly the moment someone wanted it. The Save half
          disables itself instead, and says why. */}
      <TemplateBar
        jobId={currentJobId}
        onSelectJob={openExistingJob}
        onJobCreated={() => {
          // The new job is a draft on the jobs list; the map still shows the
          // one being worked on, so nothing is switched underneath the user.
          setIntegrateSubTab("map");
        }}
      />

      {/* Integration sub-tabs: Integration Map | Integration Review */}
      <div className="flex items-center gap-1 bg-slate-100/70 rounded-2xl p-1 w-fit">
        {(
          [
            { id: "map", label: "Integration Map", icon: MapIcon },
            // NOTE matching rules deliberately have no tab of their own. They
            // are a destination write mode, so they live in the mapping
            // editor's write-mode block alongside Append and Upsert — one
            // decision in one place, rather than a setting split across two
            // screens where each can contradict the other.
            { id: "review", label: "Integration Review", icon: GitBranch },
            // Rows whose upsert key matched more than one destination record.
            // Lives here rather than under /data-room so a conflict hit while
            // running a job is resolved without leaving the workflow.
            { id: "conflicts", label: "Write Conflicts", icon: AlertTriangle },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setIntegrateSubTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              integrateSubTab === id
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {id === "review" && reviewPendingCount > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {reviewPendingCount}
              </span>
            )}
            {id === "conflicts" && writeConflictCount > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {writeConflictCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {integrateSubTab === "conflicts" && (
        currentJobId ? (
          <UpsertReviewPanel
            jobId={currentJobId}
            onResolved={() => {
              refetchWriteConflicts();
              setIntegrateSubTab("map");
            }}
          />
        ) : (
          <Card className="rounded-3xl">
            <CardContent className="p-8 text-center text-sm text-slate-500">
              Select or create an integration job first.
            </CardContent>
          </Card>
        )
      )}

      {integrateSubTab === "review" && (
        <IntegrationGovernanceReview
          workflowId={workflowId}
          jobId={currentJobId}
          jobName={jobName}
          jobLocked={jobLocked}
          mappings={mappings}
          compileErrors={compileErrors}
          unmatchedSourceColumns={unmatchedSourceColumns}
          unmatchedTargetColumns={unmatchedTargetColumns}
          reviewItems={reviewItems}
          isReadOnly={mappingsAreReadOnly}
          reviewSuggestedCount={reviewSuggestedCount}
          unmatchedCount={unmatchedCount}
          reviewRefreshNonce={reviewRefreshNonce}
          onReviewApprove={handleReviewApprove}
          onReviewReject={handleReviewReject}
          onReviewCorrect={handleReviewCorrect}
          onReviewUndo={handleReviewUndo}
          onReviewApproveAll={handleReviewApproveAll}
          onExceptionRuleChange={handleExceptionRuleChange}
          onReviewStateChange={handleReviewStateChange}
          onJobUpdated={() => {
            if (!currentJobId) return;
            void refreshJobState(currentJobId).then((job) =>
              syncJobFromApiResponse(currentJobId, job)
            );
          }}
          onReviewApproved={() => {
            setJobLocked(true);
            setHasPendingReview(false);
          }}
          onGoToMap={() => setIntegrateSubTab("map")}
        />
      )}

      {integrateSubTab === "map" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max text-[11px]">
              {INTEGRATION_FLOW_STEPS.map((step, index) => {
                const stepIndex = INTEGRATION_FLOW_STEPS.findIndex((s) => s.id === currentFlowStep);
                const isComplete = index < stepIndex;
                const isCurrent = step.id === currentFlowStep;
                return (
                  <div key={step.id} className="flex items-center gap-1">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full font-semibold whitespace-nowrap",
                        isCurrent && "bg-indigo-600 text-white",
                        isComplete && !isCurrent && "bg-emerald-100 text-emerald-800",
                        !isComplete && !isCurrent && "bg-slate-100 text-slate-500"
                      )}
                    >
                      {index + 1}. {step.label}
                    </span>
                    {index < INTEGRATION_FLOW_STEPS.length - 1 && (
                      <span className="text-slate-300">→</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {mappings.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: "Mapped", value: mappingStats.total, color: "text-slate-800" },
                { label: "Auto", value: mappingStats.auto, color: "text-emerald-600" },
                { label: "Needs review", value: mappingStats.review, color: "text-amber-600" },
                { label: "Unmatched", value: mappingStats.unmatched, color: "text-slate-500" },
                { label: "Required", value: mappingStats.required, color: "text-rose-600" },
                {
                  label: "Transforms",
                  value: mappingStats.withTransform,
                  color: "text-indigo-600",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center shadow-sm"
                >
                  <p className={cn("text-xl font-bold tabular-nums", stat.color)}>{stat.value}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          {workflowId && (
            <IntegrationTargetsBar
              targets={integrationTargets}
              activeTargetId={activeTargetId ?? undefined}
              availableTables={availableDestinationTables}
              sourceColumns={sourceColumnsForSchema.map((c) => c.name)}
              onSelectTarget={(id) => void handleSelectTarget(id)}
              onAddTarget={handleAddTarget}
              onRemoveTarget={handleRemoveTarget}
              onRemoveAllTargets={handleRemoveAllTargets}
            />
          )}

          {workflowId && integrationTargets.length >= 2 && (
            <IntegrationBundlePanel
              workflowId={workflowId}
              workflowName={workflowName ?? workflowId ?? "Workflow"}
              sourceTable={sourceTableName}
              sourceConnectorName={sourceConnectorName}
              targets={integrationTargets}
              jobActivatedNonce={bundleJobActivatedNonce}
            />
          )}

          <Card className="border-0 shadow-sm ring-1 ring-slate-200/60 overflow-hidden bg-gradient-to-b from-white to-slate-50/30">
            <CardHeader
              className="border-b border-slate-100 bg-white/80 cursor-pointer select-none"
              onClick={() => setSetupCollapsed((v) => !v)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-800">
                  Integration Setup
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="hidden sm:inline truncate max-w-[240px]">
                    {sourceConnectorName} → {destinationConnectorName}
                  </span>
                  {setupCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
            {!setupCollapsed && (
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Job Name
                    </p>
                    <Input
                      value={jobName}
                      onChange={(event) => setJobName(event.target.value)}
                      placeholder="Job name"
                      className="h-10 rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Source Table
                    </p>
                    {sourceTableOptions.length > 0 ? (
                      <Combobox
                        options={sourceTableComboboxOptions}
                        value={sourceTableName}
                        onValueChange={handleSourceTableChange}
                        placeholder={
                          isLoadingSourceTables
                            ? "Loading source tables..."
                            : "Search or select source table"
                        }
                        searchPlaceholder="Type to search tables..."
                        emptyText="No matching tables. Type a name and choose Use."
                        allowCustomValue
                        className="rounded-xl border-slate-200 bg-white font-normal text-left"
                      />
                    ) : (
                      <Input
                        value={sourceTableName}
                        onChange={(event) => handleSourceTableChange(event.target.value)}
                        placeholder={
                          isLoadingSourceTables
                            ? "Loading source tables..."
                            : "e.g. ocr_staging_employee_records_extraction_config_test"
                        }
                        className="h-10 rounded-xl border-slate-200 bg-white"
                      />
                    )}
                    <p className="text-[11px] text-slate-400">
                      {workflowId
                        ? "Search the catalog or type a custom table name. Changes persist until you re-suggest mappings."
                        : "Search catalog tables or type a custom source table name."}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Source Connector
                    </p>
                    <Select value={sourceConnectorName} onValueChange={setSourceConnectorName}>
                      <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="Source connector" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectorOptions.map((connectorName) => (
                          <SelectItem key={connectorName} value={connectorName}>
                            {connectorName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Destination Connector
                    </p>
                    <Select
                      value={destinationConnectorName}
                      onValueChange={setDestinationConnectorName}
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="Destination connector" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectorOptions.map((connectorName) => (
                          <SelectItem key={connectorName} value={connectorName}>
                            {connectorName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Destination Table
                    </p>
                    {availableDestinationTables.length > 0 ? (
                      <Combobox
                        options={destinationTableComboboxOptions}
                        value={destinationTable}
                        onValueChange={handleDestinationTableChange}
                        placeholder={
                          isLoadingDestinationTables
                            ? "Loading destination tables..."
                            : "Search or select destination table"
                        }
                        searchPlaceholder="Type to search tables..."
                        emptyText="No matching tables. Type a name and choose Use."
                        allowCustomValue
                        className="rounded-xl border-slate-200 bg-white font-normal text-left"
                      />
                    ) : (
                      <Input
                        value={destinationTable}
                        onChange={(event) => handleDestinationTableChange(event.target.value)}
                        placeholder={
                          isLoadingDestinationTables
                            ? "Loading destination tables..."
                            : "Destination table"
                        }
                        className="h-10 rounded-xl border-slate-200 bg-white"
                      />
                    )}
                  </div>
                </div>

                {setupChangedFromJob && !jobLocked && currentJobId && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
                    Setup changed from the saved job
                    {savedJobSourceTable && sourceTableName !== savedJobSourceTable && (
                      <>
                        {" "}
                        (source: <strong>{savedJobSourceTable}</strong> →{" "}
                        <strong>{sourceTableName}</strong>)
                      </>
                    )}
                    {savedJobDestinationTable && destinationTable !== savedJobDestinationTable && (
                      <>
                        {" "}
                        (destination: <strong>{savedJobDestinationTable}</strong> →{" "}
                        <strong>{destinationTable}</strong>)
                      </>
                    )}
                    . Click <strong>Suggest Mappings</strong> to regenerate mappings for the new
                    setup.
                  </div>
                )}

                {jobLocked && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 space-y-2">
                    <p className="text-sm font-semibold text-indigo-900">
                      This job is locked — Suggest Mappings is disabled
                    </p>
                    <p className="text-xs text-indigo-800">
                      {setupChangedFromJob ? (
                        <>
                          {savedJobSourceTable &&
                            sourceTableName !== savedJobSourceTable &&
                            savedJobDestinationTable &&
                            destinationTable !== savedJobDestinationTable && (
                              <>
                                You changed the source to <strong>{sourceTableName}</strong> and
                                destination to <strong>{destinationTable}</strong>, but mappings
                                still target <strong>{savedJobSourceTable}</strong> →{" "}
                                <strong>{savedJobDestinationTable}</strong>.
                              </>
                            )}
                          {savedJobSourceTable &&
                            sourceTableName !== savedJobSourceTable &&
                            !(
                              savedJobDestinationTable &&
                              destinationTable !== savedJobDestinationTable
                            ) && (
                              <>
                                You changed the source to <strong>{sourceTableName}</strong>, but
                                current mappings still use <strong>{savedJobSourceTable}</strong>.
                              </>
                            )}
                          {savedJobDestinationTable &&
                            destinationTable !== savedJobDestinationTable &&
                            !(savedJobSourceTable && sourceTableName !== savedJobSourceTable) && (
                              <>
                                You changed the destination to <strong>{destinationTable}</strong>,
                                but current mappings still target{" "}
                                <strong>{savedJobDestinationTable}</strong>.
                              </>
                            )}
                          Unlock and re-suggest to generate new mappings for the updated setup.
                        </>
                      ) : (
                        <>
                          After HITL approval, mappings are frozen until an admin unlocks the job.
                          Use the button below to unlock, then you can change setup and re-suggest.
                        </>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        className="rounded-xl"
                        onClick={handleUnlockAndSuggest}
                        disabled={isUnlocking || isSuggesting || hasPendingReview}
                      >
                        <LockOpen className="h-3.5 w-3.5 mr-1" />
                        {isUnlocking || isSuggesting
                          ? "Working..."
                          : "Unlock & re-suggest mappings"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-indigo-300 bg-white"
                        onClick={handleUnlockJob}
                        disabled={isUnlocking || isSuggesting}
                      >
                        Unlock only
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {jobLocked ? (
                    <Button
                      onClick={handleUnlockAndSuggest}
                      disabled={isUnlocking || isSuggesting || hasPendingReview}
                      className="h-10 rounded-xl px-4 shadow-sm"
                    >
                      <LockOpen className="h-3.5 w-3.5 mr-1" />
                      {isUnlocking || isSuggesting ? "Working..." : "Unlock & re-suggest"}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSuggestMappings}
                      disabled={isSuggesting || mappingsAreReadOnly}
                      className="h-10 rounded-xl px-4 shadow-sm"
                      title={suggestBlockedReason ?? undefined}
                    >
                      {isSuggesting ? "Suggesting..." : "Suggest Mappings"}
                    </Button>
                  )}
                  <Button
                    onClick={() => setIsEditingMappings((previous) => !previous)}
                    disabled={!canEditMappings || mappings.length === 0}
                    variant="outline"
                    className="h-10 rounded-xl px-4 border-slate-200 bg-white"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    {isEditingMappings ? "Close Editor" : "Edit Mappings"}
                  </Button>
                  <Button
                    onClick={handleSaveMappings}
                    disabled={
                      !currentJobId || mappingsAreReadOnly || isSaving || mappings.length === 0
                    }
                    variant="outline"
                    className="h-10 rounded-xl px-4 border-slate-200 bg-white"
                  >
                    {isSaving ? "Saving..." : "Save Mappings"}
                  </Button>
                  <Button
                    // Opens the dialog rather than activating straight away, so the
                    // job can be given a destination reference name (EP-947). The
                    // dialog's "Activate without a name" path is the old behaviour.
                    onClick={() => setIsActivateDialogOpen(true)}
                    disabled={!canActivate}
                    variant="outline"
                    className="h-10 rounded-xl px-4 border-emerald-200 bg-emerald-50/50 text-emerald-900"
                    title={activateBlockedReason ?? undefined}
                  >
                    {isActivating ? "Activating..." : "Activate"}
                  </Button>
                  <Button
                    onClick={handleRunJob}
                    disabled={!canRun}
                    variant="outline"
                    className="h-10 rounded-xl px-4 border-slate-200 bg-white"
                    title={jobStatus !== "active" ? "Activate the job first (Step 5)" : undefined}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    {isRunning ? "Running..." : "Run"}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge variant="outline" className="rounded-full">
                    job_id: {currentJobId || "-"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    match_method: {matchMethod}
                  </Badge>
                  {/* Destination write mode, visible without opening the editor.
                      Shown for ALL modes: no badge would be indistinguishable
                      from "this build predates the feature", and a job that
                      appends silently is exactly what catches people out.

                      Rules are checked FIRST because they beat the upsert key at
                      run time. Reading the key here while rules decided was a
                      badge that stated the wrong write mode. */}
                  {jobHasRules ? (
                    <Badge
                      className="rounded-full bg-indigo-100 text-indigo-800 border-indigo-200"
                      title="Conditions narrow the candidate rows, and the surviving count decides whether this job updates, creates, or asks a person."
                    >
                      match: rules
                    </Badge>
                  ) : upsertKeys.length > 0 ? (
                    <Badge
                      className="rounded-full bg-blue-100 text-blue-800 border-blue-200 max-w-[320px] truncate"
                      title={`Rows are matched on ${upsertKeys.join(" + ")} — a row is updated only when ${
                        upsertKeys.length > 1 ? "all of these agree" : "this agrees"
                      }.`}
                    >
                      upsert: {upsertKeys.join(" + ")}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="rounded-full"
                      title="Every run adds new rows. Existing rows are never changed."
                    >
                      append
                    </Badge>
                  )}
                  {jobStatus && (
                    <Badge variant="outline" className="rounded-full max-w-[280px] truncate">
                      {jobStatusLabel}
                    </Badge>
                  )}
                  {hasPendingReview && (
                    <Badge className="rounded-full bg-amber-100 text-amber-800 border-amber-200">
                      read-only
                    </Badge>
                  )}
                  {jobLocked && (
                    <Badge className="rounded-full bg-indigo-100 text-indigo-800 border-indigo-200">
                      locked
                    </Badge>
                  )}
                  {reviewSuggestedCount > 0 && (
                    <Badge className="rounded-full bg-amber-100 text-amber-800 border-amber-200">
                      {reviewSuggestedCount} need review
                    </Badge>
                  )}
                  {run?.id && (
                    <Badge variant="outline" className="rounded-full">
                      run: {run.id}
                    </Badge>
                  )}
                  {run?.status && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        run.status === "awaiting_review" &&
                          "bg-amber-100 text-amber-800 border-amber-200"
                      )}
                    >
                      run_status:{" "}
                      {run.status === "awaiting_review" ? "waiting on you" : run.status}
                    </Badge>
                  )}
                </div>

                {/* The run stopped because some rows matched more than one
                    existing record. A toast is easy to miss or dismiss, so the
                    state is also parked here until it is resolved. */}
                {run?.status === "awaiting_review" && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-900">
                        {run.review_records
                          ? `${run.review_records} row(s) need your decision`
                          : "Some rows need your decision"}
                      </p>
                      <p className="text-xs text-amber-800">
                        They matched more than one existing record, so nothing was written for
                        them{run.processed_records ? ` — the other ${run.processed_records} landed as normal` : ""}.
                        Pick which record each one should update, or add it as a new record.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl h-8 shrink-0 bg-amber-500 text-white hover:bg-amber-600"
                      onClick={() => {
                        refetchWriteConflicts();
                        setIntegrateSubTab("conflicts");
                      }}
                    >
                      Pick records
                    </Button>
                  </div>
                )}
                {activateBlockedReason && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p>{activateBlockedReason}</p>
                    {!jobLocked && !hasPendingReview && currentJobId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-8 text-xs border-amber-300 bg-white shrink-0"
                        onClick={() => setIntegrateSubTab("review")}
                      >
                        <GitBranch className="h-3.5 w-3.5 mr-1" />
                        Open Integration Review
                      </Button>
                    )}
                    {hasPendingReview && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-8 text-xs border-amber-300 bg-white shrink-0"
                        onClick={() => setIntegrateSubTab("review")}
                      >
                        <GitBranch className="h-3.5 w-3.5 mr-1" />
                        Check review status
                      </Button>
                    )}
                  </div>
                )}
                {reviewSuggestedCount > 0 && !mappingsAreReadOnly && (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-slate-600">
                      Review rows need a ✓ confirm or removal — then Save Mappings before submitting
                      for review.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl text-xs"
                      onClick={handleConfirmAllReviewSuggested}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Confirm all ({reviewSuggestedCount})
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {currentJobId && integrateSubTab === "map" && hasPendingReview && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3 text-xs text-indigo-900 flex flex-wrap items-center justify-between gap-2">
              <p>
                Mappings are awaiting HITL review. Open the <strong>Integration Review</strong> tab
                to approve, reject, or request revisions.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-8 text-xs"
                onClick={() => setIntegrateSubTab("review")}
              >
                Open Integration Review
              </Button>
            </div>
          )}

          {isEditingMappings && !mappingsAreReadOnly && (
            <Card className="border-0 shadow-sm ring-1 ring-blue-200/60 overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <IntegrationMappingEditor
                  mappings={mappings}
                  upsertKeys={upsertKeys}
                  hasRules={jobHasRules}
                  // Inline rather than a separate tab: the write mode and the
                  // rules are one decision — how a row is identified — and the
                  // upsert key is already edited here, so rules being anywhere
                  // else would split one setting across two screens.
                  rulesPanel={
                    currentJobId ? (
                      <RulesEditor
                        jobId={currentJobId}
                        destinationTable={destinationTable}
                        upsertKeys={upsertKeys}
                        readOnly={mappingsAreReadOnly}
                      />
                    ) : null
                  }
                  onCancel={() => setIsEditingMappings(false)}
                  isSaving={isSaving}
                  onSave={handleEditorSave}
                />
              </CardContent>
            </Card>
          )}

          {compileErrors.length > 0 && (
            <Card className="border-2 border-rose-200 bg-rose-50/80 overflow-hidden">
              <CardHeader className="py-3 border-b border-rose-100">
                <CardTitle className="text-sm font-bold text-rose-900 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Activation blocked — fix mappings before retry
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {compileErrorMessage && (
                  <p className="text-sm text-rose-800 font-medium">{compileErrorMessage}</p>
                )}
                <ul className="space-y-2 text-xs text-rose-900">
                  {compileErrors.map((error, index) => (
                    <li
                      key={`${error.code}-${index}`}
                      className="rounded-lg border border-rose-200 bg-white/80 px-3 py-2"
                    >
                      <span className="font-mono font-semibold text-rose-700">[{error.code}]</span>{" "}
                      {error.message}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-rose-800">
                  Read-only Airtable fields (<strong>formula</strong>, <strong>createdBy</strong>,
                  linked records) cannot receive mapped values. Remove{" "}
                  <strong>charter_id→charter_id</strong> and similar mappings, then save.
                  {jobLocked && (
                    <>
                      {" "}
                      The job is locked — the fix button below will unlock, remove, and save
                      automatically (admin role required).
                    </>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-xl"
                    onClick={handleRemoveBlockedMappings}
                    disabled={isSaving || isUnlocking || blockedDestinationColumns.length === 0}
                  >
                    {jobLocked ? "Unlock, remove" : "Remove"} {blockedDestinationColumns.length}{" "}
                    blocked mapping
                    {blockedDestinationColumns.length === 1 ? "" : "s"} and save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-rose-300 bg-white"
                    onClick={handleOpenEditorToFixBlocked}
                    disabled={isSaving || isUnlocking}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit mappings (remove formula fields)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-rose-300 bg-white"
                    onClick={() => {
                      setCompileErrors([]);
                      setCompileErrorMessage(null);
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Column Mapping</h3>
                <p className="text-xs text-slate-500">
                  Compare staged source fields against mapped target fields before integration runs.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Graphical / Tabular toggle */}
              <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-0.5">
                {(
                  [
                    { id: "tabular", label: "Tabular", icon: LayoutList },
                    { id: "graphical", label: "Graphical", icon: MapIcon },
                    { id: "schema", label: "Schema", icon: Network },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMapView(id)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      mapView === id
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Save the MAPPINGS as a reusable suggestion.
                  Named explicitly because an integration TEMPLATE — the whole
                  job setup, saved under a name you choose — now exists too, in
                  the bar above the sub-tabs. Two buttons both reading "Save as
                  Template" and doing different things sent people to the wrong
                  one; this saves only the column mappings and auto-applies on
                  the next Suggest Mappings, which is what the label should say. */}
              {mappings.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-xl text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1.5"
                  onClick={handleSaveAsTemplate}
                  disabled={isSavingTemplate}
                  title="Remembers these column mappings and re-applies them the next time you Suggest Mappings for this protocol"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" />
                  {isSavingTemplate ? "Saving…" : "Remember these mappings"}
                </Button>
              )}

              {loadedTemplate && (
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 rounded-full text-[10px]">
                  Template v{loadedTemplate.version} cached
                </Badge>
              )}

              <Badge className="bg-indigo-100 text-indigo-700 border-0 rounded-full text-xs">
                {comparisonRows.length} rows
              </Badge>
            </div>
          </div>

          {/* Graphical / Sankey view */}
          {mapView === "graphical" && (
            <IntegrationSankeyMap
              mappings={sankeyRows}
              onMappingClick={() => {
                setIntegrateSubTab("review");
              }}
            />
          )}

          {mapView === "schema" && (
            <IntegrationSchemaLineage
              sourceTable={sourceTableName || "source"}
              sourceConnector={sourceConnectorName}
              sourceColumns={sourceColumnsForSchema}
              targets={integrationTargets}
              activeTargetId={activeTargetId ?? undefined}
              mappingCounts={targetMappingCounts}
              onSelectTarget={(id) => void handleSelectTarget(id)}
            />
          )}

          {mapView === "tabular" && (
            <IntegrationMappingTable
              mappings={mappings}
              isReadOnly={mappingsAreReadOnly}
              isBlocked={(mapping) =>
                compileErrors.length > 0 && isMappingBlockedByCompileErrors(mapping, compileErrors)
              }
              onConfirm={handleConfirmMapping}
              onRemove={handleRemoveMapping}
            />
          )}

          {(effectiveUnmatchedSourceColumns.length > 0 ||
            effectiveUnmatchedTargetColumns.length > 0) && (
            <Card className="border-0 shadow-sm ring-1 ring-amber-200/60 overflow-hidden">
              <CardHeader className="py-3 border-b border-amber-100 bg-amber-50/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm font-bold text-amber-800">
                    Unmatched Columns — assign or skip before review
                  </CardTitle>
                  {!mappingsAreReadOnly && unmatchedCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl h-8 text-xs border-amber-300 bg-white hover:bg-amber-50"
                      onClick={handleSkipAllUnmatched}
                    >
                      Skip all unmatched ({unmatchedCount})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="font-semibold text-slate-700">Unmatched source columns</p>
                      {!mappingsAreReadOnly && effectiveUnmatchedSourceColumns.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-amber-800 hover:bg-amber-50"
                          onClick={handleSkipAllUnmatchedSources}
                        >
                          Skip all ({effectiveUnmatchedSourceColumns.length})
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {effectiveUnmatchedSourceColumns.length === 0 && (
                        <span className="text-slate-500">None</span>
                      )}
                      {effectiveUnmatchedSourceColumns.map((column) => (
                        <Badge
                          key={column}
                          variant="outline"
                          className="rounded-full cursor-pointer hover:bg-amber-50"
                          onClick={() => setPairSourceColumn(column)}
                        >
                          {column}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      ETL metadata columns (e.g. etl_batch_id) can be skipped if not needed in the
                      target.
                    </p>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="font-semibold text-slate-700">Unmatched target columns</p>
                      {!mappingsAreReadOnly && effectiveUnmatchedTargetColumns.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-amber-800 hover:bg-amber-50"
                          onClick={handleSkipAllUnmatchedTargets}
                        >
                          Skip all ({effectiveUnmatchedTargetColumns.length})
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {effectiveUnmatchedTargetColumns.length === 0 && (
                        <span className="text-slate-500">None</span>
                      )}
                      {effectiveUnmatchedTargetColumns.map((column) => (
                        <Badge
                          key={column}
                          variant="outline"
                          className="rounded-full cursor-pointer hover:bg-amber-50"
                          onClick={() => setPairTargetColumn(column)}
                        >
                          {column}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {!mappingsAreReadOnly && (
                  <div className="rounded-xl border border-amber-200 bg-white/80 p-3 space-y-3">
                    <p className="font-semibold text-slate-700">Manual mapping</p>
                    <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto] items-end">
                      <div className="space-y-1">
                        <p className="text-[11px] text-slate-500">Source column</p>
                        <Select value={pairSourceColumn} onValueChange={setPairSourceColumn}>
                          <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent>
                            {effectiveUnmatchedSourceColumns.map((column) => (
                              <SelectItem key={column} value={column}>
                                {column}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] text-slate-500">Target column</p>
                        <Select value={pairTargetColumn} onValueChange={setPairTargetColumn}>
                          <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white">
                            <SelectValue placeholder="Select target" />
                          </SelectTrigger>
                          <SelectContent>
                            {effectiveUnmatchedTargetColumns.map((column) => (
                              <SelectItem key={column} value={column}>
                                {column}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-xl h-9"
                        onClick={handleAddUnmatchedMapping}
                        disabled={!pairSourceColumn || !pairTargetColumn}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add mapping
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {pairSourceColumn && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl h-8 text-[11px]"
                          onClick={() => handleDismissUnmatchedSource(pairSourceColumn)}
                        >
                          Skip source: {pairSourceColumn}
                        </Button>
                      )}
                      {pairTargetColumn && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl h-8 text-[11px]"
                          onClick={() => handleDismissUnmatchedTarget(pairTargetColumn)}
                        >
                          Skip target: {pairTargetColumn}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/*
        EP-947: activation optionally names the destination so it can be used as a
        step in a DRAT abstraction pipeline. Rendered at the component root rather
        than beside the button so it is not unmounted when the toolbar's section
        collapses mid-activation.
      */}
      <ActivateJobDialog
        open={isActivateDialogOpen}
        onOpenChange={(open) => {
          // Not dismissable while the request is in flight: closing would leave the
          // user unsure whether the job was activated.
          if (!isActivating) setIsActivateDialogOpen(open);
        }}
        jobName={jobName}
        destinationTable={destinationTable}
        isActivating={isActivating}
        onConfirm={handleActivateJob}
      />
    </div>
  );
}
