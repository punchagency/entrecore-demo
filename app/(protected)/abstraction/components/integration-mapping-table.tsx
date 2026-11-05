"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, CheckCircle2, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrationColumnMapping } from "@/app/(protected)/data-room/integrations/services/data-integration-api";

interface IntegrationMappingTableProps {
  mappings: IntegrationColumnMapping[];
  isReadOnly?: boolean;
  isBlocked?: (mapping: IntegrationColumnMapping) => boolean;
  onConfirm?: (sourceColumn: string, targetColumn: string) => void;
  onRemove?: (sourceColumn: string, targetColumn: string) => void;
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-14 rounded-full bg-slate-100 overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-slate-500">{pct}%</span>
    </div>
  );
}

export function IntegrationMappingTable({
  mappings,
  isReadOnly = false,
  isBlocked,
  onConfirm,
  onRemove,
}: IntegrationMappingTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return mappings;
    const q = search.toLowerCase();
    return mappings.filter(
      (m) =>
        m.source_column.toLowerCase().includes(q) ||
        m.destination_column.toLowerCase().includes(q) ||
        m.transformation?.toLowerCase().includes(q)
    );
  }, [mappings, search]);

  if (mappings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
        No mappings yet. Run Suggest Mappings to generate AI suggestions.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter columns…"
            className="h-8 pl-8 text-xs rounded-lg bg-white"
          />
        </div>
        <span className="text-[10px] text-slate-400 ml-auto">
          {filtered.length} of {mappings.length} mappings
        </span>
      </div>

      <div className="max-h-[560px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgb(226,232,240)]">
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-2.5 text-left w-[22%]">Source</th>
              <th className="px-3 py-2.5 text-left w-[18%]">Transformation</th>
              <th className="px-3 py-2.5 text-left w-[22%]">Target</th>
              <th className="px-3 py-2.5 text-left w-[14%]">Confidence</th>
              <th className="px-3 py-2.5 text-left w-[14%]">Status</th>
              <th className="px-3 py-2.5 w-[10%]" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((mapping, index) => {
              const blocked = isBlocked?.(mapping) ?? false;
              const confidence = mapping.match_confidence ?? "review_suggested";
              return (
                <tr
                  key={`${mapping.source_column}-${mapping.destination_column}-${index}`}
                  className={cn(
                    "border-b border-slate-100 transition-colors",
                    blocked && "bg-rose-50/70",
                    !blocked && index % 2 === 0 && "bg-white",
                    !blocked && index % 2 === 1 && "bg-slate-50/30"
                  )}
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {mapping.source_column || "—"}
                    </span>
                    {mapping.is_required && (
                      <span className="ml-1 text-rose-500 text-xs" title="Required">❗</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {mapping.transformation ? (
                      <code className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {mapping.transformation}
                      </code>
                    ) : (
                      <span className="text-[10px] text-slate-300 italic">direct</span>
                    )}
                    {mapping.data_type && (
                      <span className="block text-[9px] text-slate-400 mt-0.5">{mapping.data_type}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs font-semibold text-emerald-700">
                      {mapping.destination_column}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {mapping.match_score !== undefined ? (
                      <ConfidenceBar score={mapping.match_score} />
                    ) : (
                      <span className="text-[10px] text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] rounded-full gap-0.5",
                        confidence === "auto" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        confidence === "review_suggested" && "bg-amber-50 text-amber-700 border-amber-200",
                        confidence === "unmatched" && "bg-slate-50 text-slate-500 border-slate-200"
                      )}
                    >
                      {confidence === "auto" && <CheckCircle2 className="h-2.5 w-2.5" />}
                      {confidence === "auto" ? "Auto" : confidence === "review_suggested" ? "Review" : "Unmatched"}
                    </Badge>
                    {blocked && (
                      <Badge className="ml-1 bg-rose-100 text-rose-700 border-rose-200 text-[9px]">
                        blocked
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {!isReadOnly && (
                      <div className="flex items-center gap-0.5">
                        {confidence === "review_suggested" && onConfirm && (
                          <button
                            type="button"
                            onClick={() => onConfirm(mapping.source_column, mapping.destination_column)}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            title="Confirm mapping"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onRemove && (
                          <button
                            type="button"
                            onClick={() => onRemove(mapping.source_column, mapping.destination_column)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Remove mapping"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
