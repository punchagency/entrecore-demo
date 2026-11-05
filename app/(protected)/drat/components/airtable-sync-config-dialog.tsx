"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import { AlertTriangle, Keyboard, Loader2, MousePointerClick, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AirtableSyncConfig,
  AirtableTable,
  emptyAirtableSyncConfig,
} from "../services/entities-api";
import { extractAxiosErrorMessage } from "../services/drive-map-api";
import {
  useAirtableBases,
  useAirtableTables,
  useClearAirtableSyncConfig,
  useSetAirtableSyncConfig,
} from "../hooks/use-entities";
import { QueryErrorState } from "@/components/query-error-state";

interface AirtableSyncConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingConfig: AirtableSyncConfig | null;
}

/** Airtable IDs are prefixed and fixed-length; catch a pasted URL early in manual mode. */
const BASE_ID_PATTERN = /^app[A-Za-z0-9]{14}$/;

/** Radix Select can't hold "" as a value, so unmapped optional columns need a sentinel. */
const NO_COLUMN = "__none__";

type OptionalColumn = "aliases" | "drive_folder_id" | "enabled";

export function AirtableSyncConfigDialog({
  open,
  onOpenChange,
  existingConfig,
}: AirtableSyncConfigDialogProps) {
  const setMutation = useSetAirtableSyncConfig();
  const clearMutation = useClearAirtableSyncConfig();
  const [form, setForm] = useState<AirtableSyncConfig>(emptyAirtableSyncConfig);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  const basesQuery = useAirtableBases(open && !manualEntry);
  const tablesQuery = useAirtableTables(form.base_id || null, open && !manualEntry);

  // Read through a ref so the hydration effect below doesn't depend on the
  // config object's identity.
  const configRef = useRef(existingConfig);
  configRef.current = existingConfig;

  // Hydrate the form only as the dialog opens. Depending on existingConfig here
  // would re-run on every background refetch of the config query and silently
  // discard edits the user hadn't saved yet.
  useEffect(() => {
    if (!open) return;
    setForm(configRef.current ?? emptyAirtableSyncConfig());
    setConfirmingClear(false);
    setManualEntry(false);
  }, [open]);

  const setField = <K extends keyof AirtableSyncConfig>(
    key: K,
    value: AirtableSyncConfig[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const setColumn = (key: keyof AirtableSyncConfig["column_map"], value: string | null) =>
    setForm((prev) => ({ ...prev, column_map: { ...prev.column_map, [key]: value } }));

  // The saved table may be stored as a name or a tblXXX id, and either may no longer
  // exist in Airtable. Match on both so an existing config still resolves.
  const selectedTable: AirtableTable | undefined = useMemo(
    () =>
      tablesQuery.data?.find(
        (t) => t.name === form.table_name || t.id === form.table_name
      ),
    [tablesQuery.data, form.table_name]
  );

  const columnOptions = useMemo(() => selectedTable?.fields ?? [], [selectedTable]);

  const sortedBases = useMemo(
    () => [...(basesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [basesQuery.data]
  );
  const sortedTables = useMemo(
    () => [...(tablesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [tablesQuery.data]
  );
  const sortedColumns = useMemo(
    () => [...columnOptions].sort((a, b) => a.name.localeCompare(b.name)),
    [columnOptions]
  );

  const handleBaseChange = (baseId: string) => {
    // Table and columns belong to the old base; keeping them would silently
    // produce a config that points at nothing.
    setForm((prev) => ({
      ...prev,
      base_id: baseId,
      table_name: "",
      column_map: { name: "", aliases: null, drive_folder_id: null, enabled: null },
    }));
  };

  const handleTableChange = (tableName: string) => {
    const table = tablesQuery.data?.find((t) => t.name === tableName);
    const hasName = table?.fields.some((f) => f.name === form.column_map.name);
    setForm((prev) => ({
      ...prev,
      table_name: tableName,
      column_map: hasName
        ? prev.column_map
        : { name: "", aliases: null, drive_folder_id: null, enabled: null },
    }));
  };

  const baseId = form.base_id.trim();
  const tableName = form.table_name.trim();
  const nameColumn = (form.column_map.name ?? "").trim();
  const baseIdLooksWrong = manualEntry && baseId.length > 0 && !BASE_ID_PATTERN.test(baseId);
  const canSave = baseId.length > 0 && tableName.length > 0 && nameColumn.length > 0;

  const discoveryError = basesQuery.isError
    ? extractAxiosErrorMessage(
        basesQuery.error,
        "Could not reach Airtable. Connect an Airtable account in Core OS first."
      )
    : null;

  const handleSave = async () => {
    if (!canSave) return;
    try {
      await setMutation.mutateAsync(form);
      toast.success("Airtable sync configured. You can run a sync now.");
      onOpenChange(false);
    } catch (error: unknown) {
      showApiErrorToast(error, "Failed to save the Airtable sync configuration");
    }
  };

  const handleClear = async () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    try {
      await clearMutation.mutateAsync();
      toast.success("Airtable sync configuration removed.");
      onOpenChange(false);
    } catch (error: unknown) {
      showApiErrorToast(error, "Failed to remove the Airtable sync configuration");
    }
  };

  const busy = setMutation.isPending || clearMutation.isPending;

  const optionalColumnPicker = (
    key: OptionalColumn,
    label: string,
    hint?: string
  ) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {manualEntry ? (
        <Input
          value={form.column_map[key] ?? ""}
          onChange={(e) => setColumn(key, e.target.value)}
          className="rounded-xl border-slate-200 bg-slate-50/50"
          disabled={busy}
        />
      ) : (
        <Select
          value={form.column_map[key] ?? NO_COLUMN}
          onValueChange={(v) => setColumn(key, v === NO_COLUMN ? null : v)}
          disabled={busy || !selectedTable}
        >
          <SelectTrigger className="rounded-xl bg-slate-50/50">
            <SelectValue placeholder="Not mapped" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_COLUMN}>— Not mapped —</SelectItem>
            {sortedColumns.map((f) => (
              <SelectItem key={f.name} value={f.name}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Airtable sync settings</DialogTitle>
          <DialogDescription>
            Choose which Airtable base and table hold your client list, and which columns
            map onto entity fields. Credentials come from the Airtable connector you set up
            in Core OS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {discoveryError && !manualEntry && (
            <div className="space-y-1.5">
              <QueryErrorState
                variant="inline"
                className="p-3.5"
                error={basesQuery.error}
                title="Couldn't reach Airtable"
                fallbackMessage="Connect an Airtable account in Core OS first."
                onRetry={() => basesQuery.refetch()}
                isRetrying={basesQuery.isFetching}
              />
              <button
                type="button"
                className="text-xs font-semibold text-rose-700 underline"
                onClick={() => setManualEntry(true)}
              >
                Enter IDs manually instead
              </button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="airtable-base-id">Base</Label>
              {manualEntry ? (
                <Input
                  id="airtable-base-id"
                  placeholder="appXXXXXXXXXXXXXX"
                  value={form.base_id}
                  onChange={(e) => setField("base_id", e.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50/50 font-mono text-sm"
                  disabled={busy}
                />
              ) : (
                <Select
                  value={form.base_id || undefined}
                  onValueChange={handleBaseChange}
                  disabled={busy || basesQuery.isLoading || !!discoveryError}
                >
                  <SelectTrigger className="rounded-xl bg-slate-50/50">
                    <SelectValue
                      placeholder={basesQuery.isLoading ? "Loading bases…" : "Choose a base"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {/* A saved base that the token can no longer see must stay selectable,
                        otherwise opening settings would silently blank the config. */}
                    {form.base_id &&
                      !basesQuery.data?.some((b) => b.id === form.base_id) && (
                        <SelectItem value={form.base_id}>{form.base_id} (saved)</SelectItem>
                      )}
                    {sortedBases.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {baseIdLooksWrong ? (
                <p className="text-xs text-amber-600">
                  Expected an ID like <span className="font-mono">appXXXXXXXXXXXXXX</span>.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="airtable-table-name">Table</Label>
              {manualEntry ? (
                <Input
                  id="airtable-table-name"
                  placeholder="Clients"
                  value={form.table_name}
                  onChange={(e) => setField("table_name", e.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  disabled={busy}
                />
              ) : (
                <Select
                  value={form.table_name || undefined}
                  onValueChange={handleTableChange}
                  disabled={busy || !form.base_id || tablesQuery.isLoading}
                >
                  <SelectTrigger className="rounded-xl bg-slate-50/50">
                    <SelectValue
                      placeholder={
                        !form.base_id
                          ? "Choose a base first"
                          : tablesQuery.isLoading
                            ? "Loading tables…"
                            : "Choose a table"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {form.table_name && !selectedTable && (
                      <SelectItem value={form.table_name}>
                        {form.table_name} (saved)
                      </SelectItem>
                    )}
                    {sortedTables.map((t) => (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {tablesQuery.isError && !manualEntry ? (
                <QueryErrorState
                  variant="inline"
                  className="p-3"
                  error={tablesQuery.error}
                  title="Couldn't list the tables in this base"
                  onRetry={() => tablesQuery.refetch()}
                  isRetrying={tablesQuery.isFetching}
                />
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label className="text-sm font-semibold text-slate-800">Column mapping</Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  {manualEntry
                    ? "Airtable column names, spelled exactly as they appear in the table."
                    : "Pick the columns that hold each entity field. Optional ones can stay unmapped."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualEntry((v) => !v)}
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600"
              >
                {manualEntry ? (
                  <>
                    <MousePointerClick className="h-3.5 w-3.5" />
                    Pick from Airtable
                  </>
                ) : (
                  <>
                    <Keyboard className="h-3.5 w-3.5" />
                    Type manually
                  </>
                )}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="airtable-col-name">Client name (required)</Label>
                {manualEntry ? (
                  <Input
                    id="airtable-col-name"
                    placeholder="Name"
                    value={form.column_map.name}
                    onChange={(e) => setColumn("name", e.target.value)}
                    className="rounded-xl border-slate-200 bg-slate-50/50"
                    disabled={busy}
                  />
                ) : (
                  <Select
                    value={form.column_map.name || undefined}
                    onValueChange={(v) => setColumn("name", v)}
                    disabled={busy || !selectedTable}
                  >
                    <SelectTrigger className="rounded-xl bg-slate-50/50">
                      <SelectValue
                        placeholder={selectedTable ? "Choose a column" : "Choose a table first"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {form.column_map.name &&
                        !columnOptions.some((f) => f.name === form.column_map.name) && (
                          <SelectItem value={form.column_map.name}>
                            {form.column_map.name} (saved)
                          </SelectItem>
                        )}
                      {sortedColumns.map((f) => (
                        <SelectItem key={f.name} value={f.name}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {optionalColumnPicker(
                "aliases",
                "Aliases",
                "Pipe- or comma-separated, or a multi-select. Aliases let DRAT match documents filed under an older name."
              )}
              {optionalColumnPicker("drive_folder_id", "Drive folder ID")}
              {optionalColumnPicker(
                "enabled",
                "Active flag",
                "A checkbox column. Leave unmapped and every synced client counts as active."
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="airtable-sync-enabled" className="text-sm">
                  Include in the nightly sync
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  When off, only the Sync from Airtable button runs a sync.
                </p>
              </div>
              <Switch
                id="airtable-sync-enabled"
                checked={form.sync_enabled}
                onCheckedChange={(v) => setField("sync_enabled", v)}
                disabled={busy}
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="airtable-disable-missing" className="text-sm">
                  Disable clients removed from Airtable
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Entities whose Airtable record disappears are switched off rather than
                  deleted, so their filing history survives.
                </p>
              </div>
              <Switch
                id="airtable-disable-missing"
                checked={form.disable_missing}
                onCheckedChange={(v) => setField("disable_missing", v)}
                disabled={busy}
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="airtable-drive-authoritative" className="text-sm">
                  Airtable owns Drive folders
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  When on, the Drive column overwrites folders you set here. When off, sync
                  only fills in entities that have no folder yet.
                </p>
              </div>
              <Switch
                id="airtable-drive-authoritative"
                checked={form.drive_folder_authoritative}
                onCheckedChange={(v) => setField("drive_folder_authoritative", v)}
                disabled={busy}
              />
            </div>
          </div>

          {form.disable_missing && (
            <div className="flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Entities that aren&apos;t in this Airtable table get switched off on the first
                sync. If you have entities you created by hand, turn this off for the first
                run.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 sm:justify-between">
          {existingConfig ? (
            <Button
              variant="outline"
              onClick={() => void handleClear()}
              disabled={busy}
              className={
                confirmingClear
                  ? "border-rose-300 text-rose-600 hover:bg-rose-50"
                  : "text-slate-600"
              }
            >
              {clearMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {confirmingClear ? "Click again to confirm" : "Remove config"}
            </Button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!canSave || busy}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              {setMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save settings
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
