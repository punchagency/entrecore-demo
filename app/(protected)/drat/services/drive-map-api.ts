import { Axios } from "@/app/config/axios";

export interface EntityDriveMap {
  id: string;
  company_id: string;
  entity_id: string;
  entity_name?: string | null;
  drive_root_folder_id: string;
  drive_root_path?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EntityDriveMapListResponse {
  items: EntityDriveMap[];
  total: number;
}

export interface DriveFolderEntry {
  id: string;
  name: string;
  is_folder: boolean;
  web_view_link?: string | null;
}

export interface DriveFolderBrowseResponse {
  folder_id: string;
  connector_config_id: string;
  folders: DriveFolderEntry[];
  total: number;
  query?: string | null;
}

export interface SharedDriveEntry {
  id: string;
  name: string;
}

export interface SharedDrivesListResponse {
  connector_config_id: string;
  drives: SharedDriveEntry[];
  total: number;
}

export interface CreateDriveFolderPayload {
  name: string;
  parent_folder_id?: string | null;
  connector_config_id?: string | null;
}

export interface CreateDriveFolderResponse {
  folder_id: string;
  name: string;
  parent_folder_id?: string | null;
  created: boolean;
  connector_config_id: string;
}

export interface UpsertEntityDriveMapPayload {
  entity_id: string;
  drive_root_folder_id: string;
  drive_root_path?: string | null;
}

export const fetchEntityDriveMaps = async (): Promise<EntityDriveMapListResponse> => {
  const response = await Axios.get("/data/drat-entity-drive-map/");
  const data = response.data;
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    items,
    total: typeof data?.total === "number" ? data.total : items.length,
  };
};

export const upsertEntityDriveMap = async (
  payload: UpsertEntityDriveMapPayload
): Promise<EntityDriveMap> => {
  const response = await Axios.put("/data/drat-entity-drive-map/", payload);
  return response.data;
};

export const browseDriveFolders = async (params?: {
  folderId?: string;
  connectorConfigId?: string;
}): Promise<DriveFolderBrowseResponse> => {
  const response = await Axios.get("/data/drat-entity-drive-map/browse-folders", {
    params: {
      ...(params?.folderId ? { folder_id: params.folderId } : {}),
      ...(params?.connectorConfigId ? { connector_config_id: params.connectorConfigId } : {}),
    },
  });
  return response.data;
};

export const searchDriveFolders = async (params: {
  q: string;
  connectorConfigId?: string;
}): Promise<DriveFolderBrowseResponse> => {
  const response = await Axios.get("/data/drat-entity-drive-map/search-folders", {
    params: {
      q: params.q,
      ...(params.connectorConfigId ? { connector_config_id: params.connectorConfigId } : {}),
    },
  });
  return response.data;
};

export const listSharedDrives = async (params?: {
  connectorConfigId?: string;
}): Promise<SharedDrivesListResponse> => {
  const response = await Axios.get("/data/drat-entity-drive-map/shared-drives", {
    params: {
      ...(params?.connectorConfigId ? { connector_config_id: params.connectorConfigId } : {}),
    },
  });
  return response.data;
};

export const createDriveFolder = async (
  payload: CreateDriveFolderPayload
): Promise<CreateDriveFolderResponse> => {
  const response = await Axios.post("/data/drat-entity-drive-map/create-folder", {
    name: payload.name,
    ...(payload.parent_folder_id ? { parent_folder_id: payload.parent_folder_id } : {}),
    ...(payload.connector_config_id ? { connector_config_id: payload.connector_config_id } : {}),
  });
  return response.data;
};

export function extractAxiosErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as {
      response?: { data?: { detail?: unknown }; status?: number };
      message?: string;
    };
    if (!axiosError.response) {
      return "Could not reach the API. If you just changed ENCRYPTION_KEY, recreate the Docker containers and re-connect Google Drive in Core OS.";
    }
    const detail = axiosError.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (typeof detail === "object" && detail !== null && "message" in detail) {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === "string") return message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
