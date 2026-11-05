/**
 * The connector types this page can configure today. Ids match `appsMapping`
 * in coreos/constants.ts and the service ids used by ServiceSelectionModal.
 */
export const SUPPORTED_CONNECTOR_IDS = [9, 27, 2, 28, 29] as const;

export const CONNECTOR_BLURBS: Record<number, string> = {
  9: "Warehouse tables, schemas, and query history",
  27: "ERP records, transactions, and financials",
  2: "Bases, tables, and records",
  28: "Pages, databases, and workspace content",
  29: "Documents, folders, and shared drives",
};
