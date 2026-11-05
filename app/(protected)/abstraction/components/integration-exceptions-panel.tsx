"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  History,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  type IntegrationException,
  type IntegrationExceptionAuditEntry,
  type IntegrationExceptionSeverity,
  type IntegrationExceptionStatus,
  loadExceptionAuditLog,
  updateExceptionStatus,
} from "../services/integration-exception-store";

interface IntegrationExceptionsPanelProps {
  jobId: string;
  exceptions: IntegrationException[];
  onExceptionsChange: (exceptions: IntegrationException[]) => void;
  onDrillIntoMapping?: (mappingId: string) => void;
  actorName?: string;
}

const STATUS_LABELS: Record<IntegrationExceptionStatus, string> = {
  open: "Open",
  in_review: "In Review",
  resolved: "Resolved",
  approved_exception: "Approved Exception",
};

const SEVERITY_CLASS: Record<IntegrationExceptionSeverity, string> = {
  critical: "bg-rose-100 text-rose-800 border-rose-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

function ExceptionRow({
  exception,
  onStatusChange,
  onDrillIntoMapping,
}: {
  exception: IntegrationException;
  onStatusChange: (status: IntegrationExceptionStatus) => void;
  onDrillIntoMapping?: (mappingId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isFailed = exception.status === "open" || exception.status === "in_review";

  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        isFailed && exception.severity === "critical" && "border-rose-300 bg-rose-50/40",
        isFailed && exception.severity === "high" && "border-orange-200 bg-orange-50/30",
        isFailed && exception.severity === "medium" && "border-amber-200 bg-amber-50/20",
        !isFailed && "border-slate-200 bg-white opacity-80"
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <AlertTriangle
          className={cn(
            "h-4 w-4 mt-0.5 shrink-0",
            exception.severity === "critical" ? "text-rose-600" : "text-amber-500"
          )}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-semibold text-slate-800 truncate">
              {exception.sourceRecord}
            </span>
            <Badge variant="outline" className={cn("text-[9px] rounded-full", SEVERITY_CLASS[exception.severity])}>
              {exception.severity}
            </Badge>
            <Badge variant="outline" className="text-[9px] rounded-full bg-slate-50">
              {STATUS_LABELS[exception.status]}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 line-clamp-2">{exception.failureReason}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {exception.mappingId && onDrillIntoMapping && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[10px] rounded-lg"
              onClick={() => onDrillIntoMapping(exception.mappingId!)}
            >
              View mapping
            </Button>
          )}
          <Select value={exception.status} onValueChange={(v) => onStatusChange(v as IntegrationExceptionStatus)}>
            <SelectTrigger className="h-7 w-[130px] text-[10px] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as IntegrationExceptionStatus[]).map((status) => (
                <SelectItem key={status} value={status} className="text-xs">
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button type="button" onClick={() => setExpanded((v) => !v)} className="p-1 text-slate-400">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-dashed border-slate-200 px-4 py-3 bg-slate-50/60 text-xs space-y-2 rounded-b-xl">
          <div>
            <span className="font-semibold text-slate-500">Validation rule: </span>
            <span className="font-mono text-slate-700">{exception.validationRule}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500">Suggested remediation: </span>
            <span className="text-slate-700">{exception.suggestedRemediation}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function IntegrationExceptionsPanel({
  jobId,
  exceptions,
  onExceptionsChange,
  onDrillIntoMapping,
  actorName = "Reviewer",
}: IntegrationExceptionsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<IntegrationExceptionStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<IntegrationExceptionSeverity | "all">("all");
  const [search, setSearch] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const auditLog = useMemo(() => loadExceptionAuditLog(jobId), [jobId, exceptions]);

  const filtered = useMemo(() => {
    let rows = exceptions;
    if (statusFilter !== "all") rows = rows.filter((e) => e.status === statusFilter);
    if (severityFilter !== "all") rows = rows.filter((e) => e.severity === severityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (e) =>
          e.sourceRecord.toLowerCase().includes(q) ||
          e.failureReason.toLowerCase().includes(q) ||
          e.validationRule.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [exceptions, statusFilter, severityFilter, search]);

  const openCount = exceptions.filter((e) => e.status === "open").length;

  const handleStatusChange = (exceptionId: string, status: IntegrationExceptionStatus) => {
    const next = updateExceptionStatus(jobId, exceptionId, status, actorName);
    onExceptionsChange(next);
  };

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
      <CardHeader className="py-3 border-b border-slate-100 bg-white/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Integration Exceptions
            {openCount > 0 && (
              <Badge className="rounded-full bg-rose-100 text-rose-700 border-rose-200">{openCount} open</Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs rounded-lg"
            onClick={() => setShowAudit((v) => !v)}
          >
            <History className="h-3.5 w-3.5 mr-1" />
            Audit log
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter exceptions…"
              className="h-8 pl-8 text-xs rounded-xl"
            />
          </div>
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="h-8 w-[130px] text-xs rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_LABELS) as IntegrationExceptionStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}>
            <SelectTrigger className="h-8 w-[120px] text-xs rounded-xl">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-sm text-slate-400 rounded-xl border border-dashed border-slate-200">
            {exceptions.length === 0 ? "No exceptions detected." : "No exceptions match filters."}
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-auto">
            {filtered.map((exception) => (
              <ExceptionRow
                key={exception.id}
                exception={exception}
                onDrillIntoMapping={onDrillIntoMapping}
                onStatusChange={(status) => handleStatusChange(exception.id, status)}
              />
            ))}
          </div>
        )}

        {showAudit && (
          <AuditLog entries={auditLog} />
        )}
      </CardContent>
    </Card>
  );
}

function AuditLog({ entries }: { entries: IntegrationExceptionAuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic pt-2 border-t border-slate-100">
        No exception status changes recorded yet.
      </p>
    );
  }

  return (
    <div className="pt-3 border-t border-slate-100 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Exception audit log</p>
      <ul className="space-y-1.5 max-h-36 overflow-auto">
        {entries.map((entry) => (
          <li key={entry.id} className="text-[11px] text-slate-600 rounded-lg bg-slate-50 px-2.5 py-1.5">
            <span className="text-slate-400">{new Date(entry.timestamp).toLocaleString()}</span>
            {" · "}
            <span className="font-medium">{entry.actor}</span>
            {" changed "}
            <span className="font-mono">{entry.exceptionId.slice(0, 12)}…</span>
            {entry.previousStatus && entry.newStatus && (
              <>
                {" "}
                {entry.previousStatus} → {entry.newStatus}
              </>
            )}
            {entry.note && <span className="italic"> — {entry.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
