"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { parseApiUtcDate } from "@/lib/datetime";
import {
  ScrollText,
  Search,
  RefreshCw,
  ExternalLink,
  RotateCcw,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Eye,
  Download,
  Copy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DratSectionNav } from "../components/drat-section-nav";
import { DratFailedRunsCard } from "../components/drat-failed-runs-card";
import {
  useRuleLogRun,
  useRuleLogRuns,
  useRuleLogStats,
  useRerunFailedDratRun,
} from "../hooks/use-drat-log";
import {
  DratLogListParams,
  DratLogOutcome,
  DratRuleLogEntry,
  DratRuleLogRunDetail,
  DratRuleLogRunSummary,
  driveFileViewLink,
  fetchRunFiledFile,
  readApiErrorFromBlob,
  OUTCOME_LABELS,
  STEP_LABELS,
} from "../services/log-api";
import { PageWrapper } from "@/components/page-wrapper";
import { toast } from "sonner";
import { jobFailureMessage, showApiErrorToast } from "@/utils/api-error";
import { JobFailureReason } from "@/components/job-failure-reason";
import { QueryErrorState } from "@/components/query-error-state";

const PAGE_SIZE = 50;

const defaultFilters = {
  entity_name: "",
  rule_name: "",
  outcome: "" as DratLogOutcome | "",
  step: "",
  doc_id: "",
  date_from: "",
  date_to: "",
};

function outcomeBadgeClass(outcome: DratLogOutcome): string {
  switch (outcome) {
    case "success":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "skipped":
      return "bg-slate-50 text-slate-600 border-slate-200";
    case "error":
      return "bg-red-50 text-red-700 border-red-200";
    case "manual":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "";
  }
}

function dotColor(outcome: DratLogOutcome): string {
  switch (outcome) {
    case "success":
      return "bg-emerald-500";
    case "skipped":
      return "bg-slate-400";
    case "error":
      return "bg-red-500";
    case "manual":
      return "bg-amber-500";
    default:
      return "bg-slate-300";
  }
}

function stepLabel(step: string): string {
  return STEP_LABELS[step] ?? step.replace(/_/g, " ");
}

function failedStepOf(run: DratRuleLogRunSummary) {
  return run.step_summary.find((step) => step.outcome === "error");
}

// Step messages can carry raw exception text from older filings; never show internals.
function stepMessage(step: DratRuleLogEntry): string {
  return jobFailureMessage(step, step.outcome === "error" ? "This step failed." : "");
}

/** The readable reason a filing failed: the last failed step's message. */
function filingFailureReason(run: DratRuleLogRunDetail): string {
  const failed = [...run.steps].reverse().find((step) => step.outcome === "error");
  return jobFailureMessage(failed, "This filing failed. Share the run ID with support to find the full error.");
}

function displayRunFilename(run: DratRuleLogRunSummary): string {
  return run.filename || run.doc_id || run.run_key;
}

/** Latest successfully-filed Drive step for a run, if the run was filed at all. */
function filedDriveStep(run: DratRuleLogRunDetail): DratRuleLogEntry | undefined {
  return run.steps
    .slice()
    .reverse()
    .find(
      (s) => s.step === "drive_file" && (s.outcome === "success" || s.outcome === "skipped")
    );
}

function filedDriveFileName(
  step: DratRuleLogEntry | undefined,
  run: DratRuleLogRunDetail
): string {
  return step?.new_filename || step?.old_filename || run.filename || "document";
}

/** Trigger a browser download of a Blob, revoking the object URL after a delay. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the download a moment to claim the URL before revoking.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function DratFilingLogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [skip, setSkip] = useState(0);
  const [selectedRunKey, setSelectedRunKey] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fileAction, setFileAction] = useState<"view" | "download" | null>(null);
  const [downloadingRunKey, setDownloadingRunKey] = useState<string | null>(null);

  useEffect(() => {
    const run = searchParams.get("run");
    if (run) setSelectedRunKey(run);
  }, [searchParams]);

  const closeRunPanel = () => {
    setSelectedRunKey(null);
    if (searchParams.get("run")) {
      router.replace("/drat/logs");
    }
  };

  const queryParams = useMemo<DratLogListParams>(() => {
    const params: DratLogListParams = {
      skip,
      limit: PAGE_SIZE,
    };
    if (appliedFilters.entity_name.trim()) params.entity_name = appliedFilters.entity_name.trim();
    if (appliedFilters.rule_name.trim()) params.rule_name = appliedFilters.rule_name.trim();
    if (appliedFilters.outcome) params.outcome = appliedFilters.outcome;
    if (appliedFilters.step.trim()) params.step = appliedFilters.step.trim();
    if (appliedFilters.doc_id.trim()) params.doc_id = appliedFilters.doc_id.trim();
    if (appliedFilters.date_from) params.date_from = `${appliedFilters.date_from}T00:00:00`;
    if (appliedFilters.date_to) params.date_to = `${appliedFilters.date_to}T23:59:59`;
    return params;
  }, [appliedFilters, skip]);

  const { data, isLoading, isError, error, refetch, isFetching } = useRuleLogRuns(queryParams);
  const { data: selectedRun } = useRuleLogRun(selectedRunKey);
  const rerun = useRerunFailedDratRun();

  const statsParams = useMemo(() => {
    const p: Pick<
      DratLogListParams,
      "date_from" | "date_to" | "rule_name" | "entity_name" | "workflow_run_id" | "doc_id" | "step"
    > = {};
    if (appliedFilters.entity_name.trim()) p.entity_name = appliedFilters.entity_name.trim();
    if (appliedFilters.rule_name.trim()) p.rule_name = appliedFilters.rule_name.trim();
    if (appliedFilters.step.trim()) p.step = appliedFilters.step.trim();
    if (appliedFilters.doc_id.trim()) p.doc_id = appliedFilters.doc_id.trim();
    if (appliedFilters.date_from) p.date_from = `${appliedFilters.date_from}T00:00:00`;
    if (appliedFilters.date_to) p.date_to = `${appliedFilters.date_to}T23:59:59`;
    return p;
  }, [appliedFilters]);
  const { data: stats } = useRuleLogStats(statsParams);

  const activeFilterCount = useMemo(
    () =>
      [
        appliedFilters.entity_name,
        appliedFilters.rule_name,
        appliedFilters.outcome,
        appliedFilters.step,
        appliedFilters.doc_id,
        appliedFilters.date_from,
        appliedFilters.date_to,
      ].filter(Boolean).length,
    [appliedFilters]
  );

  const setOutcomeFilter = (outcome: DratLogOutcome | "") => {
    setDraftFilters((prev) => ({ ...prev, outcome }));
    setAppliedFilters((prev) => ({ ...prev, outcome }));
    setSkip(0);
  };

  const handleRerun = (runId: string | null | undefined, filename: string) => {
    if (!runId) {
      toast.error("This run has no workflow run id to re-queue.");
      return;
    }
    rerun.mutate(runId, {
      onSuccess: () => {
        toast.success(`Re-queued "${filename}"`);
        refetch();
      },
      onError: (error) =>
        showApiErrorToast(error, "Failed to re-queue run"),
    });
  };

  const filedStep = selectedRun ? filedDriveStep(selectedRun) : undefined;

  const handleFileAction = async (disposition: "inline" | "attachment") => {
    if (!selectedRun) return;

    if (disposition === "inline") {
      // Open the tab synchronously in the click handler, otherwise the popup
      // blocker rejects a window.open() issued after the awaited fetch.
      const viewTab = window.open("", "_blank");
      if (!viewTab) {
        toast.error("Allow pop-ups to view the file, or use Download.");
        return;
      }
      setFileAction("view");
      try {
        const blob = await fetchRunFiledFile(selectedRun.run_key, disposition);
        const url = URL.createObjectURL(blob);
        viewTab.opener = null;
        viewTab.location.href = url;
        // Give the new tab a moment to claim the URL before revoking.
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (error) {
        viewTab.close();
        showApiErrorToast(
          error,
          "Couldn't fetch the filed document",
          { message: (await readApiErrorFromBlob(error)) ?? undefined },
        );
      } finally {
        setFileAction(null);
      }
      return;
    }

    setFileAction("download");
    try {
      const blob = await fetchRunFiledFile(selectedRun.run_key, disposition);
      downloadBlob(blob, filedDriveFileName(filedStep, selectedRun));
    } catch (error) {
      showApiErrorToast(
        error,
        "Couldn't fetch the filed document",
        { message: (await readApiErrorFromBlob(error)) ?? undefined },
      );
    } finally {
      setFileAction(null);
    }
  };

  const handleRowDownload = async (run: DratRuleLogRunSummary) => {
    setDownloadingRunKey(run.run_key);
    try {
      const blob = await fetchRunFiledFile(run.run_key, "attachment");
      downloadBlob(blob, run.filename || "document");
    } catch (error) {
      showApiErrorToast(
        error,
        "Couldn't fetch the filed document",
        { message: (await readApiErrorFromBlob(error)) ?? undefined },
      );
    } finally {
      setDownloadingRunKey(null);
    }
  };

  const handleCopyDriveLink = async (driveFileId: string) => {
    try {
      await navigator.clipboard.writeText(driveFileViewLink(driveFileId));
      toast.success("Drive link copied");
    } catch (error) {
      showApiErrorToast(error, "Failed to copy the Drive link");
    }
  };

  const runs = data?.items ?? [];
  const total = data?.total ?? 0;
  const canPrev = skip > 0;
  const canNext = skip + PAGE_SIZE < total;

  const applyFilters = () => {
    setSkip(0);
    setAppliedFilters(draftFilters);
  };

  const resetFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setSkip(0);
  };

  return (
    <PageWrapper title="Logs">
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="w-full p-6 space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                <ScrollText className="h-6 w-6 text-indigo-300" />
              </div>
              <Badge
                variant="outline"
                className="border-indigo-400 text-indigo-300 font-medium tracking-wide bg-indigo-950/30"
              >
                DRAT Admin
              </Badge>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              Filing log
            </h1>
            <p className="text-indigo-100/80 leading-relaxed max-w-xl">
              One row per filing run. Open a run to see the full classify → route → drive timeline.
            </p>
          </div>
        </div>

        <DratSectionNav active="logs" />

        <DratFailedRunsCard />

        <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5 border-b border-slate-100 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {stats && (
                    <>
                      <span className="text-xs font-semibold text-slate-600 mr-1">
                        {stats.total} runs
                      </span>
                      {(
                        [
                          ["success", stats.success, "bg-emerald-50 text-emerald-700 border-emerald-200"],
                          ["manual", stats.manual, "bg-amber-50 text-amber-700 border-amber-200"],
                          ["error", stats.error, "bg-red-50 text-red-700 border-red-200"],
                          ["skipped", stats.skipped, "bg-slate-50 text-slate-600 border-slate-200"],
                        ] as const
                      ).map(([outcome, count, cls]) => (
                        <button
                          key={outcome}
                          type="button"
                          onClick={() =>
                            setOutcomeFilter(appliedFilters.outcome === outcome ? "" : outcome)
                          }
                          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                            appliedFilters.outcome === outcome
                              ? "ring-1 ring-indigo-400"
                              : "hover:bg-slate-50"
                          } ${cls}`}
                        >
                          {OUTCOME_LABELS[outcome]} · {count}
                        </button>
                      ))}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-500 font-semibold">
                    {isLoading ? "Loading..." : `${total} shown`}
                  </p>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl border-slate-200"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-slate-200"
                    onClick={() => setFiltersOpen((v) => !v)}
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-1.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 ml-1 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                </div>
              </div>

              {filtersOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FilterField label="Entity">
                  <Input
                    placeholder="Curv Labs Inc."
                    value={draftFilters.entity_name}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, entity_name: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                    className="rounded-xl border-slate-200 bg-slate-50/50"
                  />
                </FilterField>
                <FilterField label="Rule">
                  <Input
                    placeholder="NDA → Legal"
                    value={draftFilters.rule_name}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, rule_name: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                    className="rounded-xl border-slate-200 bg-slate-50/50"
                  />
                </FilterField>
                <FilterField label="Outcome">
                  <Select
                    value={draftFilters.outcome || "all"}
                    onValueChange={(value) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        outcome: value === "all" ? "" : (value as DratLogOutcome),
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50">
                      <SelectValue placeholder="All outcomes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All outcomes</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="skipped">Skipped</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="manual">Manual review</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Step">
                  <Select
                    value={draftFilters.step || "all"}
                    onValueChange={(value) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        step: value === "all" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50">
                      <SelectValue placeholder="All steps" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All steps</SelectItem>
                      <SelectItem value="classify">Classify</SelectItem>
                      <SelectItem value="route">Route</SelectItem>
                      <SelectItem value="drive_file">Drive filing</SelectItem>
                      <SelectItem value="hitl">Human review</SelectItem>
                      <SelectItem value="intake">Intake</SelectItem>
                      <SelectItem value="validation">Rule validation</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Doc ID">
                  <Input
                    placeholder="DOC-12345"
                    value={draftFilters.doc_id}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, doc_id: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                    className="rounded-xl border-slate-200 bg-slate-50/50"
                  />
                </FilterField>
                <FilterField label="From">
                  <Input
                    type="date"
                    value={draftFilters.date_from}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, date_from: e.target.value }))
                    }
                    className="rounded-xl border-slate-200 bg-slate-50/50"
                  />
                </FilterField>
                <FilterField label="To">
                  <Input
                    type="date"
                    value={draftFilters.date_to}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, date_to: e.target.value }))
                    }
                    className="rounded-xl border-slate-200 bg-slate-50/50"
                  />
                </FilterField>
              </div>
              )}

              {filtersOpen && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500"
                    onClick={applyFilters}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Apply filters
                  </Button>
                  <Button variant="outline" className="rounded-xl border-slate-200" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>
              )}
              <p className="text-xs text-slate-400 leading-relaxed">
                Step-level detail is stored in the audit log and shown in the run timeline drawer.
              </p>
            </div>

            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : isError ? (
              <QueryErrorState
                error={error}
                title="Couldn't load the filing log"
                onRetry={() => refetch()}
                isRetrying={isFetching}
              />
            ) : runs.length === 0 ? (
              <div className="py-20 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No filing runs yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                  Run a DRAT workflow (upload → classify → route → Drive file) to populate the audit log.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="pl-6 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Last activity
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Filename
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Entity
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Steps
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Final outcome
                        </TableHead>
                        <TableHead className="pr-6 text-xs font-bold uppercase tracking-wider text-slate-500">
                          File
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.map((run) => {
                        const driveFileId = run.drive_file_id;
                        return (
                          <TableRow
                            key={run.run_key}
                            className="cursor-pointer hover:bg-slate-50/50"
                            onClick={() => setSelectedRunKey(run.run_key)}
                          >
                            <TableCell className="pl-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                              {formatDistanceToNow(parseApiUtcDate(run.last_event_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell className="py-4 max-w-[240px]">
                              <p className="truncate font-semibold text-slate-800">
                                {displayRunFilename(run)}
                              </p>
                              {run.doc_id && (
                                <p className="text-[10px] text-slate-400 font-mono truncate">
                                  {run.doc_id}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="py-4 max-w-[140px] truncate text-sm text-slate-700">
                              {run.entity_name || "—"}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 max-w-[260px]">
                                {run.step_summary.map((step, i) => (
                                  <span key={`${run.run_key}-${step.step}`} className="flex items-center">
                                    {i > 0 && <span className="text-slate-300 text-xs mx-0.5">→</span>}
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${outcomeBadgeClass(step.outcome)}`}
                                    >
                                      <span className={`h-1.5 w-1.5 rounded-full ${dotColor(step.outcome)}`} />
                                      {stepLabel(step.step)}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${outcomeBadgeClass(run.final_outcome)}`}
                              >
                                {OUTCOME_LABELS[run.final_outcome]}
                              </Badge>
                              {run.final_outcome === "error" && failedStepOf(run) && (
                                <p className="mt-1 text-[10px] text-rose-700 whitespace-nowrap">
                                  failed at {stepLabel(failedStepOf(run)!.step)}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="pr-6 py-4" onClick={(e) => e.stopPropagation()}>
                              {driveFileId ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-indigo-600"
                                    disabled={downloadingRunKey === run.run_key}
                                    aria-label="Download filed document"
                                    title="Download"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRowDownload(run);
                                    }}
                                  >
                                    {downloadingRunKey === run.run_key ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-indigo-600"
                                    aria-label="Copy Google Drive link"
                                    title="Copy Drive link"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyDriveLink(driveFileId);
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between p-5 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-slate-200"
                      disabled={!canPrev}
                      onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-slate-200"
                      disabled={!canNext}
                      onClick={() => setSkip((s) => s + PAGE_SIZE)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selectedRunKey} onOpenChange={(open) => !open && closeRunPanel()}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          {selectedRun ? (
            <>
              <SheetHeader className="space-y-3 border-b border-slate-100 bg-slate-50/80 px-6 py-5 text-left">
                <div className="flex flex-wrap gap-2 pr-8">
                  <Badge variant="outline" className={outcomeBadgeClass(selectedRun.final_outcome)}>
                    {OUTCOME_LABELS[selectedRun.final_outcome]}
                  </Badge>
                  <Badge variant="outline" className="bg-white">
                    {selectedRun.step_count} steps
                  </Badge>
                </div>
                <SheetTitle className="text-left text-base font-bold leading-snug text-slate-900">
                  {displayRunFilename(selectedRun)}
                </SheetTitle>
                <SheetDescription className="text-left text-xs text-slate-500">
                  {selectedRun.doc_id && (
                    <span className="font-mono block">{selectedRun.doc_id}</span>
                  )}
                  {format(parseApiUtcDate(selectedRun.started_at), "PPpp")} →{" "}
                  {format(parseApiUtcDate(selectedRun.last_event_at), "PPpp")}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5 text-sm space-y-4">
                {selectedRun.final_outcome === "error" && (
                  <JobFailureReason
                    title="Why this filing failed"
                    reason={filingFailureReason(selectedRun)}
                    runId={selectedRun.workflow_run_id || selectedRun.run_key}
                  />
                )}
                <RunTimeline steps={selectedRun.steps} />
              </div>

              <SheetFooter className="mt-0 flex-col gap-2 border-t border-slate-100 bg-white px-6 py-4 sm:flex-col sm:space-x-0">
                {filedStep && (
                  <div className="flex w-full gap-2">
                    <Button
                      className="flex-1 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                      variant="outline"
                      disabled={fileAction !== null}
                      onClick={() => handleFileAction("inline")}
                    >
                      {fileAction === "view" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      View file
                    </Button>
                    <Button
                      className="flex-1 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                      variant="outline"
                      disabled={fileAction !== null}
                      onClick={() => handleFileAction("attachment")}
                    >
                      {fileAction === "download" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download
                    </Button>
                  </div>
                )}
                <Button
                  className="w-full justify-start rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                  variant="outline"
                  disabled={rerun.isPending}
                  onClick={() =>
                    handleRerun(
                      selectedRun.workflow_run_id,
                      displayRunFilename(selectedRun)
                    )
                  }
                >
                  {rerun.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Re-queue
                </Button>
                {selectedRun.steps.some(
                  (s) => s.outcome === "manual" || s.step === "hitl"
                ) && (
                  <Button
                    className="w-full justify-start rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                    onClick={() => router.push("/drat/review")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open review queue
                  </Button>
                )}
              </SheetFooter>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 py-12 text-sm text-slate-500">
              Loading run…
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
    </PageWrapper>
  );
}

function RunTimeline({ steps }: { steps: DratRuleLogEntry[] }) {
  return (
    <ol className="relative space-y-0 border-l border-slate-200 ml-2">
      {steps.map((step) => (
        <li key={step.id} className="relative pl-6 pb-6 last:pb-0">
          <span
            className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
              step.outcome === "error"
                ? "bg-red-500"
                : step.outcome === "manual"
                  ? "bg-amber-500"
                  : step.outcome === "skipped"
                    ? "bg-slate-400"
                    : "bg-emerald-500"
            }`}
          />
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-slate-900">{stepLabel(step.step)}</span>
              <Badge variant="outline" className={`text-[10px] ${outcomeBadgeClass(step.outcome)}`}>
                {OUTCOME_LABELS[step.outcome]}
              </Badge>
              <span className="text-[10px] text-slate-400 ml-auto">
                {format(parseApiUtcDate(step.event_at), "PPp")}
              </span>
            </div>

            {stepMessage(step) && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
                {stepMessage(step)}
              </p>
            )}

            <div className="space-y-1">
              {(step.new_filename || step.old_filename) && (
                <p className="text-xs text-slate-600 break-all">
                  {step.old_filename && step.new_filename && step.old_filename !== step.new_filename
                    ? `${step.old_filename} → ${step.new_filename}`
                    : step.new_filename || step.old_filename}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {step.rule_name && (
                  <p className="text-xs text-slate-500">Rule: {step.rule_name}</p>
                )}
                {step.rule_match && (
                  <p className="text-xs text-slate-500">Matched: {step.rule_match}</p>
                )}
              </div>
            </div>

            {step.actions && step.actions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {step.actions.map((action) => (
                  <Badge key={action} variant="secondary" className="text-[10px] rounded-md">
                    {action.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      {children}
    </div>
  );
}
