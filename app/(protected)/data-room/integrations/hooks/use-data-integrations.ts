import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IntegrationAPI } from "../services/data-integration-api";
import type {
  IntegrationJobCreateRequest,
  IntegrationJobUpdateRequest,
  AISuggestMappingsRequest,
  UpsertDecision,
  UpsertMatchRow,
  UpsertReviewListResponse,
} from "../services/data-integration-api";

export const integrationKeys = {
  all: ["data-integrations"] as const,
  jobs: () => [...integrationKeys.all, "jobs"] as const,
  job: (id: string) => [...integrationKeys.all, "job", id] as const,
  runs: (jobId: string) => [...integrationKeys.all, "runs", jobId] as const,
  run: (runId: string) => [...integrationKeys.all, "run", runId] as const,
  reviewQueue: () => [...integrationKeys.all, "review"] as const,
  bundles: () => [...integrationKeys.all, "bundles"] as const,
  bundle: (id: string) => [...integrationKeys.all, "bundle", id] as const,
  bundleRuns: (bundleId: string) => [...integrationKeys.all, "bundle-runs", bundleId] as const,
  bundleRun: (runId: string) => [...integrationKeys.all, "bundle-run", runId] as const,
  upsertReviewRuns: (jobId?: string) =>
    [...integrationKeys.all, "upsert-review-runs", jobId ?? "all"] as const,
  upsertReview: (runId: string) => [...integrationKeys.all, "upsert-review", runId] as const,
  upsertReviewRows: (runId: string) =>
    [...integrationKeys.all, "upsert-review-rows", runId] as const,
};

// Jobs
export function useIntegrationJobs(page = 1, pageSize = 20, search?: string) {
  return useQuery({
    // `search` belongs in the key, or typing would keep serving the previous
    // term's page from cache.
    queryKey: [...integrationKeys.jobs(), page, pageSize, search?.trim() ?? ""],
    queryFn: () => IntegrationAPI.getJobs(page, pageSize, search),
    // Paging without this blanks the list on every page turn, which reads as
    // "there is nothing here" for as long as the request takes.
    placeholderData: (previous) => previous,
  });
}

/**
 * Named destinations for this company (EP-947).
 *
 * Used to label a job by the reference name a steward gave it at activation,
 * which is the name people actually recognise — a job's own `name` is usually a
 * generated slug. Keyed by `current_job_id`, which the backend re-points whenever
 * a job is edited, so the label follows the job across versions.
 */
export function useIntegrationDestinations(abstractionReadyOnly = false) {
  return useQuery({
    queryKey: [...integrationKeys.all, "destinations", abstractionReadyOnly],
    queryFn: () => IntegrationAPI.listDestinations(abstractionReadyOnly),
  });
}

export function useIntegrationJob(id: string) {
  return useQuery({
    queryKey: integrationKeys.job(id),
    queryFn: () => IntegrationAPI.getJob(id),
    enabled: !!id,
  });
}

export function useCreateIntegrationJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IntegrationJobCreateRequest) => IntegrationAPI.createJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.jobs() });
    },
  });
}

export function useUpdateIntegrationJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IntegrationJobUpdateRequest }) => 
      IntegrationAPI.updateJob(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.jobs() });
      queryClient.invalidateQueries({ queryKey: integrationKeys.job(data.id) });
    },
  });
}

export function useDeleteIntegrationJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => IntegrationAPI.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.jobs() });
    },
  });
}

export function useActivateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => IntegrationAPI.activateJob(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.job(data.id) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.jobs() });
    },
  });
}

export function useSuggestMappings() {
  return useMutation({
    mutationFn: (data: AISuggestMappingsRequest) => IntegrationAPI.suggestMappings(data),
  });
}

export function useToggleSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) => 
      enable ? IntegrationAPI.enableSchedule(id) : IntegrationAPI.disableSchedule(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.job(data.id) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.jobs() });
    },
  });
}

// Runs
export function useIntegrationRuns(jobId: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...integrationKeys.runs(jobId), page, pageSize],
    queryFn: () => IntegrationAPI.getRunsForJob(jobId, page, pageSize),
    enabled: !!jobId,
  });
}

export function useIntegrationRun(runId: string, isPolling = false) {
  return useQuery({
    queryKey: integrationKeys.run(runId),
    queryFn: () => IntegrationAPI.getRun(runId),
    enabled: !!runId,
    refetchInterval: isPolling ? 2000 : false, // Poll every 2 seconds if active
  });
}

export function useTriggerRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, resumeFromId }: { jobId: string; resumeFromId?: string }) => 
      IntegrationAPI.triggerRun(jobId, resumeFromId ? { resume_from_run_id: resumeFromId } : {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.runs(data.job_id) });
    },
  });
}

export function useRunLineage(runId: string, page = 1, pageSize = 100) {
  return useQuery({
    queryKey: [...integrationKeys.run(runId), "lineage", page, pageSize],
    queryFn: () => IntegrationAPI.getRunLineage(runId, page, pageSize),
    enabled: !!runId,
  });
}

// Review Queue
export function useReviewQueue(jobId?: string, pendingOnly = true, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...integrationKeys.reviewQueue(), jobId, pendingOnly, page, pageSize],
    queryFn: () => IntegrationAPI.getReviewQueue({ job_id: jobId, pending_only: pendingOnly, page, page_size: pageSize }),
  });
}

export function useDecideReviewRow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: "approved" | "rejected"; note?: string }) => 
      IntegrationAPI.decideReviewRow(id, { decision, reviewer_note: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.reviewQueue() });
    },
  });
}

// ----------------------------------------------------------------------
// Upsert match review
// ----------------------------------------------------------------------

/** Runs waiting on a decision. Feeds the inbox and the nav count badge. */
export function useUpsertReviewRuns(jobId?: string) {
  return useQuery({
    queryKey: integrationKeys.upsertReviewRuns(jobId),
    queryFn: () => IntegrationAPI.getUpsertReviewRuns(jobId ? { job_id: jobId } : {}),
  });
}

export function useUpsertReview(runId: string, isPolling = false) {
  return useQuery({
    queryKey: integrationKeys.upsertReview(runId),
    queryFn: () => IntegrationAPI.getUpsertReview(runId),
    enabled: !!runId,
    // Only while the write is actually in flight. A parked run changes nothing
    // on its own, so polling it would be pure noise.
    refetchInterval: isPolling ? 2000 : false,
  });
}

export function useUpsertReviewRows(runId: string) {
  return useQuery({
    queryKey: integrationKeys.upsertReviewRows(runId),
    queryFn: () => IntegrationAPI.getUpsertReviewRows(runId, { limit: 200 }),
    enabled: !!runId,
  });
}

/**
 * Optimistic, with rollback. Deciding a row is the core interaction on this
 * screen and there may be a dozen in a row — a spinner between each one makes
 * the whole thing feel like paperwork.
 */
export function useDecideUpsertRow(runId: string) {
  const queryClient = useQueryClient();
  const rowsKey = integrationKeys.upsertReviewRows(runId);

  return useMutation({
    mutationFn: ({
      rowId,
      decision,
      recordId,
      excludedFields,
    }: {
      rowId: string;
      decision: UpsertDecision;
      recordId?: string;
      /** Omit to leave the stored exclusions alone; [] writes every field. */
      excludedFields?: string[];
    }) =>
      IntegrationAPI.decideUpsertRow(rowId, {
        decision,
        record_id: recordId,
        // Spread rather than always-send: the key's ABSENCE is what means
        // "leave the exclusions as they are", and sending `undefined` would
        // serialise to a missing key by accident rather than by intent.
        ...(excludedFields !== undefined ? { excluded_fields: excludedFields } : {}),
      }),

    onMutate: async ({ rowId, decision, recordId, excludedFields }) => {
      await queryClient.cancelQueries({ queryKey: rowsKey });
      const previous = queryClient.getQueryData<UpsertReviewListResponse<UpsertMatchRow>>(rowsKey);
      queryClient.setQueryData<UpsertReviewListResponse<UpsertMatchRow>>(rowsKey, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((r) =>
                r.id === rowId
                  ? {
                      ...r,
                      decision,
                      decision_record_id: decision === "update" ? recordId ?? null : null,
                      // Mirrors the server: create and skip reset the set, and
                      // an omitted excludedFields keeps what is already there.
                      // Getting this wrong is visible — every checkbox in the
                      // open row would flicker back on between the click and
                      // the refetch.
                      excluded_fields:
                        decision !== "update"
                          ? []
                          : excludedFields ?? r.excluded_fields ?? [],
                      // A fresh decision clears whatever staleness was showing.
                      apply_state: null,
                      apply_error: null,
                    }
                  : r
              ),
            }
          : old
      );
      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(rowsKey, context.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rowsKey });
      queryClient.invalidateQueries({ queryKey: integrationKeys.upsertReview(runId) });
    },
  });
}

export function useDecideUpsertRowsBulk(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rowIds, decision }: { rowIds: string[]; decision: "create" | "skip" }) =>
      IntegrationAPI.decideUpsertRowsBulk(runId, { row_ids: rowIds, decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.upsertReviewRows(runId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.upsertReview(runId) });
    },
  });
}

export function useApplyUpsertReview(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => IntegrationAPI.applyUpsertReview(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.upsertReview(runId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.upsertReviewRuns() });
      queryClient.invalidateQueries({ queryKey: integrationKeys.run(runId) });
    },
  });
}

export function useDiscardUpsertReview(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => IntegrationAPI.discardUpsertReview(runId),
    onSuccess: () => {
      // Same three keys as useApplyUpsertReview — discard and apply both close
      // out the review and move the run off the parked list, so they touch the
      // same data. Invalidating integrationKeys.all here refetched every job,
      // bundle and connector query in the tree for no gain.
      queryClient.invalidateQueries({ queryKey: integrationKeys.upsertReview(runId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.upsertReviewRuns() });
      queryClient.invalidateQueries({ queryKey: integrationKeys.run(runId) });
    },
  });
}

export function useRefreshUpsertCandidates(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => IntegrationAPI.refreshUpsertCandidates(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.upsertReviewRows(runId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.upsertReview(runId) });
    },
  });
}

// Bundles
export function useIntegrationBundles(skip = 0, limit = 20) {
  return useQuery({
    queryKey: [...integrationKeys.bundles(), skip, limit],
    queryFn: () => IntegrationAPI.listBundles(skip, limit),
  });
}

export function useIntegrationBundle(id: string) {
  return useQuery({
    queryKey: integrationKeys.bundle(id),
    queryFn: () => IntegrationAPI.getBundle(id),
    enabled: !!id,
  });
}

export function useIntegrationBundleRun(runId: string, isPolling = false) {
  return useQuery({
    queryKey: integrationKeys.bundleRun(runId),
    queryFn: () => IntegrationAPI.getBundleRun(runId),
    enabled: !!runId,
    refetchInterval: isPolling ? 3000 : false,
  });
}

export function useTriggerBundleRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bundleId: string) => IntegrationAPI.triggerBundleRun(bundleId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.bundleRuns(data.bundle_id) });
    },
  });
}
