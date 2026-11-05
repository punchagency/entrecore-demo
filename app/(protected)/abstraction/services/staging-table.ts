/**
 * Which BigQuery table a protocol stages into.
 *
 * Mirrors `derive_staging_table_name` / `effective_staging_table` in
 * BackEnd/data_ingestion_service/ingestion_service/models/ocr_model.py. Keep
 * the two in step: the backend's staging path
 * (GCSOCRPipeline._stage_mapped_data) applies exactly this fallback, so if the
 * UI disagrees it will either block a pairing that works or allow one that
 * aborts mid-chain.
 */

/**
 * The default staging table for a protocol of this name.
 *
 * Lossy on purpose, exactly as on the backend: every non-alphanumeric
 * character collapses to "_" and the result is lowercased, so "Virgil
 * Parties", "virgil-parties" and "Virgil_Parties" all derive
 * `ocr_staging_virgil_parties`.
 */
export function deriveStagingTableName(protocolName?: string | null): string | null {
  const cleaned = (protocolName ?? "").trim();
  if (!cleaned) return null;
  return `ocr_staging_${cleaned.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
}

/**
 * The table this protocol actually stages into — the stored value if it has
 * one, otherwise the name-derived default.
 *
 * `staging_table_name` is nullable and empty for every protocol that predates
 * the column, so reading it alone disagrees with reality for most rows.
 */
export function effectiveStagingTable(
  config: { name?: string | null; staging_table_name?: string | null } | undefined | null
): string | null {
  if (!config) return null;
  const stored = (config.staging_table_name ?? "").trim();
  if (stored) return stored;
  return deriveStagingTableName(config.name);
}
