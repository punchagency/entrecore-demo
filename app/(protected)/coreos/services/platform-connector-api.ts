import { Axios } from "@/app/config/axios";

export interface PlatformConnector {
  id: string;
  erp_type: string;
  name: string;
  is_active?: boolean;
}

/** Map UI app names / ids to connectors.erp_type (stable across envs). */
export const PLATFORM_ERP_TYPES = {
  airtable: "airtable",
  bigquery: "bigquery",
  netsuite: "netsuite",
  notion: "notion",
  google_drive: "google_drive",
} as const;

export type PlatformErpType = (typeof PLATFORM_ERP_TYPES)[keyof typeof PLATFORM_ERP_TYPES];

export function erpTypeFromAppName(appName: string): PlatformErpType | null {
  const normalized = appName.toLowerCase().replace(/\s+/g, "");
  if (normalized === "airtable") return PLATFORM_ERP_TYPES.airtable;
  if (normalized === "bigquery") return PLATFORM_ERP_TYPES.bigquery;
  if (normalized === "netsuite") return PLATFORM_ERP_TYPES.netsuite;
  if (normalized === "notion") return PLATFORM_ERP_TYPES.notion;
  if (normalized === "googledrive") return PLATFORM_ERP_TYPES.google_drive;
  return null;
}

interface ConnectorListResponse {
  items?: PlatformConnector[];
}

const connectorIdCache = new Map<string, string>();
const connectorIdInflight = new Map<string, Promise<string | null>>();

function normalizeErpType(erpType: string): string {
  return erpType.trim().toLowerCase();
}

function findConnectorByErpType(
  items: PlatformConnector[] | undefined,
  erpType: string
): PlatformConnector | undefined {
  const normalized = normalizeErpType(erpType);
  return items?.find((item) => normalizeErpType(item.erp_type) === normalized);
}

/**
 * Resolve the platform catalog connector id for an erp_type via the backend.
 * Results are cached for the session. Optional envFallback supports local dev
 * during migration; prod should rely on the connectors table only.
 */
export async function resolvePlatformConnectorId(
  erpType: string,
  _options?: { envFallback?: string }
): Promise<string | null> {
  const cacheKey = normalizeErpType(erpType);
  const cached = connectorIdCache.get(cacheKey);
  if (cached) return cached;

  const inflight = connectorIdInflight.get(cacheKey);
  if (inflight) return inflight;

  const lookup = (async (): Promise<string | null> => {
    try {
      const filtered = await Axios.get<ConnectorListResponse>("/data/connectors/", {
        params: { erp_type: erpType, limit: 10, is_active: true },
      });
      let match = findConnectorByErpType(filtered.data?.items, erpType);

      if (!match) {
        const all = await Axios.get<ConnectorListResponse>("/data/connectors/", {
          params: { limit: 100, is_active: true },
        });
        match = findConnectorByErpType(all.data?.items, erpType);
      }

      if (match?.id) {
        connectorIdCache.set(cacheKey, match.id);
        return match.id;
      }

      // Do not fall back to a baked NEXT_PUBLIC_* UUID here. Staging IDs on a
      // prod deploy caused "Connector {uuid} not found". Local/dev can still
      // pass envFallback via the hook's error path if the catalog is unreachable.
      return null;
    } finally {
      connectorIdInflight.delete(cacheKey);
    }
  })();

  connectorIdInflight.set(cacheKey, lookup);
  return lookup;
}

/** Look up a platform connector (name, erp_type) by its UUID. */
export async function fetchPlatformConnectorById(
  connectorId: string
): Promise<PlatformConnector | null> {
  const response = await Axios.get<ConnectorListResponse>("/data/connectors/", {
    params: { limit: 100 },
  });
  return response.data?.items?.find((item) => item.id === connectorId) ?? null;
}

export function clearPlatformConnectorIdCache(erpType?: string): void {
  if (erpType) {
    connectorIdCache.delete(normalizeErpType(erpType));
    return;
  }
  connectorIdCache.clear();
}
