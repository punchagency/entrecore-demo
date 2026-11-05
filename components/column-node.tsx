"use client";
import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Database, FileText, Hash, Type, ToggleLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnData extends Record<string, unknown> {
  id: string;
  name: string;
  label: string;
  column_id: string;
  table_id: string;
  node_type: string;
  column_type: string;
  data_type: string;
  is_nullable?: boolean;
  nullable?: boolean;
  description?: string;
  metadata?: Record<string, any>;
  record_count?: number | null;
  last_run?: string | null;
  pipeline_stage?: string | null;
  transformation_type?: string | null;
  data_quality_score?: number | null;
}

interface ColumnNodeProps {
  data: ColumnData;
  selected?: boolean;
}

const getColumnTypeIcon = (columnType: string) => {
  switch (columnType?.toLowerCase()) {
    case "integer":
    case "int":
    case "bigint":
    case "smallint":
      return Hash;
    case "varchar":
    case "text":
    case "string":
      return Type;
    case "boolean":
    case "bool":
      return ToggleLeft;
    default:
      return FileText;
  }
};

const ColumnNode = ({ data, selected }: ColumnNodeProps) => {
  // Use the correct field for column type from metadata
  const columnType =
    (data.metadata as any)?.data_type || data.data_type || data.column_type || "string";
  const Icon = getColumnTypeIcon(columnType);

  // Use the correct field for nullability from metadata
  const isNullable =
    (data.metadata as any)?.nullable !== undefined
      ? (data.metadata as any).nullable
      : data.nullable;
  const columnName = (data.metadata as any)?.column_name || data.name;

  return (
    <div
      className={cn(
        "relative min-w-[160px] p-3 rounded-lg border",
        "bg-gradient-to-br from-slate-50 to-slate-100/80 backdrop-blur-sm",
        "shadow-sm transition-all duration-300",
        "hover:shadow-md hover:scale-105",
        selected && "ring-2 ring-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
      )}
    >
      {/* Input Handle - for incoming connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="column-input"
        className="w-3 h-3 bg-slate-500 border-2 border-slate-300"
      />

      {/* Left Handle - for left connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="column-left"
        className="w-2 h-2 bg-slate-500 border border-slate-300"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-slate-200 text-slate-600">
            <Icon className="w-3 h-3" />
          </div>
          <h4 className="font-medium text-sm text-slate-800 truncate" title={data.label}>
            {data.label}
          </h4>
        </div>

        {isNullable !== undefined && (
          <div
            className={cn(
              "px-1.5 py-0.5 rounded text-xs font-medium",
              isNullable ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
            )}
          >
            {isNullable ? "NULL" : "NOT NULL"}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-1">
        <div className="text-xs text-slate-600 font-medium">
          Type: {columnType}
          {(data.metadata as any)?.key_type && (
            <span className="ml-1 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
              {(data.metadata as any).key_type}
            </span>
          )}
        </div>

        {(data.metadata as any)?.schema_name && (
          <div className="text-xs text-slate-500">Schema: {(data.metadata as any).schema_name}</div>
        )}

        <div className="text-xs text-slate-400">Column: {columnName}</div>

        {(data.metadata as any)?.is_primary_key && (
          <div className="text-xs text-purple-600 font-medium">Primary Key</div>
        )}

        {(data.metadata as any)?.is_foreign_key && (
          <div className="text-xs text-blue-600 font-medium">Foreign Key</div>
        )}
      </div>

      {/* Right Handle - for right connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="column-right"
        className="w-2 h-2 bg-slate-500 border border-slate-300"
      />

      {/* Output Handle - for outgoing connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="column-output"
        className="w-3 h-3 bg-slate-500 border-2 border-slate-300"
      />
    </div>
  );
};

export default memo(ColumnNode);
