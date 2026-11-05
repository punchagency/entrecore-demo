import { Axios } from "@/app/config/axios";

/** Mirrors the field vocabulary in drat_routing_conditions.py. */
export type RoutingRuleConditionField =
  | "filename"
  | "name"
  | "suggested_filename"
  | "original_filename"
  | "document_type"
  | "document_text"
  | "extension"
  | "kind"
  | "source_email"
  | "size"
  | "subfolder_depth"
  | "date_added"
  | "entity";

export type RoutingRuleConditionOperator =
  | "contains"
  | "not_contains"
  | "regex"
  | "exact"
  | "glob"
  | "eq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "before"
  | "after"
  | "within_days"
  | "in_list"
  | "not_in_list";

export type RoutingRuleGroupLogic = "and" | "or" | "not";

/**
 * The API serializes leaves and groups through one Pydantic model with every
 * field optional and no exclude_none, so a leaf arrives carrying
 * `logic: null, conditions: null` and a group carries `field: null` etc. Both
 * shapes below allow those nulls so the discriminator can't be fooled by them.
 */
export interface RoutingRuleLeafCondition {
  field: RoutingRuleConditionField;
  operator: RoutingRuleConditionOperator;
  /** Text, a byte count or size string, an ISO date, or a day count. */
  value?: string | number | null;
  logic?: null;
  conditions?: null;
}

/** A `not` group matches when none of its children match. */
export interface RoutingRuleConditionGroup {
  logic: RoutingRuleGroupLogic;
  conditions: RoutingRuleCondition[];
  field?: null;
  operator?: null;
  value?: null;
}

export type RoutingRuleCondition = RoutingRuleLeafCondition | RoutingRuleConditionGroup;

/**
 * Only an actual child array makes a node a group. Checking `logic` here would
 * misclassify every leaf, because leaves arrive with `logic: null`.
 */
export const isConditionGroup = (
  condition: RoutingRuleCondition
): condition is RoutingRuleConditionGroup =>
  Array.isArray((condition as RoutingRuleConditionGroup).conditions);

/** Operators that carry no value, so pruning must not treat them as empty. */
export const VALUELESS_OPERATORS: ReadonlySet<RoutingRuleConditionOperator> =
  new Set<RoutingRuleConditionOperator>(["in_list", "not_in_list"]);

/**
 * Deepest chain of nested groups the server accepts. drat_routing_conditions.py
 * sets MAX_CONDITION_DEPTH = 6, but that budget includes the leaf level, so the
 * sixth stacked group is rejected. Verified against the validator directly.
 */
export const MAX_CONDITION_GROUP_NESTING = 5;

export interface RoutingRule {
  id: string;
  rule_id: string;
  pattern: string;
  /**
   * Drive-filing destination. Empty for an integration rule, whose destination
   * is `integration_job_id` / `integration_bundle_id` instead.
   */
  target_folder: string;
  priority: number;
  match_mode?: "all" | "any";
  conditions?: RoutingRuleCondition[] | null;
  description?: string | null;
  source: string;
  /**
   * Integration auto-push destination. Added by the DRAT deterministic-routing
   * backend story; optional here so the FE renders correctly against a backend
   * that does not yet return these fields (they simply stay undefined).
   */
  integration_job_id?: string | null;
  integration_bundle_id?: string | null;
  /**
   * Abstraction-routing destination: the pipeline (workflow) a matched document
   * is run through. Added by the deterministic-routing backend story; optional
   * here so the FE renders against a backend that doesn't return it yet.
   */
  pipeline_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Where a rule sends a matched document. */
export type RoutingRuleDestinationKind =
  | "folder"
  | "job"
  | "bundle"
  | "pipeline"
  | "none";

type RuleDestinationFields = Pick<
  RoutingRule,
  "target_folder" | "integration_job_id" | "integration_bundle_id" | "pipeline_id"
>;

/**
 * Classifies a rule's destination from whichever field is populated. Integration
 * job/bundle and pipeline destinations take precedence over `target_folder`.
 * Used to split the single `/drat-routing-rules` collection into its Drive,
 * integration and abstraction-pipeline subsets without a dedicated `source` flag
 * (which the backend may add later).
 */
export const ruleDestinationKind = (
  rule: RuleDestinationFields
): RoutingRuleDestinationKind => {
  if (rule.integration_job_id) return "job";
  if (rule.integration_bundle_id) return "bundle";
  if (rule.pipeline_id) return "pipeline";
  if (rule.target_folder && rule.target_folder.trim()) return "folder";
  return "none";
};

/** True when a rule's destination is an integration job or bundle. */
export const isIntegrationRule = (rule: RuleDestinationFields): boolean => {
  const kind = ruleDestinationKind(rule);
  return kind === "job" || kind === "bundle";
};

/** True when a rule routes a matched document into an abstraction pipeline. */
export const isPipelineRule = (rule: RuleDestinationFields): boolean =>
  ruleDestinationKind(rule) === "pipeline";

export interface RoutingRuleListResponse {
  rules: RoutingRule[];
  total: number;
  page: number;
  limit: number;
}

export interface RoutingRuleCreatePayload {
  rule_id: string;
  pattern?: string;
  /** Optional: an integration rule carries a job/bundle destination instead. */
  target_folder?: string;
  match_mode?: "all" | "any";
  conditions?: RoutingRuleCondition[];
  priority?: number;
  description?: string;
  source?: string;
  integration_job_id?: string | null;
  integration_bundle_id?: string | null;
  pipeline_id?: string | null;
}

export interface RoutingRuleUpdatePayload {
  rule_id?: string;
  pattern?: string;
  target_folder?: string;
  match_mode?: "all" | "any";
  conditions?: RoutingRuleCondition[] | null;
  priority?: number;
  description?: string | null;
  source?: string;
  integration_job_id?: string | null;
  integration_bundle_id?: string | null;
  pipeline_id?: string | null;
}

export interface RoutingRuleImportResponse {
  success: boolean;
  imported_count: number;
  errors: string[];
  validation_report?: Record<string, unknown>;
}

export interface RoutingRuleBulkDeleteResponse {
  deleted_count: number;
}

const normalizeList = (
  data: Record<string, unknown>,
  pageVal: number,
  limitVal: number
): RoutingRuleListResponse => {
  const rules = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.rules)
    ? data.rules
    : Array.isArray(data.data)
    ? data.data
    : Array.isArray(data.results)
    ? data.results
    : Array.isArray(data)
    ? data
    : [];

  return {
    rules: rules as RoutingRule[],
    total: typeof data.total === "number" ? data.total : rules.length,
    page: pageVal,
    limit: limitVal,
  };
};

export const fetchRoutingRules = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
  source?: string;
}): Promise<RoutingRuleListResponse> => {
  const pageVal = params?.page || 1;
  const limitVal = params?.limit || 50;
  const skip = (pageVal - 1) * limitVal;

  const response = await Axios.get("/data/drat-routing-rules/", {
    params: {
      search: params?.search,
      source: params?.source,
      skip,
      limit: limitVal,
    },
  });

  if (response.data && typeof response.data === "object") {
    return normalizeList(response.data, pageVal, limitVal);
  }

  return { rules: [], total: 0, page: pageVal, limit: limitVal };
};

export const createRoutingRule = async (
  payload: RoutingRuleCreatePayload
): Promise<RoutingRule> => {
  const response = await Axios.post("/data/drat-routing-rules/", payload);
  return response.data;
};

export const updateRoutingRule = async (
  id: string,
  payload: RoutingRuleUpdatePayload
): Promise<RoutingRule> => {
  const response = await Axios.patch(`/data/drat-routing-rules/${id}`, payload);
  return response.data;
};

export const deleteRoutingRule = async (id: string): Promise<void> => {
  await Axios.delete(`/data/drat-routing-rules/${id}`);
};

export const deleteAllRoutingRules = async (): Promise<RoutingRuleBulkDeleteResponse> => {
  const response = await Axios.delete("/data/drat-routing-rules/bulk");
  return response.data;
};

export const duplicateRoutingRule = async (id: string): Promise<RoutingRule> => {
  const response = await Axios.post(`/data/drat-routing-rules/${id}/duplicate`);
  return response.data;
};

export const reorderRoutingRules = async (orderedIds: string[]): Promise<RoutingRule[]> => {
  const response = await Axios.post("/data/drat-routing-rules/reorder", {
    ordered_ids: orderedIds,
  });
  const data = response.data;
  if (data && Array.isArray(data.items)) {
    return data.items;
  }
  return [];
};

export const importRoutingRules = async (
  file: File,
  clearExisting = false
): Promise<RoutingRuleImportResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await Axios.post("/data/drat-routing-rules/import", formData, {
    params: { clear_existing: clearExisting },
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};
