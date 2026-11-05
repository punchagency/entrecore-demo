"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EntityDefinition } from "@/app/store/abstractionStore";

import { asEntityDataType } from "../constants/entity-data-types";
import {
  CatalogTable,
  ConnectorConfig,
  fetchCatalogTables,
  fetchCompanyConnectorsStrict,
} from "../services/data-source-api";
import { inferProtocolEntities, type InferredEntity } from "../services/ocr-api";
import { showApiErrorToast } from "@/utils/api-error";

export type AutoCreateMode = "merge" | "replace";

interface AutoCreateProtocolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** How many entities the protocol already has — drives whether the
   *  merge/replace choice is shown at all. */
  existingEntityCount: number;
  /** Applies the entities and returns how many were ACTUALLY added. In merge
   *  mode that is fewer than offered when names already exist, and the dialog
   *  reports the returned number rather than what it inferred. */
  onApply: (entities: EntityDefinition[], mode: AutoCreateMode) => number;
}

function tableKey(table: Pick<CatalogTable, "name" | "datasetName">): string {
  return `${table.datasetName ?? ""}::${table.name}`;
}

/**
 * Collapsible table picker that behaves like the shared <Combobox> but renders
 * its dropdown INLINE rather than through a Radix Popover portal.
 *
 * The shared Combobox cannot be used here: PopoverContent is portalled
 * (components/ui/popover.tsx), so inside a Dialog it lands outside the focus
 * trap and the search field silently swallows every keystroke. Neither value of
 * its `modal` prop helps — the portal is the problem, not the modality.
 * drat-entity-combobox.tsx:33-35 hit the same wall; this mirrors its structure
 * (trigger button, absolutely-positioned panel, outside-mousedown to close,
 * rAF focus on the search input) so the two behave identically.
 */
function InlineTableCombobox({
  tables,
  value,
  onChange,
  disabled,
  isLoading,
  placeholder,
  noTablesText,
}: {
  tables: CatalogTable[];
  value: string;
  onChange: (key: string) => void;
  disabled: boolean;
  isLoading: boolean;
  placeholder: string;
  noTablesText: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [open]);

  // Collapse if the connector changes out from under an open dropdown.
  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setSearch("");
    }
  }, [disabled]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return tables;
    // Search the base too — with several bases in play, "app6Yh" is a
    // reasonable thing to type.
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        (t.datasetName ?? "").toLowerCase().includes(needle)
    );
  }, [tables, search]);

  // Only show the base when there is more than one in play. For a single-base
  // connector — the normal case, since the crawler is single-base per config —
  // a base id on every row is noise. Same rule DataSourcePicker uses for
  // multi-dataset BigQuery.
  const showBase = new Set(tables.map((t) => t.datasetName).filter(Boolean)).size > 1;

  const selectedTableForLabel = tables.find((t) => tableKey(t) === value);
  const selectedLabel = selectedTableForLabel
    ? showBase && selectedTableForLabel.datasetName
      ? `${selectedTableForLabel.name} · ${selectedTableForLabel.datasetName}`
      : selectedTableForLabel.name
    : undefined;

  function select(key: string) {
    onChange(key);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "h-9 w-full justify-between px-3 font-normal",
          !selectedLabel && "text-muted-foreground"
        )}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[60] mt-1 rounded-md border bg-white shadow-lg">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tables…"
              className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto p-1">
            {isLoading ? (
              <p className="py-6 text-center text-sm text-slate-500">Loading tables…</p>
            ) : tables.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">{noTablesText}</p>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No tables match that search.
              </p>
            ) : (
              filtered.map((table) => {
                const key = tableKey(table);
                const isSelected = key === value;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => select(key)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                      "text-slate-900 hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent/60"
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{table.name}</span>
                      {showBase && table.datasetName && (
                        // Without this, two bases holding a table of the same
                        // name render as identical rows and the choice is blind.
                        <span className="truncate font-mono text-[11px] text-slate-500">
                          {table.datasetName}
                        </span>
                      )}
                    </span>
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0 text-slate-700",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function randomColor(): string {
  return `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0")}`;
}

/**
 * Backend entity -> store EntityDefinition.
 *
 * Deliberately parallel to mapConfigToProtocol's entity branch in
 * protocol-editor.tsx: same client-side id convention, same unknown-dataType
 * guard, same random colour. A scaffolded entity must be indistinguishable from
 * a loaded one once it is in the store, because everything downstream (the
 * editor rows, buildOcrConfigurationPayload, Deploy) only ever sees the store.
 */
function mapInferredEntity(entity: InferredEntity, index: number): EntityDefinition {
  return {
    id: `e-auto-${Date.now()}-${index}`,
    name: entity.name,
    type: "custom",
    description: entity.description ?? "",
    dataType: asEntityDataType(entity.dataType),
    options: entity.optionList ?? [],
    dataSource: entity.dataSource ?? undefined,
    defaultValue: entity.defaultValue ?? "N/A",
    isRecordKey: false,
    isVerbatim: false,
    required: false,
    color: randomColor(),
  };
}

export function AutoCreateProtocolDialog({
  open,
  onOpenChange,
  existingEntityCount,
  onApply,
}: AutoCreateProtocolDialogProps) {
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [connectorsLoading, setConnectorsLoading] = useState(false);
  const [connectorId, setConnectorId] = useState("");
  const [tables, setTables] = useState<CatalogTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [draftDescriptions, setDraftDescriptions] = useState(false);
  const [mode, setMode] = useState<AutoCreateMode>("merge");
  const [isRunning, setIsRunning] = useState(false);
  // Identifies the run whose result is still wanted, so an in-flight result is
  // discarded instead of rewriting the protocol behind the user's back. A ref,
  // not state: handleRun's closure needs to read the value AFTER its await, and
  // a state variable captured before the await would still hold the old one.
  //
  // A counter rather than an `abandoned` boolean. A boolean cannot tell
  // "abandoned" from "superseded": closing sets it true, and the NEXT run would
  // set it false again, so a still-in-flight earlier run would see false and
  // apply. That sequence is currently unreachable — `canRun` includes
  // `!isRunning` and reset() leaves isRunning alone, so a second run cannot
  // start until the first has settled and already been discarded. This does not
  // rely on that: the guard is only as good as a disabled-button invariant 200
  // lines away, and nothing states the dependency. A counter makes the check
  // self-contained, and covers overlapping runs if that invariant ever changes.
  const runIdRef = useRef(0);

  // Airtable only, and said out loud rather than discovered by a 400. The
  // backend rejects other connector types regardless — this filter is the
  // courtesy, not the gate.
  const airtableConnectors = useMemo(
    () => connectors.filter((c) => (c.erp_type ?? "").toLowerCase() === "airtable"),
    [connectors]
  );

  useEffect(() => {
    if (!open) return;
    const companyId =
      typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") : null;
    if (!companyId) return;

    // Strict variant deliberately: fetchCompanyConnectors falls back to demo
    // connectors on error, including a plausible Airtable one. Harmless in a
    // browsing picker, a trap here — the selection immediately drives a live
    // schema read, so a fake id becomes an unexplained 404. See the wrapper's
    // docstring in services/data-source-api.ts.
    let cancelled = false;
    setConnectorsLoading(true);
    fetchCompanyConnectorsStrict(companyId)
      .then((fetched) => {
        if (!cancelled) setConnectors(fetched);
      })
      .catch((error) => {
        if (cancelled) return;
        setConnectors([]);
        showApiErrorToast(error, "Couldn't load connectors");
      })
      .finally(() => {
        if (!cancelled) setConnectorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    // Search state lives inside InlineTableCombobox, which clears it whenever
    // the dropdown closes — and picking a connector closes it via the
    // outside-mousedown handler — so only the selection needs resetting here.
    setSelectedKey("");
    if (!connectorId) {
      setTables([]);
      return;
    }
    // Switching connectors quickly races: connector A's catalog can resolve
    // AFTER the user has already picked B, overwriting B's tables with A's. The
    // selection is cleared above, so the user would then choose a table that
    // does not belong to the selected connector — and infer-entities would be
    // called with a mismatched pair.
    let cancelled = false;
    setTablesLoading(true);
    fetchCatalogTables(connectorId)
      .then((fetched) => {
        if (cancelled) return;
        // catalog-browse can list the same Airtable table more than once. Same
        // de-dupe as DataSourcePicker — duplicate keys are undefined behaviour
        // for React's list reconciliation, not merely a console warning.
        const byKey = new Map(fetched.map((t) => [tableKey(t), t]));
        // Newest crawl first. Previously this just .reverse()d the response,
        // which was a guess at recency; catalog-browse now returns
        // last_crawled_at, so order on it properly. Tables with no crawl date
        // sort last rather than jumping to the top.
        setTables(
          Array.from(byKey.values()).sort((a, b) => {
            const at = a.last_crawled_at ? Date.parse(a.last_crawled_at) : 0;
            const bt = b.last_crawled_at ? Date.parse(b.last_crawled_at) : 0;
            return bt - at;
          })
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setTables([]);
        showApiErrorToast(error, "Couldn't load tables for this connector");
      })
      .finally(() => {
        if (!cancelled) setTablesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connectorId]);

  const selectedTable = tables.find((t) => tableKey(t) === selectedKey);
  const canRun = Boolean(connectorId && selectedTable) && !isRunning;

  function reset() {
    setConnectorId("");
    setTables([]);
    setSelectedKey("");
    setDraftDescriptions(false);
    setMode("merge");
  }

  async function handleRun() {
    if (!selectedTable) return;
    // Abandoning the dialog mid-run must not still rewrite the protocol.
    // Cancel is disabled while running, but Escape and the X still close it —
    // and the in-flight promise would otherwise resolve and call onApply
    // anyway. With Replace + AI descriptions (the slowest combination) that
    // means walking away and coming back to a wiped entity list.
    //
    // Claim this run's id. Anything that invalidates it (a close, a later run)
    // bumps the counter, so the check after the await fails and this result is
    // dropped.
    const myRun = ++runIdRef.current;
    setIsRunning(true);
    try {
      const result = await inferProtocolEntities({
        connector_config_id: connectorId,
        table: selectedTable.name,
        dataset_name: selectedTable.datasetName ?? null,
        draft_descriptions: draftDescriptions,
      });

      // Not ours any more — the dialog was closed, or a newer run superseded
      // this one. Either way the user is not waiting on this result.
      if (myRun !== runIdRef.current) return;

      const entities = result.entities.map(mapInferredEntity);

      // Every warning is something the user can act on (an uncrawled linked
      // table, a link across bases). Surfaced individually rather than counted,
      // because "1 warning" tells nobody what to do.
      result.warnings.forEach((w) => toast.warning(w));

      if (entities.length === 0) {
        // Not a success. A table of nothing but formulas would otherwise show a
        // green toast over an unchanged, empty entity list.
        toast.warning(
          result.skipped_fields.length > 0
            ? `No usable fields in "${result.table}" — ${describeSkipped(result.skipped_fields)}.`
            : `No fields found in "${result.table}".`
        );
        return;
      }

      const effectiveMode = existingEntityCount === 0 ? "replace" : mode;
      // The APPLIED count, not the inferred one. In merge mode names already on
      // the protocol are dropped, so these differ — and reporting the inferred
      // count meant a green "Added 12 fields" after adding nothing at all.
      const applied = onApply(entities, effectiveMode);

      if (applied === 0) {
        // Mirrors addMissingCharterFields: an info toast, and the dialog stays
        // open so the user can switch to Replace or pick another table rather
        // than being dropped back with no idea why nothing changed.
        toast.info(
          `Every field in "${result.table}" is already in this protocol. ` +
            "Choose Replace to overwrite them instead."
        );
        return;
      }

      const skipped =
        result.skipped_fields.length > 0
          ? ` ${describeSkipped(result.skipped_fields)} skipped.`
          : "";
      const drafted =
        result.descriptions_drafted > 0
          ? ` ${result.descriptions_drafted} description(s) AI-drafted — review them.`
          : "";
      const ignored =
        applied < entities.length
          ? ` ${entities.length - applied} already present.`
          : "";
      toast.success(
        `Added ${applied} field(s) from "${result.table}".${ignored}${skipped}${drafted} Deploy when ready.`
      );

      onOpenChange(false);
      reset();
    } catch (error: unknown) {
      showApiErrorToast(error, "Could not read that table's schema.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          // Escape and the X route through here too, not just Cancel — so this
          // is the one place that reliably catches "user walked away".
          // Bumping the counter invalidates whatever is in flight without
          // needing to know whether anything is.
          runIdRef.current += 1;
          reset();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-600" />
            Auto Create Protocol
          </DialogTitle>
          <DialogDescription>
            Read a destination table and prefill this protocol&apos;s fields. Nothing is
            saved until you deploy.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Works with Airtable connectors only for now.</span>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Connector</Label>
            <Select value={connectorId} onValueChange={setConnectorId}>
              <SelectTrigger className="h-9">
                <SelectValue
                  placeholder={
                    connectorsLoading ? "Loading connectors…" : "Select an Airtable connector"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {airtableConnectors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.connector_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!connectorsLoading && airtableConnectors.length === 0 && (
              <p className="text-xs text-slate-500">
                No Airtable connectors found for this company. Connect one in CoreOS first.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Table</Label>
            <InlineTableCombobox
              tables={tables}
              value={selectedKey}
              onChange={setSelectedKey}
              disabled={!connectorId}
              isLoading={tablesLoading}
              placeholder={!connectorId ? "Pick a connector first" : "Select a table"}
              noTablesText="No tables in this connector's catalog. Crawl the connector first."
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-md border border-slate-200 p-2.5">
            <Checkbox
              id="auto-create-draft-descriptions"
              checked={draftDescriptions}
              onCheckedChange={(checked) => setDraftDescriptions(checked === true)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="auto-create-draft-descriptions"
                className="text-xs font-medium cursor-pointer"
              >
                Draft descriptions with AI for fields that have none
              </Label>
              <p className="text-[11px] leading-snug text-slate-500">
                Fields that already have an Airtable description keep it exactly. A
                description is the extraction instruction, so review anything drafted.
              </p>
            </div>
          </div>

          {existingEntityCount > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                This protocol already has {existingEntityCount} field(s)
              </Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as AutoCreateMode)}
                className="gap-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="merge" id="auto-create-merge" />
                  <Label htmlFor="auto-create-merge" className="text-xs cursor-pointer">
                    Add missing fields only — keep what&apos;s there
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="replace" id="auto-create-replace" />
                  <Label htmlFor="auto-create-replace" className="text-xs cursor-pointer">
                    Replace all {existingEntityCount} field(s)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRunning}>
            Cancel
          </Button>
          <Button
            onClick={handleRun}
            disabled={!canRun}
            className={
              mode === "replace" && existingEntityCount > 0
                ? "bg-amber-600 hover:bg-amber-700"
                : undefined
            }
          >
            {isRunning && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {mode === "replace" && existingEntityCount > 0
              ? `Replace ${existingEntityCount} field(s)`
              : "Auto Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function describeSkipped(skipped: { reason: string }[]): string {
  const computed = skipped.filter((s) => s.reason === "computed").length;
  const unsupported = skipped.length - computed;
  const parts: string[] = [];
  if (computed > 0) parts.push(`${computed} computed field(s)`);
  if (unsupported > 0) parts.push(`${unsupported} unsupported field(s)`);
  return parts.join(" and ");
}

