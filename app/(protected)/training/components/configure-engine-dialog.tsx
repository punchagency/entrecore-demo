"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Cpu,
  Zap,
  Settings2,
  Database,
  BrainCircuit,
  GitBranch,
  ShieldCheck
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ConfigureEngineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigureEngineDialog({ open, onOpenChange }: ConfigureEngineDialogProps) {
  const [learningRate, setLearningRate] = useState(0.001);
  const [discountFactor, setDiscountFactor] = useState(0.95);

  const handleSave = () => {
    toast.success("RL Engine configuration updated successfully.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] rounded-3xl border-0 shadow-2xl p-0 overflow-hidden ring-1 ring-slate-200">
        <div className="bg-slate-900 p-8 text-white relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-400/20 backdrop-blur-md">
              <Settings2 className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">Configure RL Engine</DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">
                Fine-tune the Reinforcement Learning model hyperparameters and policy settings.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8 bg-white">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <BrainCircuit className="h-3.5 w-3.5" /> Base Model
              </Label>
              <Select defaultValue="gpt4o">
                <SelectTrigger className="rounded-xl border-slate-200 h-11 cursor-pointer transition-all hover:bg-slate-50 hover:border-blue-400 hover:shadow-md">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem className="hover:bg-slate-100 hover:border-blue-400 hover:shadow-md" value="gpt4o">GPT-5.4 (Standard-RL)</SelectItem>
                  <SelectItem className="hover:bg-slate-100 hover:border-blue-400 hover:shadow-md" value="claude35">Claude Sonnet 4.6</SelectItem>
                  <SelectItem className="hover:bg-slate-100 hover:border-blue-400 hover:shadow-md" value="llama3-70b">Gemini 3.1 Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Database className="h-3.5 w-3.5" /> Training Buffer
              </Label>
              <Select defaultValue="100k">
                <SelectTrigger className="rounded-xl border-slate-200 h-11 cursor-pointer transition-all hover:bg-slate-50 hover:border-blue-400 hover:shadow-md">
                  <SelectValue placeholder="Replay buffer" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem className="hover:bg-slate-100 hover:border-blue-400 hover:shadow-md" value="50k">50k Samples</SelectItem>
                  <SelectItem className="hover:bg-slate-100 hover:border-blue-400 hover:shadow-md" value="100k">100k Samples</SelectItem>
                  <SelectItem className="hover:bg-slate-100 hover:border-blue-400 hover:shadow-md" value="250k">250k Samples</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Learning Rate</Label>
                <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded-md text-slate-700">{learningRate}</span>
              </div>
              <input
                type="range"
                min="0.0001"
                max="0.01"
                step="0.0001"
                value={learningRate}
                onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400">Controls how quickly the policy updates based on reward signals.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discount Factor (γ)</Label>
                <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded-md text-slate-700">{discountFactor}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.01"
                value={discountFactor}
                onChange={(e) => setDiscountFactor(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400">Determines the importance of future rewards vs. immediate outcomes.</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800">Safety Policy Active</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">Changes to hyperparameters will be validated against safety constraints before being deployed to the live agent.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-6 border-t border-slate-100">
          <Button variant="ghost" className="rounded-xl px-6 h-11 text-slate-600 font-bold" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl px-8 h-11 bg-slate-900 border-0 text-white font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all"
            onClick={handleSave}
          >
            Deploy Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
