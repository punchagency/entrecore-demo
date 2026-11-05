"use client";

import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Clock, Globe, Database, Mail, MessageSquare, Radio,
  Upload, FileEdit, MousePointer2, ClipboardList, CheckCircle2,
  AlertTriangle, Timer, TableProperties,
  Search, X, ChevronDown, ChevronRight, RotateCcw, CheckCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TRIGGER_GROUPS,
  TriggerDefinition,
  TriggerColor,
} from "./trigger-library-data";

// ─── Icon resolver ─────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Zap, Clock, Globe, Database, Mail, MessageSquare, Radio,
  Upload, FileEdit, MousePointer2, ClipboardList, CheckCircle2,
  AlertTriangle, Timer, TableProperties,
};

function TriggerIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[name] ?? Zap;
  return <Icon size={size} className={className} />;
}

// ─── Color system ─────────────────────────────────────────────────────────────
const TRIGGER_COLOR_STYLES: Record<TriggerColor, {
  bg: string; text: string; border: string; light: string;
  selectedBorder: string; selectedBg: string;
}> = {
  green:   { bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200",   light: "bg-green-100",   selectedBorder: "border-green-500",   selectedBg: "bg-green-50" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", light: "bg-emerald-100", selectedBorder: "border-emerald-500", selectedBg: "bg-emerald-50" },
  teal:    { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",    light: "bg-teal-100",    selectedBorder: "border-teal-500",    selectedBg: "bg-teal-50" },
  cyan:    { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200",    light: "bg-cyan-100",    selectedBorder: "border-cyan-500",    selectedBg: "bg-cyan-50" },
  blue:    { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    light: "bg-blue-100",    selectedBorder: "border-blue-500",    selectedBg: "bg-blue-50" },
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200",  light: "bg-indigo-100",  selectedBorder: "border-indigo-500",  selectedBg: "bg-indigo-50" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  light: "bg-violet-100",  selectedBorder: "border-violet-500",  selectedBg: "bg-violet-50" },
  purple:  { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200",  light: "bg-purple-100",  selectedBorder: "border-purple-500",  selectedBg: "bg-purple-50" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   light: "bg-amber-100",   selectedBorder: "border-amber-500",   selectedBg: "bg-amber-50" },
  orange:  { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  light: "bg-orange-100",  selectedBorder: "border-orange-500",  selectedBg: "bg-orange-50" },
  rose:    { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    light: "bg-rose-100",    selectedBorder: "border-rose-500",    selectedBg: "bg-rose-50" },
  pink:    { bg: "bg-pink-50",    text: "text-pink-700",    border: "border-pink-200",    light: "bg-pink-100",    selectedBorder: "border-pink-500",    selectedBg: "bg-pink-50" },
};

// ─── Trigger card (in picker list) ────────────────────────────────────────────
function TriggerCard({
  trigger,
  isSelected,
  onSelect,
}: {
  trigger: TriggerDefinition;
  isSelected: boolean;
  onSelect: (t: TriggerDefinition) => void;
}) {
  const styles = TRIGGER_COLOR_STYLES[trigger.color];

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(trigger)}
      className={cn(
        "w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-150",
        isSelected
          ? cn("border-blue-500 bg-blue-50/50 shadow-xs")
          : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50"
      )}
    >
      <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0 border border-slate-100", styles.light)}>
        <TriggerIcon name={trigger.iconName} size={12} className={styles.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-medium truncate leading-tight", isSelected ? "text-blue-700 font-semibold" : "text-slate-800")}>
          {trigger.label}
        </p>
        <p className="text-[10px] text-slate-400 truncate mt-0.5">{trigger.description}</p>
      </div>
      {isSelected && (
        <CheckCheck size={12} className="text-blue-600 shrink-0" />
      )}
    </motion.button>
  );
}

// ─── Selected trigger badge ────────────────────────────────────────────────────
function SelectedTriggerBadge({
  trigger,
  onClear,
}: {
  trigger: TriggerDefinition;
  onClear: () => void;
}) {
  const styles = TRIGGER_COLOR_STYLES[trigger.color];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 bg-slate-50/60"
    >
      <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0 border border-slate-100", styles.light)}>
        <TriggerIcon name={trigger.iconName} size={13} className={styles.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Active Trigger</p>
        <p className="text-xs font-semibold text-slate-800 truncate">{trigger.label}</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        title="Remove trigger"
        className="p-1 rounded hover:bg-white transition-colors shrink-0"
      >
        <RotateCcw size={11} className="text-slate-400 hover:text-slate-600" />
      </button>
    </motion.div>
  );
}

// ─── Main TriggerSelector ─────────────────────────────────────────────────────
export interface TriggerSelectorProps {
  selectedTriggerId: string | null;
  onTriggerSelect: (trigger: TriggerDefinition) => void;
  onTriggerClear: () => void;
}

export function TriggerSelector({
  selectedTriggerId,
  onTriggerSelect,
  onTriggerClear,
}: TriggerSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(!selectedTriggerId);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTrigger = useMemo(
    () => TRIGGER_GROUPS.flatMap((g) => g.triggers).find((t) => t.id === selectedTriggerId) ?? null,
    [selectedTriggerId]
  );

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return TRIGGER_GROUPS;
    const q = searchQuery.toLowerCase();
    return TRIGGER_GROUPS.map((grp) => ({
      ...grp,
      triggers: grp.triggers.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.group.toLowerCase().includes(q)
      ),
    })).filter((grp) => grp.triggers.length > 0);
  }, [searchQuery]);

  const handleSelect = (trigger: TriggerDefinition) => {
    onTriggerSelect(trigger);
    setIsExpanded(false);
    setSearchQuery("");
  };

  const handleClear = () => {
    onTriggerClear();
    setIsExpanded(true);
  };

  return (
    <div className="shrink-0 border-b border-slate-100">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-5 h-5 rounded-md flex items-center justify-center shrink-0",
            selectedTrigger ? "bg-emerald-100" : "bg-amber-100"
          )}>
            <Zap size={11} className={selectedTrigger ? "text-emerald-600" : "text-amber-600"} />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">
              Step 1 — Choose Trigger
            </p>
            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
              {selectedTrigger ? selectedTrigger.label : "Required"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!selectedTrigger && (
            <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              Required
            </span>
          )}
          {selectedTrigger && (
            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <CheckCheck size={9} /> Set
            </span>
          )}
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronDown size={12} className="text-slate-400" />
          </motion.div>
        </div>
      </button>

      {/* Expanded picker */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="trigger-picker"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-2">
              {/* Active trigger display */}
              {selectedTrigger && (
                <SelectedTriggerBadge trigger={selectedTrigger} onClear={handleClear} />
              )}

              {/* Search */}
              <div className="relative flex items-center">
                <Search size={11} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search triggers…"
                  className="w-full pl-7 pr-6 py-1 rounded-md text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); inputRef.current?.focus(); }}
                    className="absolute right-2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Trigger groups */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {filteredGroups.map((grp) => (
                  <div key={grp.group}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                      {grp.group}
                    </p>
                    <div className="space-y-1">
                      {grp.triggers.map((t) => (
                        <TriggerCard
                          key={t.id}
                          trigger={t}
                          isSelected={selectedTriggerId === t.id}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {filteredGroups.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                    <Search size={16} className="mb-1 opacity-30" />
                    <p className="text-xs">No triggers match</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TriggerSelector;
