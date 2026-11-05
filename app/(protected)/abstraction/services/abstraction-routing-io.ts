import type { RoutingRuleCondition } from "@/app/(protected)/drat/hooks/use-routing-rules";
import type { AbstractionRuleCreate } from "./abstraction-api";

/**
 * Local import/export file for abstraction routing rules.
 *
 * The on-disk rule shape matches the backend `RuleImportRequest` wire format:
 * each rule references its pipeline by `pipeline_id` UUID — there are no
 * embedded step chains on the wire. A file produced by
 * `exportAbstractionRoutingRules` can therefore be validated here and then
 * POSTed to `POST /api/v1/data/abstraction/rules/import` as
 * `{ rules, clear_existing }` (see `toRuleImportRequest`).
 *
 * This file is local-only scaffolding around that wire format: it validates
 * shape client-side and assigns transient client ids for React keys. It is
 * not itself the backend import service.
 */

export const ABSTRACTION_ROUTING_EXPORT_VERSION = 1;
export const ABSTRACTION_ROUTING_EXPORT_KIND = "abstraction-routing";

/**
 * A rule as the page holds it: a When (conditions) and a Then (pipeline_id).
 * `id` is a transient client key, never sent to the backend. Empty/null
 * `conditions` is a catch-all that always matches.
 */
export interface AbstractionRoutingRule {
  id: string;
  rule_id: string;
  name?: string;
  match_mode: "all" | "any";
  conditions: RoutingRuleCondition[];
  pipeline_id: string;
  priority?: number;
  is_active?: boolean;
  description?: string;
  source?: string;
}

/** One rule on disk — identical to the `RuleImportRequest` rule shape. */
interface ExportedRule {
  rule_id: string;
  name?: string;
  match_mode: "all" | "any";
  conditions: RoutingRuleCondition[];
  pipeline_id: string;
  priority?: number;
  is_active?: boolean;
  description?: string;
  source?: string;
}

interface ExportedFile {
  version: number;
  kind: string;
  rules: ExportedRule[];
}

export interface ImportValidationReport {
  imported: number;
  skipped: number;
  errors: string[];
  warnings: string[];
}

/** Ids the importer can check references against (all optional). */
export interface ImportReferenceSets {
  pipelineIds?: Set<string>;
}

let importCounter = 0;
const freshRuleId = () => {
  importCounter += 1;
  return `imported-${Date.now()}-${importCounter}`;
};

export function exportAbstractionRoutingRules(rules: AbstractionRoutingRule[]): string {
  const file: ExportedFile = {
    version: ABSTRACTION_ROUTING_EXPORT_VERSION,
    kind: ABSTRACTION_ROUTING_EXPORT_KIND,
    rules: rules.map((rule) => ({
      rule_id: rule.rule_id,
      ...(rule.name ? { name: rule.name } : {}),
      match_mode: rule.match_mode,
      conditions: rule.conditions,
      pipeline_id: rule.pipeline_id,
      ...(rule.priority !== undefined ? { priority: rule.priority } : {}),
      ...(rule.is_active !== undefined ? { is_active: rule.is_active } : {}),
      ...(rule.description ? { description: rule.description } : {}),
      ...(rule.source ? { source: rule.source } : {}),
    })),
  };
  return JSON.stringify(file, null, 2);
}

/** Strips transient client ids so parsed rules can go straight to the import endpoint. */
export function toRuleImportRequest(
  rules: AbstractionRoutingRule[],
  clearExisting = false
): { rules: AbstractionRuleCreate[]; clear_existing: boolean } {
  return {
    rules: rules.map((rule) => ({
      rule_id: rule.rule_id,
      ...(rule.name ? { name: rule.name } : {}),
      match_mode: rule.match_mode,
      conditions: rule.conditions,
      pipeline_id: rule.pipeline_id,
      ...(rule.priority !== undefined ? { priority: rule.priority } : {}),
      ...(rule.is_active !== undefined ? { is_active: rule.is_active } : {}),
      ...(rule.description ? { description: rule.description } : {}),
      ...(rule.source ? { source: rule.source } : {}),
    })),
    clear_existing: clearExisting,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Parses and validates an import file. Accepts files exported by
 * `exportAbstractionRoutingRules` (`{ kind, version, rules }`) as well as bare
 * arrays of backend-valid rows (`{ rule_id, pipeline_id, name, source,
 * is_active, ... }`). Empty/missing conditions are valid catch-all rows.
 * Invalid rows are skipped and explained in the report. Reference sets, when
 * supplied, turn unknown pipeline ids into warnings (the rule still imports).
 */
export function parseAbstractionRoutingImport(
  text: string,
  refs: ImportReferenceSets = {}
): { rules: AbstractionRoutingRule[]; report: ImportValidationReport } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rules: AbstractionRoutingRule[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      rules: [],
      report: { imported: 0, skipped: 0, errors: ["File is not valid JSON."], warnings: [] },
    };
  }

  const root = asRecord(parsed);
  const rawRules = Array.isArray(parsed)
    ? parsed
    : Array.isArray(root?.rules)
      ? (root?.rules as unknown[])
      : null;

  if (!rawRules) {
    return {
      rules: [],
      report: {
        imported: 0,
        skipped: 0,
        errors: ['File shape not recognized — expected an array of rules or { "rules": [...] }.'],
        warnings: [],
      },
    };
  }

  if (root && root.kind && root.kind !== ABSTRACTION_ROUTING_EXPORT_KIND) {
    warnings.push(`Unexpected file kind "${String(root.kind)}" — importing anyway.`);
  }

  const seenRuleIds = new Set<string>();

  rawRules.forEach((entry, index) => {
    const label = `Rule #${index + 1}`;
    const rule = asRecord(entry);
    if (!rule) {
      errors.push(`${label}: not an object — skipped.`);
      return;
    }

    const ruleId = typeof rule.rule_id === "string" ? rule.rule_id.trim() : "";
    const name = ruleId || label;

    const ruleErrors: string[] = [];

    if (!ruleId) ruleErrors.push(`${label}: missing rule_id.`);
    else if (seenRuleIds.has(ruleId)) ruleErrors.push(`Rule "${ruleId}": duplicate rule_id.`);

    const pipelineId =
      typeof rule.pipeline_id === "string" ? rule.pipeline_id.trim() : "";
    if (!pipelineId) ruleErrors.push(`Rule "${name}": missing pipeline_id.`);
    else if (refs.pipelineIds && !refs.pipelineIds.has(pipelineId)) {
      warnings.push(`Rule "${name}": unknown pipeline "${pipelineId}".`);
    }

    const conditions = Array.isArray(rule.conditions)
      ? (rule.conditions as RoutingRuleCondition[])
      : [];

    if (ruleErrors.length > 0) {
      errors.push(...ruleErrors);
      return;
    }

    seenRuleIds.add(ruleId);
    rules.push({
      id: freshRuleId(),
      rule_id: ruleId,
      name: asOptionalString(rule.name),
      match_mode: rule.match_mode === "all" ? "all" : "any",
      conditions,
      pipeline_id: pipelineId,
      priority: asOptionalNumber(rule.priority),
      is_active: typeof rule.is_active === "boolean" ? rule.is_active : undefined,
      description: asOptionalString(rule.description),
      source: asOptionalString(rule.source),
    });
  });

  return {
    rules,
    report: {
      imported: rules.length,
      skipped: rawRules.length - rules.length,
      errors,
      warnings,
    },
  };
}
