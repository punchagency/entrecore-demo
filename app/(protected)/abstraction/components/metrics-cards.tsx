"use client";

import { Card } from "@/components/ui/card";
import { BarChart3, FileText, Sparkles, ClipboardCheck, Zap, AlertCircle } from "lucide-react";

export interface MetricsCardsProps {
  successRate: number;
  recordsProcessed: number;
  pendingReview: number;
  entitiesTracked: number;
  processingTime?: number;
  errorRate?: number;
}

export function MetricsCards({
  successRate,
  recordsProcessed,
  pendingReview,
  entitiesTracked,
  processingTime = 0,
  errorRate = 0,
}: MetricsCardsProps) {
  const metrics = [
    {
      icon: FileText,
      label: "Documents Processed",
      value: recordsProcessed,
      color: "emerald",
      unit: "",
    },
    {
      icon: Sparkles,
      label: "Extraction Accuracy",
      value: successRate,
      color: "amber",
      unit: "%",
    },
    {
      icon: ClipboardCheck,
      label: "Pending Review",
      value: pendingReview,
      color: "rose",
      unit: "",
    },
    {
      icon: BarChart3,
      label: "Entities Tracked",
      value: entitiesTracked,
      color: "cyan",
      unit: "",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const colorClasses = {
          emerald: "text-emerald-400",
          amber: "text-amber-400",
          rose: "text-rose-400",
          cyan: "text-cyan-400",
        };

        return (
          <Card
            key={metric.label}
            className="bg-white/10 backdrop-blur-md border-white/20 text-white overflow-hidden group hover:bg-white/15 transition-all duration-300"
          >
            <div className="p-6">
              <Icon
                className={`h-8 w-8 ${
                  colorClasses[metric.color as keyof typeof colorClasses]
                } mb-3 group-hover:scale-110 transition-transform`}
              />
              <p className="text-3xl font-bold">
                {typeof metric.value === "number" ? metric.value.toFixed(1) : metric.value}
                {metric.unit}
              </p>
              <p className="text-sm text-blue-200 font-medium">{metric.label}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
