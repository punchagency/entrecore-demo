import { Axios } from "@/app/config/axios";
import type {
  MarkAllReadResponse,
  MarkReadResponse,
  NotificationListResponse,
  NotificationQuery,
  UnreadCountResponse,
} from "../types";

const BASE = "/data/notifications";

/**
 * Builds query string with repeatable `type` parameters for FastAPI.
 * Array params must be repeated (type=a&type=b), NOT type[]=a.
 */
function buildQuery({ skip = 0, limit = 20, types, isRead }: NotificationQuery) {
  const query = new URLSearchParams();
  query.set("skip", String(skip));
  query.set("limit", String(limit));
  types?.forEach((t) => {
    if (t) query.append("type", t);
  });
  if (isRead !== undefined) {
    query.set("is_read", String(isRead));
  }
  return query.toString();
}

export const fetchNotifications = async (
  params: NotificationQuery = {}
): Promise<NotificationListResponse> => {
  const qs = buildQuery(params);
  const { data } = await Axios.get<NotificationListResponse>(`${BASE}?${qs}`);
  return data;
};

export const fetchUnreadCount = async (): Promise<number> => {
  const { data } = await Axios.get<UnreadCountResponse>(`${BASE}/unread-count`);
  return data.unread_count;
};

export const markNotificationRead = async (id: string): Promise<MarkReadResponse> => {
  const { data } = await Axios.post<MarkReadResponse>(`${BASE}/${encodeURIComponent(id)}/read`);
  return data;
};

export const markAllNotificationsRead = async (
  types?: string[]
): Promise<MarkAllReadResponse> => {
  const query = new URLSearchParams();
  types?.forEach((t) => {
    if (t) query.append("type", t);
  });
  const suffix = query.toString() ? `?${query}` : "";
  const { data } = await Axios.post<MarkAllReadResponse>(`${BASE}/read-all${suffix}`);
  return data;
};
