"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BATCH_ITEM_STATUS_LABEL,
  isDratItemBad,
  isDratItemRetryable,
  isDratItemTerminal,
  type DratBatchItem,
  type DratBatchItemStatus,
  type DratBatchStatusResponse,
} from "../services/batch-status-api";
import {
  useDratBatchStatus,
  useRetryDratBatchFailed,
  useRetryDratBatchItem,
} from "../hooks/use-drat-batch-status";
import { QueryErrorState } from "@/components/query-error-state";
import { showApiErrorToast } from "@/utils/api-error";

// ─── Status badge configs ─────────────────────────────────────────────────────

const ITEM_STATUS_ICON: Record<DratBatchItemStatus, React.ReactNode> = {
  pending_upload: <Clock className="h-3 w-3" />,
  uploaded: <CheckCircle2 className="h-3 w-3" />,
  validating: <Loader2 className="h-3 w-3 animate-spin" />,
  queued: <Clock className="h-3 w-3" />,
  processing: <Loader2 className="h-3 w-3 animate-spin" />,
  done: <Sparkles className="h-3 w-3" />,
  duplicate: <Copy className="h-3 w-3" />,
  rejected: <ShieldAlert className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
};

const ITEM_STATUS_STYLE: Record<DratBatchItemStatus, string> = {
  pending_upload: "text-slate-500 bg-slate-50 border-slate-200",
  uploaded: "text-blue-600 bg-blue-50 border-blue-200",
  validating: "text-indigo-600 bg-indigo-50 border-indigo-200",
  queued: "text-slate-500 bg-slate-50 border-slate-200",
  processing: "text-indigo-700 bg-indigo-50 border-indigo-200",
  done: "text-emerald-700 bg-emerald-50 border-emerald-200",
  duplicate: "text-amber-700 bg-amber-50 border-amber-200",
  rejected: "text-orange-700 bg-orange-50 border-orange-200",
  failed: "text-red-700 bg-red-50 border-red-200",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ItemStatusBadge({ status }: { status: DratBatchItemStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0",
        ITEM_STATUS_STYLE[status]
      )}
    >
      {ITEM_STATUS_ICON[status]}
      {BATCH_ITEM_STATUS_LABEL[status]}
    </span>
  );
}

function BatchItemRow({
  item,
  onRetry,
  isRetrying,
}: {
  item: DratBatchItem;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  const bad = isDratItemBad(item.status);
  const terminal = isDratItemTerminal(item.status);
  const workflowHref = item.workflow_run_id
    ? `/workflows/runs/${item.workflow_run_id}`
    : null;

  return (
    <li
      className={cn(
        "flex flex-col gap-1.5 px-4 py-3",
        bad && "bg-red-50/40",
        item.status === "duplicate" && "bg-amber-50/40",
        item.status === "rejected" && "bg-orange-50/40"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText
          className={cn(
            "h-4 w-4 shrink-0",
            bad ? "text-red-400" : "text-indigo-400",
            item.status === "duplicate" && "text-amber-400",
            item.status === "rejected" && "text-orange-400",
            item.status === "done" && "text-emerald-500"
          )}
        />
        <p
          className={cn(
            "text-sm font-medium truncate flex-1 min-w-0",
            !terminal ? "text-slate-700" : bad ? "text-slate-600" : "text-slate-800"
          )}
          title={item.filename}
        >
          {item.filename}
        </p>
        <ItemStatusBadge status={item.status} />
        {item.status === "failed" && onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-6 px-2 text-[11px] rounded-lg border-red-200 text-red-700 hover:bg-red-50 shrink-0"
          >
            {isRetrying ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RotateCcw className="h-3 w-3 mr-1" />
            )}
            Retry
          </Button>
        )}
        {workflowHref && (
          <Link
            href={workflowHref}
            className="text-indigo-500 hover:text-indigo-700 transition-colors shrink-0"
            title="Open workflow run"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {item.reason && (
        <p
          className={cn(
            "text-xs pl-7",
            item.status === "failed" && "text-red-600",
            item.status === "duplicate" && "text-amber-700",
            item.status === "rejected" && "text-orange-700"
          )}
        >
          {item.reason}
        </p>
      )}
    </li>
  );
}

function SummaryStrip({ data }: { data: DratBatchStatusResponse }) {
  console.log({data})
  const s = data?.summary;
  return (
    <div className="flex flex-wrap gap-3">
      <Stat label="Total" value={s?.total} />
      <Stat label="Done" value={s?.succeeded} accent="emerald" />
      {s?.pending > 0 && <Stat label="In progress" value={s?.pending} accent="indigo" />}
      {s?.duplicate > 0 && <Stat label="Duplicate" value={s?.duplicate} accent="amber" />}
      {s?.failed > 0 && <Stat label="Failed" value={s?.failed} accent="red" />}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "indigo" | "amber" | "red";
}) {
  const colors = {
    emerald: "text-emerald-700 bg-emerald-50 ring-emerald-100",
    indigo: "text-indigo-700 bg-indigo-50 ring-indigo-100",
    amber: "text-amber-700 bg-amber-50 ring-amber-100",
    red: "text-red-700 bg-red-50 ring-red-100",
  };
  const cls = accent ? colors[accent] : "text-slate-700 bg-slate-50 ring-slate-100";
  return (
    <div className={cn("flex flex-col items-center px-4 py-2 rounded-xl ring-1", cls)}>
      <span className="text-xl font-bold tabular-nums leading-none">{value}</span>
      <span className="text-[10px] font-medium mt-0.5 uppercase tracking-wide opacity-70">
        {label}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-20 rounded-xl" />
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export interface DratBatchStatusPanelProps {
  batchId: string;
  /** Compact mode collapses the item list behind a scrollable container. */
  compact?: boolean;
}

export function DratBatchStatusPanel({
  batchId,
  compact = true,
}: DratBatchStatusPanelProps) {
  const { data, isLoading, isError, error, isFetching, refetch } = useDratBatchStatus(batchId);

  const retryAllMutation = useRetryDratBatchFailed(batchId);
  const retryItemMutation = useRetryDratBatchItem(batchId);

  const failedItems = data?.items.filter((item) => isDratItemRetryable(item.status)) ?? [];

  const handleRetryFailed = async () => {
    if (failedItems.length === 0) return;
    try {
      const results = await retryAllMutation.mutateAsync(
        failedItems.map((item) => item.item_id)
      );
      toast.success(
        `Re-enqueued ${results.length} failed file${results.length === 1 ? "" : "s"}`
      );
    } catch (error) {
      showApiErrorToast(error, "Couldn't retry the failed items");
    }
  };

  const handleRetrySingle = async (itemId: string, filename: string) => {
    try {
      await retryItemMutation.mutateAsync(itemId);
      toast.success(`Re-enqueued "${filename}" for processing`);
    } catch (error) {
      showApiErrorToast(error, `Couldn't retry "${filename}"`);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !data) {
    return (
      <QueryErrorState
        variant="inline"
        error={error}
        title="Couldn't load batch status"
        fallbackMessage="It will refresh automatically."
        onRetry={() => refetch()}
        isRetrying={isFetching}
      />
    );
  }

  const hasFailed = failedItems.length > 0;
  const isActive = data.items.some((item) => !isDratItemTerminal(item.status));
  const batchDone = data.status === "complete" || data.status === "failed";

  // Sort: bad items first, then in-progress, then done
  const sortedItems = [...data.items].sort((a, b) => {
    const badA = isDratItemBad(a.status) ? 0 : isDratItemTerminal(a.status) ? 2 : 1;
    const badB = isDratItemBad(b.status) ? 0 : isDratItemTerminal(b.status) ? 2 : 1;
    return badA - badB;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Pipeline status</h3>
          {isActive && (
            <span className="flex items-center gap-1 text-[11px] text-indigo-600 font-medium">
              <Loader2 className="h-3 w-3 animate-spin" />
              Live
            </span>
          )}
          {isFetching && !isActive && (
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          )}
          {batchDone && !hasFailed && (
            <Badge
              variant="outline"
              className="text-emerald-700 border-emerald-200 bg-emerald-50 text-[10px]"
            >
              Complete
            </Badge>
          )}
          {batchDone && hasFailed && (
            <Badge
              variant="outline"
              className="text-red-700 border-red-200 bg-red-50 text-[10px]"
            >
              Has failures
            </Badge>
          )}
        </div>

        <p className="text-[11px] font-mono text-slate-400 truncate max-w-[140px]" title={batchId}>
          {batchId.slice(0, 8)}…
        </p>
      </div>

      {/* Summary strip */}
      <SummaryStrip data={data} />

      {/* Warnings */}
      {hasFailed && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">
              {failedItems.length} file{failedItems.length === 1 ? "" : "s"} failed
              processing
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Retry to re-enqueue only the failed items. Successful files are not re-processed.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleRetryFailed}
            disabled={retryAllMutation.isPending}
            className="bg-red-600 hover:bg-red-500 text-white rounded-lg h-8 text-xs shrink-0"
          >
            {retryAllMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RotateCcw className="h-3 w-3 mr-1" />
            )}
            Retry failed
          </Button>
        </div>
      )}

      {/* Per-item list */}
      <ul
        className={cn(
          "rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-y-auto",
          compact ? "max-h-[400px]" : "max-h-none"
        )}
      >
        {sortedItems.map((item) => (
          <BatchItemRow
            key={item.item_id}
            item={item}
            onRetry={() => handleRetrySingle(item.item_id, item.filename)}
            isRetrying={
              retryItemMutation.isPending &&
              retryItemMutation.variables === item.item_id
            }
          />
        ))}
      </ul>
    </div>
  );
}
