"use client";

import { useEffect, useState } from "react";
import { Settings2, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeType, OutputNodeType } from "@/types/abstraction";
import { nodeDefinitions } from "@/app/(protected)/abstraction/services/node-definitions";
import {
  CONNECTOR_MANAGED_FIELD_KEYS,
  isOutputNodeType,
  nodeConfigFields,
  NodeConfigValues,
  validateNodeConfig,
} from "@/app/(protected)/abstraction/services/node-config-fields";
import { ConnectorInputSection } from "./connector-input-section";
import { OutputTargetSection } from "./output-target-section";
import type { InferredSchemaColumn } from "../services/connector-input-api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NodeConfigurationPanelProps {
  nodeId: string;
  nodeType: NodeType;
  config: NodeConfigValues;
  companyId?: string | null;
  upstreamSchema?: InferredSchemaColumn[];
  onSave: (config: NodeConfigValues) => void;
  onClose: () => void;
}

export function NodeConfigurationPanel({
  nodeId,
  nodeType,
  config,
  companyId = null,
  upstreamSchema = [],
  onSave,
  onClose,
}: NodeConfigurationPanelProps) {
  const [draft, setDraft] = useState<NodeConfigValues>(config);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const def = nodeDefinitions[nodeType];
  const fields = nodeConfigFields[nodeType].filter(
    (field) => !CONNECTOR_MANAGED_FIELD_KEYS.has(field.key)
  );
  const showConnectorInput = nodeType === "document-intake" || nodeType === "integration";
  const showOutputTarget = isOutputNodeType(nodeType);
  const Icon = def.icon;

  useEffect(() => {
    setDraft(config);
    setErrors({});
    setTouched({});
  }, [nodeId, config]);

  function applyDraftUpdates(updates: Partial<NodeConfigValues>) {
    setDraft((prev) => {
      const next: NodeConfigValues = { ...prev };
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) next[key] = value;
      });
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(updates).forEach((key) => delete next[key]);
      return next;
    });
  }

  function updateField(key: string, value: string | number | boolean) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleValidateAndSave() {
    const nextErrors = validateNodeConfig(nodeType, draft);
    setErrors(nextErrors);
    setTouched(
      Object.fromEntries(nodeConfigFields[nodeType].map((field) => [field.key, true]))
    );

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fix validation errors before saving");
      return;
    }

    onSave(draft);
    toast.success("Node configuration saved");
  }

  function showError(key: string): string | undefined {
    if (!touched[key] && !errors[key]) return undefined;
    return errors[key];
  }

  return (
    <Card className="border-violet-200 bg-white shadow-md ring-1 ring-violet-100">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-violet-500" />
            Node Configuration
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-lg"
            onClick={onClose}
            aria-label="Close configuration panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Icon className={cn("h-4 w-4", def.textColor)} />
          <p className="text-xs text-slate-600">{def.label}</p>
        </div>
        <p className="text-[10px] font-mono text-slate-400 mt-1">{nodeId}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {showOutputTarget && (
          <OutputTargetSection
            companyId={companyId}
            outputMode={nodeType as OutputNodeType}
            draft={draft}
            errors={errors}
            upstreamSchema={upstreamSchema}
            onUpdate={applyDraftUpdates}
          />
        )}

        {showConnectorInput && (
          <ConnectorInputSection
            companyId={companyId}
            draft={draft}
            errors={errors}
            onUpdate={applyDraftUpdates}
            connectorFieldKey="connectorId"
            tableIdFieldKey={nodeType === "integration" ? "destinationTableId" : "sourceTableId"}
            tableNameFieldKey={
              nodeType === "integration" ? "destinationTableName" : "sourceTableName"
            }
            title={nodeType === "integration" ? "Data Target" : "Enterprise Data Source"}
          />
        )}

        {fields.map((field) => {
          const error = showError(field.key);
          const fieldId = `${nodeId}-${field.key}`;

          return (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={fieldId} className="text-xs font-semibold text-slate-700">
                {field.label}
                {field.required ? <span className="text-rose-500 ml-0.5">*</span> : null}
              </Label>
              {field.description ? (
                <p className="text-[10px] text-slate-500">{field.description}</p>
              ) : null}

              {field.type === "select" && field.options ? (
                <Select
                  value={stringifyValue(draft[field.key]) || field.options[0]?.value}
                  onValueChange={(value) => updateField(field.key, value)}
                >
                  <SelectTrigger
                    id={fieldId}
                    className={cn("h-9 text-sm", error && "border-rose-400 focus:ring-rose-200")}
                  >
                    <SelectValue placeholder={`Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={fieldId}
                  type={field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
                  min={field.min}
                  max={field.max}
                  placeholder={field.placeholder}
                  value={stringifyValue(draft[field.key])}
                  onChange={(e) =>
                    updateField(
                      field.key,
                      field.type === "number" ? e.target.value : e.target.value
                    )
                  }
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, [field.key]: true }));
                    const fieldErrors = validateNodeConfig(nodeType, draft);
                    if (fieldErrors[field.key]) {
                      setErrors((prev) => ({ ...prev, [field.key]: fieldErrors[field.key] }));
                    }
                  }}
                  className={cn("h-9 text-sm", error && "border-rose-400 focus-visible:ring-rose-200")}
                />
              )}

              {error ? <p className="text-[11px] text-rose-600 font-medium">{error}</p> : null}
            </div>
          );
        })}

        <Button type="button" className="w-full gap-2" onClick={handleValidateAndSave}>
          <Save className="h-4 w-4" />
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}
