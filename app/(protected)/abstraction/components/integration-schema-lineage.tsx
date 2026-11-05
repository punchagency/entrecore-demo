"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IntegrationTargetLink } from "../services/integration-targets";

interface SchemaColumn {
  name: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

interface IntegrationSchemaLineageProps {
  sourceTable: string;
  sourceConnector: string;
  sourceColumns?: SchemaColumn[];
  targets: IntegrationTargetLink[];
  activeTargetId?: string;
  mappingCounts?: Record<string, number>;
  onSelectTarget?: (targetId: string) => void;
  className?: string;
}

const TARGET_COLORS = [
  { header: "#059669", line: "#059669" },
  { header: "#e11d48", line: "#e11d48" },
  { header: "#7c3aed", line: "#7c3aed" },
  { header: "#0891b2", line: "#0891b2" },
];

function truncate(value: string, max = 22) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function IntegrationSchemaLineage({
  sourceTable,
  sourceConnector,
  sourceColumns = [],
  targets,
  activeTargetId,
  mappingCounts = {},
  onSelectTarget,
  className,
}: IntegrationSchemaLineageProps) {
  const displaySourceColumns = useMemo(() => {
    if (sourceColumns.length > 0) return sourceColumns.slice(0, 8);
    return [{ name: "id", isPrimaryKey: true }];
  }, [sourceColumns]);

  if (targets.length === 0) {
    return (
      <div className={cn("rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400", className)}>
        Add a destination table to see schema lineage.
      </div>
    );
  }

  const svgW = Math.max(720, 280 + targets.length * 220);
  const sourceX = 40;
  const sourceW = 200;
  const targetStartX = sourceX + sourceW + 120;
  const targetW = 180;
  const rowH = 28;
  const headerH = 36;
  const tableH = headerH + displaySourceColumns.length * rowH + 12;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px] rounded-full">
          1 source → {targets.length} target{targets.length !== 1 ? "s" : ""}
        </Badge>
        <span className="text-[10px] text-slate-400">
          Click a target table to switch mapping context
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-[linear-gradient(to_right,#f8fafc_1px,transparent_1px),linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-[size:24px_24px] overflow-x-auto">
        <svg width={svgW} height={tableH + 40} className="block min-w-full">
          <g>
            <rect x={sourceX} y={20} width={sourceW} height={tableH} rx={10} fill="white" stroke="#cbd5e1" strokeWidth={1.5} />
            <rect x={sourceX} y={20} width={sourceW} height={headerH} rx={10} fill="#2563eb" />
            <rect x={sourceX} y={20 + headerH - 10} width={sourceW} height={10} fill="#2563eb" />
            <text x={sourceX + sourceW / 2} y={20 + 23} textAnchor="middle" fill="white" fontSize={11} fontWeight={700}>
              {truncate(sourceTable.toUpperCase(), 24)}
            </text>
            <text x={sourceX + sourceW / 2} y={20 + headerH - 6} textAnchor="middle" fill="#bfdbfe" fontSize={8}>
              {sourceConnector}
            </text>
            {displaySourceColumns.map((col, i) => (
              <g key={`${col.name}-${i}`}>
                <circle
                  cx={sourceX + 16}
                  cy={20 + headerH + 14 + i * rowH}
                  r={4}
                  fill={col.isPrimaryKey || col.isForeignKey ? "#fbbf24" : "#93c5fd"}
                />
                <text x={sourceX + 28} y={20 + headerH + 18 + i * rowH} fontSize={10} fontFamily="ui-monospace, monospace" fill="#334155">
                  {col.name}
                  {col.isPrimaryKey ? " (PK)" : col.isForeignKey ? " (FK)" : ""}
                </text>
              </g>
            ))}
          </g>

          {targets.map((target, index) => {
            const colors = TARGET_COLORS[index % TARGET_COLORS.length];
            const tx = targetStartX + index * (targetW + 60);
            const isActive = target.id === activeTargetId;
            const count = mappingCounts[target.id] ?? 0;
            const linkY = 20 + headerH + 14;

            return (
              <g
                key={target.id}
                style={{ cursor: onSelectTarget ? "pointer" : "default" }}
                onClick={() => onSelectTarget?.(target.id)}
              >
                <path
                  d={`M ${sourceX + sourceW} ${linkY} C ${sourceX + sourceW + 50} ${linkY}, ${tx - 50} ${linkY + index * 8}, ${tx} ${linkY + index * 8}`}
                  stroke={colors.line}
                  strokeWidth={isActive ? 3 : 2}
                  fill="none"
                  strokeOpacity={isActive ? 1 : 0.55}
                />
                <rect x={(sourceX + sourceW + tx) / 2 - 36} y={linkY + index * 8 - 22} width={72} height={18} rx={9} fill="white" stroke={colors.line} strokeWidth={1} />
                <text x={(sourceX + sourceW + tx) / 2} y={linkY + index * 8 - 10} textAnchor="middle" fontSize={9} fill={colors.line} fontWeight={700}>
                  {target.relationship} · {target.linkColumn ?? "id"}
                </text>

                <rect x={tx} y={20} width={targetW} height={tableH} rx={10} fill="white" stroke={isActive ? colors.line : "#e2e8f0"} strokeWidth={isActive ? 2.5 : 1.5} />
                <rect x={tx} y={20} width={targetW} height={headerH} rx={10} fill={colors.header} />
                <rect x={tx} y={20 + headerH - 10} width={targetW} height={10} fill={colors.header} />
                <text x={tx + targetW / 2} y={20 + 23} textAnchor="middle" fill="white" fontSize={10} fontWeight={700}>
                  {truncate(target.label ?? target.destinationTable.toUpperCase(), 20)}
                </text>
                <text x={tx + targetW / 2} y={20 + headerH - 6} textAnchor="middle" fill="white" fontSize={8} opacity={0.85}>
                  {target.destinationConnector}
                </text>
                <text x={tx + 12} y={20 + headerH + 18} fontSize={9} fill="#64748b">
                  {truncate(target.destinationTable, 24)}
                </text>
                <text x={tx + 12} y={20 + headerH + 34} fontSize={9} fill="#94a3b8">
                  {count} column mapping{count !== 1 ? "s" : ""}
                </text>
                {isActive && (
                  <text x={tx + targetW / 2} y={20 + tableH + 14} textAnchor="middle" fontSize={9} fill={colors.line} fontWeight={600}>
                    ● active mapping target
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 text-[10px] text-slate-500 px-1">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> PK / FK</span>
        <span><strong>1:1</strong> — one source row → one target row</span>
        <span><strong>1:N</strong> — one source row → many target rows</span>
      </div>
    </div>
  );
}
