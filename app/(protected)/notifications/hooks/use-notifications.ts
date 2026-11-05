"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { useSocketIO } from "@/contexts/socketio-context";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications-api";
import { resolveNotificationLink } from "../utils";
import type {
  NotificationListResponse,
  NotificationQuery,
  SocketNotificationCreatedPayload,
} from "../types";

export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  lists: () => [...NOTIFICATION_KEYS.all, "list"] as const,
  list: (params: NotificationQuery) => [...NOTIFICATION_KEYS.lists(), params] as const,
  unread: () => [...NOTIFICATION_KEYS.all, "unread-count"] as const,
};

interface UseNotificationsOptions {
  enableToasts?: boolean;
}

export function useNotifications(
  params: NotificationQuery = { limit: 20 },
  options: UseNotificationsOptions = { enableToasts: true }
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { socket } = useSocketIO();
  const seenIdsRef = useRef<Set<string>>(new Set());

  // ── Queries ────────────────────────────────────────────────────────────────
  const list = useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: () => fetchNotifications(params),
    // The socket is a nudge, not a guarantee. Polling is the floor.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    retry: (failureCount, error) => {
      // Don't retry on 400 (no company/token) or 401
      if (isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 401)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const unread = useQuery({
    queryKey: NOTIFICATION_KEYS.unread(),
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 401)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // ── 400 detection: Hide bell if no company attached ─────────────────────────
  const isCompanyMissing = useMemo(() => {
    const listStatus = isAxiosError(list.error) ? list.error.response?.status : undefined;
    const unreadStatus = isAxiosError(unread.error) ? unread.error.response?.status : undefined;
    return listStatus === 400 || unreadStatus === 400;
  }, [list.error, unread.error]);

  // ── Realtime Socket.IO Listener ────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onCreated = (payload: SocketNotificationCreatedPayload) => {
      if (!payload || !payload.id) return;

      // Deduplicate: two providers may be mounted in layout hierarchy
      if (seenIdsRef.current.has(payload.id)) return;
      seenIdsRef.current.add(payload.id);

      // Trigger toast ONLY on socket event and ONLY for severity warning/error
      if (options.enableToasts && (payload.severity === "warning" || payload.severity === "error")) {
        const resolved = resolveNotificationLink(payload.link_url ?? null);

        const toastAction = resolved
          ? {
              label: "View",
              onClick: () => {
                if (resolved.kind === "internal") {
                  router.push(resolved.href);
                } else {
                  window.open(resolved.href, "_blank", "noopener,noreferrer");
                }
              },
            }
          : undefined;

        const toastContent = {
          description: payload.body || payload.resource_name || undefined,
          action: toastAction,
        };

        if (payload.severity === "error") {
          toast.error(payload.title, toastContent);
        } else {
          toast.warning(payload.title, toastContent);
        }
      }

      // Invalidate query to reconcile from REST source of truth
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    };

    const onConnect = () => {
      // No backlog replay for company events: resync on every (re)connect
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    };

    socket.on("notification.created", onCreated);
    socket.on("connect", onConnect);

    return () => {
      socket.off("notification.created", onCreated);
      socket.off("connect", onConnect);
    };
  }, [socket, queryClient, router, options.enableToasts]);

  // ── Optimistic Mark Read Mutation ──────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_KEYS.all });

      const prevList = queryClient.getQueryData<NotificationListResponse>(
        NOTIFICATION_KEYS.list(params)
      );
      const prevUnread = queryClient.getQueryData<number>(NOTIFICATION_KEYS.unread());

      if (prevList) {
        queryClient.setQueryData<NotificationListResponse>(NOTIFICATION_KEYS.list(params), {
          ...prevList,
          unread_count: Math.max(0, (prevList.unread_count ?? 1) - 1),
          items: prevList.items.map((n) =>
            n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          ),
        });
      }

      if (typeof prevUnread === "number") {
        queryClient.setQueryData<number>(
          NOTIFICATION_KEYS.unread(),
          Math.max(0, prevUnread - 1)
        );
      }

      return { prevList, prevUnread };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevList) {
        queryClient.setQueryData(NOTIFICATION_KEYS.list(params), ctx.prevList);
      }
      if (typeof ctx?.prevUnread === "number") {
        queryClient.setQueryData(NOTIFICATION_KEYS.unread(), ctx.prevUnread);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });

  // ── Optimistic Mark All Read Mutation ──────────────────────────────────────
  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(params.types),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_KEYS.all });

      const prevList = queryClient.getQueryData<NotificationListResponse>(
        NOTIFICATION_KEYS.list(params)
      );
      const prevUnread = queryClient.getQueryData<number>(NOTIFICATION_KEYS.unread());

      if (prevList) {
        queryClient.setQueryData<NotificationListResponse>(NOTIFICATION_KEYS.list(params), {
          ...prevList,
          unread_count: 0,
          items: prevList.items.map((n) => ({
            ...n,
            is_read: true,
            read_at: n.read_at || new Date().toISOString(),
          })),
        });
      }

      queryClient.setQueryData<number>(NOTIFICATION_KEYS.unread(), 0);

      return { prevList, prevUnread };
    },
    onError: (_err, _variables, ctx) => {
      if (ctx?.prevList) {
        queryClient.setQueryData(NOTIFICATION_KEYS.list(params), ctx.prevList);
      }
      if (typeof ctx?.prevUnread === "number") {
        queryClient.setQueryData(NOTIFICATION_KEYS.unread(), ctx.prevUnread);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });

  const markRead = useCallback(
    (id: string) => markReadMutation.mutate(id),
    [markReadMutation]
  );

  const markAllRead = useCallback(
    () => markAllReadMutation.mutate(),
    [markAllReadMutation]
  );

  return {
    notifications: list.data?.items ?? [],
    total: list.data?.total ?? 0,
    // Prefer the list's unread_count when loaded: it is company-wide and
    // filter-independent, i.e. exactly the badge number.
    unreadCount: list.data?.unread_count ?? unread.data ?? 0,
    isLoading: list.isLoading,
    isFetching: list.isFetching,
    error: list.error,
    isCompanyMissing,
    refetch: list.refetch,
    markRead,
    markAllRead,
    isMarkingRead: markReadMutation.isPending,
    isMarkingAll: markAllReadMutation.isPending,
  };
}
