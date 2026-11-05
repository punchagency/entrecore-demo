"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrationTargetLink, TargetRelationship } from "../services/integration-targets";

interface IntegrationTargetsBarProps {
  targets: IntegrationTargetLink[];
  activeTargetId?: string;
  availableTables: string[];
  sourceColumns: string[];
  onSelectTarget: (targetId: string) => void;
  onAddTarget: (target: Omit<IntegrationTargetLink, "id">) => void;
  onRemoveTarget: (targetId: string) => void;
  onRemoveAllTargets?: () => void;
}

export function IntegrationTargetsBar({
  targets,
  activeTargetId,
  availableTables,
  sourceColumns,
  onSelectTarget,
  onAddTarget,
  onRemoveTarget,
  onRemoveAllTargets,
}: IntegrationTargetsBarProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTable, setNewTable] = useState("");
  const [relationship, setRelationship] = useState<TargetRelationship>("1:1");
  const [linkColumn, setLinkColumn] = useState("id");

  const unusedTables = availableTables.filter(
    (table) => !targets.some((t) => t.destinationTable === table)
  );

  function handleAdd() {
    if (!newTable.trim()) return;
    onAddTarget({
      destinationTable: newTable,
      destinationConnector: targets[0]?.destinationConnector ?? "airtable",
      relationship,
      linkColumn: linkColumn || "id",
      label: newTable,
    });
    setNewTable("");
    setIsAdding(false);
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mr-1">
          Targets
        </span>
        {targets.map((target) => {
          const isActive = target.id === activeTargetId;
          const displayName = target.label ?? target.destinationTable;
          return (
            <Tooltip key={target.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelectTarget(target.id)}
                  className={cn(
                    "group flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border text-xs font-medium transition-all",
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                  )}
                >
                  <span className="truncate max-w-[140px]">{displayName}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] rounded-full px-1.5",
                      isActive ? "border-white/40 text-white bg-white/10" : "border-slate-200"
                    )}
                  >
                    {target.relationship}
                  </Badge>
                  {targets.length > 1 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTarget(target.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          onRemoveTarget(target.id);
                        }
                      }}
                      className={cn(
                        "p-0.5 rounded-md opacity-60 hover:opacity-100",
                        isActive ? "hover:bg-white/20" : "hover:bg-slate-100"
                      )}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-xs">
                {target.destinationTable}
              </TooltipContent>
            </Tooltip>
          );
        })}
        {!isAdding && unusedTables.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs gap-1 border-dashed"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add target
          </Button>
        )}
        {targets.length > 1 && onRemoveAllTargets && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-xl text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            onClick={onRemoveAllTargets}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all ({targets.length})
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="flex flex-wrap items-end gap-2 p-3 rounded-xl border border-indigo-200 bg-indigo-50/40">
          <div className="space-y-1 min-w-[180px]">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Destination table</p>
            <Select value={newTable} onValueChange={setNewTable}>
              <SelectTrigger className="h-8 text-xs rounded-lg bg-white">
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent>
                {unusedTables.map((table) => (
                  <SelectItem key={table} value={table} className="text-xs">
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Relationship</p>
            <Select value={relationship} onValueChange={(v) => setRelationship(v as TargetRelationship)}>
              <SelectTrigger className="h-8 w-24 text-xs rounded-lg bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">1:1</SelectItem>
                <SelectItem value="1:N">1:N</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[120px]">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Link column</p>
            {sourceColumns.length > 0 ? (
              <Select value={linkColumn} onValueChange={setLinkColumn}>
                <SelectTrigger className="h-8 text-xs rounded-lg bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceColumns.map((col) => (
                    <SelectItem key={col} value={col} className="text-xs font-mono">
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={linkColumn}
                onChange={(e) => setLinkColumn(e.target.value)}
                className="h-8 text-xs rounded-lg bg-white"
                placeholder="id"
              />
            )}
          </div>
          <Button size="sm" className="h-8 rounded-lg text-xs" onClick={handleAdd} disabled={!newTable}>
            Add
          </Button>
          <Button size="sm" variant="ghost" className="h-8 rounded-lg text-xs" onClick={() => setIsAdding(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
