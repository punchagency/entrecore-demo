import { Axios } from "@/app/config/axios";
import {
  ConnectorConfig,
  fetchCompanyConnectors,
} from "@/app/(protected)/workflows/services/integration-api";

export interface ConnectorTableOption {
  id: string;
  name: string;
  erp_type?: string;
  connector?: string;
  description?: string;
}

export interface InferredSchemaColumn {
  name: string;
  data_type: string;
  nullable: boolean;
  label?: string;
  distinct_count?: number;
}

export interface ConnectorConnectivityResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  testedAt: string;
}

export { fetchCompanyConnectors, type ConnectorConfig };

function normalizeCatalogItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as Record<string, unknown>[];
    if (Array.isArray(record.data)) return record.data as Record<string, unknown>[];
  }
  return [];
}

export async function fetchConnectorTables(
  companyId: string,
  connector: ConnectorConfig
): Promise<ConnectorTableOption[]> {
  const response = await Axios.get("/data/catalog/", {
    params: { company_id: companyId },
  });

  const erpType = connector.erp_type?.toLowerCase() ?? "";
  const connectorName = connector.connector_name?.toLowerCase() ?? "";

  const tables = normalizeCatalogItems(response.data)
    .filter((item) => {
      const itemErp = String(item.erp_type ?? item.connector ?? "").toLowerCase();
      if (!itemErp) return true;
      return itemErp === erpType || itemErp === connectorName;
    })
    .map((item) => {
      const id = String(item.id ?? item.table_id ?? "");
      const name = String(
        item.table_name ?? item.name ?? item.dataset ?? item.function ?? "Unnamed table"
      );
      return {
        id,
        name: name.trim(),
        erp_type: typeof item.erp_type === "string" ? item.erp_type : connector.erp_type,
        connector: typeof item.connector === "string" ? item.connector : connector.connector_name,
        description: typeof item.description === "string" ? item.description : undefined,
      };
    })
    .filter((table) => table.id && table.name);

  const unique = new Map<string, ConnectorTableOption>();
  tables.forEach((table) => {
    if (!unique.has(table.id)) unique.set(table.id, table);
  });

  return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function inferTableSchema(
  companyId: string,
  tableId: string
): Promise<InferredSchemaColumn[]> {
  const response = await Axios.get("/data/metadata/columns", {
    params: {
      company_id: companyId,
      table_id: tableId,
      skip: 0,
      limit: 200,
    },
  });

  const items = Array.isArray(response.data?.items)
    ? response.data.items
    : Array.isArray(response.data)
      ? response.data
      : [];

  return items
    .map((item: Record<string, unknown>) => ({
      name: String(item.column_name ?? item.name ?? ""),
      data_type: String(item.data_type ?? item.type ?? "string"),
      nullable: Boolean(item.is_nullable ?? item.nullable ?? true),
      label: typeof item.label === "string" ? item.label : undefined,
      distinct_count:
        typeof item.unique_values_count === "number" ? item.unique_values_count : undefined,
    }))
    .filter((column: InferredSchemaColumn) => column.name);
}

export async function testConnectorConnectivity(
  connectorConfigId: string,
  companyId: string
): Promise<ConnectorConnectivityResult> {
  const testedAt = new Date().toISOString();
  const start = Date.now();

  try {
    const response = await Axios.post(
      `/data/connectors/configs/${connectorConfigId}/test-connection`,
      { company_id: companyId }
    );
    const data = response.data ?? {};
    return {
      success: data.success !== false,
      message:
        typeof data.message === "string"
          ? data.message
          : data.success === false
            ? "Connection test failed"
            : "Connection successful",
      latencyMs: typeof data.latency_ms === "number" ? data.latency_ms : Date.now() - start,
      testedAt,
    };
  } catch {
    try {
      const configs = await fetchCompanyConnectors(companyId);
      const match = configs.find((config) => config.id === connectorConfigId);
      if (!match) {
        return {
          success: false,
          message: "Connector configuration not found for this company",
          testedAt,
        };
      }

      await Axios.get("/data/catalog/", {
        params: { company_id: companyId, limit: 1 },
      });

      return {
        success: true,
        message: `${match.connector_name} (${match.erp_type}) is reachable via catalog API`,
        latencyMs: Date.now() - start,
        testedAt,
      };
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      return {
        success: false,
        message:
          typeof detail === "string"
            ? detail
            : "Unable to reach connector. Verify credentials in CoreOS.",
        latencyMs: Date.now() - start,
        testedAt,
      };
    }
  }
}
