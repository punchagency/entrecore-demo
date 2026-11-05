"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ShieldAlert,
  AlertTriangle,
  Ban,
  Archive,
  SkipForward,
  Settings2,
  Info,
} from "lucide-react";
import { useIntegrationStore } from "@/app/store/integrationStore";
import type { NullHandling, ErrorRouting } from "../services/integration-api";

const NULL_HANDLING_OPTIONS: { value: NullHandling; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "keep_null",
    label: "Keep Null",
    icon: <SkipForward className="h-3.5 w-3.5" />,
    description: "Pass null values through to target",
  },
  {
    value: "use_default",
    label: "Use Default",
    icon: <Settings2 className="h-3.5 w-3.5" />,
    description: "Replace nulls with a default value",
  },
  {
    value: "reject_row",
    label: "Reject Row",
    icon: <Ban className="h-3.5 w-3.5" />,
    description: "Reject entire row if null encountered",
  },
];

const ERROR_ROUTING_OPTIONS: { value: ErrorRouting; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "reject_row",
    label: "Reject Row",
    icon: <Ban className="h-3.5 w-3.5" />,
    description: "Drop the row from output",
  },
  {
    value: "quarantine",
    label: "Quarantine",
    icon: <Archive className="h-3.5 w-3.5" />,
    description: "Send to quarantine table for review",
  },
  {
    value: "skip",
    label: "Skip Field",
    icon: <SkipForward className="h-3.5 w-3.5" />,
    description: "Set field to null and continue",
  },
];

export function ExceptionConfigPanel() {
  const { mappings, updateMappingException, targetColumns } = useIntegrationStore();

  const mappingsWithExceptions = mappings.filter((m) => m.source_column);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-50 rounded-xl">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Exception Handling
          </h3>
          <p className="text-xs text-slate-500">
            Configure default values, null handling, and error routing per
            mapping
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
        <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-indigo-900">
            Exception Rules
          </p>
          <p className="text-xs text-indigo-700 mt-0.5">
            Define how the integration engine should handle null values,
            type conversion errors, and constraint violations for each mapping.
          </p>
        </div>
      </div>

      {/* Exception config per mapping */}
      <div className="space-y-4">
        {mappingsWithExceptions.map((mapping) => {
          const target = targetColumns.find(
            (c) => c.name === mapping.target_column
          );
          const exception = mapping.exception_rule || {
            null_handling: "keep_null" as NullHandling,
            error_routing: "reject_row" as ErrorRouting,
            default_value: "",
          };

          return (
            <Card
              key={mapping.id}
              className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-2xl bg-white overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg text-xs">
                      {mapping.source_column}
                    </span>
                    <span className="text-slate-400 text-xs">→</span>
                    <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg text-xs">
                      {mapping.target_column}
                    </span>
                  </CardTitle>
                  {target && !target.nullable && (
                    <Badge
                      variant="outline"
                      className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] gap-0.5"
                    >
                      <AlertTriangle className="h-2.5 w-2.5" /> NOT NULL
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Default Value */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Default Value
                    </Label>
                    <Input
                      value={exception.default_value || ""}
                      onChange={(e) =>
                        updateMappingException(mapping.id, {
                          ...exception,
                          default_value: e.target.value,
                        })
                      }
                      placeholder={target?.default_value || "No default"}
                      className="h-9 text-sm rounded-xl font-mono"
                    />
                    {target?.default_value && (
                      <p className="text-[10px] text-slate-400">
                        Schema default: {target.default_value}
                      </p>
                    )}
                  </div>

                  {/* Null Handling */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Null Handling
                    </Label>
                    <Select
                      value={exception.null_handling}
                      onValueChange={(v) =>
                        updateMappingException(mapping.id, {
                          ...exception,
                          null_handling: v as NullHandling,
                        })
                      }
                    >
                      <SelectTrigger className="h-9 text-sm rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NULL_HANDLING_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              {opt.icon}
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-400">
                      {
                        NULL_HANDLING_OPTIONS.find(
                          (o) => o.value === exception.null_handling
                        )?.description
                      }
                    </p>
                  </div>

                  {/* Error Routing */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Error Routing
                    </Label>
                    <Select
                      value={exception.error_routing}
                      onValueChange={(v) =>
                        updateMappingException(mapping.id, {
                          ...exception,
                          error_routing: v as ErrorRouting,
                        })
                      }
                    >
                      <SelectTrigger className="h-9 text-sm rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ERROR_ROUTING_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              {opt.icon}
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-400">
                      {
                        ERROR_ROUTING_OPTIONS.find(
                          (o) => o.value === exception.error_routing
                        )?.description
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {mappingsWithExceptions.length === 0 && (
          <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 rounded-2xl bg-white">
            <CardContent className="p-12 text-center">
              <Settings2 className="h-10 w-10 text-slate-300 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-slate-700 mb-1">
                No Mappings to Configure
              </h4>
              <p className="text-sm text-slate-500">
                Add source column mappings first to configure exception handling
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
