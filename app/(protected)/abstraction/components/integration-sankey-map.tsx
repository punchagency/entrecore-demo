"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export interface SankeyMappingRow {
  sourceColumn: string;
  targetColumn: string;
  status: "auto" | "review_suggested" | "unmatched";
  score?: number;
  transformation?: string;
}

interface IntegrationSankeyMapProps {
  mappings: SankeyMappingRow[];
  onMappingClick?: (sourceColumn: string, targetColumn: string) => void;
  className?: string;
}

const STATUS_PATH: Record<SankeyMappingRow["status"], string> = {
  auto: "#10b981",
  review_suggested: "#f59e0b",
  unmatched: "#94a3b8",
};

const ROW_H = 32;
const ROW_GAP = 6;
const LABEL_W = 200;
const BAR_W = 6;
const PADDING_Y = 20;
const PATH_STROKE = 18;
const MAX_VISIBLE_H = 520;

function curvePath(x1: number, y1: number, x2: number, y2: number) {
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

export function IntegrationSankeyMap({
  mappings,
  onMappingClick,
  className,
}: IntegrationSankeyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [width, setWidth] = useState(720);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    setWidth(containerRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const filteredMappings = useMemo(() => {
    if (!search.trim()) return mappings;
    const q = search.toLowerCase();
    return mappings.filter(
      (m) =>
        m.sourceColumn.toLowerCase().includes(q) ||
        m.targetColumn.toLowerCase().includes(q)
    );
  }, [mappings, search]);

  const stats = useMemo(
    () => ({
      auto: mappings.filter((m) => m.status === "auto").length,
      review: mappings.filter((m) => m.status === "review_suggested").length,
      unmatched: mappings.filter((m) => m.status === "unmatched").length,
    }),
    [mappings]
  );

  const { sourceRows, targetRows, paths, svgHeight } = useMemo(() => {
    const uniqueSources = Array.from(new Set(filteredMappings.map((m) => m.sourceColumn))).sort();
    const uniqueTargets = Array.from(new Set(filteredMappings.map((m) => m.targetColumn))).sort();

    const rowH = ROW_H + ROW_GAP;
    const svgH = Math.max(uniqueSources.length, uniqueTargets.length) * rowH + PADDING_Y * 2;

    const srcMap = new Map(uniqueSources.map((col, i) => [col, PADDING_Y + i * rowH + ROW_H / 2]));
    const tgtMap = new Map(uniqueTargets.map((col, i) => [col, PADDING_Y + i * rowH + ROW_H / 2]));

    const leftEdge = LABEL_W + BAR_W + 8;
    const rightEdge = width - LABEL_W - 8;

    const builtPaths = filteredMappings.map((m) => {
      const sy = srcMap.get(m.sourceColumn) ?? PADDING_Y;
      const ty = tgtMap.get(m.targetColumn) ?? PADDING_Y;
      return {
        d: curvePath(leftEdge, sy, rightEdge, ty),
        color: STATUS_PATH[m.status],
        status: m.status,
        score: m.score,
        sourceColumn: m.sourceColumn,
        targetColumn: m.targetColumn,
        transformation: m.transformation,
      };
    });

    return {
      sourceRows: uniqueSources.map((col) => ({ col, y: srcMap.get(col)! })),
      targetRows: uniqueTargets.map((col) => ({ col, y: tgtMap.get(col)! })),
      paths: builtPaths,
      svgHeight: svgH,
    };
  }, [filteredMappings, width]);

  if (mappings.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-40 text-sm text-slate-400 rounded-xl border border-dashed border-slate-200", className)}>
        No mappings to display. Run Suggest Mappings first.
      </div>
    );
  }

  const rightX = width - LABEL_W;

  return (
    <div ref={containerRef} className={cn("w-full space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px] rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">
          {stats.auto} auto
        </Badge>
        <Badge variant="outline" className="text-[10px] rounded-full bg-amber-50 text-amber-700 border-amber-200">
          {stats.review} need review
        </Badge>
        {stats.unmatched > 0 && (
          <Badge variant="outline" className="text-[10px] rounded-full bg-slate-50 text-slate-500 border-slate-200">
            {stats.unmatched} unmatched
          </Badge>
        )}
        <div className="relative ml-auto w-full sm:w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter flows…"
            className="h-8 pl-8 text-xs rounded-lg"
          />
        </div>
      </div>

      <div
        className="relative rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white overflow-auto"
        style={{ maxHeight: MAX_VISIBLE_H }}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 bg-white/95 backdrop-blur border-b border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Source · {sourceTableLabel(filteredMappings.length, mappings.length)}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            Target
          </span>
        </div>

        <svg
          width={width}
          height={svgHeight}
          viewBox={`0 0 ${width} ${svgHeight}`}
          className="block min-w-full"
        >
          {sourceRows.map(({ col, y }) => {
            const status =
              filteredMappings.find((m) => m.sourceColumn === col)?.status ?? "auto";
            return (
              <g key={`src-${col}`}>
                <rect
                  x={LABEL_W}
                  y={y - ROW_H / 2 + 4}
                  width={BAR_W}
                  height={ROW_H - 8}
                  rx={2}
                  fill={STATUS_PATH[status]}
                />
                <text
                  x={LABEL_W - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={11}
                  fontFamily="ui-monospace, monospace"
                  fill="#334155"
                  fontWeight={500}
                >
                  {truncate(col, 28)}
                </text>
              </g>
            );
          })}

          {targetRows.map(({ col, y }) => (
            <g key={`tgt-${col}`}>
              <rect
                x={rightX + 2}
                y={y - ROW_H / 2 + 4}
                width={BAR_W}
                height={ROW_H - 8}
                rx={2}
                fill="#059669"
                opacity={0.7}
              />
              <text
                x={rightX + BAR_W + 10}
                y={y + 4}
                textAnchor="start"
                fontSize={11}
                fontFamily="ui-monospace, monospace"
                fill="#047857"
                fontWeight={500}
              >
                {truncate(col, 28)}
              </text>
            </g>
          ))}

          <g>
            {paths.map((p, i) => {
              const isHovered = hoveredIndex === i;
              const isOtherHovered = hoveredIndex !== null && !isHovered;
              return (
                <path
                  key={`path-${i}`}
                  d={p.d}
                  stroke={p.color}
                  strokeWidth={PATH_STROKE}
                  strokeOpacity={isOtherHovered ? 0.06 : isHovered ? 0.75 : 0.35}
                  fill="none"
                  strokeLinecap="round"
                  style={{ cursor: onMappingClick ? "pointer" : "default" }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => onMappingClick?.(p.sourceColumn, p.targetColumn)}
                />
              );
            })}
          </g>

          {hoveredIndex !== null && (() => {
            const p = paths[hoveredIndex];
            const srcY = sourceRows.find((r) => r.col === p.sourceColumn)?.y ?? 0;
            const tgtY = targetRows.find((r) => r.col === p.targetColumn)?.y ?? 0;
            const midY = (srcY + tgtY) / 2;
            const midX = width / 2;
            const tooltipH = p.transformation ? 68 : 54;
            return (
              <g pointerEvents="none">
                <rect
                  x={midX - 100}
                  y={midY - tooltipH / 2}
                  width={200}
                  height={tooltipH}
                  rx={10}
                  fill="white"
                  stroke={p.color}
                  strokeWidth={1.5}
                  filter="drop-shadow(0 2px 8px rgba(0,0,0,0.12))"
                />
                <text x={midX} y={midY - 12} textAnchor="middle" fontSize={10} fill="#64748b" fontWeight={600}>
                  {truncate(p.sourceColumn, 22)} → {truncate(p.targetColumn, 22)}
                </text>
                {p.score !== undefined && (
                  <text x={midX} y={midY + 4} textAnchor="middle" fontSize={10} fill="#475569">
                    Confidence: {Math.round(p.score * 100)}%
                  </text>
                )}
                {p.transformation ? (
                  <text x={midX} y={midY + 20} textAnchor="middle" fontSize={9} fill="#6366f1" fontStyle="italic">
                    {p.transformation}
                  </text>
                ) : (
                  <text x={midX} y={midY + 20} textAnchor="middle" fontSize={9} fill="#94a3b8">
                    direct mapping
                  </text>
                )}
              </g>
            );
          })()}
        </svg>
      </div>

      <p className="text-[10px] text-slate-400 text-center">
        Straight flows = 1:1 name matches. Curved flows = remapped columns. Click a flow to review.
      </p>
    </div>
  );
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function sourceTableLabel(filtered: number, total: number) {
  return filtered === total ? `${total} fields` : `${filtered} of ${total} fields`;
}
