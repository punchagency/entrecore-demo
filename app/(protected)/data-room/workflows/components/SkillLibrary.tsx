"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, ChevronRight, ChevronDown,
  Mail, Database, GitMerge, BarChart2, Sparkles, Plug,
  Users, Briefcase, Server, FolderOpen, Globe, Clock, Cpu,
  ShieldCheck, FileText, BookOpen, Plus, GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SKILL_CATEGORIES, SkillCategory, SkillAction, ActionColor } from "./skill-library-data";

// ─── Icon resolver ─────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Mail, Database, GitMerge, BarChart2, Sparkles, Plug,
  Users, Briefcase, Server, FolderOpen, Globe, Clock, Cpu,
  ShieldCheck, FileText,
};

function CategoryIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[name] ?? BookOpen;
  return <Icon size={size} className={className} />;
}

// ─── Color system (icon tint & dot accents) ───────────────────────────────────
const COLOR_STYLES: Record<ActionColor, { iconBg: string; iconText: string; dot: string; text: string }> = {
  blue:    { iconBg: "bg-blue-50",    iconText: "text-blue-600",    dot: "bg-blue-500",    text: "text-blue-600" },
  violet:  { iconBg: "bg-violet-50",  iconText: "text-violet-600",  dot: "bg-violet-500",  text: "text-violet-600" },
  indigo:  { iconBg: "bg-indigo-50",  iconText: "text-indigo-600",  dot: "bg-indigo-500",  text: "text-indigo-600" },
  cyan:    { iconBg: "bg-cyan-50",    iconText: "text-cyan-600",    dot: "bg-cyan-500",    text: "text-cyan-600" },
  teal:    { iconBg: "bg-teal-50",    iconText: "text-teal-600",    dot: "bg-teal-500",    text: "text-teal-600" },
  emerald: { iconBg: "bg-emerald-50", iconText: "text-emerald-600", dot: "bg-emerald-500", text: "text-emerald-600" },
  green:   { iconBg: "bg-green-50",   iconText: "text-green-600",   dot: "bg-green-500",   text: "text-green-600" },
  amber:   { iconBg: "bg-amber-50",   iconText: "text-amber-600",   dot: "bg-amber-500",   text: "text-amber-600" },
  orange:  { iconBg: "bg-orange-50",  iconText: "text-orange-600",  dot: "bg-orange-500",  text: "text-orange-600" },
  rose:    { iconBg: "bg-rose-50",    iconText: "text-rose-600",    dot: "bg-rose-500",    text: "text-rose-600" },
  pink:    { iconBg: "bg-pink-50",    iconText: "text-pink-600",    dot: "bg-pink-500",    text: "text-pink-600" },
  purple:  { iconBg: "bg-purple-50",  iconText: "text-purple-600",  dot: "bg-purple-500",  text: "text-purple-600" },
  slate:   { iconBg: "bg-slate-100",  iconText: "text-slate-600",   dot: "bg-slate-500",   text: "text-slate-600" },
  red:     { iconBg: "bg-red-50",     iconText: "text-red-600",     dot: "bg-red-500",     text: "text-red-600" },
  fuchsia: { iconBg: "bg-fuchsia-50", iconText: "text-fuchsia-600", dot: "bg-fuchsia-500", text: "text-fuchsia-600" },
};

import { hasVariableX } from "./node-variable-meta";

// ─── Action row ────────────────────────────────────────────────────────────────
function ActionRow({ action, color, onSelect }: {
  action: SkillAction;
  color: ActionColor;
  onSelect: (action: SkillAction) => void;
}) {
  const styles = COLOR_STYLES[color];
  const isVar = Boolean(action.hasVariable || hasVariableX(action.label));

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({
        label: action.label,
        originalLabel: action.label,
        description: action.description,
        color,
        hasVariable: isVar,
        variableName: isVar ? "x" : undefined,
        variableConfirmed: false,
      })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => onSelect(action)}
      className="group flex items-center gap-2 px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-xs transition-all cursor-grab active:cursor-grabbing"
    >
      <GripVertical size={11} className="text-slate-300 shrink-0 group-hover:text-slate-400 transition-colors" />
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", styles.dot)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-slate-700 group-hover:text-slate-900 truncate leading-snug">
            {action.label}
          </p>
          {isVar && (
            <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0 leading-none">
              x
            </span>
          )}
        </div>
        {action.description && (
          <p className="text-[10px] text-slate-400 truncate leading-tight">
            {action.description}
          </p>
        )}
      </div>
      <Plus
        size={12}
        className="shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-blue-600 transition-all"
      />
    </div>
  );
}

// ─── Category card ─────────────────────────────────────────────────────────────
function CategoryCard({
  category,
  isExpanded,
  onToggle,
  onSelect,
  searchQuery,
}: {
  category: SkillCategory;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (action: SkillAction, category: SkillCategory) => void;
  searchQuery: string;
}) {
  const styles = COLOR_STYLES[category.color];

  const filteredActions = useMemo(() => {
    if (!searchQuery) return category.actions;
    const q = searchQuery.toLowerCase();
    return category.actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q)
    );
  }, [category.actions, searchQuery]);

  if (searchQuery && filteredActions.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition-all duration-150 hover:border-slate-300">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50/70 transition-colors"
      >
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0 border border-slate-100", styles.iconBg)}>
          <CategoryIcon name={category.iconName} size={13} className={styles.iconText} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{category.title}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {filteredActions.length} action{filteredActions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown size={13} className="text-slate-400 shrink-0" />
        </motion.div>
      </button>

      {/* Action list */}
      <AnimatePresence initial={false}>
        {(isExpanded || searchQuery) && (
          <motion.div
            key="actions"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 pt-1 flex flex-col gap-0.5 border-t border-slate-100 bg-slate-50/30">
              {filteredActions.map((action) => (
                <ActionRow
                  key={action.label}
                  action={action}
                  color={category.color}
                  onSelect={(a) => onSelect(a, category)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Category pill filter ──────────────────────────────────────────────────────
function CategoryPill({
  category,
  isActive,
  onClick,
}: {
  category: SkillCategory;
  isActive: boolean;
  onClick: () => void;
}) {
  const styles = COLOR_STYLES[category.color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all whitespace-nowrap shrink-0",
        isActive
          ? "bg-slate-900 text-white shadow-xs font-semibold"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", styles.dot)} />
      {category.title.split(" ")[0]}
    </button>
  );
}

// ─── Main SkillLibrary component ───────────────────────────────────────────────
export interface SkillLibraryProps {
  onActionSelect?: (action: SkillAction, category: SkillCategory) => void;
  className?: string;
}

export function SkillLibrary({ onActionSelect, className }: SkillLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleCategory = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(SKILL_CATEGORIES.map((c) => c.id)));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const handleSelect = useCallback(
    (action: SkillAction, category: SkillCategory) => {
      onActionSelect?.(action, category);
    },
    [onActionSelect]
  );

  const visibleCategories = useMemo(() => {
    let cats = SKILL_CATEGORIES;
    if (activeFilter) {
      cats = cats.filter((c) => c.id === activeFilter);
    }
    return cats;
  }, [activeFilter]);

  const totalActions = useMemo(
    () => SKILL_CATEGORIES.reduce((sum, c) => sum + c.actions.length, 0),
    []
  );

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* ── Header ── */}
      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <BookOpen size={11} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 leading-tight">Skill Library</h2>
              <p className="text-[10px] text-slate-400">
                {SKILL_CATEGORIES.length} categories · {totalActions} actions
              </p>
            </div>
          </div>

          {!searchQuery && (
            <div className="flex gap-1.5 text-[10px]">
              <button type="button" onClick={expandAll} className="font-medium text-blue-600 hover:text-blue-700">
                Expand
              </button>
              <span className="text-slate-300">·</span>
              <button type="button" onClick={collapseAll} className="font-medium text-slate-400 hover:text-slate-600">
                Collapse
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <Search size={12} className="absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search actions…"
            className={cn(
              "w-full pl-7 pr-6 py-1 rounded-md text-xs",
              "bg-slate-50 border border-slate-200",
              "focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500",
              "placeholder:text-slate-400 transition-all"
            )}
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
      </div>

      {/* ── Category pill filters ── */}
      {!searchQuery && (
        <div className="shrink-0 flex gap-1 px-3 py-1.5 overflow-x-auto border-b border-slate-100 scrollbar-hide">
          <button
            type="button"
            onClick={() => setActiveFilter(null)}
            className={cn(
              "flex items-center px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap shrink-0 transition-all",
              activeFilter === null
                ? "bg-slate-900 text-white font-semibold shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
            )}
          >
            All
          </button>
          {SKILL_CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat.id}
              category={cat}
              isActive={activeFilter === cat.id}
              onClick={() => setActiveFilter(activeFilter === cat.id ? null : cat.id)}
            />
          ))}
        </div>
      )}

      {/* ── Scrollable list ── */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {searchQuery ? (
          <>
            {SKILL_CATEGORIES.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                isExpanded={true}
                onToggle={() => {}}
                onSelect={handleSelect}
                searchQuery={searchQuery}
              />
            ))}
            {SKILL_CATEGORIES.every(
              (c) => !c.actions.some(
                (a) =>
                  a.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (a.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
              )
            ) && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Search size={20} className="mb-1.5 opacity-30" />
                <p className="text-xs font-medium">No actions found</p>
                <p className="text-[10px] mt-0.5">Try a different keyword</p>
              </div>
            )}
          </>
        ) : (
          visibleCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              isExpanded={expandedIds.has(cat.id)}
              onToggle={() => toggleCategory(cat.id)}
              onSelect={handleSelect}
              searchQuery=""
            />
          ))
        )}
      </div>

      {/* ── Footer hint ── */}
      <div className="shrink-0 px-3 py-1.5 border-t border-slate-100 bg-slate-50">
        <p className="text-[10px] text-slate-400 text-center leading-relaxed">
          Drag action to canvas or click <Plus size={8} className="inline -mt-0.5" /> to add
        </p>
      </div>
    </div>
  );
}

export default SkillLibrary;
