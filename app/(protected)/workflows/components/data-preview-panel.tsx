"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  TableIcon,
  ArrowLeftRight,
  BarChart3,
  AlertCircle,
  RefreshCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useIntegrationStore } from "@/app/store/integrationStore";
import { useRunPreviewSample } from "../hooks/use-integration";
import type { PreviewRow, TransformedPreviewResponse } from "../services/integration-api";

interface DataPreviewPanelProps {
  workflowId: string;
}

function DataTable({
  rows,
  highlightNulls = false,
}: {
  rows: PreviewRow[];
  highlightNulls?: boolean;
}) {
  if (!rows.length) {
    return (
      <div className="p-8 text-center text-slate-500">
        <TableIcon className="h-8 w-8 text-slate-300 mx-auto mb-3" />
        <p>No data to display</p>
      </div>
    );
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="overflow-auto max-h-[420px] rounded-xl border border-slate-200">
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
            <TableHead className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/95">
              #
            </TableHead>
            {columns.map((col) => (
              <TableHead
                key={col}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/95 whitespace-nowrap px-3"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIdx) => (
            <TableRow
              key={rowIdx}
              className="hover:bg-indigo-50/30 transition-colors"
            >
              <TableCell className="text-center text-[10px] text-slate-400 font-mono">
                {rowIdx + 1}
              </TableCell>
              {columns.map((col) => {
                const val = row[col];
                const isNull = val === null || val === undefined;
                return (
                  <TableCell
                    key={col}
                    className={`text-xs font-mono whitespace-nowrap px-3 ${
                      isNull && highlightNulls
                        ? "bg-amber-50/50 text-amber-500 italic"
                        : "text-slate-700"
                    }`}
                  >
                    {isNull ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-bold uppercase tracking-wider">
                        null
                      </span>
                    ) : typeof val === "boolean" ? (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          val
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {String(val)}
                      </span>
                    ) : (
                      <span className="truncate max-w-[200px] block">
                        {String(val)}
                      </span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatsPanel({ label, stats }: { label: string; stats: Record<string, number> | undefined }) {
  if (!stats || Object.keys(stats).length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
      {Object.entries(stats).map(([col, val]) => (
        <div
          key={col}
          className="p-3 rounded-xl bg-slate-50 border border-slate-100"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            {col}
          </div>
          <div className="text-sm font-bold text-slate-800">
            {typeof val === "number" && val % 1 !== 0
              ? `${val.toFixed(1)}%`
              : val.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">{label}</div>
        </div>
      ))}
    </div>
  );
}

export function DataPreviewPanel({ workflowId }: DataPreviewPanelProps) {
  const {
    sourcePreviewData,
    transformedPreviewData,
    mappings,
    isPreviewStale,
    setTransformedPreview,
  } = useIntegrationStore();

  const [previewTab, setPreviewTab] = useState("source");
  const [previewResult, setPreviewResult] =
    useState<TransformedPreviewResponse | null>(null);

  const previewMutation = useRunPreviewSample();

  const handleRunPreview = () => {
    previewMutation.mutate(
      { workflowId, mappings },
      {
        onSuccess: (data) => {
          setPreviewResult(data);
          setTransformedPreview(data.rows);
          setPreviewTab("transformed");
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <TableIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Data Preview</h3>
            <p className="text-xs text-slate-500">
              Inspect source data and preview transformed output
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isPreviewStale && transformedPreviewData.length > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1">
              <AlertCircle className="h-3 w-3" /> Preview outdated
            </Badge>
          )}
          <Button
            onClick={handleRunPreview}
            disabled={previewMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-200 h-10 px-5"
          >
            {previewMutation.isPending ? (
              <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2 fill-current" />
            )}
            Run Preview
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={previewTab}
        onValueChange={setPreviewTab}
        className="space-y-4"
      >
        <TabsList className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm h-11">
          <TabsTrigger
            value="source"
            className="rounded-lg px-4 h-9 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 transition-all text-sm font-semibold"
          >
            <TableIcon className="h-3.5 w-3.5 mr-1.5" /> Source Data
          </TabsTrigger>
          <TabsTrigger
            value="transformed"
            className="rounded-lg px-4 h-9 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 transition-all text-sm font-semibold"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Transformed
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="rounded-lg px-4 h-9 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 transition-all text-sm font-semibold"
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="source" className="outline-none mt-0">
          <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-0">
              <DataTable rows={sourcePreviewData} highlightNulls />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transformed" className="outline-none mt-0">
          {previewMutation.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : transformedPreviewData.length > 0 ? (
            <div className="space-y-4">
              <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-2xl bg-white overflow-hidden">
                <CardContent className="p-0">
                  <DataTable rows={transformedPreviewData} highlightNulls />
                </CardContent>
              </Card>

              {/* Errors from preview */}
              {previewResult?.errors && previewResult.errors.length > 0 && (
                <Card className="border-red-200 bg-red-50/30 rounded-2xl shadow-none">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-bold text-red-700 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      {previewResult.errors.length} Transformation Errors
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {previewResult.errors.map((err, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs bg-white p-2 rounded-lg border border-red-100"
                      >
                        <Badge
                          variant="outline"
                          className="bg-red-100 text-red-700 border-red-200 text-[10px] shrink-0"
                        >
                          Row {err.row_index + 1}
                        </Badge>
                        <span className="font-mono text-red-800">
                          {err.column}
                        </span>
                        <span className="text-red-600">{err.message}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Row count reconciliation */}
              {previewResult && (
                <div className="flex gap-3">
                  <div className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-xl font-bold text-slate-900">
                      {previewResult.row_count_source}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Source Rows
                    </div>
                  </div>
                  <div className="flex items-center">
                    <ArrowLeftRight className="h-5 w-5 text-slate-300" />
                  </div>
                  <div
                    className={`flex-1 p-3 rounded-xl border text-center ${
                      previewResult.row_count_source ===
                      previewResult.row_count_output
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="text-xl font-bold text-slate-900">
                      {previewResult.row_count_output}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Output Rows
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-2xl bg-white">
              <CardContent className="p-12 text-center">
                <Play className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-slate-700 mb-1">
                  No Preview Available
                </h4>
                <p className="text-sm text-slate-500 mb-4">
                  Run the preview to see transformed output based on your
                  current mapping configuration.
                </p>
                <Button
                  onClick={handleRunPreview}
                  disabled={previewMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md"
                >
                  <Play className="h-4 w-4 mr-2 fill-current" /> Generate
                  Preview
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stats" className="outline-none mt-0">
          <div className="space-y-6">
            {previewResult?.stats ? (
              <>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Null Percentage by Column
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(previewResult.stats.null_percentage).map(
                      ([col, pct]) => (
                        <div
                          key={col}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">
                            {col}
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="text-lg font-bold text-slate-800">
                              {pct.toFixed(1)}%
                            </div>
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pct > 10
                                    ? "bg-amber-400"
                                    : pct > 0
                                      ? "bg-indigo-400"
                                      : "bg-emerald-400"
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Distinct Values by Column
                    </h4>
                  </div>
                  <StatsPanel
                    label="distinct"
                    stats={previewResult.stats.distinct_values}
                  />
                </div>
              </>
            ) : (
              <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-2xl bg-white">
                <CardContent className="p-12 text-center">
                  <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-slate-700 mb-1">
                    Run Preview First
                  </h4>
                  <p className="text-sm text-slate-500">
                    Statistics will be available after running a preview
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
