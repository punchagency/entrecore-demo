"use client";

import { useState } from "react";
import {
  Database,
  FileText,
  Table2,
  Lightbulb,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Loader2,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuggestedEntities } from "@/hooks/useVerticals";
import { VerticalBadges } from "@/components/vertical-badges";
import { getVerticalConfig } from "@/utils/vertical-constants";
import { motion, AnimatePresence } from "framer-motion";

interface SuggestedEntitiesPanelProps {
  guideId: string;
  className?: string;
}

const ENTITY_TYPE_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  db_table: {
    icon: <Table2 className="w-4 h-4" />,
    label: "Database Table",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  dataset: {
    icon: <Database className="w-4 h-4" />,
    label: "Dataset",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  document: {
    icon: <FileText className="w-4 h-4" />,
    label: "Document",
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  glossary: {
    icon: <FileText className="w-4 h-4" />,
    label: "Glossary",
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  dashboard: {
    icon: <Box className="w-4 h-4" />,
    label: "Dashboard",
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
  model: {
    icon: <Sparkles className="w-4 h-4" />,
    label: "Model",
    color: "text-pink-600 bg-pink-50 border-pink-200",
  },
};

const getEntityMeta = (type: string) => {
  return (
    ENTITY_TYPE_META[type] || {
      icon: <Database className="w-4 h-4" />,
      label: type.replace("_", " "),
      color: "text-slate-600 bg-slate-50 border-slate-200",
    }
  );
};

export function SuggestedEntitiesPanel({
  guideId,
  className,
}: SuggestedEntitiesPanelProps) {
  const [filterType, setFilterType] = useState<string>("");
  const { data, isLoading, error } = useSuggestedEntities(
    guideId,
    filterType || undefined
  );

  const entities = data?.entities || [];
  const guideVerticals = data?.verticals || [];

  return (
    <Card
      className={cn(
        "border border-slate-200/60 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200/50">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold text-slate-900 tracking-tight">
                Suggested Data Assets
              </CardTitle>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Entities sharing vertical tags with this guide
              </p>
            </div>
          </div>
          {guideVerticals.length > 0 && (
            <VerticalBadges verticalKeys={guideVerticals} max={3} size="sm" />
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Entity type filter pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setFilterType("")}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all",
              !filterType
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
            )}
          >
            All
          </button>
          {["db_table", "dataset", "document", "glossary", "dashboard"].map(
            (type) => {
              const meta = getEntityMeta(type);
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(filterType === type ? "" : type)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all",
                    filterType === type
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  )}
                >
                  {meta.label}
                </button>
              );
            }
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="py-10 text-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">
              Discovering related assets…
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && entities.length === 0 && (
          <div className="py-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-bold">
              No suggestions yet
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-[260px] mx-auto">
              Tag this guide with verticals to discover related data assets
              automatically
            </p>
          </div>
        )}

        {/* Entity list */}
        {!isLoading && entities.length > 0 && (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {entities.map((entity, idx) => {
                const meta = getEntityMeta(entity.entity_type);
                const vCfg = getVerticalConfig(entity.vertical_key);

                return (
                  <motion.div
                    key={entity.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: idx * 0.04 }}
                    className="group flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all duration-200"
                  >
                    {/* Entity type icon */}
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                        meta.color
                      )}
                    >
                      {meta.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {entity.entity_id.slice(0, 8)}…
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0 border-slate-200 text-slate-500"
                        >
                          {meta.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0 border",
                            vCfg.bgClass,
                            vCfg.textClass,
                            vCfg.borderClass
                          )}
                        >
                          <span
                            className={cn(
                              "w-1 h-1 rounded-full mr-1",
                              vCfg.dotClass
                            )}
                          />
                          {vCfg.name}
                        </Badge>
                      </div>
                    </div>

                    {/* Source pill */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 shrink-0",
                        entity.tag_source === "automated"
                          ? "bg-violet-50 text-violet-600 border-violet-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      )}
                    >
                      {entity.tag_source}
                    </Badge>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Count footer */}
            <div className="pt-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {data?.count || entities.length} suggestions discovered
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
