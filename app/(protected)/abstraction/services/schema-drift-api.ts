import { Axios } from "@/app/config/axios";

/**
 * Run the schema-drift check for one connector, on demand.
 *
 * The same pass Beat runs every six hours, narrowed to a single connector so it
 * finishes while someone is waiting. Read-only unless a table actually drifted;
 * then exactly those tables are re-crawled and re-profiled.
 *
 * Deliberately NOT company-wide. The underlying monitor defaults to every
 * active connector on the platform, which is right for a scheduled task and a
 * cross-tenant write from a request — the endpoint scopes to the caller's
 * company and to the one connector named here.
 */

/** One connector's result within a pass. */
export interface DriftResult {
  connector_id: string;
  connector_name: string;
  erp_type: string;
  company_id: string;
  /** Present when the connector was passed over rather than checked. */
  skipped?: string;
  /** Present when the check itself failed — one bad connector never stops a pass. */
  error?: string;
  drift?: {
    added: string[];
    removed: string[];
    changed: string[];
  };
}

export interface DriftRunSummary {
  connectors_checked: number;
  connectors_skipped: number;
  connectors_drifted: number;
  tables_recrawled: number;
  tables_reprofiled: number;
  tables_removed: number;
  results: DriftResult[];
  /** Set when the connector's type is not covered by drift monitoring. */
  note?: string;
}

export async function runSchemaDrift(connectorId: string): Promise<DriftRunSummary> {
  const response = await Axios.post(`/data/connectors/${connectorId}/drift/run`);
  return response.data;
}
