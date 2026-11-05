"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppNotification } from "../types";
import {
  formatNotificationTime,
  getNotificationTypeMeta,
  resolveNotificationLink,
} from "../utils";

interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead?: (id: string) => void;
  onNavigate?: () => void;
  className?: string;
  compact?: boolean;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onNavigate,
  className,
  compact = false,
}: NotificationItemProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const isUnread = !notification.is_read;
  const link = resolveNotificationLink(notification.link_url);
  const typeMeta = getNotificationTypeMeta(notification.type);

  // Normalize severity
  const severity = (notification.severity || "info").toLowerCase();

  const handleRowClick = () => {
    // Mark as read if currently unread
    if (isUnread && onMarkRead) {
      onMarkRead(notification.id);
    }

    if (!link) {
      return;
    }

    if (link.kind === "internal") {
      onNavigate?.();
      startTransition(() => {
        router.push(link.href);
      });
    } else {
      window.open(link.href, "_blank", "noopener,noreferrer");
      onNavigate?.();
    }
  };

  const handleMarkReadOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkRead && isUnread) {
      onMarkRead(notification.id);
    }
  };

  // Severity indicator styling
  const severityBadge = (() => {
    switch (severity) {
      case "error":
        return {
          icon: <AlertCircle className="h-4 w-4 text-rose-600" />,
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          dot: "bg-rose-500",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
        };
      case "info":
      default:
        if (typeMeta.category === "done") {
          return {
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
            bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
            dot: "bg-emerald-500",
          };
        }
        return {
          icon: <Info className="h-4 w-4 text-blue-600" />,
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          dot: "bg-blue-500",
        };
    }
  })();

  const formattedTime = formatNotificationTime(notification.created_at);

  return (
    <div
      onClick={handleRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleRowClick();
        }
      }}
      className={cn(
        "group relative flex items-start gap-3 p-3.5 transition-all text-left outline-hidden select-none",
        link ? "cursor-pointer" : "cursor-default",
        isUnread
          ? "bg-blue-50/40 hover:bg-blue-50/70"
          : "bg-transparent hover:bg-slate-50",
        "border-b border-slate-100 last:border-b-0",
        className
      )}
    >
      {/* Left severity indicator icon */}
      <div
        className={cn(
          "flex-shrink-0 mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs transition-transform group-hover:scale-105",
          severityBadge.bg
        )}
      >
        {severityBadge.icon}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              "text-xs truncate block tracking-tight",
              isUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"
            )}
            title={notification.title}
          >
            {notification.title}
          </span>
        </div>

        {/* Optional body line (clamped to 2 lines) */}
        {notification.body && (
          <p
            className={cn(
              "text-xs text-slate-500 line-clamp-2 leading-relaxed mb-1.5",
              compact && "line-clamp-1"
            )}
          >
            {notification.body}
          </p>
        )}

        {/* Footer metadata: Resource Name, Timestamp, External link pill */}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {notification.resource_name && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/80 text-[10px] font-medium text-slate-600 max-w-[200px] truncate border border-slate-200/60"
              title={notification.resource_name}
            >
              <FileText className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="truncate">{notification.resource_name}</span>
            </span>
          )}

          {formattedTime && (
            <span className="text-[11px] text-slate-400 font-normal">
              {formattedTime}
            </span>
          )}

          {link?.kind === "external" && (
            <span className="inline-flex items-center gap-1 text-[10px] text-blue-600/80 font-medium">
              <ExternalLink className="h-2.5 w-2.5" />
              View document
            </span>
          )}
        </div>
      </div>

      {/* Right Action Affordance: Unread dot & Hover Mark-Read Button */}
      <div className="absolute right-3 top-3.5 flex items-center gap-1.5">
        {isUnread && (
          <span
            className="w-2 h-2 rounded-full bg-blue-600 shadow-xs ring-2 ring-blue-100 transition-opacity group-hover:opacity-0"
            aria-label="Unread"
          />
        )}

        {isUnread && onMarkRead && (
          <button
            type="button"
            onClick={handleMarkReadOnly}
            title="Mark as read"
            aria-label="Mark as read"
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 shadow-xs transition-all duration-150"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
