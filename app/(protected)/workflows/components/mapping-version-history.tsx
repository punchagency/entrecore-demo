"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  Bot,
  UserCheck,
  MessageSquare,
  ArrowRight,
  Shield,
} from "lucide-react";
import { useMappingVersions } from "../hooks/use-integration";
import { formatDistanceToNow, format } from "date-fns";
import type { MappingVersion, MappingVersionStatus } from "../services/integration-api";

interface MappingVersionHistoryProps {
  workflowId: string;
}

function StatusBadge({ status }: { status: MappingVersionStatus }) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold gap-1 uppercase tracking-wider">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] font-bold gap-1 uppercase tracking-wider">
          <XCircle className="h-3 w-3" /> Rejected
        </Badge>
      );
    case "draft":
      return (
        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold gap-1 uppercase tracking-wider">
          <FileText className="h-3 w-3" /> Draft
        </Badge>
      );
    case "superseded":
      return (
        <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold gap-1 uppercase tracking-wider">
          <RotateCcw className="h-3 w-3" /> Superseded
        </Badge>
      );
    default:
      return null;
  }
}

function VersionCard({ version }: { version: MappingVersion }) {
  const isLatest = version.status === "draft";

  return (
    <div
      className={`relative flex items-start gap-4 group ${isLatest ? "" : ""}`}
    >
      {/* Timeline dot */}
      <div
        className={`mt-1.5 h-10 w-10 rounded-xl flex items-center justify-center border-4 border-white shadow-sm shrink-0 z-10 transition-transform group-hover:scale-110 ${
          version.status === "approved"
            ? "bg-emerald-500 text-white"
            : version.status === "rejected"
              ? "bg-red-500 text-white"
              : version.status === "draft"
                ? "bg-indigo-600 text-white"
                : "bg-slate-400 text-white"
        }`}
      >
        <span className="font-bold text-sm">v{version.version}</span>
      </div>

      {/* Content */}
      <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 group-hover:bg-white group-hover:shadow-md group-hover:border-indigo-100 transition-all mb-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-900">
              Version {version.version}
            </h4>
            <StatusBadge status={version.status} />
          </div>
          <time className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {formatDistanceToNow(new Date(version.created_at))} ago
          </time>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Layers className="h-3.5 w-3.5" />
            <span>{version.mapping_count} mappings</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-violet-600">
            <Bot className="h-3.5 w-3.5" />
            <span>{version.ai_generated_count} AI-generated</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-sky-600">
            <UserCheck className="h-3.5 w-3.5" />
            <span>{version.human_modified_count} human-modified</span>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
            <Clock className="h-3 w-3 text-slate-400" />
            <span className="text-slate-500">
              {format(new Date(version.created_at), "MMM d, yyyy HH:mm")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
            <span className="text-slate-400 font-bold uppercase tracking-tighter">
              By
            </span>
            <span className="font-bold text-indigo-600">
              {version.created_by.startsWith("agent-") ? "AI Agent" : version.created_by.substring(0, 8)}
            </span>
          </div>
        </div>

        {/* Approval info */}
        {version.approved_by && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            <div className="text-xs">
              <span className="text-emerald-800 font-semibold">
                Approved by {version.approved_by.substring(0, 8)}
              </span>
              {version.approved_at && (
                <span className="text-emerald-600 ml-1.5">
                  on{" "}
                  {format(new Date(version.approved_at), "MMM d, yyyy HH:mm")}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Rejection reason */}
        {version.rejection_reason && (
          <div className="mt-3 p-2.5 rounded-xl bg-red-50/50 border border-red-100 flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 leading-relaxed">
              <span className="font-bold">Rejection reason:</span>{" "}
              {version.rejection_reason}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MappingVersionHistory({
  workflowId,
}: MappingVersionHistoryProps) {
  const { data: versions, isLoading } = useMappingVersions(workflowId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-xl">
          <Layers className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Mapping Version History
          </h3>
          <p className="text-xs text-slate-500">
            Track mapping changes, approvals, and rejections over time
          </p>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : !versions?.length ? (
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-2xl bg-white">
          <CardContent className="p-12 text-center">
            <Layers className="h-10 w-10 text-slate-300 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-slate-700 mb-1">
              No Versions Yet
            </h4>
            <p className="text-sm text-slate-500">
              Save or approve a mapping to create the first version
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative space-y-0 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-200 before:via-slate-200 before:to-transparent">
          {versions.map((version) => (
            <VersionCard key={version.id} version={version} />
          ))}
        </div>
      )}
    </div>
  );
}
