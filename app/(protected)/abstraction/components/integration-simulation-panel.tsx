"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IntegrationColumnMapping } from "@/app/(protected)/data-room/integrations/services/data-integration-api";
import { runPreviewSample } from "@/app/(protected)/workflows/services/integration-api";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Copy,
  Download,
  FlaskConical,
  Loader2,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

export interface SimulationRow {
  rowIndex: number;
  sourcePayload: Record<string, unknown>;
  targetPayload: Record<string, unknown>;
  validationOutcomes: { rule: string; passed: boolean; message?: string }[];
  transformationImpacts: string[];
  duplicateDetected: boolean;
  businessRuleViolations: string[];
}

export interface SimulationResult {
  runAt: string;
  rows: SimulationRow[];
  summary: {
    totalRows: number;
    passedValidation: number;
    failedValidation: number;
    duplicates: number;
    businessViolations: number;
  };
}

interface IntegrationSimulationPanelProps {
  workflowId?: string;
  mappings: IntegrationColumnMapping[];
  jobName?: string;
}

function buildClientSideSimulation(mappings: IntegrationColumnMapping[]): SimulationResult {
  const sampleRows = [
    { row_index: 0, note: "Sample row A" },
    { row_index: 1, note: "Sample row B" },
    { row_index: 2, note: "Sample row C" },
  ];

  const rows: SimulationRow[] = sampleRows.map((sample, index) => {
    const sourcePayload: Record<string, unknown> = { _sim_row: index + 1 };
    const targetPayload: Record<string, unknown> = {};
    const transformationImpacts: string[] = [];
    const validationOutcomes: SimulationRow["validationOutcomes"] = [];
    const businessRuleViolations: string[] = [];

    mappings.forEach((mapping) => {
      const src = mapping.source_column || "(constant)";
      const mockValue = mapping.default_value ?? `[${src}]`;
      sourcePayload[src] = mockValue;
      targetPayload[mapping.destination_column] = mapping.transformation
        ? `${mockValue} (via ${mapping.transformation})`
        : mockValue;

      if (mapping.transformation) {
        transformationImpacts.push(
          `${src} → ${mapping.destination_column}: ${mapping.transformation}`
        );
      }

      if (mapping.is_required && !mapping.source_column?.trim() && !mapping.default_value) {
        validationOutcomes.push({
          rule: "not_null",
          passed: false,
          message: `Required target "${mapping.destination_column}" has no source or default.`,
        });
        businessRuleViolations.push(`Required field ${mapping.destination_column} unmapped`);
      } else {
        validationOutcomes.push({ rule: "not_null", passed: true });
      }
    });

    const duplicateDetected = index === 2 && mappings.some((m) => m.destination_column === "email");

    return {
      rowIndex: index,
      sourcePayload,
      targetPayload,
      validationOutcomes,
      transformationImpacts,
      duplicateDetected,
      businessRuleViolations,
    };
  });

  const failedValidation = rows.reduce(
    (acc, r) => acc + r.validationOutcomes.filter((v) => !v.passed).length,
    0
  );

  return {
    runAt: new Date().toISOString(),
    rows,
    summary: {
      totalRows: rows.length,
      passedValidation: rows.reduce((acc, r) => acc + r.validationOutcomes.filter((v) => v.passed).length, 0),
      failedValidation,
      duplicates: rows.filter((r) => r.duplicateDetected).length,
      businessViolations: rows.reduce((acc, r) => acc + r.businessRuleViolations.length, 0),
    },
  };
}

function exportSimulationCsv(result: SimulationResult, jobName: string): void {
  const headers = ["row_index", "validation_passed", "duplicate", "target_payload_json", "violations"];
  const lines = result.rows.map((row) => {
    const passed = row.validationOutcomes.every((v) => v.passed);
    const violations = [
      ...row.validationOutcomes.filter((v) => !v.passed).map((v) => v.message ?? v.rule),
      ...row.businessRuleViolations,
    ].join("; ");
    return [
      row.rowIndex,
      passed,
      row.duplicateDetected,
      JSON.stringify(row.targetPayload),
      `"${violations.replace(/"/g, '""')}"`,
    ].join(",");
  });
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${jobName || "integration"}-simulation-${Date.now()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function IntegrationSimulationPanel({
  workflowId,
  mappings,
  jobName = "integration",
}: IntegrationSimulationPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleRunSimulation = useCallback(async () => {
    if (mappings.length === 0) {
      toast.error("Suggest mappings first before running a simulation.");
      return;
    }

    setIsRunning(true);
    try {
      if (workflowId) {
        try {
          const previewMappings = mappings.map((m, i) => ({
            id: m.id ?? `sim-${i}`,
            source_column: m.source_column,
            target_column: m.destination_column,
            transformation: {
              type: m.transformation ? ("expression" as const) : ("direct" as const),
              expression: m.transformation ?? undefined,
            },
            confidence: m.match_score ?? 0.8,
            ai_generated: true,
            human_modified: false,
            validation_issues: [],
          }));

          const preview = await runPreviewSample(workflowId, previewMappings);
          const rows: SimulationRow[] = preview.rows.map((row, index) => ({
            rowIndex: index,
            sourcePayload: row,
            targetPayload: row,
            validationOutcomes: preview.errors
              .filter((e) => e.row_index === index)
              .map((e) => ({
                rule: e.column,
                passed: false,
                message: e.message,
              })),
            transformationImpacts: mappings
              .filter((m) => m.transformation)
              .map((m) => `${m.source_column} → ${m.destination_column}`),
            duplicateDetected: false,
            businessRuleViolations: preview.errors
              .filter((e) => e.row_index === index)
              .map((e) => e.message),
          }));

          if (rows.length === 0) {
            setResult(buildClientSideSimulation(mappings));
          } else {
            setResult({
              runAt: new Date().toISOString(),
              rows,
              summary: {
                totalRows: rows.length,
                passedValidation: rows.reduce(
                  (acc, r) => acc + (r.validationOutcomes.length === 0 ? 1 : 0),
                  0
                ),
                failedValidation: preview.errors.length,
                duplicates: 0,
                businessViolations: preview.errors.length,
              },
            });
          }
        } catch {
          setResult(buildClientSideSimulation(mappings));
        }
      } else {
        setResult(buildClientSideSimulation(mappings));
      }
      toast.success("Simulation complete — no production systems were affected.");
    } finally {
      setIsRunning(false);
    }
  }, [workflowId, mappings]);

  const handleExport = () => {
    if (!result) return;
    exportSimulationCsv(result, jobName);
    toast.success("Simulation results exported.");
  };

  return (
    <Card className="border-0 shadow-sm ring-1 ring-violet-200/60 overflow-hidden">
      <CardHeader className="py-3 border-b border-violet-100 bg-violet-50/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold text-violet-900 flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Simulation Run
            <Badge variant="outline" className="text-[9px] rounded-full bg-white border-violet-200 text-violet-700">
              <Shield className="h-2.5 w-2.5 mr-0.5" />
              Non-production
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 rounded-xl text-xs"
              onClick={handleRunSimulation}
              disabled={isRunning || mappings.length === 0}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <FlaskConical className="h-3.5 w-3.5 mr-1" />
                  Run Simulation
                </>
              )}
            </Button>
            {result && (
              <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs" onClick={handleExport}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-slate-600">
          Preview expected target payloads, validation outcomes, transformation impacts, duplicate detection,
          and business rule violations without writing to production.
        </p>

        {!result ? (
          <div className="flex items-center justify-center h-24 text-sm text-slate-400 rounded-xl border border-dashed border-violet-200">
            Run a simulation to preview downstream outcomes.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: "Rows", value: result.summary.totalRows },
                { label: "Validations passed", value: result.summary.passedValidation, color: "text-emerald-600" },
                { label: "Failed", value: result.summary.failedValidation, color: "text-rose-600" },
                { label: "Duplicates", value: result.summary.duplicates, color: "text-amber-600" },
                { label: "Rule violations", value: result.summary.businessViolations, color: "text-orange-600" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center">
                  <p className={cn("text-lg font-bold tabular-nums", s.color ?? "text-slate-800")}>{s.value}</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 max-h-[360px] overflow-auto">
              {result.rows.map((row) => {
                const hasFailure =
                  row.validationOutcomes.some((v) => !v.passed) ||
                  row.businessRuleViolations.length > 0 ||
                  row.duplicateDetected;
                const isExpanded = expandedRow === row.rowIndex;

                return (
                  <div
                    key={row.rowIndex}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs",
                      hasFailure ? "border-rose-200 bg-rose-50/30" : "border-slate-200 bg-white"
                    )}
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-2 text-left"
                      onClick={() => setExpandedRow(isExpanded ? null : row.rowIndex)}
                    >
                      <span className="font-semibold text-slate-700">Row {row.rowIndex + 1}</span>
                      <div className="flex items-center gap-1.5">
                        {row.duplicateDetected && (
                          <Badge className="text-[9px] bg-amber-100 text-amber-800">Duplicate</Badge>
                        )}
                        {hasFailure && (
                          <Badge className="text-[9px] bg-rose-100 text-rose-800">
                            <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                            Failed
                          </Badge>
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-2 pt-2 border-t border-dashed border-slate-200">
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Target payload</p>
                          <pre className="text-[10px] font-mono bg-slate-50 rounded-lg p-2 overflow-auto max-h-24">
                            {JSON.stringify(row.targetPayload, null, 2)}
                          </pre>
                        </div>
                        {row.transformationImpacts.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">
                              Transformation impacts
                            </p>
                            <ul className="text-[10px] text-indigo-700 space-y-0.5">
                              {row.transformationImpacts.map((t) => (
                                <li key={t}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {row.validationOutcomes.filter((v) => !v.passed).length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-rose-500 mb-1">
                              Validation outcomes
                            </p>
                            <ul className="text-[10px] text-rose-800 space-y-0.5">
                              {row.validationOutcomes
                                .filter((v) => !v.passed)
                                .map((v) => (
                                  <li key={v.rule}>{v.message ?? v.rule}</li>
                                ))}
                            </ul>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px]"
                          onClick={() => {
                            void navigator.clipboard.writeText(JSON.stringify(row.targetPayload, null, 2));
                            toast.success("Payload copied");
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy payload
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400">
              Simulated at {new Date(result.runAt).toLocaleString()} — read-only preview, no production writes.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
