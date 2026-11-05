"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  HardDrive,
  Loader2,
  Plug,
  RefreshCw,
  Webhook,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { OutputNodeType } from "@/types/abstraction";
import type { NodeConfigValues } from "../services/node-config-fields";
import {
  ConnectorConfig,
  ConnectorTableOption,
  fetchCompanyConnectors,
  fetchConnectorTables,
  inferTableSchema,
  InferredSchemaColumn,
} from "../services/connector-input-api";
import {
  OutputTargetMode,
  testOutputConnectivity,
} from "../services/output-target-api";
import {
  parseStoredSchema,
  SchemaCompatibilityIssue,
  validateSchemaCompatibility,
} from "../services/output-schema-validation";
import { getApiError, showApiErrorToast } from "@/utils/api-error";

interface OutputTargetSectionProps {
  companyId: string | null;
  outputMode: OutputNodeType;
  draft: NodeConfigValues;
  errors?: Record<string, string>;
  upstreamSchema?: InferredSchemaColumn[];
  onUpdate: (updates: Partial<NodeConfigValues>) => void;
}

type ConnectionStatus = "idle" | "testing" | "success" | "failed";

function modeFromNodeType(nodeType: OutputNodeType): OutputTargetMode {
  if (nodeType === "write-sql-table") return "sql";
  if (nodeType === "write-storage") return "storage";
  return "webhook";
}

function connectorDotColor(erpType: string): string {
  switch (erpType.toLowerCase()) {
    case "bigquery":
      return "bg-blue-500";
    case "netsuite":
      return "bg-orange-500";
    case "airtable":
      return "bg-emerald-500";
    default:
      return "bg-violet-500";
  }
}

export function OutputTargetSection({
  companyId,
  outputMode,
  draft,
  errors = {},
  upstreamSchema = [],
  onUpdate,
}: OutputTargetSectionProps) {
  const mode = modeFromNodeType(outputMode);
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [tables, setTables] = useState<ConnectorTableOption[]>([]);
  const [targetSchema, setTargetSchema] = useState<InferredSchemaColumn[]>(() =>
    parseStoredSchema(draft.inferredSchemaJson)
  );
  const [compatibilityIssues, setCompatibilityIssues] = useState<SchemaCompatibilityIssue[]>([]);
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isInferringSchema, setIsInferringSchema] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => {
    const stored = String(draft.connectionStatus ?? "");
    if (stored === "success") return "success";
    if (stored === "failed") return "failed";
    return "idle";
  });
  const [connectionMessage, setConnectionMessage] = useState(String(draft.connectionMessage ?? ""));

  const selectedConnectorId = String(draft.connectorId ?? "");
  const selectedTableId = String(draft.destinationTableId ?? "");
  const webhookUrl = String(draft.webhookUrl ?? "");
  const storagePath = String(draft.storagePath ?? "");
  const httpMethod = String(draft.httpMethod ?? "POST");

  const selectedConnector = useMemo(
    () => connectors.find((connector) => connector.id === selectedConnectorId),
    [connectors, selectedConnectorId]
  );

  const sourceSchema = useMemo(() => {
    const stored = parseStoredSchema(draft.upstreamSchemaJson);
    return stored.length > 0 ? stored : upstreamSchema;
  }, [draft.upstreamSchemaJson, upstreamSchema]);

  const title =
    mode === "sql"
      ? "Write to SQL Table"
      : mode === "storage"
        ? "Write File to Storage"
        : "Call Webhook / API";

  const TitleIcon = mode === "sql" ? Database : mode === "storage" ? HardDrive : Webhook;

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setIsLoadingConnectors(true);
    fetchCompanyConnectors(companyId)
      .then((items) => {
        if (!cancelled) setConnectors(items);
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
    if (!companyId || !selectedConnector || mode === "webhook") {
      setTables([]);
      return;
    }
    let cancelled = false;
    setIsLoadingTables(true);
    fetchConnectorTables(companyId, selectedConnector)
      .then((items) => {
        if (!cancelled) setTables(items);
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
  }, [companyId, selectedConnector, mode]);

  useEffect(() => {
    setTargetSchema(parseStoredSchema(draft.inferredSchemaJson));
    const compatRaw = draft.schemaCompatibilityJson;
    if (compatRaw && typeof compatRaw === "string") {
      try {
        const parsed = JSON.parse(compatRaw);
        setCompatibilityIssues(parsed.issues ?? []);
      } catch {
        setCompatibilityIssues([]);
      }
    }
  }, [draft.inferredSchemaJson, draft.schemaCompatibilityJson]);

  useEffect(() => {
    if (mode !== "sql" || targetSchema.length === 0) return;
    if (sourceSchema.length === 0) {
      setCompatibilityIssues([]);
      return;
    }
    const result = validateSchemaCompatibility(sourceSchema, targetSchema);
    setCompatibilityIssues(result.issues);
  }, [mode, targetSchema, sourceSchema]);

  function runCompatibilityCheck(
    targetColumns: InferredSchemaColumn[],
    sourceColumns: InferredSchemaColumn[]
  ) {
    if (mode !== "sql" || targetColumns.length === 0) {
      setCompatibilityIssues([]);
      onUpdate({ schemaCompatibilityJson: "", schemaCompatible: "" });
      return;
    }

    const result = validateSchemaCompatibility(sourceColumns, targetColumns);
    setCompatibilityIssues(result.issues);
    onUpdate({
      schemaCompatibilityJson: JSON.stringify(result),
      schemaCompatible: result.compatible ? "true" : "false",
    });

    if (!result.compatible && result.issues.length > 0) {
      toast.error("Schema compatibility issues found");
    }
  }

  async function handleConnectorChange(connectorId: string) {
    onUpdate({
      connectorId,
      destinationTableId: "",
      destinationTableName: "",
      inferredSchemaJson: "",
      schemaCompatibilityJson: "",
      schemaCompatible: "",
      connectionStatus: "",
      connectionMessage: "",
    });
    setTargetSchema([]);
    setCompatibilityIssues([]);
    setConnectionStatus("idle");
    setConnectionMessage("");
  }

  async function handleTableChange(tableId: string) {
    const table = tables.find((item) => item.id === tableId);
    onUpdate({
      destinationTableId: tableId,
      destinationTableName: table?.name ?? "",
      inferredSchemaJson: "",
      schemaCompatibilityJson: "",
    });

    if (!companyId || !tableId) {
      setTargetSchema([]);
      return;
    }

    setIsInferringSchema(true);
    try {
      const columns = await inferTableSchema(companyId, tableId);
      setTargetSchema(columns);
      onUpdate({
        destinationTableId: tableId,
        destinationTableName: table?.name ?? "",
        inferredSchemaJson: JSON.stringify(columns),
        upstreamSchemaJson:
          sourceSchema.length > 0 ? JSON.stringify(sourceSchema) : String(draft.upstreamSchemaJson ?? ""),
      });
      runCompatibilityCheck(columns, sourceSchema);
    } catch (error) {
      showApiErrorToast(error, "Failed to infer target table schema");
    } finally {
      setIsInferringSchema(false);
    }
  }

  async function handleTestConnectivity() {
    if (!companyId && mode !== "webhook") {
      toast.error("Select a company workspace first");
      return;
    }

    setConnectionStatus("testing");
    try {
      const result = await testOutputConnectivity({
        mode,
        companyId: companyId ?? "",
        connectorId: selectedConnectorId || undefined,
        webhookUrl,
        storagePath,
        httpMethod,
      });
      setConnectionStatus(result.success ? "success" : "failed");
      setConnectionMessage(result.message);
      onUpdate({
        connectionStatus: result.success ? "success" : "failed",
        connectionMessage: result.message,
        connectionTestedAt: result.testedAt,
      });
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch (error) {
      const { message } = getApiError(error, "Output connectivity test failed");
      setConnectionStatus("failed");
      setConnectionMessage(message);
      onUpdate({ connectionStatus: "failed", connectionMessage: message });
      showApiErrorToast(error, "Output connectivity test failed");
    }
  }

  if (!companyId && mode !== "webhook") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
        Select a company workspace to load target connectors.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
      <div className="flex items-center gap-2">
        <TitleIcon className="h-4 w-4 text-indigo-600" />
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">{title}</p>
      </div>

      {mode === "webhook" ? (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Webhook URL<span className="text-rose-500 ml-0.5">*</span>
            </Label>
            <Input
              value={webhookUrl}
              onChange={(e) => onUpdate({ webhookUrl: e.target.value })}
              placeholder="https://api.example.com/hooks/workflow"
              className={cn("h-9 text-sm bg-white", errors.webhookUrl && "border-rose-400")}
            />
            {errors.webhookUrl ? (
              <p className="text-[11px] text-rose-600 font-medium">{errors.webhookUrl}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">HTTP Method</Label>
            <Select value={httpMethod} onValueChange={(value) => onUpdate({ httpMethod: value })}>
              <SelectTrigger className="h-9 text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["POST", "PUT", "PATCH"].map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Auth Connector <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Select
              value={selectedConnectorId || undefined}
              onValueChange={handleConnectorChange}
              disabled={isLoadingConnectors}
            >
              <SelectTrigger className="h-9 text-sm bg-white">
                <SelectValue placeholder="Optional connector for auth" />
              </SelectTrigger>
              <SelectContent>
                {connectors.map((connector) => (
                  <SelectItem key={connector.id} value={connector.id}>
                    {connector.connector_name} ({connector.erp_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Target Connector<span className="text-rose-500 ml-0.5">*</span>
            </Label>
            <Select
              value={selectedConnectorId || undefined}
              onValueChange={handleConnectorChange}
              disabled={isLoadingConnectors}
            >
              <SelectTrigger
                className={cn(
                  "h-9 text-sm bg-white",
                  errors.connectorId && "border-rose-400"
                )}
              >
                <SelectValue
                  placeholder={isLoadingConnectors ? "Loading connectors..." : "Select target"}
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
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-500">
              {connectors.length} company connector{connectors.length === 1 ? "" : "s"} available
            </p>
            {errors.connectorId ? (
              <p className="text-[11px] text-rose-600 font-medium">{errors.connectorId}</p>
            ) : null}
          </div>

          {mode === "sql" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Destination Table<span className="text-rose-500 ml-0.5">*</span>
              </Label>
              <Select
                value={selectedTableId || undefined}
                onValueChange={handleTableChange}
                disabled={!selectedConnectorId || isLoadingTables}
              >
                <SelectTrigger
                  className={cn(
                    "h-9 text-sm bg-white",
                    errors.destinationTableId && "border-rose-400"
                  )}
                >
                  <SelectValue
                    placeholder={
                      !selectedConnectorId
                        ? "Select connector first"
                        : isLoadingTables
                          ? "Loading tables..."
                          : "Select destination table"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      <div className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-slate-400" />
                        {table.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.destinationTableId ? (
                <p className="text-[11px] text-rose-600 font-medium">{errors.destinationTableId}</p>
              ) : null}
            </div>
          )}

          {mode === "storage" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Storage Path<span className="text-rose-500 ml-0.5">*</span>
                </Label>
                <Input
                  value={storagePath}
                  onChange={(e) => onUpdate({ storagePath: e.target.value })}
                  placeholder="bucket-name/exports/workflow-output"
                  className={cn("h-9 text-sm bg-white", errors.storagePath && "border-rose-400")}
                />
                {errors.storagePath ? (
                  <p className="text-[11px] text-rose-600 font-medium">{errors.storagePath}</p>
                ) : null}
              </div>
            </>
          )}
        </>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={connectionStatus === "testing"}
          onClick={handleTestConnectivity}
        >
          {connectionStatus === "testing" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wifi className="h-3.5 w-3.5" />
          )}
          Test Output Connectivity
        </Button>
        {connectionStatus === "success" && (
          <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Reachable
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

      {mode === "sql" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700">Target Schema</Label>
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

          {targetSchema.length > 0 ? (
            <ScrollArea className="h-32 rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-slate-50 border-b">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">Column</th>
                    <th className="px-2 py-1.5 font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {targetSchema.map((col) => (
                    <tr key={col.name} className="border-b border-slate-50">
                      <td className="px-2 py-1">{col.name}</td>
                      <td className="px-2 py-1 text-slate-500">{col.data_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          ) : (
            <p className="text-[11px] text-slate-500 border border-dashed rounded-lg p-3 bg-white">
              Select a destination table to infer schema.
            </p>
          )}

          {sourceSchema.length > 0 && compatibilityIssues.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2">
              <p className="text-[10px] font-bold uppercase text-slate-600">Schema Compatibility</p>
              {compatibilityIssues.map((issue) => (
                <div
                  key={`${issue.column}-${issue.message}`}
                  className={cn(
                    "flex gap-2 text-[11px] rounded px-2 py-1",
                    issue.severity === "error"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-amber-50 text-amber-700"
                  )}
                >
                  <Plug className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}

          {sourceSchema.length === 0 && selectedTableId && (
            <p className="text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
              Connect an upstream node with extracted schema to run compatibility validation.
            </p>
          )}

          {errors.schemaCompatible ? (
            <p className="text-[11px] text-rose-600 font-medium">{errors.schemaCompatible}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
