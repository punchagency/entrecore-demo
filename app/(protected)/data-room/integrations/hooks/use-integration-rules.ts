import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RulesAPI } from "../services/rules-api";
import type { RuleDocument } from "../services/rules-api";

/**
 * Query hooks for matching rules and the rule set library.
 *
 * Kept out of use-data-integrations.ts because the key namespace is separate
 * and the invalidation graph is its own: attaching a job to a rule set changes
 * BOTH that job's rules and the library's usage counts, and getting that wrong
 * shows someone a stale "used by 1 job" right after they made it two.
 */

export const rulesKeys = {
  all: ["integration-rules"] as const,
  rules: (jobId: string) => [...rulesKeys.all, "job", jobId] as const,
  schema: (jobId: string, table?: string) =>
    [...rulesKeys.all, "schema", jobId, table ?? "default"] as const,
  ruleSets: (includeRetired: boolean) =>
    [...rulesKeys.all, "sets", includeRetired] as const,
  ruleSet: (id: string, version?: number) =>
    [...rulesKeys.all, "set", id, version ?? "latest"] as const,
  ruleSetVersions: (id: string) => [...rulesKeys.all, "set-versions", id] as const,
};

// ----------------------------------------------------------------------
// Rules on a job
// ----------------------------------------------------------------------

export function useJobRules(jobId: string) {
  return useQuery({
    queryKey: rulesKeys.rules(jobId),
    queryFn: () => RulesAPI.getRules(jobId),
    enabled: !!jobId,
    // This query backs an EDITING surface, so a background refetch is not a free
    // refresh — it hands the editor a new object, and the editor loads it.
    //
    // app/providers.tsx builds the QueryClient with no defaults, which means
    // staleTime 0 and refetchOnWindowFocus true for everything. So alt-tabbing to
    // read a spec and coming back refetched this, and an in-progress rule set was
    // replaced by the last saved one. `useRuleSchema` below already opted out for
    // the cheaper reason (a wasted round trip); this one had the expensive one.
    //
    // Safe to hold because nothing else writes these rules: every mutation in
    // this file invalidates the key explicitly, so a real change still lands
    // immediately. RulesEditor also refuses to overwrite a dirty draft, which is
    // the guard that has to hold regardless of what caching does.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useRuleSchema(jobId: string, table?: string) {
  return useQuery({
    queryKey: rulesKeys.schema(jobId, table),
    queryFn: () => RulesAPI.getSchema(jobId, table),
    enabled: !!jobId,
    // The destination schema changes when someone edits the Airtable base, not
    // between renders. Refetching it on every focus costs an API round trip per
    // tab switch and tells the user nothing new.
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveJobRules(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (document: RuleDocument) => RulesAPI.saveRules(jobId, document),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKeys.rules(jobId) });
      // The schema too, because /schema's `incoming_fields` is derived partly
      // from the SAVED document's check-only columns. Without this, declaring a
      // new one and then trying to use it in a `when` offers a dropdown that
      // has not heard of it — the name is a select, not free text, so the only
      // way forward would be reloading the page.
      queryClient.invalidateQueries({
        queryKey: [...rulesKeys.all, "schema", jobId],
      });
    },
  });
}

export function useClearJobRules(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => RulesAPI.clearRules(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKeys.rules(jobId) });
    },
  });
}

/**
 * Validate without saving.
 *
 * A mutation rather than a query on purpose: it is driven by the user pausing,
 * not by a key changing, and caching "was this draft valid" against a document
 * that changes on every keystroke would only ever serve stale answers.
 */
export function useValidateJobRules(jobId: string) {
  return useMutation({
    mutationFn: (document: RuleDocument) => RulesAPI.validateRules(jobId, document),
  });
}

export function useDryRunRules(jobId: string) {
  return useMutation({
    mutationFn: ({
      records,
      document,
    }: {
      records: Record<string, unknown>[];
      document?: RuleDocument;
    }) => RulesAPI.dryRun(jobId, records, document),
  });
}

// ----------------------------------------------------------------------
// The library
// ----------------------------------------------------------------------

export function useRuleSets(includeRetired = false) {
  return useQuery({
    queryKey: rulesKeys.ruleSets(includeRetired),
    queryFn: () => RulesAPI.listRuleSets(includeRetired),
  });
}

export function useRuleSetVersions(ruleSetId: string | null | undefined) {
  return useQuery({
    queryKey: rulesKeys.ruleSetVersions(ruleSetId ?? ""),
    queryFn: () => RulesAPI.getRuleSetVersions(ruleSetId as string),
    enabled: !!ruleSetId,
  });
}

/**
 * Every library mutation invalidates BOTH the job's rules and the set list.
 * Promoting or attaching changes a usage count as well as the job, and showing
 * "used by 1 job" straight after someone made it two reads as a bug.
 */
function useLibraryMutation<TArgs>(
  jobId: string,
  mutationFn: (args: TArgs) => Promise<unknown>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKeys.rules(jobId) });
      queryClient.invalidateQueries({ queryKey: rulesKeys.all });
    },
  });
}

export function usePromoteRules(jobId: string) {
  return useLibraryMutation(jobId, ({ name, description }: { name: string; description?: string }) =>
    RulesAPI.promote(jobId, name, description)
  );
}

export function useAttachRuleSet(jobId: string) {
  return useLibraryMutation(
    jobId,
    ({ ruleSetId, version }: { ruleSetId: string; version?: number }) =>
      RulesAPI.attach(jobId, ruleSetId, version)
  );
}

export function useDetachRuleSet(jobId: string) {
  return useLibraryMutation(jobId, ({ keepInline }: { keepInline: boolean }) =>
    RulesAPI.detach(jobId, keepInline)
  );
}

// ----------------------------------------------------------------------
// Integration templates
// ----------------------------------------------------------------------

export function useIntegrationTemplates() {
  return useQuery({
    queryKey: [...rulesKeys.all, "templates"] as const,
    queryFn: () => RulesAPI.listTemplates(),
  });
}

export function useSaveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      name,
      description,
    }: {
      jobId: string;
      name: string;
      description?: string;
    }) => RulesAPI.saveTemplate(jobId, name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...rulesKeys.all, "templates"] });
    },
  });
}

export function useCreateJobFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, name }: { templateId: string; name: string }) =>
      RulesAPI.createJobFromTemplate(templateId, name),
    onSuccess: () => {
      // Both the template list (its usage count moved) and the job list (there
      // is a new one) are now stale.
      queryClient.invalidateQueries({ queryKey: [...rulesKeys.all, "templates"] });
      queryClient.invalidateQueries({ queryKey: ["data-integrations"] });
    },
  });
}

export function usePublishRuleSetVersion(jobId: string) {
  return useLibraryMutation(
    jobId,
    ({
      ruleSetId,
      document,
      description,
    }: {
      ruleSetId: string;
      document: RuleDocument;
      description?: string;
    }) => RulesAPI.publishVersion(ruleSetId, document, undefined, description)
  );
}
