/**
 * In-App Notifications Types (EP-1041)
 */

/** Open-ended on purpose — the backend can add one without a schema change. */
export type NotificationSeverity = "info" | "warning" | "error" | (string & {});

export interface AppNotification {
  id: string;
  type: string; // see catalogue in §4
  severity: NotificationSeverity;
  title: string; // always present, already human-readable
  body: string | null; // one-line detail
  resource_name: string | null; // the file/record a person recognises
  source_type: string | null; // "ocr_document" | "integration_run" | ...
  source_id: string | null; // NOT a UUID — can be "DOC-2026-...", "rec...", a run id
  link_url: string | null; // ABSOLUTE url, may be external, may be null
  details: Record<string, unknown> | null;
  created_at: string; // UTC, no timezone suffix — see §6.1
  is_read: boolean; // per-user
  read_at: string | null;
}

export interface NotificationListResponse {
  items: AppNotification[];
  total: number;
  skip: number;
  limit: number;
  unread_count: number; // company-wide for this user, ignores filters
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkReadResponse {
  id: string;
  is_read: boolean;
  read_at: string;
}

export interface MarkAllReadResponse {
  marked: number;
  unread_count: number;
}

export interface NotificationQuery {
  skip?: number;
  limit?: number;
  types?: string[];
  isRead?: boolean;
}

export interface SocketNotificationCreatedPayload {
  event?: string;
  id: string;
  company_id?: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  body?: string | null;
  resource_name?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  link_url?: string | null;
  created_at: string;
}

export type ResolvedLink =
  | { kind: "internal"; href: string }
  | { kind: "external"; href: string }
  | null;
