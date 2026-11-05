"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Loader2,
  Plug,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { NodeConfigValues } from "../services/node-config-fields";
import {
  ConnectorConfig,
  ConnectorTableOption,
  fetchCompanyConnectors,
  fetchConnectorTables,
  inferTableSchema,
  InferredSchemaColumn,
  testConnectorConnectivity,
} from "../services/connector-input-api";
import { getApiError, showApiErrorToast } from "@/utils/api-error";

interface ConnectorInputSectionProps {
  companyId: string | null;
  draft: NodeConfigValues;
  onUpdate: (updates: Partial<NodeConfigValues>) => void;
  errors?: Record<string, string>;
  connectorFieldKey?: string;
  tableIdFieldKey?: string;
  tableNameFieldKey?: string;
  title?: string;
}

type ConnectionStatus = "idle" | "testing" | "success" | "failed";

function parseStoredSchema(value: unknown): InferredSchemaColumn[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as InferredSchemaColumn[];
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function connectorDotColor(erpType: string): string {
  switch (erpType.toLowerCase()) {
    case "bigquery":
      return "bg-blue-500";
    case "netsuite":
      return "bg-orange-500";
    case "airtable":
      return "bg-emerald-500";
    case "notion":
      return "bg-slate-700";
    default:
      return "bg-violet-500";
  }
}

export function ConnectorInputSection({
  companyId,
  draft,
  onUpdate,
  errors = {},
  connectorFieldKey = "connectorId",
  tableIdFieldKey = "sourceTableId",
  tableNameFieldKey = "sourceTableName",
  title = "Data Source",
}: ConnectorInputSectionProps) {
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [tables, setTables] = useState<ConnectorTableOption[]>([]);
  const [schema, setSchema] = useState<InferredSchemaColumn[]>(() =>
    parseStoredSchema(draft.inferredSchemaJson)
  );
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isInferringSchema, setIsInferringSchema] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => {
    const stored = String(draft.connectionStatus ?? "");
    if (stored === "success") return "success";
    if (stored === "failed") return "failed";
    return "idle";
  });
  const [connectionMessage, setConnectionMessage] = useState(
    String(draft.connectionMessage ?? "")
  );

  const selectedConnectorId = String(draft[connectorFieldKey] ?? "");
  const selectedTableId = String(draft[tableIdFieldKey] ?? "");

  const selectedConnector = useMemo(
    () => connectors.find((connector) => connector.id === selectedConnectorId),
    [connectors, selectedConnectorId]
  );

  useEffect(() => {
    if (!companyId) return;

    let cancelled = false;
    setIsLoadingConnectors(true);

    fetchCompanyConnectors(companyId)
      .then((items) => {
        if (cancelled) return;
        setConnectors(items);
      })
      .catch((error) => {
        if (!cancelled) {
          setConnectors([]);
          showApiErrorToast(error, "Failed to load company connectors");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingConnectors(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !selectedConnector) {
      setTables([]);
      return;
    }

    let cancelled = false;
    setIsLoadingTables(true);

    fetchConnectorTables(companyId, selectedConnector)
      .then((items) => {
        if (cancelled) return;
        setTables(items);
      })
      .catch((error) => {
        if (cancelled) return;
        setTables([]);
        showApiErrorToast(error, "Couldn't load tables for this connector");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTables(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, selectedConnector]);

  useEffect(() => {
    setSchema(parseStoredSchema(draft.inferredSchemaJson));
    const stored = String(draft.connectionStatus ?? "");
    if (stored === "success") setConnectionStatus("success");
    else if (stored === "failed") setConnectionStatus("failed");
    else setConnectionStatus("idle");
    setConnectionMessage(String(draft.connectionMessage ?? ""));
  }, [draft.inferredSchemaJson, draft.connectionStatus, draft.connectionMessage]);

  async function handleConnectorChange(connectorId: string) {
    onUpdate({
      [connectorFieldKey]: connectorId,
      [tableIdFieldKey]: "",
      [tableNameFieldKey]: "",
      inferredSchemaJson: "",
      connectionStatus: "",
      connectionMessage: "",
    });
    setSchema([]);
    setConnectionStatus("idle");
    setConnectionMessage("");
  }

  async function handleTableChange(tableId: string) {
    const table = tables.find((item) => item.id === tableId);
    onUpdate({
      [tableIdFieldKey]: tableId,
      [tableNameFieldKey]: table?.name ?? "",
      inferredSchemaJson: "",
    });

    if (!companyId || !tableId) {
      setSchema([]);
      return;
    }

    setIsInferringSchema(true);
    try {
      const columns = await inferTableSchema(companyId, tableId);
      setSchema(columns);
      onUpdate({
        [tableIdFieldKey]: tableId,
        [tableNameFieldKey]: table?.name ?? "",
        inferredSchemaJson: JSON.stringify(columns),
      });
    } catch (error) {
      setSchema([]);
      showApiErrorToast(error, "Failed to infer schema for selected table");
    } finally {
      setIsInferringSchema(false);
    }
  }

  async function handleTestConnection() {
    if (!companyId || !selectedConnectorId) {
      toast.error("Select a connector first");
      return;
    }

    setConnectionStatus("testing");
    setConnectionMessage("");

    try {
      const result = await testConnectorConnectivity(selectedConnectorId, companyId);
      setConnectionStatus(result.success ? "success" : "failed");
      setConnectionMessage(result.message);
      onUpdate({
        connectionStatus: result.success ? "success" : "failed",
        connectionMessage: result.message,
        connectionLatencyMs: result.latencyMs ?? 0,
        connectionTestedAt: result.testedAt,
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      setConnectionStatus("failed");
      const { message } = getApiError(error, "Connection test failed");
      setConnectionMessage(message);
      onUpdate({ connectionStatus: "failed", connectionMessage: message });
      showApiErrorToast(error, "Connection test failed");
    }
  }

  if (!companyId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
        Select a company workspace to load connectors.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center gap-2">
        <Plug className="h-4 w-4 text-violet-500" />
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">{title}</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">
          Connector<span className="text-rose-500 ml-0.5">*</span>
        </Label>
        <Select
          value={selectedConnectorId || undefined}
          onValueChange={handleConnectorChange}
          disabled={isLoadingConnectors}
        >
          <SelectTrigger
            className={cn(
              "h-9 text-sm bg-white",
              errors[connectorFieldKey] && "border-rose-400 focus:ring-rose-200"
            )}
          >
            <SelectValue
              placeholder={isLoadingConnectors ? "Loading connectors..." : "Select connector"}
            />
          </SelectTrigger>
          <SelectContent>
            {connectors.map((connector) => (
              <SelectItem key={connector.id} value={connector.id}>
                <div className="flex items-center gap-2">
                  <span
                    className={cn("h-2 w-2 rounded-full", connectorDotColor(connector.erp_type))}
                  />
                  <span className="font-medium">{connector.connector_name}</span>
                  <span className="text-slate-400">({connector.erp_type})</span>
                  {!connector.is_active && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      inactive
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-slate-500">
          {connectors.length} company connector{connectors.length === 1 ? "" : "s"} available
        </p>
        {errors[connectorFieldKey] ? (
          <p className="text-[11px] text-rose-600 font-medium">{errors[connectorFieldKey]}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!selectedConnectorId || connectionStatus === "testing"}
          onClick={handleTestConnection}
        >
          {connectionStatus === "testing" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wifi className="h-3.5 w-3.5" />
          )}
          Test Connectivity
        </Button>
        {connectionStatus === "success" && (
          <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </Badge>
        )}
        {connectionStatus === "failed" && (
          <Badge className="bg-rose-100 text-rose-700 border-0 gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        )}
      </div>
      {connectionMessage ? (
        <p
          className={cn(
            "text-[11px] font-medium",
            connectionStatus === "failed" ? "text-rose-600" : "text-emerald-600"
          )}
        >
          {connectionMessage}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">
          Source Table<span className="text-rose-500 ml-0.5">*</span>
        </Label>
        <Select
          value={selectedTableId || undefined}
          onValueChange={handleTableChange}
          disabled={!selectedConnectorId || isLoadingTables}
        >
          <SelectTrigger
            className={cn(
              "h-9 text-sm bg-white",
              errors[tableIdFieldKey] && "border-rose-400 focus:ring-rose-200"
            )}
          >
            <SelectValue
              placeholder={
                !selectedConnectorId
                  ? "Select a connector first"
                  : isLoadingTables
                    ? "Loading tables..."
                    : tables.length
                      ? "Select source table"
                      : "No tables found for connector"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {tables.map((table) => (
              <SelectItem key={table.id} value={table.id}>
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-slate-400" />
                  <span>{table.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors[tableIdFieldKey] ? (
          <p className="text-[11px] text-rose-600 font-medium">{errors[tableIdFieldKey]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-slate-700">Inferred Schema</Label>
          {selectedTableId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] gap-1"
              disabled={isInferringSchema}
              onClick={() => handleTableChange(selectedTableId)}
            >
              {isInferringSchema ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Refresh
            </Button>
          )}
        </div>

        {!selectedTableId ? (
          <p className="text-[11px] text-slate-500 rounded-lg border border-dashed border-slate-200 bg-white p-3">
            Select a source table to infer and display its schema.
          </p>
        ) : isInferringSchema ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 p-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            Inferring schema...
          </div>
        ) : schema.length === 0 ? (
          <p className="text-[11px] text-slate-500 rounded-lg border border-dashed border-slate-200 bg-white p-3">
            No columns inferred yet for this table.
          </p>
        ) : (
          <ScrollArea className="h-44 rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-2 py-1.5 font-semibold text-slate-600">Column</th>
                  <th className="px-2 py-1.5 font-semibold text-slate-600">Type</th>
                  <th className="px-2 py-1.5 font-semibold text-slate-600">Null</th>
                </tr>
              </thead>
              <tbody>
                {schema.map((column) => (
                  <tr key={column.name} className="border-b border-slate-50 last:border-0">
                    <td className="px-2 py-1.5 font-medium text-slate-800">{column.name}</td>
                    <td className="px-2 py-1.5 text-slate-500">{column.data_type}</td>
                    <td className="px-2 py-1.5 text-slate-500">
                      {column.nullable ? "yes" : "no"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}
        {schema.length > 0 && (
          <p className="text-[10px] text-slate-500">{schema.length} columns inferred</p>
        )}
      </div>
    </div>
  );
}
