"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { EntityDefinition } from "@/app/store/abstractionStore";
import {
  CatalogTable,
  ConnectorConfig,
  fetchCatalogTables,
  fetchCompanyConnectors,
} from "../services/data-source-api";
import { showApiErrorToast } from "@/utils/api-error";

interface DataSourcePickerProps {
  value?: EntityDefinition["dataSource"];
  onChange: (next: EntityDefinition["dataSource"] | undefined) => void;
}

function tableKey(table: Pick<CatalogTable, "name" | "datasetName">): string {
  return `${table.datasetName ?? ""}::${table.name}`;
}

/**
 * Connector -> Table -> Column picker for a select entity's optional data
 * source. Only ever calls onChange with the picked pointer — it never
 * fetches sample values itself.   The backend resolves actual values fresh on
 * every extraction run (apply_reasoning / _apply_data_source_values in
 * ocr_service.py), so there's nothing to preview or "fetch now" here.
 */
export function DataSourcePicker({ value, onChange }: DataSourcePickerProps) {
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [tables, setTables] = useState<CatalogTable[]>([]);
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  useEffect(() => {
    const companyId =
      typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") : null;
    if (!companyId) return;
    setIsLoadingConnectors(true);
    fetchCompanyConnectors(companyId)
      .then(setConnectors)
      .finally(() => setIsLoadingConnectors(false));
  }, []);

  useEffect(() => {
    if (!value?.connectorConfigId) {
      setTables([]);
      return;
    }
    setIsLoadingTables(true);
    fetchCatalogTables(value.connectorConfigId)
      .then((fetched) => {
        // catalog-browse can list the same table more than once (seen for
        // Airtable) — de-dupe by the same key the Combobox renders on.
        // Map keeps the LAST pair for a repeated key, so this keeps the
        // latest occurrence in the response, not the first. Duplicate keys
        // are undefined behavior for React's list reconciliation, which is
        // what made the table search flaky, not just the console warning.
        const byKey = new Map(fetched.map((table) => [tableKey(table), table]));
        // Reverse the response order — the last table the backend listed
        // shows up first.
        const deduped = Array.from(byKey.values()).reverse();
        setTables(deduped);
      })
      .catch((error) => {
        setTables([]);
        showApiErrorToast(error, "Couldn't load tables for this connector");
      })
      .finally(() => setIsLoadingTables(false));
  }, [value?.connectorConfigId]);

  // More than one distinct dataset only happens for a multi-dataset BigQuery
  // connector — every other connector type has exactly one, so the Table
  // dropdown stays plain (no dataset prefix) for the common case.
  const disambiguate = new Set(tables.map((t) => t.datasetName).filter(Boolean)).size > 1;
  const selectedTable = tables.find(
    (t) => t.name === value?.table && (t.datasetName ?? undefined) === value?.datasetName
  );

  function handleConnectorChange(connectorConfigId: string) {
    onChange({ connectorConfigId, table: "", column: "" });
  }

  function handleTableChange(key: string) {
    const table = tables.find((t) => tableKey(t) === key);
    if (!table || !value) return;
    onChange({ ...value, table: table.name, column: "", datasetName: table.datasetName });
  }

  function handleColumnChange(column: string) {
    if (!value) return;
    onChange({ ...value, column });
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/50 p-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Data Source (optional)
        </label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-md hover:bg-red-50"
            aria-label="Remove data source"
            onClick={() => onChange(undefined)}
          >
            <X className="h-3 w-3 text-red-500" />
          </Button>
        )}
      </div>

      <Select value={value?.connectorConfigId ?? ""} onValueChange={handleConnectorChange}>
        <SelectTrigger className="h-8 text-xs rounded-lg">
          <SelectValue placeholder={isLoadingConnectors ? "Loading connectors..." : "Connector"} />
        </SelectTrigger>
        <SelectContent>
          {connectors.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.connector_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value?.connectorConfigId && (
        <Combobox
          size="sm"
          value={selectedTable ? tableKey(selectedTable) : ""}
          onValueChange={handleTableChange}
          options={tables.map((t) => ({
            value: tableKey(t),
            label: disambiguate && t.datasetName ? `${t.datasetName}.${t.name}` : t.name,
          }))}
          placeholder={isLoadingTables ? "Loading tables..." : "Table"}
          searchPlaceholder="Search tables..."
          emptyText="No tables found."
          className="rounded-lg text-xs"
        />
      )}

      {selectedTable && (
        <Combobox
          size="sm"
          value={value?.column ?? ""}
          onValueChange={handleColumnChange}
          options={selectedTable.columns.map((col) => ({ value: col.name, label: col.name }))}
          placeholder="Column"
          searchPlaceholder="Search columns..."
          emptyText="No columns found."
          className="rounded-lg text-xs"
        />
      )}
    </div>
  );
}
