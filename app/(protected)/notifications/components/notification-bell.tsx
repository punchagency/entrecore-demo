"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Inbox,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotifications } from "../hooks/use-notifications";
import { NotificationItem } from "./notification-item";
import type { NotificationQuery } from "../types";

interface NotificationBellProps {
  className?: string;
}

type FilterTab = "all" | "unread" | "reviews" | "failures";

const REVIEW_TYPES = [
  "drat_review_task_created",
  "needs_review",
  "awaiting_onboarding",
  "upsert_review_parked",
];

const FAILURE_TYPES = [
  "push_failed",
  "drat_file_unprocessable",
  "dq_rules_failed",
];

export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Build the query params based on active filter tab
  const queryParams: NotificationQuery = useMemo(() => {
    const params: NotificationQuery = {
      limit: 20,
    };

    if (activeTab === "unread") {
      params.isRead = false;
    } else if (activeTab === "reviews") {
      params.types = REVIEW_TYPES;
    } else if (activeTab === "failures") {
      params.types = FAILURE_TYPES;
    }

    return params;
  }, [activeTab]);

  const {
    notifications,
    unreadCount,
    isLoading,
    isFetching,
    isCompanyMissing,
    markRead,
    markAllRead,
    isMarkingAll,
  } = useNotifications(queryParams);

  // If 400 "No company attached to this account" / "No user id on this token",
  // hide the bell entirely per §2.5 & §6.4 specs.
  if (isCompanyMissing) {
    return null;
  }

  // Format badge count: capped at 99+
  const badgeText = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications, no unread"
          }
          className={cn(
            "relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-2xl",
            "bg-white/60 hover:bg-white/90 backdrop-blur-md border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.08)]",
            "text-slate-600 hover:text-blue-600 transition-all duration-300 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500",
            isOpen && "bg-white text-blue-600 shadow-[0_8px_30px_rgba(37,99,235,0.12)] border-blue-200",
            className
          )}
        >
          <Bell className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" />

          {/* Unread badge (hidden at 0) */}
          {badgeText && (
            <span
              className={cn(
                "absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full",
                "bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-black tracking-tight",
                "flex items-center justify-center shadow-md shadow-red-500/30 ring-2 ring-white",
                "animate-in zoom-in-50 duration-200"
              )}
            >
              {badgeText}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className={cn(
          "w-[390px] max-w-[calc(100vw-2rem)] p-0",
          "bg-white/95 backdrop-blur-2xl rounded-2xl border border-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.15)]",
          "flex flex-col max-h-[72vh] overflow-hidden"
        )}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-white/60">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                {unreadCount} unread
              </span>
            )}
            {isFetching && !isLoading && (
              <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={unreadCount === 0 || isMarkingAll}
            onClick={() => markAllRead()}
            className="h-7 px-2 text-[11px] font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50/60 rounded-lg gap-1 disabled:opacity-40"
          >
            {isMarkingAll ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Mark all read
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 bg-slate-50/50 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0",
              activeTab === "all"
                ? "bg-white text-blue-600 font-bold shadow-xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("unread")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 flex items-center gap-1",
              activeTab === "unread"
                ? "bg-white text-blue-600 font-bold shadow-xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            )}
          >
            Unread
            {unreadCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0",
              activeTab === "reviews"
                ? "bg-white text-blue-600 font-bold shadow-xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            )}
          >
            Reviews
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("failures")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0",
              activeTab === "failures"
                ? "bg-white text-blue-600 font-bold shadow-xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            )}
          >
            Failures
          </button>
        </div>

        {/* Scrollable Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 max-h-[50vh]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 rounded-md w-3/4" />
                    <div className="h-2.5 bg-slate-100 rounded-md w-full" />
                    <div className="h-2 bg-slate-100 rounded-md w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                {activeTab === "unread" ? (
                  <Sparkles className="h-6 w-6 text-blue-500" />
                ) : (
                  <Inbox className="h-6 w-6 text-slate-400" />
                )}
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-0.5">
                {activeTab === "unread"
                  ? "You're all caught up"
                  : "No notifications here"}
              </p>
              <p className="text-xs text-slate-400 max-w-[220px]">
                {activeTab === "unread"
                  ? "You have no unread notifications waiting for review."
                  : "New system events and reviews will appear here."}
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <NotificationItem
                key={item.id}
                notification={item}
                onMarkRead={markRead}
                onNavigate={() => setIsOpen(false)}
              />
            ))
          )}
        </div>

        {/* Panel Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {notifications.length} shown
          </span>

          <Link
            href="/notifications"
            onClick={() => setIsOpen(false)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
          >
            View all
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
