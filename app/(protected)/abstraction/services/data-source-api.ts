import { Axios } from "@/app/config/axios";
import {
  ConnectorConfig,
  fetchCompanyConnectors,
} from "@/app/(protected)/workflows/services/integration-api";

export { fetchCompanyConnectors, type ConnectorConfig };

/**
 * A company's connector configs — with NO demo fallback.
 *
 * `fetchCompanyConnectors` swallows errors and returns three hard-coded
 * connectors, one of them `{id: "conn-103", erp_type: "airtable"}`
 * (workflows/services/integration-api.ts:404-408). For a browsing picker that
 * is a harmless placeholder. For anything that turns the choice into a live API
 * call it is a trap: the user picks a real-looking Airtable connector, the
 * request goes out with an id that does not exist, and the failure surfaces as
 * an unexplained 404 rather than "we could not load your connectors".
 *
 * Use this wherever the selection drives a real request. A rejected fetch must
 * mean "none", so the caller's empty state can say so honestly.
 */
export async function fetchCompanyConnectorsStrict(
  companyId: string
): Promise<ConnectorConfig[]> {
  const response = await Axios.get(`/data/connectors/company/${companyId}/configs`);
  const raw = response.data?.configs ?? response.data ?? [];
  return Array.isArray(raw) ? raw : [];
}

export interface CatalogColumn {
  name: string;
  data_type?: string;
}

export interface CatalogTable {
  name: string;
  source_table_name?: string;
  /**
   * When this table was last crawled. Lets a picker order by freshness instead
   * of alphabetically — a table crawled minutes ago is almost always the one
   * the user means.
   */
  last_crawled_at?: string | null;
  columns: CatalogColumn[];
  /**
   * Which dataset this table belongs to. Only meaningfully distinct across
   * tables for a connector with more than one dataset (currently just
   * multi-dataset BigQuery) — every other connector type has exactly one
   * dataset per connector config, so this is the same value on every table.
   */
  datasetName?: string;
}

/**
 * Tables (with their columns) a data-source picker can choose from for one
 * connector config. Only populates the picker's own dropdowns — fetching
 * actual column values happens entirely server-side, at extraction time
 * (see apply_reasoning / _apply_data_source_values in ocr_service.py), not
 * here.
 */
export async function fetchCatalogTables(connectorConfigId: string): Promise<CatalogTable[]> {
  const res = await Axios.get("/data/integration/catalog-browse", {
    params: { connector_config_id: connectorConfigId },
  });
  const schemas: any[] = res.data?.schemas ?? [];
  return schemas.flatMap((s) =>
    (s.tables ?? []).map((t: any) => ({ ...t, datasetName: s.dataset_name }))
  );
}
