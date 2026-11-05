"use client";

import { useState } from "react";
import { Tag, Plus, X, Loader2, History, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useEntityTags,
  useTagEntity,
  useRemoveEntityTag,
  useAllVerticals,
  useEntityTagAudit,
} from "@/hooks/useVerticals";
import { getVerticalConfig, VERTICAL_ORDER } from "@/utils/vertical-constants";
import { VerticalBadges } from "@/components/vertical-badges";
import { type EntityType } from "@/utils/vertical-tagging-api";
import { motion, AnimatePresence } from "framer-motion";

interface EntityVerticalTaggerProps {
  /** Type of entity being tagged */
  entityType: EntityType;
  /** ID of the entity */
  entityId: string;
  /** Whether to show the audit trail */
  showAudit?: boolean;
  /** Additional class names */
  className?: string;
  /** Compact display mode */
  compact?: boolean;
}

export function EntityVerticalTagger({
  entityType,
  entityId,
  showAudit = false,
  className,
  compact = false,
}: EntityVerticalTaggerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const { data: tags = [], isLoading: isLoadingTags } = useEntityTags(
    entityType,
    entityId
  );
  const { data: allVerticals = [] } = useAllVerticals();
  const tagMutation = useTagEntity();
  const removeMutation = useRemoveEntityTag();

  const { data: auditData, isLoading: isLoadingAudit } = useEntityTagAudit(
    showAudit && auditOpen ? entityType : undefined,
    showAudit && auditOpen ? entityId : undefined
  );

  const activeKeys = tags
    .filter((t) => t.is_active !== false)
    .map((t) => t.vertical_key);

  const availableVerticals = [...VERTICAL_ORDER].filter(
    (key) => !activeKeys.includes(key)
  );

  const handleAdd = (verticalKey: string) => {
    tagMutation.mutate({
      entityType,
      entityId,
      verticalKey,
      tagSource: "manual",
    });
  };

  const handleRemove = (verticalKey: string) => {
    removeMutation.mutate({
      entityType,
      entityId,
      verticalKey,
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Current tags display */}
      <div className="flex items-center gap-2 flex-wrap">
        {isLoadingTags ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">
              Loading tags…
            </span>
          </div>
        ) : activeKeys.length === 0 ? (
          <span className="text-xs text-slate-400 font-medium italic">
            No vertical tags
          </span>
        ) : (
          <AnimatePresence mode="popLayout">
            {activeKeys.map((key) => {
              const cfg = getVerticalConfig(key);
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  layout
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 border group/badge",
                      "transition-all duration-200",
                      cfg.bgClass,
                      cfg.textClass,
                      cfg.borderClass
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full mr-1.5",
                        cfg.dotClass
                      )}
                    />
                    {cfg.name}
                    <button
                      onClick={() => handleRemove(key)}
                      disabled={removeMutation.isPending}
                      className="ml-1.5 p-0.5 rounded-full hover:bg-black/10 transition-colors opacity-0 group-hover/badge:opacity-100"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Add tag button */}
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 rounded-full text-slate-400 hover:text-primary hover:bg-primary/5 border border-dashed border-slate-200 hover:border-primary/30",
                "transition-all duration-200"
              )}
            >
              <Plus className="w-3 h-3 mr-1" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Tag
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[280px] p-0 shadow-2xl border-0 rounded-2xl overflow-hidden"
            align="start"
            sideOffset={8}
          >
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Add Vertical Tag
              </p>
            </div>
            <div className="max-h-[280px] overflow-y-auto p-2">
              {availableVerticals.length === 0 ? (
                <div className="py-6 text-center">
                  <Tag className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">
                    All verticals assigned
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {availableVerticals.map((key) => {
                    const cfg = getVerticalConfig(key);
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          handleAdd(key);
                          setAddOpen(false);
                        }}
                        disabled={tagMutation.isPending}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all group text-left"
                      >
                        <span
                          className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0",
                            cfg.dotClass
                          )}
                        />
                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">
                          {cfg.name}
                        </span>
                        <Plus className="w-3.5 h-3.5 text-slate-300 ml-auto group-hover:text-primary transition-colors" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Audit log toggle */}
        {showAudit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAuditOpen(!auditOpen)}
            className="h-7 px-2 rounded-full text-slate-400 hover:text-slate-600"
          >
            <History className="w-3 h-3 mr-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Audit
            </span>
            <ChevronRight
              className={cn(
                "w-3 h-3 ml-0.5 transition-transform",
                auditOpen && "rotate-90"
              )}
            />
          </Button>
        )}
      </div>

      {/* Audit trail section */}
      <AnimatePresence>
        {showAudit && auditOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Tag History
              </p>
              {isLoadingAudit ? (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <span className="text-xs text-slate-400">Loading…</span>
                </div>
              ) : (auditData?.audit_log?.length ?? 0) === 0 ? (
                <p className="text-xs text-slate-400 py-3 italic">
                  No audit history
                </p>
              ) : (
                <div className="space-y-1.5">
                  {auditData!.audit_log.map((entry, idx) => {
                    const cfg = getVerticalConfig(entry.vertical_key);
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white transition-colors"
                      >
                        <div
                          className={cn(
                            "w-1 h-1 rounded-full",
                            entry.action === "tag_added"
                              ? "bg-emerald-500"
                              : "bg-red-400"
                          )}
                        />
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            entry.action === "tag_added"
                              ? "text-emerald-600"
                              : "text-red-500"
                          )}
                        >
                          {entry.action === "tag_added" ? "Added" : "Removed"}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 border",
                            cfg.bgClass,
                            cfg.textClass,
                            cfg.borderClass
                          )}
                        >
                          {cfg.name}
                        </Badge>
                        <span className="ml-auto text-[10px] text-slate-400 font-medium">
                          {new Date(entry.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
