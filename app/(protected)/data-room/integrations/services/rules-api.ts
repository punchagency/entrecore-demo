import { Axios } from "@/app/config/axios";

/**
 * Matching rules — how a job decides update vs. insert vs. ask a human.
 *
 * The successor to the fixed composite upsert key. A record arrives, a SWITCH
 * picks a case, that case's CONDITIONS narrow the candidate rows in the target
 * table, and the surviving count maps to an action the user chose:
 *
 *     1,240 rows  ->  cond 1  ->  3 left  ->  cond 2  ->  2 left  ->  cond 3  ->  1 left
 *                                                          outcome: one -> update
 *
 * This file holds no business logic on purpose. Columns, operators, actions and
 * normalisers all come from `getSchema` — the backend owns the vocabulary, so
 * adding an operator never means a frontend release.
 */

// ----------------------------------------------------------------------
// DATA MODELS  (mirror BackEnd schemas/integration_rules.py)
// ----------------------------------------------------------------------

/** A column on a destination table. `table` defaults to the case's own. */
export interface ColumnRef {
  table?: string | null;
  column: string;
}

/**
 * One clause: a column tested against a record field, a constant, or another
 * column. Exactly one of `field` / `value` / `column`, and none of them for a
 * unary operator.
 *
 * `field` names a value on the ARRIVING record. By the time rules run the
 * mapping has been applied, so it is a destination column name.
 */
export interface Comparison {
  left: ColumnRef;
  op: string;
  field?: string | null;
  value?: unknown;
  column?: ColumnRef | null;
  normalise?: string[];
  /**
   * Similarity operators only — how alike the two sides must be, 0–100.
   * The backend fills in the default rather than leaving it null, so a saved
   * document states the bar it was authored against.
   */
  threshold?: number | null;
}

/** Operators that score a likeness rather than testing equality. */
export const SIMILARITY_OPS = ["similar_to"];
export const DEFAULT_SIMILARITY_THRESHOLD = 85;

/** A boolean expression over clauses. Recursive, so groups nest. */
export interface Expression {
  op: "and" | "or" | "not" | "clause";
  clause?: Comparison | null;
  args?: Expression[] | null;
}

export type RuleActionName =
  | "continue"
  | "insert"
  | "update"
  | "merge"
  | "human"
  | "flag"
  | "skip";

/**
 * One column on the SIDE table, and where its value comes from.
 *
 * Two ends, named separately. `field` is a name on the ARRIVING record — one of
 * `incoming_fields`; `value` is a constant, which is how a placeholder states
 * something the source is silent about. Exactly one of the two.
 */
export interface SideWriteField {
  column: string;
  field?: string | null;
  value?: unknown;
  /**
   * "this_record" links back to the row this rule writes on the main table —
   * an equity grant pointing at the engagement that promised it. Resolves to
   * that row's record id, so the destination must be a linked-record column.
   */
  source?: "this_record" | null;
}

/**
 * A row written to ANOTHER table alongside the main write.
 *
 * Deliberately bounded: a plain `match_on` key, never its own conditions.
 */
export interface SideWrite {
  table: string;
  action: "insert" | "upsert";
  match_on?: string[];
  write?: SideWriteField[];
  /**
   * The older shape, where one list of names served as both source and
   * destination. Folded into `write` on the way in and never written back —
   * kept on the type because a document resolved from a PINNED rule-set
   * version still arrives this way.
   */
  fields?: string[] | null;
  values?: Record<string, unknown>;
  /** Only fire when this holds — tests the arriving record. */
  when?: Expression | null;
}

/**
 * A destination column filled with an authored constant.
 *
 * The same idea SideWriteField.value carries for secondary tables, on the table
 * the action is acting on. It behaves as ONE MORE INCOMING VALUE that happens
 * not to come from the source — so `precedence`, the diff states and the review
 * screen all treat it like any other write, with no special cases.
 *
 * An empty value writes nothing. It is a no-op, never a blanking, which is why
 * a constant can never produce a `would_clear`.
 */
export interface FixedField {
  column: string;
  value?: unknown;
}

export interface RuleAction {
  action: RuleActionName;
  /** Column allowlist — MAPPED columns only. `fixed` declares its own. */
  fields?: string[] | null;
  /** Columns filled with a constant regardless of the incoming record. */
  fixed?: FixedField[];
  /** merge only — who wins when both sides hold a real, differing value. */
  precedence?: "existing" | "incoming" | null;
  /** Leave a cell alone when the arriving value is blank. Defaults true. */
  keep_existing_when_blank?: boolean;
  /** human/flag/skip only — shown on the review screen, so write a sentence. */
  reason?: string | null;
  /** Rows written to other tables. Only valid on a writing action. */
  also?: SideWrite[];
}

/**
 * What a condition does depending on how many rows satisfied it.
 *
 * `one` and `many` default to carrying on to the next condition, so an author
 * only fills a slot in when they want to peel off early.
 */
export interface RuleOutcomes {
  none: RuleAction;
  one?: RuleAction;
  many?: RuleAction;
}

/** What happens to whatever survived every condition. All three required. */
export interface FinalOutcomes {
  none: RuleAction;
  one: RuleAction;
  many: RuleAction;
}

/** One narrowing step, and what it does about what it leaves behind. */
export interface RuleCondition {
  label?: string | null;
  expression: Expression;
  outcomes: RuleOutcomes;
}

/**
 * One branch of the switch. Either a funnel (`conditions` + `outcomes`) or an
 * unconditional `always` write, never both — the second is Append, expressed
 * per case.
 */
export interface RuleCase {
  name: string;
  when?: Expression | null;
  default?: boolean;
  target_table: string;
  conditions?: RuleCondition[];
  outcomes?: FinalOutcomes | null;
  always?: RuleAction | null;
}

export interface RuleDocument {
  version: string;
  cases: RuleCase[];
  /**
   * Columns carried to the rules and never written to THIS job's destination.
   *
   * A column mapping means "write this to the destination", and it used to be
   * the only way a value reached the rules at all — so a routing fact like
   * `isCsv` had nowhere to live. These names ride through for `when` and for
   * any clause's `field`, then are stripped before the write.
   *
   * A side-write may still carry one into ANOTHER table, since it names its
   * source and destination columns separately — so "never written" is too
   * strong, and a column may be declared here purely to reach a side table.
   */
  check_only?: string[];
  /** Cosmetic only. The backend never reads it. */
  ui?: Record<string, unknown>;
}

export type RuleSource = "inline" | "rule_set" | "none";

export interface RuleDocumentResponse {
  job_id: string;
  document: RuleDocument | null;
  source: RuleSource;
  rule_set_id?: string | null;
  rule_set_version?: number | null;
}

/** One problem, addressed to the row that caused it. */
export interface RuleValidationError {
  message: string;
  case_index?: number | null;
  case_name?: string | null;
  condition_index?: number | null;
  location?: string | null;
}

export interface RuleValidationResponse {
  valid: boolean;
  errors: RuleValidationError[];
}

/** One table on the connector, and what a clause may reference on it. */
export interface TableSchema {
  name: string;
  columns: string[];
  column_types: Record<string, string>;
  is_destination: boolean;
}

export interface RuleSchemaResponse {
  destination_table?: string | null;
  /** EVERY table on the connector — a clause can reach a neighbour. */
  tables: TableSchema[];
  destination_columns: string[];
  column_types: Record<string, string>;
  /**
   * Allowed values for select-style destination columns. Only those columns
   * appear — so a missing entry means "unconstrained", while an entry with an
   * empty array means "a select whose options are not defined yet".
   *
   * Used to offer a dropdown for a fixed value rather than a free-text box.
   * That matters most here: these writes run with typecast on, so a typed-in
   * value that is not a real option does not fail — it CREATES a new option in
   * the destination.
   */
  column_options?: Record<string, string[]>;
  /** Everything the record will carry — mapped columns plus check-only ones. */
  incoming_fields: string[];
  /** The subset of incoming_fields that is never written. */
  check_only: string[];
  /** Columns on the SOURCE table, for the check-only picker. Empty if uncatalogued. */
  source_columns: string[];
  /** Source columns the job already maps — shown as unavailable in that picker. */
  mapped_source_columns: string[];
  operators: string[];
  unary_operators: string[];
  normalisers: string[];
  actions: string[];
}

// -- dry run -----------------------------------------------------------

export interface DryRunStep {
  label: string;
  remaining: number;
  /** What this condition did about it: continue | insert | flag | … */
  outcome: string;
}

export interface DryRunResult {
  row_index: number;
  action: string;
  bucket?: string | null;
  case_name?: string | null;
  /** Which condition ended it, or null if it reached the final outcomes. */
  decided_at?: number | null;
  started_from: number;
  candidate_count: number;
  matched_record_id?: string | null;
  reason?: string | null;
  steps: DryRunStep[];
  trace: string[];
}

export interface DryRunResponse {
  job_id: string;
  scanned: Record<string, number>;
  totals: Record<string, number>;
  results: DryRunResult[];
}

// -- the library -------------------------------------------------------

export interface RuleSetSummary {
  rule_set_id: string;
  name: string;
  description?: string | null;
  /** The newest version. A job may be pinned to an older one. */
  version: number;
  requires_columns: string[];
  used_by_jobs: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RuleSetDetail extends RuleSetSummary {
  document: RuleDocument | null;
}

export interface RuleSetVersionSummary {
  version: number;
  created_by?: string | null;
  created_at?: string | null;
  pinned_by_jobs: number;
}

export interface RuleSetVersionsResponse {
  rule_set_id: string;
  name: string;
  versions: RuleSetVersionSummary[];
}

// -- integration templates ---------------------------------------------

/**
 * A whole job's setup, saved to clone.
 *
 * COPY semantics, unlike a rule set: a job created from a template is
 * independent the moment it exists, and editing the template afterwards changes
 * nothing already created. Both get called "template" in conversation, which is
 * why the UI says "New from template" for this and "uses the … rules" for that.
 */
export interface IntegrationTemplateSummary {
  id: string;
  name: string;
  description?: string | null;
  times_used: number;
  destination_table?: string | null;
  source_type?: string | null;
  mapping_count: number;
  uses_rule_set: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

// ----------------------------------------------------------------------
// API CALLS
// ----------------------------------------------------------------------

const RULES_URL = "/data/integration/rules";
const RULE_SETS_URL = "/data/integration/rule-sets";
const TEMPLATES_URL = "/data/integration/templates";

export const RulesAPI = {
  getRules: async (jobId: string): Promise<RuleDocumentResponse> => {
    const res = await Axios.get(`${RULES_URL}/jobs/${jobId}`);
    return res.data;
  },

  saveRules: async (jobId: string, document: RuleDocument): Promise<RuleDocumentResponse> => {
    const res = await Axios.put(`${RULES_URL}/jobs/${jobId}`, document);
    return res.data;
  },

  /**
   * Check without saving. Returns 200 with `valid: false` rather than 422 —
   * asking "is this good yet?" is not a failed request, and a stream of 422s
   * while someone is mid-condition is noise in every log downstream.
   */
  validateRules: async (
    jobId: string,
    document: RuleDocument
  ): Promise<RuleValidationResponse> => {
    const res = await Axios.post(`${RULES_URL}/jobs/${jobId}/validate`, document);
    return res.data;
  },

  clearRules: async (jobId: string): Promise<RuleDocumentResponse> => {
    const res = await Axios.delete(`${RULES_URL}/jobs/${jobId}`);
    return res.data;
  },

  getSchema: async (jobId: string, table?: string): Promise<RuleSchemaResponse> => {
    const res = await Axios.get(`${RULES_URL}/jobs/${jobId}/schema`, {
      params: table ? { table } : undefined,
    });
    return res.data;
  },

  /** Reads the destination; writes nothing, parks nothing, creates no run. */
  dryRun: async (
    jobId: string,
    records: Record<string, unknown>[],
    document?: RuleDocument
  ): Promise<DryRunResponse> => {
    const res = await Axios.post(`${RULES_URL}/jobs/${jobId}/dry-run`, {
      records,
      ...(document ? { document } : {}),
    });
    return res.data;
  },

  // -- library, job side --

  promote: async (
    jobId: string,
    name: string,
    description?: string
  ): Promise<RuleDocumentResponse> => {
    const res = await Axios.post(`${RULES_URL}/jobs/${jobId}/promote`, { name, description });
    return res.data;
  },

  attach: async (
    jobId: string,
    ruleSetId: string,
    version?: number
  ): Promise<RuleDocumentResponse> => {
    const res = await Axios.post(`${RULES_URL}/jobs/${jobId}/attach`, {
      rule_set_id: ruleSetId,
      ...(version != null ? { version } : {}),
    });
    return res.data;
  },

  detach: async (jobId: string, keepInline = true): Promise<RuleDocumentResponse> => {
    const res = await Axios.post(
      `${RULES_URL}/jobs/${jobId}/detach`,
      null,
      { params: { keep_inline: keepInline } }
    );
    return res.data;
  },

  // -- library --

  listRuleSets: async (includeRetired = false): Promise<{ items: RuleSetSummary[]; total: number }> => {
    const res = await Axios.get(RULE_SETS_URL, {
      params: { include_retired: includeRetired },
    });
    return res.data;
  },

  getRuleSet: async (ruleSetId: string, version?: number): Promise<RuleSetDetail> => {
    const res = await Axios.get(`${RULE_SETS_URL}/${ruleSetId}`, {
      params: version != null ? { version } : undefined,
    });
    return res.data;
  },

  getRuleSetVersions: async (ruleSetId: string): Promise<RuleSetVersionsResponse> => {
    const res = await Axios.get(`${RULE_SETS_URL}/${ruleSetId}/versions`);
    return res.data;
  },

  /** Publishing moves no job. Pins stay where they are until someone attaches. */
  publishVersion: async (
    ruleSetId: string,
    document: RuleDocument,
    name?: string,
    description?: string
  ): Promise<RuleSetDetail> => {
    const res = await Axios.post(`${RULE_SETS_URL}/${ruleSetId}/versions`, {
      document,
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
    });
    return res.data;
  },

  retireRuleSet: async (ruleSetId: string): Promise<void> => {
    await Axios.delete(`${RULE_SETS_URL}/${ruleSetId}`);
  },

  // -- integration templates --

  listTemplates: async (): Promise<{ items: IntegrationTemplateSummary[]; total: number }> => {
    const res = await Axios.get(TEMPLATES_URL);
    return res.data;
  },

  /**
   * Refused when the job's rules are still inline — copying them by value
   * would give every clone its own duplicate to drift apart. The 400 says so.
   */
  saveTemplate: async (
    jobId: string,
    name: string,
    description?: string
  ): Promise<IntegrationTemplateSummary> => {
    const res = await Axios.post(TEMPLATES_URL, { job_id: jobId, name, description });
    return res.data;
  },

  /** The clone is a draft, unlocked, unapproved, with its schedule off. */
  createJobFromTemplate: async (
    templateId: string,
    name: string
  ): Promise<{ job_id: string; name: string; status: string; message: string }> => {
    const res = await Axios.post(`${TEMPLATES_URL}/${templateId}/jobs`, { name });
    return res.data;
  },

  retireTemplate: async (templateId: string): Promise<void> => {
    await Axios.delete(`${TEMPLATES_URL}/${templateId}`);
  },
};

// ----------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------

/**
 * Pull located validation errors out of a FastAPI error response.
 *
 * The rules router returns 422 as `{ detail: { message, errors: [...] } }`,
 * which is NOT pydantic's default shape — it is built so the editor can pin
 * each message to the condition row that caused it. Reading it as a plain
 * string renders "[object Object]".
 */
export function extractRuleErrors(err: unknown): RuleValidationError[] {
  const detail = (
    err as { response?: { data?: { detail?: { errors?: RuleValidationError[] } | string } } }
  )?.response?.data?.detail;

  if (detail && typeof detail === "object" && Array.isArray(detail.errors)) {
    return detail.errors;
  }
  return [];
}

/** A human-readable message for a rules API failure. */
export function ruleErrorMessage(err: unknown, fallback: string): string {
  const detail = (
    err as { response?: { data?: { detail?: unknown } } }
  )?.response?.data?.detail;

  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const message = (detail as { message?: string }).message;
    if (message) return message;
  }
  return fallback;
}

/** True when this case appends without reading the table. */
export function isAppendCase(ruleCase: RuleCase): boolean {
  return ruleCase.always != null;
}

/** Every leaf clause in an expression, depth-first. */
export function clausesOf(expression: Expression): Comparison[] {
  if (expression.op === "clause") return expression.clause ? [expression.clause] : [];
  return (expression.args ?? []).flatMap(clausesOf);
}

/**
 * Tables a funnel actually reads — its own, plus any a clause reaches into.
 * `always` cases contribute nothing.
 */
export function scannedTables(document: RuleDocument): string[] {
  const found = new Set<string>();
  for (const c of document.cases) {
    if (isAppendCase(c)) continue;
    found.add(c.target_table);
    for (const cond of c.conditions ?? []) {
      for (const clause of clausesOf(cond.expression)) {
        for (const ref of [clause.left, clause.column]) {
          if (ref) found.add(ref.table || c.target_table);
        }
      }
    }
  }
  return Array.from(found).sort();
}

export const UNARY_FALLBACK = ["is_empty", "is_not_empty", "is_true", "is_false"];

/** Human-readable operator labels, shared by the editor and the preview. */
export const OPERATOR_LABELS: Record<string, string> = {
  eq: "is",
  neq: "is not",
  in: "is one of",
  not_in: "is not one of",
  has_any: "has any of",
  has_all: "has all of",
  contains: "contains",
  starts_with: "starts with",
  similar_to: "is similar to",
  gt: "is greater than",
  lt: "is less than",
  before: "is before",
  after: "is after",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  is_true: "is true",
  is_false: "is false",
};

export const ACTION_LABELS: Record<string, string> = {
  continue: "Keep going",
  insert: "Create a new row",
  update: "Update that row",
  merge: "Fill its empty cells only",
  human: "Hold for a person",
  flag: "Flag red — should not be added",
  skip: "Do nothing",
};
