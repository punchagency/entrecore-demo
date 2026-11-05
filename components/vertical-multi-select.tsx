"use client";

import { useState, useMemo } from "react";
import { Check, ChevronDown, Search, X, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getVerticalConfig, VERTICAL_ORDER } from "@/utils/vertical-constants";
import { useAllVerticals } from "@/hooks/useVerticals";
import { motion, AnimatePresence } from "framer-motion";

interface VerticalMultiSelectProps {
  /** Currently selected vertical keys */
  value: string[];
  /** Callback when selection changes */
  onChange: (keys: string[]) => void;
  /** Placeholder text when nothing selected */
  placeholder?: string;
  /** Compact mode — smaller badges, inline style */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Maximum number of selectable verticals */
  maxSelections?: number;
  /** CSS class overrides */
  className?: string;
}

export function VerticalMultiSelect({
  value,
  onChange,
  placeholder = "Select enterprise verticals…",
  compact = false,
  disabled = false,
  maxSelections,
  className,
}: VerticalMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: verticals = [], isLoading } = useAllVerticals();

  // Use API data if available, otherwise fall back to VERTICAL_ORDER
  const allKeys = useMemo(() => {
    if (verticals.length > 0) return verticals.map((v) => v.key);
    return [...VERTICAL_ORDER];
  }, [verticals]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allKeys;
    const q = search.toLowerCase();
    return allKeys.filter((key) => {
      const cfg = getVerticalConfig(key);
      return (
        cfg.name.toLowerCase().includes(q) ||
        key.toLowerCase().includes(q)
      );
    });
  }, [search, allKeys]);

  const toggle = (key: string) => {
    if (value.includes(key)) {
      onChange(value.filter((k) => k !== key));
    } else {
      if (maxSelections && value.length >= maxSelections) return;
      onChange([...value, key]);
    }
  };

  const removeAll = () => onChange([]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between min-h-[44px] h-auto py-2 px-3 font-medium",
            "border-slate-200 hover:border-primary/40 hover:bg-slate-50/50",
            "transition-all duration-200",
            compact && "min-h-[36px] text-xs",
            className
          )}
        >
          <div className="flex flex-wrap gap-1.5 items-center flex-1 mr-2">
            {value.length === 0 ? (
              <span className="text-slate-400 text-sm font-normal">
                {placeholder}
              </span>
            ) : (
              <>
                {value.slice(0, compact ? 2 : 4).map((key) => {
                  const cfg = getVerticalConfig(key);
                  return (
                    <Badge
                      key={key}
                      variant="outline"
                      className={cn(
                        "rounded-full text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 border",
                        "transition-all duration-200 hover:scale-105",
                        cfg.bgClass,
                        cfg.textClass,
                        cfg.borderClass
                      )}
                    >
                      <span
                        className={cn("w-1.5 h-1.5 rounded-full mr-1.5", cfg.dotClass)}
                      />
                      {cfg.name}
                    </Badge>
                  );
                })}
                {value.length > (compact ? 2 : 4) && (
                  <Badge
                    variant="outline"
                    className="rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border-slate-200 px-2.5 py-0.5"
                  >
                    +{value.length - (compact ? 2 : 4)} more
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {value.length > 0 && (
              <span
                role="button"
                className="p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAll();
                }}
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </span>
            )}
            <ChevronDown
              className={cn(
                "w-4 h-4 text-slate-400 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[360px] p-0 shadow-2xl border-0 rounded-2xl overflow-hidden"
        align="start"
        sideOffset={8}
      >
        {/* Search input */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search verticals…"
              className="pl-9 h-9 text-sm border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Vertical list */}
        <div className="max-h-[320px] overflow-y-auto p-2">
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">
                Loading verticals…
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center">
              <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">
                No verticals found
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((key) => {
                const cfg = getVerticalConfig(key);
                const isSelected = value.includes(key);
                const apiVertical = verticals.find((v) => v.key === key);
                const atLimit =
                  !isSelected && maxSelections
                    ? value.length >= maxSelections
                    : false;

                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    disabled={atLimit}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left",
                      "transition-all duration-150 group",
                      isSelected
                        ? `${cfg.bgClass} ${cfg.borderClass} border shadow-sm`
                        : "hover:bg-slate-50 border border-transparent",
                      atLimit && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {/* Check indicator */}
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center shrink-0",
                        "transition-all duration-200",
                        isSelected
                          ? `bg-gradient-to-br ${cfg.gradientFrom} ${cfg.gradientTo} shadow-sm`
                          : "border-2 border-slate-200 group-hover:border-slate-300"
                      )}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      )}
                    </div>

                    {/* Vertical dot */}
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        cfg.dotClass,
                        !isSelected && "opacity-50"
                      )}
                    />

                    {/* Label and description */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-bold leading-tight",
                          isSelected ? cfg.textClass : "text-slate-700"
                        )}
                      >
                        {cfg.name}
                      </p>
                      {apiVertical?.description && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 leading-tight">
                          {apiVertical.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {value.length} of {allKeys.length} selected
          </span>
          {value.length > 0 && (
            <button
              onClick={removeAll}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
