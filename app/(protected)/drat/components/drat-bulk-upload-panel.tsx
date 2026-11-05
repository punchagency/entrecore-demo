"use client";

import { useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CloudUpload,
  FileText,
  Loader2,
  RotateCcw,
  ScrollText,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  DRAT_BULK_MAX_FILE_MB,
  DRAT_BULK_MAX_FILES,
  formatBytes,
  getDratBulkAcceptAttribute,
} from "../services/bulk-upload-api";
import {
  useDratBulkUpload,
  type DratBulkRow,
  type DratBulkRowStatus,
} from "../hooks/use-drat-bulk-upload";
import { DratBatchStatusPanel } from "./drat-batch-status-panel";

const STATUS_LABEL: Record<DratBulkRowStatus, string> = {
  rejected: "Not added",
  ready: "Ready",
  queued: "Queued",
  uploading: "Uploading",
  uploaded: "Uploaded",
  failed: "Failed",
};

const STATUS_STYLE: Record<DratBulkRowStatus, string> = {
  rejected: "text-red-700 bg-red-50 border-red-200",
  ready: "text-slate-600 bg-slate-50 border-slate-200",
  queued: "text-slate-600 bg-slate-50 border-slate-200",
  uploading: "text-indigo-700 bg-indigo-50 border-indigo-200",
  uploaded: "text-emerald-700 bg-emerald-50 border-emerald-200",
  failed: "text-red-700 bg-red-50 border-red-200",
};

function StatusIcon({ status }: { status: DratBulkRowStatus }) {
  switch (status) {
    case "queued":
      return <Clock className="h-3.5 w-3.5" />;
    case "uploading":
      return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    case "uploaded":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "failed":
    case "rejected":
      return <AlertCircle className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function FileRow({
  row,
  canRemove,
  canRetry,
  onRemove,
  onRetry,
}: {
  row: DratBulkRow;
  canRemove: boolean;
  canRetry: boolean;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const percent =
    row.status === "uploaded" ? 100 : Math.round((row.loaded / row.file.size) * 100) || 0;
  const muted = row.status === "rejected";

  return (
    <li className={cn("px-4 py-3 space-y-2", muted && "bg-slate-50/60")}>
      <div className="flex items-center gap-3 min-w-0">
        <FileText
          className={cn("h-5 w-5 shrink-0", muted ? "text-slate-300" : "text-indigo-500")}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium truncate",
              muted ? "text-slate-400" : "text-slate-800"
            )}
            title={row.file.name}
          >
            {row.file.name}
          </p>
          <p className="text-xs text-slate-400">{formatBytes(row.file.size)}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0",
            STATUS_STYLE[row.status]
          )}
        >
          <StatusIcon status={row.status} />
          {row.status === "uploading" ? `${percent}%` : STATUS_LABEL[row.status]}
        </span>
        {canRetry && row.status === "failed" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-7 rounded-lg border-slate-200 text-xs shrink-0"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label={`Remove ${row.file.name}`}
            className="h-7 w-7 text-slate-400 hover:text-red-500 rounded-full shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {(row.status === "uploading" || row.status === "queued") && (
        <Progress
          value={percent}
          className="h-1.5 bg-slate-100"
          indicatorClassName="bg-indigo-600"
        />
      )}
      {row.error && <p className="text-xs text-red-600 pl-8">{row.error}</p>}
    </li>
  );
}

export function DratBulkUploadPanel() {
  const {
    rows,
    phase,
    batchId,
    batchError,
    summary,
    addFiles,
    removeRow,
    removeRejected,
    start,
    retry,
    retryFailed,
    finish,
    reset,
  } = useDratBulkUpload();

  const selecting = phase === "selecting";
  const busy = phase === "creating" || phase === "uploading" || phase === "completing";

  const onDrop = useCallback(
    (files: File[]) => {
      const { duplicates, overLimit } = addFiles(files);
      if (overLimit > 0) {
        toast.error(`A batch holds up to ${DRAT_BULK_MAX_FILES} files`, {
          description: `${overLimit} file${overLimit === 1 ? " was" : "s were"} not added.`,
        });
      }
      if (duplicates > 0) {
        toast.message(`${duplicates} duplicate file${duplicates === 1 ? "" : "s"} skipped`);
      }
    },
    [addFiles]
  );

  // No `accept` here on purpose: wrong-type files must reach onDrop so they
  // show up in the list with a reason instead of vanishing.
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: !selecting,
  });

  const announce = (completed: boolean) => {
    if (completed) toast.success("Batch uploaded — DRAT staging queued");
  };
  const handleStart = async () => announce(await start());
  const handleRetry = async (rowId: string) => announce(await retry([rowId]));
  const handleRetryFailed = async () => announce(await retryFailed());
  const handleFinish = async () => announce(await finish());

  const statusLine = (() => {
    switch (phase) {
      case "creating":
        return "Preparing upload links…";
      case "uploading":
        return `Uploading ${summary.uploaded} of ${summary.batchSize}${
          summary.failed ? ` · ${summary.failed} failed` : ""
        }`;
      case "attention":
        return summary.failed
          ? `${summary.uploaded} of ${summary.batchSize} uploaded · ${summary.failed} failed`
          : `${summary.uploaded} of ${summary.batchSize} uploaded`;
      case "completing":
        return "Finishing batch…";
      case "completed":
        return `${summary.uploaded} of ${summary.batchSize} uploaded`;
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <CloudUpload className="h-5 w-5 text-indigo-600" />
          Bulk upload
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Up to {DRAT_BULK_MAX_FILES} <code>.pdf</code> or <code>.docx</code> files,{" "}
          {DRAT_BULK_MAX_FILE_MB} MB each. Files go straight to cloud storage; only their names and
          sizes are sent to the API.
        </p>
      </div>

      {selecting && (
        <div
          {...getRootProps()}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer",
            rows.length ? "min-h-[110px]" : "min-h-[180px]",
            isDragActive
              ? "border-indigo-500 bg-indigo-50/50 scale-[0.99]"
              : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
          )}
        >
          <input {...getInputProps()} accept={getDratBulkAcceptAttribute()} />
          <div className="space-y-2 flex flex-col items-center">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">
              {rows.length ? "Drop more files" : "Drag & drop files to upload"}
            </p>
            <p className="text-xs text-slate-400">
              or <span className="text-indigo-600">click to browse</span> · {summary.ready}/
              {DRAT_BULK_MAX_FILES} selected
            </p>
          </div>
        </div>
      )}

      {batchError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{batchError}</p>
        </div>
      )}

      {statusLine && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : summary.failed ? (
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              )}
              {statusLine}
            </span>
            <span className="font-medium tabular-nums">{summary.percent}%</span>
          </div>
          <Progress
            value={summary.percent}
            className="h-2 bg-slate-100"
            indicatorClassName={summary.failed ? "bg-amber-500" : "bg-indigo-600"}
          />
        </div>
      )}

      {rows.length > 0 && (
        <ul className="rounded-2xl border border-slate-200 divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
          {rows.map((row) => (
            <FileRow
              key={row.id}
              row={row}
              canRemove={selecting}
              canRetry={phase === "uploading" || phase === "attention"}
              onRemove={() => removeRow(row.id)}
              onRetry={() => handleRetry(row.id)}
            />
          ))}
        </ul>
      )}

      {phase === "completed" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 space-y-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-emerald-900">
                Batch uploaded — DRAT staging queued
              </p>
              <p className="text-xs text-emerald-800/80">
                Each file is validated and gets its own workflow run. Follow progress below or in the
                filing log.
                {summary.failed > 0 &&
                  ` ${summary.failed} file${summary.failed === 1 ? " was" : "s were"} not uploaded and won't be processed.`}
              </p>
              <p className="text-xs text-emerald-800/70 break-all font-mono">batch {batchId}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
              <Link href="/drat/logs">
                <ScrollText className="h-4 w-4 mr-2" />
                Open filing log
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              className="rounded-xl border-slate-200"
            >
              Upload another batch
            </Button>
          </div>
        </div>
      )}

      {/* Pipeline status panel — shown whenever a batch ID is available */}
      {batchId && phase === "completed" && (
        <div className="pt-2 border-t border-slate-100">
          <DratBatchStatusPanel batchId={batchId} />
        </div>
      )}

      {selecting && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={summary.ready === 0}
            onClick={handleStart}
            className="flex-1 min-w-[200px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11"
          >
            <Upload className="h-4 w-4 mr-2" />
            {summary.ready > 0
              ? `Upload ${summary.ready} file${summary.ready === 1 ? "" : "s"}`
              : "Upload files"}
          </Button>
          {summary.rejected > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={removeRejected}
              className="rounded-xl border-slate-200 h-11"
            >
              Remove {summary.rejected} not added
            </Button>
          )}
          {rows.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              className="rounded-xl h-11 text-slate-500"
            >
              Clear all
            </Button>
          )}
        </div>
      )}

      {busy && (
        <Button type="button" disabled className="w-full rounded-xl h-11 bg-indigo-600 text-white">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {phase === "creating"
            ? "Preparing…"
            : phase === "completing"
              ? "Finishing…"
              : "Uploading…"}
        </Button>
      )}

      {phase === "attention" && (
        <div className="space-y-3">
          {summary.failed > 0 ? (
            <>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={handleRetryFailed}
                  className="flex-1 min-w-[200px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry {summary.failed} failed
                </Button>
                {summary.uploaded > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFinish}
                    className="rounded-xl border-slate-200 h-11"
                  >
                    Finish with {summary.uploaded} uploaded
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Retrying only re-sends the failed files. The batch is processed once every file is
                in, or when you finish without the failed ones.
              </p>
            </>
          ) : (
            <Button
              type="button"
              onClick={handleFinish}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Finish batch
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
