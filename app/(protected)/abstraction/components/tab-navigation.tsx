"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Workflow,
  Settings2,
  GitBranch,
  ClipboardCheck,
  Zap,
  BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AbstractionStage =
  | "workflow"
  | "protocol"
  | "pipeline"
  | "ocr-review"
  | "integrate"
  | "results";

export interface TabNavigationProps {
  activeStage: AbstractionStage;
  onStageChange: (stage: AbstractionStage) => void;
  disabledStages?: AbstractionStage[];
}

const stages: Array<{
  id: AbstractionStage;
  label: string;
  icon: typeof Workflow;
  description: string;
}> = [
  {
    id: "workflow",
    label: "Workflow",
    icon: Workflow,
    description: "Configure workflow rules",
  },
  {
    id: "protocol",
    label: "Protocol",
    icon: Settings2,
    description: "Create and edit extraction protocols",
  },
  {
    id: "pipeline",
    label: "Pipeline",
    icon: GitBranch,
    description: "Define processing pipeline",
  },
  {
    id: "ocr-review",
    label: "OCR Review",
    icon: ClipboardCheck,
    description: "Review OCR results",
  },
  {
    id: "integrate",
    label: "Integrate",
    icon: Zap,
    description: "Integrate with systems",
  },
  {
    id: "results",
    label: "Results",
    icon: BarChart3,
    description: "View results",
  },
];

export function TabNavigation({
  activeStage,
  onStageChange,
  disabledStages = [],
}: TabNavigationProps) {
  return (
    <Tabs value={activeStage} onValueChange={(v) => onStageChange(v as AbstractionStage)}>
      <TabsList className="bg-white/70 backdrop-blur-md p-1.5 rounded-full shadow-lg shadow-slate-200/50 h-auto flex flex-wrap gap-1 w-full border border-slate-200/60 ring-1 ring-white/40">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isDisabled = disabledStages.includes(stage.id);

          return (
            <TabsTrigger
              key={stage.id}
              value={stage.id}
              disabled={isDisabled}
              className="rounded-full px-5 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700 font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={stage.description}
            >
              <Icon className="h-4 w-4 mr-2" />
              {stage.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
