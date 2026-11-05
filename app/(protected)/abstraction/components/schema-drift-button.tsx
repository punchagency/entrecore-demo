"use client";

import { useEffect, useState } from "react";
import { RadarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchCompanyConnectorsStrict } from "../services/data-source-api";
import type { ConnectorConfig } from "@/app/(protected)/workflows/services/integration-api";
import { runSchemaDrift } from "../services/schema-drift-api";
import type { DriftRunSummary } from "../services/schema-drift-api";
import { showApiErrorToast } from "@/utils/api-error";

/**
 * Run the schema-drift check for one connector, now.
 *
 * ONE connector rather than all of them, because the pass is read-only only
 * until it finds something: a drifted table is re-crawled and re-profiled, so a
 * company-wide button would be a long write nobody asked for. Narrowed, it
 * finishes while the request is open, which is why there is no polling here.
 *
 * The result is a toast and nothing else — no persisted state — so navigating
 * away during a run loses the answer. That is the agreed trade, and the reason
 * the button says what it is doing while it does it.
 */

/** Strict fetch, so a failed load means "none" rather than three demo connectors. */
function useCompanyConnectors() {
  const [connectors, setConnectors] = useState<ConnectorConfig[] | null>(null);

  useEffect(() => {
    const companyId =
      typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") : null;
    if (!companyId) {
      setConnectors([]);
      return;
    }
    fetchCompanyConnectorsStrict(companyId)
      .then((all) =>
        // Only those the route can actually address. A config whose
        // connector_id is missing would produce /connectors/undefined/drift/run.
        setConnectors(all.filter((c) => c.is_active && c.connector_id))
      )
      .catch(() => setConnectors([]));
  }, []);

  return connectors;
}

/** What the run found, as a sentence. */
function describe(summary: DriftRunSummary, name: string): string {
  if (summary.note) return summary.note;

  const result = summary.results?.[0];
  if (result?.skipped) {
    return `${name} was skipped: ${result.skipped}.`;
  }
  if (result?.error) {
    return `${name} could not be checked: ${result.error}`;
  }
  if (!summary.connectors_drifted) {
    return `No drift on ${name}. The catalog matches the source.`;
  }

  const parts: string[] = [];
  if (summary.tables_recrawled) parts.push(`${summary.tables_recrawled} re-crawled`);
  if (summary.tables_reprofiled) parts.push(`${summary.tables_reprofiled} re-profiled`);
  if (summary.tables_removed) parts.push(`${summary.tables_removed} tombstoned`);
  return `Drift found on ${name} — ${parts.join(", ") || "catalog updated"}.`;
}

export function SchemaDriftButton() {
  const connectors = useCompanyConnectors();
  const [chosen, setChosen] = useState<string>("");
  const [running, setRunning] = useState(false);

  // Pre-select when there is only one: a dropdown with a single option is a
  // question with one answer.
  useEffect(() => {
    if (connectors?.length === 1 && connectors[0].connector_id) {
      setChosen(connectors[0].connector_id);
    }
  }, [connectors]);

  const name =
    connectors?.find((c) => c.connector_id === chosen)?.connector_name ?? "that connector";

  async function run() {
    if (!chosen || running) return;
    setRunning(true);
    const pending = toast.loading(`Checking ${name} for schema drift…`);
    try {
      const summary = await runSchemaDrift(chosen);
      const message = describe(summary, name);
      // Drift is not an error — it is the thing the check exists to find — but
      // it is also not nothing, so it must not look identical to "all clear".
      if (summary.connectors_drifted) {
        toast.warning(message, { id: pending, duration: 10000 });
      } else {
        toast.success(message, { id: pending });
      }
    } catch (error) {
      showApiErrorToast(error, "The drift check failed.", { id: pending, duration: 10000 });
    } finally {
      setRunning(false);
    }
  }

  // Nothing to check, so nothing to show. Rendering a disabled control here
  // would raise a question the page cannot answer.
  if (connectors !== null && connectors.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Select value={chosen} onValueChange={setChosen} disabled={running || !connectors}>
        <SelectTrigger className="h-9 w-52 rounded-xl text-xs">
          <SelectValue placeholder={connectors ? "Connector…" : "Loading…"} />
        </SelectTrigger>
        <SelectContent>
          {connectors?.map((connector) => (
            <SelectItem key={connector.connector_id} value={connector.connector_id!}>
              {connector.connector_name}
              <span className="ml-2 text-[10px] uppercase text-slate-400">
                {connector.erp_type}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        onClick={run}
        disabled={!chosen || running}
        variant="outline"
        className="h-9 shrink-0 rounded-xl text-xs"
        title="Compare the live source schema against the catalog snapshot"
      >
        <RadarIcon className="mr-2 h-4 w-4" />
        {running ? "Checking…" : "Run schema drift"}
      </Button>
    </div>
  );
}
