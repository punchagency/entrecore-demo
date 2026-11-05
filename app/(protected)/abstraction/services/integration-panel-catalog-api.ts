import { Axios } from "@/app/config/axios";
import { type ConnectorConfig } from "@/app/(protected)/workflows/services/integration-api";

/**
 * Destination-table lookup for the Integrate panel (integrations-comparison).
 *
 * Deliberately separate from connector-input-api.fetchConnectorTables, which
 * serves the workflow connector-input / output-target node pickers. Those
 * return ConnectorTableOption objects keyed by catalog table `id` (they store
 * a destination table id and later resolve its columns by that id), and
 * catalog-browse does not expose an id. The Integrate panel needs only table
 * NAMES — the name string is what goes to POST /integration/jobs/suggest-mappings
 * as `destination_table` — so it can move to catalog-browse on its own without
 * changing anything the workflow pickers depend on.
 *
 * Why move at all: the panel previously read the company-wide /data/catalog/
 * and filtered client side on erp_type, which
 *   - merged EVERY connector of that type in the company into one list, with
 *     no way to tell two Airtable bases apart,
 *   - was capped at that endpoint's 500-row default with no paging here, so a
 *     large catalog silently dropped destination tables, and
 *   - passed a company_id read from localStorage rather than relying on the
 *     caller's own token.
 * catalog-browse is scoped server-side to a connector config, returns that
 * connector's full tree, and takes company from the auth token.
 *
 * The option SET is preserved: the panel still selects by connector type, so
 * every matching config is queried and the names are merged. With one config
 * per type — the normal case — the result is identical to before.
 */

/** Table names for one connector config, in catalog-browse order. */
export async function fetchConnectorTableNames(connectorConfigId: string): Promise<string[]> {
  const response = await Axios.get("/data/integration/catalog-browse", {
    params: { connector_config_id: connectorConfigId },
  });

  const schemas = Array.isArray(response.data?.schemas) ? response.data.schemas : [];
  return schemas
    .flatMap((schema: Record<string, unknown>) =>
      Array.isArray(schema?.tables) ? (schema.tables as Record<string, unknown>[]) : []
    )
    .map((table: Record<string, unknown>) => String(table?.name ?? "").trim())
    .filter((name: string) => Boolean(name));
}

/**
 * Merged, de-duplicated table names across every connector config whose
 * erp_type or connector_name matches `connectorName` — the same matching rule
 * the panel applied client-side against /data/catalog/, so the resulting list
 * is unchanged.
 *
 * Serves both the source and destination pickers: each selects by connector
 * TYPE, and both send a plain table name to suggest-mappings
 * (`source_table_name` / `destination_table`).
 *
 * A config whose catalog-browse call fails contributes nothing rather than
 * failing the whole lookup: one unreachable connector shouldn't empty the
 * dropdown for the others.
 */
export async function fetchTableNamesForConnectorType(
  connectors: ConnectorConfig[],
  connectorName: string
): Promise<string[]> {
  const wanted = (connectorName || "").toLowerCase();
  if (!wanted) return [];

  const matching = connectors.filter((connector) => {
    const erp = (connector.erp_type || "").toLowerCase();
    const name = (connector.connector_name || "").toLowerCase();
    return erp === wanted || name === wanted;
  });
  if (matching.length === 0) return [];

  const results = await Promise.all(
    matching.map((connector) => fetchConnectorTableNames(connector.id).catch(() => [] as string[]))
  );

  return Array.from(new Set(results.flat()));
}
