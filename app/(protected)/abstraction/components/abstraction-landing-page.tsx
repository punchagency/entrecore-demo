"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileSearch,
  Upload,
  Settings2,
  RefreshCw,
} from "lucide-react";
import { Workflow } from "@/types/abstraction";
import { getWorkflows, getWorkflowMetrics } from "../services/workflow-data";
import { MetricsCards } from "./metrics-cards";
import { WorkflowTable } from "./workflow-table";
import { AbstractionNotificationSettingsCard } from "./abstraction-notification-settings-card";

export function AbstractionLandingPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    avgSuccessRate: 0,
    totalRecords: 0,
    pendingReview: 0,
    entitiesTracked: 12,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [workflowsData, metricsData] = await Promise.all([
          getWorkflows(),
          Promise.resolve(getWorkflowMetrics()),
        ]);
        setWorkflows(workflowsData);
        setMetrics({
          avgSuccessRate: metricsData.avgSuccessRate,
          totalRecords: metricsData.totalRecords,
          pendingReview: metricsData.pendingReview,
          entitiesTracked: 12,
        });
      } catch (error) {
        console.error("Failed to load workflows:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSelectWorkflow = (workflow: Workflow) => {
    router.push(`/abstraction/${workflow.id}`);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    const workflowsData = await getWorkflows();
    const metricsData = getWorkflowMetrics();
    setWorkflows(workflowsData);
    setMetrics({
      avgSuccessRate: metricsData.avgSuccessRate,
      totalRecords: metricsData.totalRecords,
      pendingReview: metricsData.pendingReview,
      entitiesTracked: 12,
    });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen">
      {/* ── Header ─────────────────────────────────────────────── */}
      {/* <div className="sticky top-0 z-40 w-full flex items-center justify-between py-4 md:py-5 px-4 md:px-8 lg:px-10 bg-white/40 backdrop-blur-xl border-b border-white/60 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/data-room"
            className="w-10 h-10 rounded-full bg-white/60 border border-white/60 shadow-sm flex items-center justify-center hover:bg-blue-600 hover:text-white hover:scale-110 transition-all duration-300 group"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 group-hover:text-white" />
          </Link>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter text-gray-900 uppercase">
            Abstraction Workflows
          </h1>
        </div>
      </div> */}

      <div className="container mx-auto p-6 space-y-8">
        {/* ── Hero Banner ─────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950 via-indigo-900 to-blue-900 p-8 text-white shadow-2xl border border-white/10">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-indigo-400/10 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

          <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                  <FileSearch className="h-6 w-6 text-violet-300" />
                </div>
                <Badge
                  variant="outline"
                  className="border-violet-400/50 text-violet-300 font-medium tracking-wide bg-violet-950/30"
                >
                  OCR-Driven Protocol
                </Badge>
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-violet-100 to-blue-200">
                Legal Document Abstraction
              </h1>
              <p className="text-blue-100/70 text-lg leading-relaxed max-w-xl font-medium">
                Automatically extract, classify, and validate key entities and clauses from
                legal documents. Human-in-the-loop review ensures accuracy while the system
                continuously learns from corrections.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button
                  variant="default"
                  className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25 border-0 rounded-xl px-6"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
                <Button
                  variant="outline"
                  className="bg-transparent border-white/20 hover:bg-white/10 text-white hover:text-white rounded-xl backdrop-blur-sm px-6"
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Configure Protocol
                </Button>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="bg-transparent border-white/20 hover:bg-white/10 text-white hover:text-white rounded-xl backdrop-blur-sm px-6"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white overflow-hidden group">
                <div className="p-6">
                  <p className="text-sm text-blue-200 font-medium">Total Records</p>
                  <p className="text-3xl font-bold mt-1">{metrics.totalRecords}</p>
                </div>
              </Card>
              <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white overflow-hidden group">
                <div className="p-6">
                  <p className="text-sm text-blue-200 font-medium">Avg Success Rate</p>
                  <p className="text-3xl font-bold mt-1">{metrics.avgSuccessRate.toFixed(1)}%</p>
                </div>
              </Card>
              <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white overflow-hidden group">
                <div className="p-6">
                  <p className="text-sm text-blue-200 font-medium">Pending Review</p>
                  <p className="text-3xl font-bold mt-1">{metrics.pendingReview}</p>
                </div>
              </Card>
              <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white overflow-hidden group">
                <div className="p-6">
                  <p className="text-sm text-blue-200 font-medium">Entities Tracked</p>
                  <p className="text-3xl font-bold mt-1">{metrics.entitiesTracked}</p>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* ── Metrics Cards (Mobile & Tablet) ─────────────────── */}
        <div className="lg:hidden">
          <MetricsCards
            successRate={metrics.avgSuccessRate}
            recordsProcessed={metrics.totalRecords}
            pendingReview={metrics.pendingReview}
            entitiesTracked={metrics.entitiesTracked}
          />
        </div>

        {/* ── Workflows Table ─────────────────────────────────── */}
        <Card className="border-0 shadow-xl bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-slate-200/50 p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Configured Workflows</h2>
              <p className="text-slate-600 text-sm mt-1">
                Manage and monitor all abstraction workflows
              </p>
            </div>
            <WorkflowTable
              workflows={workflows}
              onSelectWorkflow={handleSelectWorkflow}
              isLoading={isLoading}
            />
          </div>
        </Card>

        {/* ── Notification Settings ─────────────────────────────── */}
        <AbstractionNotificationSettingsCard />
      </div>
    </div>
  );
}
