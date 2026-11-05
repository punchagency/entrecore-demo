import { Axios } from "@/app/config/axios";

// ---------- Types (EP-606 + Google Drive watch) ----------

export type WatchedSourceType = "inbox" | "folder" | "google_drive";

export interface InboxSourceConfig {
  imap_host: string;
  imap_port: number;
  username: string;
  /** Write-only: sent on create or when rotating credentials, never returned by the API. */
  password?: string;
  poll_interval_seconds: number;
  imap_folder?: string;
  use_ssl?: boolean;
  /** Delete the message from the inbox once DRAT has fully ingested it. */
  delete_after_ingest?: boolean;
}

export type FolderLocationType = "gcs" | "server";

export interface FolderSourceConfig {
  location_type: FolderLocationType;
  path: string;
  recursive: boolean;
  process_existing_on_startup?: boolean;
}

export interface GoogleDriveSourceConfig {
  drive_folder_id: string;
  drive_folder_path?: string | null;
  poll_interval_seconds: number;
  recursive?: boolean;
  connector_config_id?: string | null;
  /** Trash the source file from the watched folder once DRAT has filed it. */
  delete_after_filing?: boolean;
}

export type WatchedSourceConfig =
  | InboxSourceConfig
  | FolderSourceConfig
  | GoogleDriveSourceConfig;

interface WatchedSourceBase {
  id: string;
  name: string;
  enabled: boolean;
  rule_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface InboxWatchedSource extends WatchedSourceBase {
  source_type: "inbox";
  config: InboxSourceConfig;
}

export interface FolderWatchedSource extends WatchedSourceBase {
  source_type: "folder";
  config: FolderSourceConfig;
}

export interface GoogleDriveWatchedSource extends WatchedSourceBase {
  source_type: "google_drive";
  config: GoogleDriveSourceConfig;
}

/** Discriminated on `source_type` so narrowing it also narrows `config`. */
export type WatchedSource =
  | InboxWatchedSource
  | FolderWatchedSource
  | GoogleDriveWatchedSource;

export interface WatchedSourceCreateRequest {
  name: string;
  source_type: WatchedSourceType;
  enabled: boolean;
  config: WatchedSourceConfig;
}

export interface WatchedSourceUpdateRequest {
  name?: string;
  enabled?: boolean;
  config?: WatchedSourceConfig;
}

export function isInboxSource(source: WatchedSource): source is InboxWatchedSource {
  return source.source_type === "inbox";
}

export function isFolderSource(source: WatchedSource): source is FolderWatchedSource {
  return source.source_type === "folder";
}

export function isGoogleDriveSource(
  source: WatchedSource
): source is GoogleDriveWatchedSource {
  return source.source_type === "google_drive";
}

// ---------- API (EP-606 contract) ----------
// Base: /api/v1/data/drat-watched-sources  (Axios baseURL already includes /api/v1)
// Do NOT call /api/v1/drat/* — nginx has no location block for that prefix.

const BASE = "/data/drat-watched-sources";

interface WatchedSourceListResponse {
  items: WatchedSource[];
  total: number;
}

export const fetchWatchedSources = async (): Promise<WatchedSource[]> => {
  const response = await Axios.get<WatchedSourceListResponse>(`${BASE}/`);
  return response.data.items ?? [];
};

export const createWatchedSource = async (
  data: WatchedSourceCreateRequest
): Promise<WatchedSource> => {
  const response = await Axios.post<WatchedSource>(`${BASE}/`, data);
  return response.data;
};

export const updateWatchedSource = async (
  id: string,
  data: WatchedSourceUpdateRequest
): Promise<WatchedSource> => {
  const response = await Axios.patch<WatchedSource>(`${BASE}/${id}`, data);
  return response.data;
};

export const deleteWatchedSource = async (id: string): Promise<void> => {
  await Axios.delete(`${BASE}/${id}`);
};

export interface ImapTestRequest {
  imap_host: string;
  imap_port: number;
  username: string;
  password: string;
  imap_folder?: string;
  use_ssl?: boolean;
}

export interface ImapTestResponse {
  ok: boolean;
  message: string;
}

/** Validate IMAP credentials without persisting a watched source. */
export const testImapConnection = async (
  data: ImapTestRequest
): Promise<ImapTestResponse> => {
  const response = await Axios.post<ImapTestResponse>(`${BASE}/test-imap`, data);
  return response.data;
};
