"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, GripVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoutingRule } from "../hooks/use-routing-rules";
import { isConditionGroup } from "../services/routing-rules-api";
import { countLeafConditions } from "./routing-rule-condition-builder";

const AUTO_SCROLL_EDGE_PX = 120;
/** px/s at the edge of the scroll zone (Spotify-style fast list scroll) */
const AUTO_SCROLL_MAX_SPEED = 2200;
/** px/s when cursor just enters the edge zone */
const AUTO_SCROLL_MIN_SPEED = 420;

function getAutoScrollVelocity(container: HTMLElement, clientY: number): number {
  const rect = container.getBoundingClientRect();
  const distanceFromTop = clientY - rect.top;
  const distanceFromBottom = rect.bottom - clientY;
  const maxScroll = container.scrollHeight - container.clientHeight;

  if (maxScroll <= 0) return 0;

  let intensity = 0;
  let direction = 0;

  if (distanceFromTop >= 0 && distanceFromTop < AUTO_SCROLL_EDGE_PX && container.scrollTop > 0) {
    const t = distanceFromTop / AUTO_SCROLL_EDGE_PX;
    // Cubic curve — ramps quickly near the edge, like native list auto-scroll.
    intensity = 1 - t * t * t;
    direction = -1;
  } else if (
    distanceFromBottom >= 0 &&
    distanceFromBottom < AUTO_SCROLL_EDGE_PX &&
    container.scrollTop < maxScroll - 1
  ) {
    const t = distanceFromBottom / AUTO_SCROLL_EDGE_PX;
    intensity = 1 - t * t * t;
    direction = 1;
  }

  if (direction === 0 || intensity <= 0) return 0;

  const speed =
    AUTO_SCROLL_MIN_SPEED + (AUTO_SCROLL_MAX_SPEED - AUTO_SCROLL_MIN_SPEED) * intensity;
  return direction * speed;
}

function applyAutoScroll(container: HTMLElement, clientY: number, deltaMs: number) {
  const velocity = getAutoScrollVelocity(container, clientY);
  if (velocity === 0 || deltaMs <= 0) return;
  container.scrollTop += velocity * (deltaMs / 1000);
}

type RoutingRulesSortableTableProps = {
  rules: RoutingRule[];
  reorderPending: boolean;
  duplicatePending: boolean;
  deletePending: boolean;
  formatRuleMatchSummary: (rule: RoutingRule) => string;
  onReorder: (orderedIds: string[]) => void;
  onEdit: (rule: RoutingRule) => void;
  onDuplicate: (rule: RoutingRule) => void;
  onDelete: (rule: RoutingRule) => void;
  /** Heading for the destination column. Defaults to the Drive-filing label. */
  destinationHeader?: string;
  /**
   * Renders the destination cell. Defaults to the rule's `target_folder`; the
   * integration editor passes a renderer that resolves the job/bundle name.
   */
  renderDestination?: (rule: RoutingRule) => React.ReactNode;
};

export function RoutingRulesSortableTable({
  rules,
  reorderPending,
  duplicatePending,
  deletePending,
  formatRuleMatchSummary,
  onReorder,
  onEdit,
  onDuplicate,
  onDelete,
  destinationHeader = "Target Folder",
  renderDestination,
}: RoutingRulesSortableTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pointerYRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (dragIndex == null) {
      lastFrameRef.current = null;
      return;
    }

    const trackPointer = (event: DragEvent) => {
      pointerYRef.current = event.clientY;
    };

    const tick = (now: number) => {
      const last = lastFrameRef.current ?? now;
      const deltaMs = Math.min(now - last, 32);
      lastFrameRef.current = now;

      const container = scrollRef.current;
      if (container) {
        applyAutoScroll(container, pointerYRef.current, deltaMs);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    document.addEventListener("dragover", trackPointer, { passive: false });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("dragover", trackPointer);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameRef.current = null;
    };
  }, [dragIndex]);

  const finishReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const ordered = [...rules];
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);
    onReorder(ordered.map((rule) => rule.id));
  };

  const resetDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleRowDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    pointerYRef.current = event.clientY;
    setOverIndex(index);
  };

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto overflow-y-auto max-h-[min(70vh,720px)] overscroll-contain"
      onDragOver={(event) => {
        if (dragIndex == null) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        pointerYRef.current = event.clientY;
      }}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(241_245_249)]">
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
            <TableHead className="pl-6 text-xs font-bold uppercase tracking-wider text-slate-500 w-20 bg-slate-50/95">
              Order
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/95">
              Rule ID
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/95">
              Match
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/95">
              {destinationHeader}
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/95">
              Source
            </TableHead>
            <TableHead className="pr-6 text-xs font-bold uppercase tracking-wider text-slate-500 text-right bg-slate-50/95">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule, index) => (
            <TableRow
              key={rule.id}
              draggable={!reorderPending}
              onDragStart={(event) => {
                setDragIndex(index);
                pointerYRef.current = event.clientY;
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => handleRowDragOver(event, index)}
              onDragLeave={() => setOverIndex((current) => (current === index ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex != null) finishReorder(dragIndex, index);
                resetDrag();
              }}
              onDragEnd={resetDrag}
              className={cn(
                "hover:bg-slate-50/50 transition-colors",
                dragIndex === index && "opacity-50",
                overIndex === index && dragIndex !== index && "bg-indigo-50/70 ring-1 ring-inset ring-indigo-200"
              )}
            >
              <TableCell className="pl-6 py-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 p-1 rounded-md touch-none"
                    aria-label={`Drag to reorder ${rule.rule_id}`}
                    disabled={reorderPending}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-500 w-5">{rule.priority + 1}</span>
                </div>
              </TableCell>
              <TableCell className="py-4 font-semibold text-slate-800">{rule.rule_id}</TableCell>
              <TableCell className="py-4">
                <div className="space-y-1">
                  {rule.conditions && rule.conditions.length > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-violet-50/50 text-violet-800 border-violet-100 text-[10px] px-1.5 py-0.5 rounded-md"
                    >
                      {rule.match_mode === "all" ? "ALL" : "ANY"} ·{" "}
                      {countLeafConditions(rule.conditions)} conditions
                      {rule.conditions.some(isConditionGroup) ? " · nested" : ""}
                    </Badge>
                  ) : null}
                  <Badge
                    variant="outline"
                    className="bg-amber-50/50 text-amber-800 border-amber-100 font-mono text-[10px] px-1.5 py-0.5 rounded-md max-w-[260px] truncate block"
                  >
                    {formatRuleMatchSummary(rule)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="py-4">
                {renderDestination ? (
                  renderDestination(rule)
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-teal-50/50 text-teal-700 border-teal-100 font-mono text-[10px] px-1.5 py-0.5 rounded-md max-w-[260px] truncate"
                  >
                    {rule.target_folder}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="py-4 text-xs text-slate-500">{rule.source}</TableCell>
              <TableCell className="pr-6 py-4">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(rule)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={duplicatePending}
                    onClick={() => onDuplicate(rule)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-600 hover:text-rose-700"
                    disabled={deletePending}
                    onClick={() => onDelete(rule)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
