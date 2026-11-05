"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  ArrowRight,
  BarChart3,
  Clock,
  Database,
  GitBranch,
  Bot,
  UserCheck,
  PenLine,
  ShieldCheck,
  TableIcon,
} from "lucide-react";
import { usePostExecution } from "../hooks/use-integration";
import type { PostExecutionResult } from "../services/integration-api";
import { format } from "date-fns";

interface PostExecutionPanelProps {
  workflowId: string;
}

function MetricCard({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl bg-white overflow-hidden">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className={`p-2 rounded-xl ${color}`}>{icon}</div>
        </div>
        <div className="space-y-1">
          <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          {subtitle && (
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QualityCheckRow({
  check,
  passed,
  detail,
}: {
  check: string;
  passed: boolean;
  detail: string;
}) {
  return (
    <div
      className={`p-4 rounded-xl border transition-all hover:shadow-sm ${
        passed
          ? "border-emerald-100 bg-emerald-50/30"
          : "border-red-100 bg-red-50/30"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {passed ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <span className="text-sm font-semibold text-slate-800">{check}</span>
        </div>
        <Badge
          className={`text-[10px] font-bold uppercase tracking-wider ${
            passed
              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : "bg-red-100 text-red-700 border-red-200"
          }`}
        >
          {passed ? "Passed" : "Failed"}
        </Badge>
      </div>
      <p className="text-xs text-slate-600 pl-6">{detail}</p>
    </div>
  );
}

function LineageVisualization({
  lineage,
}: {
  lineage: PostExecutionResult["lineage"];
}) {
  return (
    <div className="flex items-stretch gap-3 overflow-x-auto pb-2">
      {lineage.map((stage, idx) => (
        <div key={stage.stage} className="flex items-center gap-3">
          <div
            className={`min-w-[200px] p-4 rounded-2xl border shadow-sm ${
              idx === 0
                ? "bg-blue-50 border-blue-200"
                : idx === lineage.length - 1
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-violet-50 border-violet-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Database
                className={`h-4 w-4 ${
                  idx === 0
                    ? "text-blue-600"
                    : idx === lineage.length - 1
                      ? "text-emerald-600"
                      : "text-violet-600"
                }`}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {stage.stage}
              </span>
            </div>
            <div className="font-mono text-sm font-bold text-slate-800 mb-2">
              {stage.table}
            </div>
            <div className="flex flex-wrap gap-1">
              {stage.columns.slice(0, 5).map((col) => (
                <span
                  key={col}
                  className="text-[9px] font-mono bg-white/60 px-1.5 py-0.5 rounded border border-slate-200/50 text-slate-600"
                >
                  {col}
                </span>
              ))}
              {stage.columns.length > 5 && (
                <span className="text-[9px] text-slate-400 font-bold px-1">
                  +{stage.columns.length - 5}
                </span>
              )}
            </div>
          </div>
          {idx < lineage.length - 1 && (
            <ArrowRight className="h-5 w-5 text-slate-300 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

export function PostExecutionPanel({ workflowId }: PostExecutionPanelProps) {
  const { data: result, isLoading } = usePostExecution(workflowId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!result) return null;

  const reconciliationMatch =
    result.row_count_source === result.row_count_target + result.row_count_rejected + result.row_count_quarantined;
  const totalOutput = result.row_count_target;
  const sourceTotal = result.row_count_source;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${
              result.status === "success"
                ? "bg-emerald-50"
                : result.status === "partial"
                  ? "bg-amber-50"
                  : "bg-red-50"
            }`}
          >
            <ShieldCheck
              className={`h-5 w-5 ${
                result.status === "success"
                  ? "text-emerald-600"
                  : result.status === "partial"
                    ? "text-amber-600"
                    : "text-red-600"
              }`}
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Post-Execution Validation
            </h3>
            <p className="text-xs text-slate-500">
              Executed {format(new Date(result.executed_at), "MMM d, yyyy HH:mm")} •{" "}
              {result.duration_seconds.toFixed(1)}s
            </p>
          </div>
        </div>
        <Badge
          className={`text-xs font-bold uppercase tracking-wider px-3 py-1 ${
            result.status === "success"
              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : result.status === "partial"
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-red-100 text-red-700 border-red-200"
          }`}
        >
          {result.status === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          ) : result.status === "partial" ? (
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
          ) : (
            <XCircle className="h-3.5 w-3.5 mr-1" />
          )}
          {result.status}
        </Badge>
      </div>

      {/* Row Count Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Source Rows"
          value={sourceTotal.toLocaleString()}
          icon={<Database className="h-5 w-5 text-blue-600" />}
          color="bg-blue-50"
        />
        <MetricCard
          label="Target Rows"
          value={totalOutput.toLocaleString()}
          icon={<TableIcon className="h-5 w-5 text-emerald-600" />}
          color="bg-emerald-50"
          subtitle={`${((totalOutput / sourceTotal) * 100).toFixed(1)}% of source`}
        />
        <MetricCard
          label="Rejected"
          value={result.row_count_rejected.toLocaleString()}
          icon={<XCircle className="h-5 w-5 text-red-600" />}
          color="bg-red-50"
          subtitle={`${((result.row_count_rejected / sourceTotal) * 100).toFixed(2)}%`}
        />
        <MetricCard
          label="Quarantined"
          value={result.row_count_quarantined.toLocaleString()}
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          color="bg-amber-50"
          subtitle={`${((result.row_count_quarantined / sourceTotal) * 100).toFixed(2)}%`}
        />
      </div>

      {/* Row Reconciliation Bar */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-5">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            Row Count Reconciliation
            {reconciliationMatch ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] gap-0.5 ml-2">
                <CheckCircle2 className="h-3 w-3" /> Balanced
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] gap-0.5 ml-2">
                <AlertTriangle className="h-3 w-3" /> Mismatch
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-20">Target</span>
              <div className="flex-1">
                <Progress
                  value={(totalOutput / sourceTotal) * 100}
                  className="h-3 bg-slate-100 [&>div]:bg-emerald-500 rounded-full"
                />
              </div>
              <span className="text-xs font-bold text-slate-700 w-16 text-right">
                {totalOutput.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-20">Rejected</span>
              <div className="flex-1">
                <Progress
                  value={(result.row_count_rejected / sourceTotal) * 100}
                  className="h-3 bg-slate-100 [&>div]:bg-red-500 rounded-full"
                />
              </div>
              <span className="text-xs font-bold text-slate-700 w-16 text-right">
                {result.row_count_rejected.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-20">Quarantined</span>
              <div className="flex-1">
                <Progress
                  value={(result.row_count_quarantined / sourceTotal) * 100}
                  className="h-3 bg-slate-100 [&>div]:bg-amber-500 rounded-full"
                />
              </div>
              <span className="text-xs font-bold text-slate-700 w-16 text-right">
                {result.row_count_quarantined.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Constraint Violations */}
      {result.constraint_violations.length > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-5">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              Constraint Violations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {result.constraint_violations.map((cv) => (
              <div
                key={cv.constraint}
                className={`p-3 rounded-xl border ${
                  cv.count === 0
                    ? "border-emerald-100 bg-emerald-50/30"
                    : "border-red-100 bg-red-50/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {cv.count === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {cv.constraint}
                    </span>
                  </div>
                  <Badge
                    className={`text-[10px] ${
                      cv.count === 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {cv.count} violations
                  </Badge>
                </div>
                {cv.sample && (
                  <p className="text-[11px] text-slate-600 pl-6 mt-1">
                    {cv.sample}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Data Quality Checks */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-5">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-500" />
            Data Quality Checks
            <Badge className="bg-slate-100 text-slate-600 text-[10px] ml-2">
              {result.quality_checks.filter((q) => q.passed).length}/
              {result.quality_checks.length} passed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-3">
          {result.quality_checks.map((qc) => (
            <QualityCheckRow
              key={qc.check}
              check={qc.check}
              passed={qc.passed}
              detail={qc.detail}
            />
          ))}
        </CardContent>
      </Card>

      {/* Schema Lineage */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-5">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-indigo-500" />
            Schema Lineage
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <LineageVisualization lineage={result.lineage} />
        </CardContent>
      </Card>

      {/* AI vs Human Report */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-5">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Bot className="h-4 w-4 text-indigo-500" />
            AI vs Human Mapping Report
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 text-center">
              <Bot className="h-6 w-6 text-violet-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-violet-800">
                {result.ai_vs_human.ai_generated}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-500">
                AI Generated
              </div>
            </div>
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 text-center">
              <UserCheck className="h-6 w-6 text-sky-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-sky-800">
                {result.ai_vs_human.human_modified}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
                Human Modified
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
              <PenLine className="h-6 w-6 text-amber-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-amber-800">
                {result.ai_vs_human.manual_added}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                Manual Added
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
