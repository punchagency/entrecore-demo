import { Axios } from "@/app/config/axios";

export interface Entity {
  id: string;
  name: string;
  aliases: string[];
  enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEntityPayload {
  name: string;
  aliases?: string[];
  enabled?: boolean;
}

export interface UpdateEntityPayload {
  name?: string;
  aliases?: string[];
  enabled?: boolean;
}

export interface EntityListResponse {
  entities: Entity[];
  total: number;
  page: number;
  limit: number;
}

export interface ImportResponse {
  created: number;
  updated: number;
  skipped: number;
  errors?: Array<{ row_number: number; name?: string | null; error: string }>;
}

export interface AirtableSyncColumnMap {
  name: string;
  aliases?: string | null;
  drive_folder_id?: string | null;
  enabled?: string | null;
}

export interface AirtableSyncConfig {
  base_id: string;
  table_name: string;
  column_map: AirtableSyncColumnMap;
  connector_id?: number | null;
  sync_enabled: boolean;
  disable_missing: boolean;
  drive_folder_authoritative: boolean;
}

export interface AirtableSyncConfigResponse {
  configured: boolean;
  config: AirtableSyncConfig | null;
}

export interface AirtableBase {
  id: string;
  name: string;
}

export interface AirtableField {
  name: string;
  type: string;
}

export interface AirtableTable {
  id: string;
  name: string;
  fields: AirtableField[];
}

export const emptyAirtableSyncConfig = (): AirtableSyncConfig => ({
  base_id: "",
  table_name: "",
  column_map: { name: "Name", aliases: null, drive_folder_id: null, enabled: null },
  connector_id: null,
  sync_enabled: true,
  disable_missing: true,
  drive_folder_authoritative: false,
});

export interface SyncAirtableResponse {
  created: number;
  updated: number;
  disabled: number;
  drive_maps_upserted: number;
  drive_maps_preserved: number;
  skipped: number;
  errors: Array<{ record_id?: string | null; name?: string | null; error: string }>;
}

const normalizeEntity = (raw: Record<string, unknown>): Entity => ({
  id: String(raw.id),
  name: String(raw.name),
  aliases: Array.isArray(raw.aliases) ? (raw.aliases as string[]) : [],
  enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
  created_at: raw.created_at as string | undefined,
  updated_at: raw.updated_at as string | undefined,
});

/** Split pasted text into entity names (commas or newlines). */
export const parseBatchEntityNames = (text: string): string[] => {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const part of text.split(/[\n,]+/)) {
    const name = part.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names;
};

export const buildEntitiesTxtFile = (names: string[]): File => {
  const content = `${names.join("\n")}\n`;
  return new File([content], "entities-paste.txt", { type: "text/plain" });
};

export const fetchEntities = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}): Promise<EntityListResponse> => {
  const pageVal = params?.page || 1;
  const limitVal = params?.limit || 15;
  const skip = (pageVal - 1) * limitVal;

  const response = await Axios.get("/data/drat-entities/", {
    params: {
      search: params?.search,
      skip,
      limit: limitVal,
      ...(params?.enabled !== undefined ? { enabled: params.enabled } : {}),
    },
  });

  // Handle various potential API return formats
  if (response.data && typeof response.data === "object") {
    const data = response.data;
    const rawEntities = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.entities)
      ? data.entities
      : Array.isArray(data.data)
      ? data.data
      : Array.isArray(data.results)
      ? data.results
      : Array.isArray(data)
      ? data
      : [];

    const entities = rawEntities.map((item: Record<string, unknown>) =>
      normalizeEntity(item)
    );

    return {
      entities,
      total: typeof data.total === "number" ? data.total : entities.length,
      page: pageVal,
      limit: limitVal,
    };
  }

  return {
    entities: [],
    total: 0,
    page: pageVal,
    limit: limitVal,
  };
};

export const createEntity = async (payload: CreateEntityPayload): Promise<Entity> => {
  const response = await Axios.post("/data/drat-entities/", payload);
  return normalizeEntity(response.data);
};

export const updateEntity = async (id: string, payload: UpdateEntityPayload): Promise<Entity> => {
  const response = await Axios.patch(`/data/drat-entities/${id}`, payload);
  return normalizeEntity(response.data);
};

export const deleteEntity = async (id: string): Promise<void> => {
  await Axios.delete(`/data/drat-entities/${id}`);
};

export const importEntities = async (file: File): Promise<ImportResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await Axios.post("/data/drat-entities/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const formatImportSummary = (result: ImportResponse): string => {
  const parts = [`${result.created} created`, `${result.updated} updated`];
  if (result.skipped > 0) {
    parts.push(`${result.skipped} skipped`);
  }
  return parts.join(", ");
};

const SYNC_CONFIG_URL = "/data/drat-entities/settings/airtable-sync";

export const getAirtableSyncConfig = async (): Promise<AirtableSyncConfigResponse> => {
  const response = await Axios.get(SYNC_CONFIG_URL);
  return response.data;
};

export const setAirtableSyncConfig = async (
  config: AirtableSyncConfig
): Promise<AirtableSyncConfigResponse> => {
  // Blank optional column names mean "this column isn't mapped". Sending "" would
  // make the sync look for a column literally named "", so normalise to null.
  const blankToNull = (value?: string | null) => {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const response = await Axios.put(SYNC_CONFIG_URL, {
    ...config,
    base_id: config.base_id.trim(),
    table_name: config.table_name.trim(),
    column_map: {
      name: config.column_map.name.trim(),
      aliases: blankToNull(config.column_map.aliases),
      drive_folder_id: blankToNull(config.column_map.drive_folder_id),
      enabled: blankToNull(config.column_map.enabled),
    },
  });
  return response.data;
};

export const clearAirtableSyncConfig = async (): Promise<void> => {
  await Axios.delete(SYNC_CONFIG_URL);
};

export const fetchAirtableBases = async (): Promise<AirtableBase[]> => {
  const response = await Axios.get("/data/drat-entities/airtable/bases");
  return response.data;
};

export const fetchAirtableTables = async (baseId: string): Promise<AirtableTable[]> => {
  const response = await Axios.get(
    `/data/drat-entities/airtable/bases/${encodeURIComponent(baseId)}/tables`
  );
  return response.data;
};

export const syncFromAirtable = async (): Promise<SyncAirtableResponse> => {
  const response = await Axios.post("/data/drat-entities/sync-airtable");
  return response.data;
};

export const formatSyncSummary = (result: SyncAirtableResponse): string => {
  const parts = [`${result.created} created`, `${result.updated} updated`];
  // A sync can retire entities and rewrite Drive mappings. Those are the
  // destructive outcomes, so report them whenever they happen rather than
  // leaving the user to infer them from a shrinking list.
  if (result.disabled > 0) {
    parts.push(`${result.disabled} disabled`);
  }
  if (result.drive_maps_upserted > 0) {
    parts.push(`${result.drive_maps_upserted} Drive folder${result.drive_maps_upserted > 1 ? "s" : ""} mapped`);
  }
  if (result.drive_maps_preserved > 0) {
    parts.push(`${result.drive_maps_preserved} Drive mapping${result.drive_maps_preserved > 1 ? "s" : ""} kept`);
  }
  if (result.skipped > 0) {
    parts.push(`${result.skipped} skipped`);
  }
  return parts.join(", ");
};

// ---------------------------------------------------------------------------
// Drive folder auto-provisioning
// ---------------------------------------------------------------------------

export interface DriveAutoProvisionConfig {
  enabled: boolean;
  parent_folder_id?: string | null;
  /** Display-only path of the parent, so the UI can show where folders land. */
  parent_folder_path?: string | null;
  connector_config_id?: string | null;
}

export interface DriveAutoProvisionConfigResponse {
  configured: boolean;
  config?: DriveAutoProvisionConfig | null;
}

export interface DriveProvisionResult {
  created: number;
  matched: number;
  skipped_existing: number;
  failed: number;
  errors: string[];
}

const AUTO_PROVISION_URL = "/data/drat-entities/settings/drive-auto-provision";

export const getDriveAutoProvisionConfig = async (): Promise<DriveAutoProvisionConfigResponse> => {
  const response = await Axios.get(AUTO_PROVISION_URL);
  return response.data;
};

export const setDriveAutoProvisionConfig = async (
  config: DriveAutoProvisionConfig
): Promise<DriveAutoProvisionConfigResponse> => {
  const blankToNull = (value?: string | null) => {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  };
  const response = await Axios.put(AUTO_PROVISION_URL, {
    enabled: config.enabled,
    // No parent means My Drive root, which the backend represents as null.
    parent_folder_id: blankToNull(config.parent_folder_id),
    parent_folder_path: blankToNull(config.parent_folder_path),
    connector_config_id: blankToNull(config.connector_config_id),
  });
  return response.data;
};

export const clearDriveAutoProvisionConfig = async (): Promise<void> => {
  await Axios.delete(AUTO_PROVISION_URL);
};

/** Backfill folders for entities that predate auto-provisioning being switched on. */
export const provisionDriveFolders = async (): Promise<DriveProvisionResult> => {
  const response = await Axios.post("/data/drat-entities/provision-drive-folders");
  return response.data;
};

export const formatProvisionSummary = (result: DriveProvisionResult): string => {
  const parts: string[] = [];
  if (result.created > 0) parts.push(`${result.created} folder${result.created > 1 ? "s" : ""} created`);
  // Created vs linked is the signal for name mismatches: folders you expected to
  // be linked showing up as created means Drive spells that client differently.
  if (result.matched > 0) parts.push(`${result.matched} linked to existing`);
  if (result.skipped_existing > 0) parts.push(`${result.skipped_existing} already mapped`);
  if (result.failed > 0) parts.push(`${result.failed} failed`);
  return parts.length > 0 ? parts.join(", ") : "No entities needed a folder";
};
