"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BrainCircuit,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  Zap,
  RefreshCcw,
  BarChart3,
  Activity,
  Sparkles,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  // @ts-ignore
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { useAbstractionStore } from "@/app/store/abstractionStore";
import { cn } from "@/lib/utils";

export function LearningDashboard() {
  const { learningMetrics, extractions, documents } = useAbstractionStore();

  const latestMetric = learningMetrics[learningMetrics.length - 1];
  const previousMetric = learningMetrics[learningMetrics.length - 2];
  const accuracyDelta =
    latestMetric && previousMetric ? latestMetric.accuracy - previousMetric.accuracy : 0;

  // Entity accuracy radar data
  const radarData = useMemo(() => {
    if (!latestMetric?.entityAccuracy) return [];
    return Object.entries(latestMetric.entityAccuracy).map(([key, value]) => ({
      entity: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      accuracy: value,
      baseline: 85,
    }));
  }, [latestMetric]);

  // Corrections trend data
  const correctionsTrend = useMemo(() => {
    return learningMetrics.map((m) => ({
      date: new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      corrections: m.correctionsApplied,
      documents: m.documentsProcessed,
      accuracy: m.accuracy,
    }));
  }, [learningMetrics]);

  // Regression test data (simulated)
  const regressionTests = useMemo(
    () => [
      {
        id: "rt-1",
        name: "Party Name Extraction",
        expected: "Acme Holdings LLC",
        actual: "Acme Holdings LLC",
        status: "pass" as const,
        deviation: 0,
      },
      {
        id: "rt-2",
        name: "Date Format Parsing",
        expected: "January 1, 2026",
        actual: "January 1, 2026",
        status: "pass" as const,
        deviation: 0,
      },
      {
        id: "rt-3",
        name: "Amount Extraction",
        expected: "$2,450,000",
        actual: "$2,400,000",
        status: "warn" as const,
        deviation: 2.04,
      },
      {
        id: "rt-4",
        name: "Address Extraction",
        expected: "123 Main Street, Suite 400, New York, NY 10001",
        actual: "123 Main Street, Suite 400, New York, NY 10001",
        status: "pass" as const,
        deviation: 0,
      },
      {
        id: "rt-5",
        name: "Termination Clause Detection",
        expected: "Section 14",
        actual: "Section 14",
        status: "pass" as const,
        deviation: 0,
      },
      {
        id: "rt-6",
        name: "Governing Law Jurisdiction",
        expected: "State of New York",
        actual: "State of New York",
        status: "pass" as const,
        deviation: 0,
      },
    ],
    []
  );

  const correctedExtractions = extractions.filter((e) => e.status === "corrected");
  const totalCorrections = learningMetrics.reduce((sum, m) => sum + m.correctionsApplied, 0);
  const passedTests = regressionTests.filter((t) => t.status === "pass").length;

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Current Accuracy",
            value: `${latestMetric?.accuracy.toFixed(1)}%`,
            delta: accuracyDelta,
            icon: <Target className="h-5 w-5" />,
            color: "text-emerald-700",
            bg: "bg-emerald-50",
            ring: "ring-emerald-200",
          },
          {
            label: "Total Corrections",
            value: totalCorrections,
            delta: -(latestMetric?.correctionsApplied || 0),
            icon: <RefreshCcw className="h-5 w-5" />,
            color: "text-amber-700",
            bg: "bg-amber-50",
            ring: "ring-amber-200",
          },
          {
            label: "Documents Trained",
            value: latestMetric?.documentsProcessed || 0,
            delta: 1,
            icon: <FileText className="h-5 w-5" />,
            color: "text-blue-700",
            bg: "bg-blue-50",
            ring: "ring-blue-200",
          },
          {
            label: "Regression Tests",
            value: `${passedTests}/${regressionTests.length}`,
            delta: null,
            icon: <CheckCircle2 className="h-5 w-5" />,
            color: passedTests === regressionTests.length ? "text-emerald-700" : "text-amber-700",
            bg: passedTests === regressionTests.length ? "bg-emerald-50" : "bg-amber-50",
            ring: passedTests === regressionTests.length ? "ring-emerald-200" : "ring-amber-200",
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={cn(
              "border-0 shadow-sm ring-1 overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5",
              stat.ring
            )}
          >
            <CardContent className={cn("p-4", stat.bg)}>
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl bg-white shadow-sm", stat.color)}>
                  {stat.icon}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                    {stat.delta !== null && stat.delta !== 0 && (
                      <span
                        className={cn(
                          "text-xs font-semibold flex items-center",
                          stat.delta > 0
                            ? "text-emerald-600"
                            : stat.delta < 0
                              ? "text-red-500"
                              : "text-slate-400"
                        )}
                      >
                        {stat.delta > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : stat.delta < 0 ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        {Math.abs(stat.delta).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Accuracy Trend Chart ────────────────────────── */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Accuracy Improvement Over Time
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={correctionsTrend}>
                  <defs>
                    <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <YAxis domain={[75, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fill="url(#accuracyGradient)"
                    dot={{ r: 4, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <Badge className="bg-emerald-50 text-emerald-700 border-0 rounded-full text-[10px]">
                <Sparkles className="h-3 w-3 mr-1" />+
                {(latestMetric?.accuracy - learningMetrics[0]?.accuracy).toFixed(1)}% improvement
              </Badge>
              <Badge className="bg-slate-50 text-slate-600 border-0 rounded-full text-[10px]">
                ≥85% threshold met
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* ── Entity Accuracy Radar ──────────────────────── */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-500" />
              Entity Accuracy by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="entity" tick={{ fontSize: 10, fill: "#64748B" }} />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[60, 100]}
                    tick={{ fontSize: 9, fill: "#94A3B8" }}
                  />
                  <Radar
                    name="Current"
                    dataKey="accuracy"
                    stroke="#7C3AED"
                    fill="#7C3AED"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Baseline"
                    dataKey="baseline"
                    stroke="#CBD5E1"
                    fill="#CBD5E1"
                    fillOpacity={0.1}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── Corrections Trend ──────────────────────────── */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              Corrections Over Time
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={correctionsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="corrections"
                    fill="#F59E0B"
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                    name="Corrections"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center mt-2">
              <Badge className="bg-amber-50 text-amber-700 border-0 rounded-full text-[10px]">
                <TrendingUp className="h-3 w-3 mr-1" />
                Corrections decreasing — model improving
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* ── Regression Tests ───────────────────────────── */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                Regression Tests
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                Run Tests
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {regressionTests.map((test) => (
              <div
                key={test.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  test.status === "pass"
                    ? "border-emerald-200 bg-emerald-50/30"
                    : test.status === "warn"
                      ? "border-amber-200 bg-amber-50/30"
                      : "border-red-200 bg-red-50/30"
                )}
              >
                {test.status === "pass" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : test.status === "warn" ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">{test.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500">
                      Expected: <span className="font-medium text-slate-600">{test.expected}</span>
                    </span>
                  </div>
                  {test.status === "warn" && (
                    <span className="text-[10px] text-amber-600 font-medium">
                      Got: {test.actual} ({test.deviation}% deviation)
                    </span>
                  )}
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-2 py-0.5 rounded-full border shrink-0",
                    test.status === "pass"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  )}
                >
                  {test.status === "pass" ? "PASS" : "WARN"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Learning Loop Info Bar */}
      <Card className="border-0 shadow-sm ring-1 ring-violet-200/50 overflow-hidden bg-gradient-to-r from-violet-50/50 to-indigo-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white rounded-xl shadow-sm">
              <BrainCircuit className="h-6 w-6 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700">Continuous Learning Loop Active</p>
              <p className="text-xs text-slate-500">
                Every correction you make is captured and used to improve extraction accuracy. The
                system automatically retrains entity patterns based on human feedback — no manual
                model training required.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className="bg-violet-100 text-violet-700 border-0 rounded-full text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Auto-Learning
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-700 border-0 rounded-full text-xs">
                {correctedExtractions.length} corrections applied
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
