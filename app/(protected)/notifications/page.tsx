"use client";

import React, { useState, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { PageWrapper } from "@/components/page-wrapper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotifications } from "./hooks/use-notifications";
import { NotificationItem } from "./components/notification-item";
import type { NotificationQuery } from "./types";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

type StatusFilter = "all" | "unread" | "read";
type CategoryFilter = "all" | "review" | "failure" | "done";

const CATEGORY_MAP: Record<CategoryFilter, string[] | undefined> = {
  all: undefined,
  review: [
    "drat_review_task_created",
    "needs_review",
    "awaiting_onboarding",
    "upsert_review_parked",
  ],
  failure: ["push_failed", "drat_file_unprocessable", "dq_rules_failed"],
  done: ["drat_file_filed"],
};

export default function NotificationsPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const queryParams: NotificationQuery = useMemo(() => {
    const params: NotificationQuery = {
      skip: page * pageSize,
      limit: pageSize,
      types: CATEGORY_MAP[categoryFilter],
    };

    if (statusFilter === "unread") {
      params.isRead = false;
    } else if (statusFilter === "read") {
      params.isRead = true;
    }

    return params;
  }, [page, pageSize, statusFilter, categoryFilter]);

  const {
    notifications,
    total,
    unreadCount,
    isLoading,
    isFetching,
    refetch,
    markRead,
    markAllRead,
    isMarkingAll,
  } = useNotifications(queryParams);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setPage(0);
  };

  const handleCategoryChange = (cat: CategoryFilter) => {
    setCategoryFilter(cat);
    setPage(0);
  };

  return (
    <PageWrapper
      title="Notifications"
      icon={<Bell className="h-6 w-6 text-blue-600" />}
      rightContent={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 px-3.5 bg-white/60 hover:bg-white text-slate-700 border-white/60 shadow-xs rounded-xl gap-2 font-semibold"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => markAllRead()}
            disabled={unreadCount === 0 || isMarkingAll}
            className="h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-blue-500/20 font-bold gap-2 disabled:opacity-40"
          >
            {isMarkingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Mark all as read
          </Button>
        </div>
      }
    >
      <div className="p-4 md:p-8 lg:p-10 max-w-6xl mx-auto space-y-6">
        {/* Header Summary & Filter Bar */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                Activity & Alerts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time stream of review queues, pipeline events, and extraction alerts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold">
                {unreadCount} unread
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200/60 text-xs font-semibold">
                {total} total matching
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/70 rounded-xl">
              {(["all", "unread", "read"] as StatusFilter[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusChange(st)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                    statusFilter === st
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {st}
                  {st === "unread" && unreadCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px]">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Category Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All Categories" },
                  { id: "review", label: "Reviews" },
                  { id: "failure", label: "Failures" },
                  { id: "done", label: "Completed" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                    categoryFilter === cat.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white/70 text-slate-600 border-slate-200/70 hover:bg-slate-50 hover:border-slate-300"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feed List Container */}
        <div className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded-md w-2/5" />
                    <div className="h-3 bg-slate-100 rounded-md w-4/5" />
                    <div className="h-2.5 bg-slate-100 rounded-md w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 px-6 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
                {statusFilter === "unread" ? (
                  <Sparkles className="h-8 w-8 text-blue-500" />
                ) : (
                  <Inbox className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                {statusFilter === "unread"
                  ? "You're all caught up"
                  : "No notifications found"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mb-5">
                {statusFilter === "unread"
                  ? "There are no unread notifications requiring your attention at this time."
                  : "No events match your current filter selection. Try adjusting your filter."}
              </p>
              {statusFilter !== "all" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setCategoryFilter("all");
                    setPage(0);
                  }}
                  className="rounded-xl"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((item) => (
                <NotificationItem
                  key={item.id}
                  notification={item}
                  onMarkRead={markRead}
                  className="p-4 md:p-5"
                />
              ))}
            </div>
          )}

          {/* Pagination Footer */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 bg-slate-50/70 border-t border-slate-100">
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span>
                  Showing {Math.min(total, page * pageSize + 1)}–
                  {Math.min(total, (page + 1) * pageSize)} of {total}
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(0);
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-blue-500"
                  >
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isLoading}
                  className="h-8 px-2.5 rounded-lg bg-white border-slate-200 text-xs font-semibold"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <span className="text-xs font-semibold text-slate-600 px-2">
                  Page {page + 1} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || isLoading}
                  className="h-8 px-2.5 rounded-lg bg-white border-slate-200 text-xs font-semibold"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
