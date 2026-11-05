"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Loader2, 
  Search, 
  Brain, 
  Zap, 
  Database, 
  Activity, 
  CheckCircle2,
  FileSearch,
  Cpu,
  RefreshCcw,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLatestRun } from "../hooks/use-training";

interface TrainingProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const TRAINING_STEPS = [
  { id: 1, label: "Scanning Data Lineage & Quality...", icon: Search, color: "text-blue-500" },
  { id: 2, label: "Initializing Neural Policy Gradients...", icon: Brain, color: "text-indigo-500" },
  { id: 3, label: "Ingesting State Vectors from Data Catalog...", icon: Database, color: "text-amber-500" },
  { id: 4, label: "Running 1,000 Parallel Loop Simulations...", icon: Activity, color: "text-emerald-500" },
  { id: 5, label: "Calculating Reward Attribution...", icon: Zap, color: "text-orange-500" },
  { id: 6, label: "Optimizing Decision Confidence Intervals...", icon: Cpu, color: "text-purple-500" },
  { id: 7, label: "Finalizing Policy Update v4.2.2...", icon: Sparkles, color: "text-pink-500" },
];

export function TrainingProgressDialog({ open, onOpenChange, onComplete }: TrainingProgressDialogProps) {
  const [activeStep, setActiveStep] = useState(0);

  // Determine whether to poll based on dialog open state and run status
  const [shouldPoll, setShouldPoll] = useState(false);
  const { data: latestRun, isError } = useLatestRun(shouldPoll);

  const status = latestRun?.status ?? "pending";
  const progressPercent = latestRun?.percent_complete ?? 0;
  const isFailed = status === "failed" || isError;

  useEffect(() => {
    if (open && status !== "completed" && status !== "failed" && !isError) {
      setShouldPoll(true);
    } else {
      setShouldPoll(false);
    }
  }, [open, status, isError]);

  useEffect(() => {
    if (open) {
      if (status === "completed") {
         setTimeout(() => {
           onComplete();
           onOpenChange(false);
         }, 1500);
      }
      
      const stepIndex = Math.floor((progressPercent / 100) * TRAINING_STEPS.length);
      setActiveStep(Math.min(stepIndex, TRAINING_STEPS.length - 1));
    }
  }, [open, status, progressPercent, onComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-3xl border-0 shadow-2xl p-8 bg-white overflow-hidden ring-1 ring-slate-100 [&>button]:hidden">
        <div className="flex flex-col items-center text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
          
          <div className="relative">
            <div className="p-5 bg-indigo-50 rounded-full border border-indigo-100 shadow-sm animate-pulse">
              <RefreshCcw className="h-10 w-10 text-indigo-600 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div className="absolute -bottom-1 -right-1 p-2 bg-emerald-500 rounded-full border-4 border-white">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">
              {isFailed ? "Training Failed" : "Updating RL Intelligence"}
            </DialogTitle>
            <DialogDescription className={`font-medium ${isFailed ? "text-rose-500" : "text-slate-500"}`}>
              {isFailed ? latestRun?.error || "An unknown error occurred." : "Evolving orchestrator decision policies through active training."}
            </DialogDescription>
          </div>

          <div className="w-full space-y-4">
            <div className="flex justify-between items-end mb-1 px-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                isFailed ? "text-rose-600 bg-rose-50" :
                status === "completed" ? "text-emerald-600 bg-emerald-50" :
                "text-indigo-600 bg-indigo-50"
              }`}>
                Status: {status}
              </span>
              <span className="text-sm font-mono font-bold text-slate-800">{Math.floor(progressPercent)}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden w-full relative">
               <div 
                 className={`h-full transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.3)] ${
                   isFailed ? "bg-rose-500" :
                   status === "completed" ? "bg-emerald-500" :
                   "bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"
                 }`}
                 style={{ width: `${progressPercent}%` }}
               />
            </div>
          </div>

          <div className={`w-full rounded-2xl p-4 border min-h-[80px] flex items-center justify-center transition-all ${
            isFailed ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100"
          }`}>
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {(() => {
                if (isFailed) return <AlertCircle className="h-5 w-5 text-rose-500 shadow-sm" />;
                if (status === "completed") return <CheckCircle2 className="h-5 w-5 text-emerald-500 shadow-sm" />;
                const step = TRAINING_STEPS[activeStep] || TRAINING_STEPS[TRAINING_STEPS.length - 1];
                const StepIcon = step.icon || Loader2;
                return <StepIcon className={`h-5 w-5 ${step.color} animate-bounce shadow-sm`} />;
              })()}
              <p className={`text-sm font-bold tracking-tight ${isFailed ? "text-rose-700" : "text-slate-700"}`}>
                {isFailed 
                  ? "Training interrupted." 
                  : status === "completed"
                    ? "Training completed successfully."
                    : TRAINING_STEPS[activeStep]?.label || TRAINING_STEPS[TRAINING_STEPS.length - 1].label}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full pt-2">
             <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">State Rank</p>
                <p className="text-sm font-bold text-slate-800">Elite-4</p>
             </div>
             <div className="text-center border-x border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Steps</p>
                <p className="text-sm font-bold text-indigo-600">{latestRun?.steps_completed ?? 0} / {latestRun?.total_steps ?? 0}</p>
             </div>
             <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Scenarios</p>
                <p className="text-sm font-bold text-slate-800">{latestRun?.scenarios_used ?? 0}</p>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
