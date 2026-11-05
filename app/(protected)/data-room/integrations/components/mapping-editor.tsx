"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IntegrationColumnMapping } from "../services/data-integration-api";
import { cn } from "@/lib/utils";

interface MappingEditorProps {
  mappings: IntegrationColumnMapping[];
  /** Destination columns currently used to match rows. [] means Append. */
  upsertKeys?: string[];
  /**
   * Whether this job has matching rules saved.
   *
   * Rules are a THIRD write mode, and at run time they beat the upsert key —
   * `_plan_upsert_review` resolves rules first and never reaches the key path.
   * Without knowing this, the editor would happily show "Upsert on title" for a
   * job whose rules actually decide, which is a screen that lies about what the
   * next run will do.
   */
  hasRules?: boolean;
  /**
   * The matching-rules editor, rendered inline when that mode is selected.
   *
   * Passed in rather than imported so this component keeps knowing nothing
   * about rules beyond "a job may have some" — it is used by two areas, and
   * only one of them has an editor to offer.
   */
  rulesPanel?: React.ReactNode;
  /** Optional escape to a roomier screen, when the caller has one. */
  onOpenRules?: () => void;
  onSave: (mappings: IntegrationColumnMapping[], upsertKeys: string[]) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

/**
 * Append, Upsert on columns, or Matching rules.
 *
 * One radio group rather than two screens, because these are the same decision:
 * how a row is identified. Rules used to be configured elsewhere while the key
 * stayed visible here, and rules silently won at run time — the precedence was
 * real but invisible. As a mode it cannot be.
 */
type WriteMode = "append" | "upsert" | "rules";

export function IntegrationMappingEditor({
  mappings: initialMappings,
  upsertKeys: initialUpsertKeys = [],
  hasRules = false,
  rulesPanel,
  onOpenRules,
  onSave,
  onCancel,
  isSaving,
}: MappingEditorProps) {
  const [localMappings, setLocalMappings] = useState<IntegrationColumnMapping[]>(initialMappings);
  const [localKeys, setLocalKeys] = useState<string[]>(initialUpsertKeys);
  // Rules beat the key at run time, so a job that has them IS in rules mode
  // whatever its key says. Otherwise upsert is "on" whenever a key exists —
  // kept as its own flag so the user can select Upsert and then tick columns,
  // rather than the mode flickering back to Append the moment they untick the
  // last one.
  const [mode, setMode] = useState<WriteMode>(
    hasRules ? "rules" : initialUpsertKeys.length > 0 ? "upsert" : "append"
  );
  const isUpsert = mode === "upsert";

  // Open in Upsert, where the Key ticks are IN the table, and folded otherwise
  // so the mode you came to change is not buried under nineteen rows. Only the
  // initial value depends on the mode — once someone opens or closes it by hand
  // that choice stands, rather than springing back on the next mode change.
  const [mappingsOpen, setMappingsOpen] = useState<boolean>(
    !hasRules && initialUpsertKeys.length > 0
  );

  // useState only reads its initial value on first mount. This editor is
  // conditionally rendered, so it normally remounts and re-reads — but if the
  // job refetches while it is open (a save mints a new job version), the props
  // change underneath and the local state would keep showing the pre-save mode.
  // Resync on the identity of the incoming key, not the array, since a fresh
  // array with the same contents arrives on every render.
  const initialKeySignature = initialUpsertKeys.join("");
  useEffect(() => {
    setLocalKeys(initialUpsertKeys);
    setMode(hasRules ? "rules" : initialUpsertKeys.length > 0 ? "upsert" : "append");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeySignature, hasRules]);

  const chooseMode = (next: WriteMode) => {
    // Selecting "rules" must not clear the key. Rules can be detached later,
    // and a job that then silently became Append because the ticks were thrown
    // away on a radio click would be a nasty surprise — so the key is kept and
    // simply stops being sent while rules are in force.
    setMode(next);
  };

  const toggleKey = (column: string) => {
    const name = column.trim();
    if (!name) return;
    setLocalKeys((prev) =>
      prev.some((k) => k.toLowerCase() === name.toLowerCase())
        ? prev.filter((k) => k.toLowerCase() !== name.toLowerCase())
        : [...prev, name]
    );
  };

  const isKey = (column: string) =>
    Boolean(column.trim()) &&
    localKeys.some((k) => k.toLowerCase() === column.trim().toLowerCase());

  // Append sends [] rather than the ticked columns, so switching to Append and
  // saving genuinely clears the key instead of leaving a stale one behind.
  //
  // The filter is a backstop, not the primary fix: rename and remove already
  // maintain localKeys, but a key can also arrive from the server naming a
  // column this job no longer maps. Only a key that still names a live
  // destination can be matched on, so pruning here guarantees what we send
  // agrees with the ticks on screen no matter how the state got there — and
  // the backend rejects an unmapped key on save (_validate_upsert_key_mapped),
  // so sending one would fail the save outright.
  const mappedDestinations = new Set(
    localMappings
      .map((m) => (m.destination_column || "").trim().toLowerCase())
      .filter(Boolean)
  );
  const effectiveKeys = localKeys.filter((k) =>
    mappedDestinations.has(k.trim().toLowerCase())
  );
  // Append clears the key. Upsert sends the ticks.
  //
  // Rules PRESERVE it, deliberately. Clearing would make the stored row tidy
  // and the behaviour treacherous: detach the rules later and the job silently
  // becomes Append, because the key someone chose was thrown away by a radio
  // click they made months earlier. Pruned through effectiveKeys either way, so
  // what survives still names live destination columns and passes
  // _validate_upsert_key_mapped on save.
  const keysToSave = mode === "append" ? [] : effectiveKeys;

  const handleUpdateMapping = (index: number, updates: Partial<IntegrationColumnMapping>) => {
    const newMappings = [...localMappings];
    const previous = newMappings[index];
    newMappings[index] = { ...previous, ...updates };
    setLocalMappings(newMappings);

    // Keys are stored as destination NAMES, so a rename has to carry the key
    // with it. Without this the checkbox — bound to the *current* name —
    // silently unticks itself while the OLD name stays in localKeys and still
    // gets saved, so the editor shows one thing and the job stores another.
    if (!("destination_column" in updates)) return;
    const before = (previous?.destination_column || "").trim();
    const after = (updates.destination_column || "").trim();
    if (before.toLowerCase() === after.toLowerCase()) return;

    setLocalKeys((prev) => {
      const at = prev.findIndex((k) => k.toLowerCase() === before.toLowerCase());
      if (at === -1) return prev; // the old name wasn't a key; nothing to carry
      const next = [...prev];
      if (!after) {
        // Renamed to blank: no name left to match on.
        next.splice(at, 1);
      } else if (prev.some((k, i) => i !== at && k.toLowerCase() === after.toLowerCase())) {
        // The new name is already a key — collapse rather than duplicate it.
        next.splice(at, 1);
      } else {
        // Rename in place: position matters, it is the order components are
        // matched in.
        next[at] = after;
      }
      return next;
    });
  };

  const handleRemoveMapping = (index: number) => {
    const removed = (localMappings[index]?.destination_column || "").trim();
    setLocalMappings(localMappings.filter((_, i) => i !== index));
    if (!removed) return;
    // Another row may still target the same column, in which case the key is
    // still writable and must stay.
    const stillMapped = localMappings.some(
      (m, i) =>
        i !== index &&
        (m.destination_column || "").trim().toLowerCase() === removed.toLowerCase()
    );
    if (!stillMapped) {
      setLocalKeys((prev) =>
        prev.filter((k) => k.toLowerCase() !== removed.toLowerCase())
      );
    }
  };

  const handleAddMapping = () => {
    const newMapping: IntegrationColumnMapping = {
      source_column: "",
      destination_column: "",
      data_type: "string",
      is_required: false,
      order_index: localMappings.length,
    };
    setLocalMappings([...localMappings, newMapping]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Schema Mapping Editor</h3>
          <p className="text-xs text-slate-500 font-medium">Define how source fields transform into destination columns.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={onCancel} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" /> Cancel
          </Button>
          <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200" onClick={() => onSave(localMappings, keysToSave)} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" /> {isSaving ? "Saving..." : "Save Mappings"}
          </Button>
        </div>
      </div>

      {/* Destination write mode */}
      <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
          Destination write mode
        </div>
        <div className="flex flex-col gap-2">
          <label
            className={cn(
              "flex items-start gap-3",
              hasRules ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
          >
            <input
              type="radio"
              name="write-mode"
              checked={mode === "append"}
              onChange={() => chooseMode("append")}
              disabled={hasRules}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-semibold text-slate-900">Append</span>
              <span className="block text-xs text-slate-500">
                Every run adds new rows. Existing rows are never changed.
              </span>
            </span>
          </label>
          <label
            className={cn(
              "flex items-start gap-3",
              hasRules ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
          >
            <input
              type="radio"
              name="write-mode"
              checked={mode === "upsert"}
              onChange={() => chooseMode("upsert")}
              disabled={hasRules}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-semibold text-slate-900">Upsert</span>
              <span className="block text-xs text-slate-500">
                Match existing rows on the ticked columns below and update them
                instead of adding duplicates. Tick more than one column when a
                single value isn&apos;t unique on its own.
              </span>
            </span>
          </label>
          {/* Always rendered, and always selectable — the mode is a real
              choice, so hiding it until rules exist meant nobody discovered it.
              Picking it opens the editor inline below: one decision, one
              place. */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="write-mode"
              checked={mode === "rules"}
              onChange={() => chooseMode("rules")}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-semibold text-slate-900">Matching rules</span>
              <span className="block text-xs text-slate-500">
                Conditions narrow the candidate rows, and you choose what happens when
                none, one, or several survive. Replaces the ticked columns entirely.
              </span>
            </span>
          </label>
        </div>

        {/* HIDDEN, NOT UNMOUNTED.
            This was `{mode === "rules" && (...)}`, so clicking the Append or
            Upsert radio tore the rules editor down — and the rules draft lives
            in that component's state, so a half-built rule set went with it, on
            a stray radio click, with nothing to undo it. Coming back showed the
            last saved version as though nothing had been typed.
            Keeping it mounted costs one extra GET for jobs that never open it
            (useJobRules caches it for five minutes) and keeps the work. */}
        <div
          className={mode === "rules" ? "mt-3 space-y-3" : "hidden"}
          aria-hidden={mode !== "rules"}
        >
            {/* What is actually in force, stated plainly.
                Selecting the radio does NOT switch the job over — the mode is
                derived from whether rules are SAVED, so an unsaved selection
                would otherwise imply a change that has not happened. */}
            {!hasRules && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Not in force yet. This job still{" "}
                {effectiveKeys.length > 0 ? (
                  <>
                    matches on{" "}
                    <span className="font-mono font-bold">{effectiveKeys.join(" + ")}</span>
                  </>
                ) : (
                  "appends every row"
                )}{" "}
                until you save rules below.
              </div>
            )}
            {hasRules && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                In force. The columns below are still the mapping — they are just not
                what identifies a row. Remove the rules to go back to Append or Upsert.
              </div>
            )}

            {rulesPanel ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                {/* Rules have their own Save. Two save buttons in one panel is
                    confusing unless you say which is which, so say it. */}
                <p className="mb-3 text-[11px] font-medium text-slate-500">
                  Rules save on their own — “Save Mappings” above does not save them.
                </p>
                {rulesPanel}
              </div>
            ) : (
              onOpenRules && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-lg text-[11px]"
                  onClick={onOpenRules}
                >
                  Open Matching Rules
                </Button>
              )
            )}
        </div>

        {isUpsert && (
          <div
            className={cn(
              "mt-3 rounded-xl px-3 py-2 text-xs",
              effectiveKeys.length === 0
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
            )}
          >
            {/* Reads effectiveKeys, not localKeys, so this banner always states
                what Save will actually store — the two disagreeing is what made
                the stale-key bug invisible. */}
            {effectiveKeys.length === 0 ? (
              // Not an error — decision 7. It is a real, saveable state that
              // simply behaves as Append, so say so rather than blocking Save.
              <>No columns ticked — this job will append, the same as Append mode.</>
            ) : (
              <>
                Matching on <span className="font-bold">{effectiveKeys.join(" + ")}</span>. A row
                is updated only when {effectiveKeys.length > 1 ? "all of these agree" : "this agrees"}.
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Collapsible.
            Nineteen mapping rows above the thing you actually came to change is
            a lot of scrolling, and in Append or Matching rules the rows are
            rarely what you are here for — so it starts folded in those modes and
            open in Upsert, where the Key ticks live in the table itself. Folding
            is presentation only: every row is still saved either way. */}
        <button
          type="button"
          onClick={() => setMappingsOpen((open) => !open)}
          className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-left transition-colors hover:bg-slate-50"
        >
          {mappingsOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Column mappings
          </span>
          <span className="rounded-full bg-slate-100 px-2 text-[10px] font-bold text-slate-600">
            {localMappings.length}
          </span>
          {!mappingsOpen && (
            <span className="text-[11px] text-slate-400">
              {isUpsert && effectiveKeys.length > 0
                ? `keyed on ${effectiveKeys.join(" + ")}`
                : "click to edit which columns are written"}
            </span>
          )}
        </button>

        {mappingsOpen && (
        <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          <div className="col-span-4">Source Field</div>
          <div className="col-span-1 text-center">Transform</div>
          <div className="col-span-3">Target Column</div>
          <div className="col-span-1 text-center">{isUpsert ? "Key" : ""}</div>
          <div className="col-span-2">Type / Req</div>
          <div className="col-span-1"></div>
        </div>
        )}

        {mappingsOpen && localMappings.map((mapping, idx) => (
          <div 
            key={idx} 
            className="grid grid-cols-12 gap-4 items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-200/60 hover:border-blue-200 hover:bg-white transition-all group"
          >
            {/* Source */}
            <div className="col-span-4">
              <Input 
                value={mapping.source_column}
                onChange={(e) => handleUpdateMapping(idx, { source_column: e.target.value })}
                placeholder="Source Field"
                className="h-10 rounded-xl bg-white border-slate-200 font-mono text-xs"
              />
            </div>

            {/* Icon */}
            <div className="col-span-1 flex justify-center">
              <ArrowRight className="w-4 h-4 text-slate-300" />
            </div>

            {/* Destination */}
            <div className="col-span-3">
              <Input
                value={mapping.destination_column}
                onChange={(e) => handleUpdateMapping(idx, { destination_column: e.target.value })}
                placeholder="Target Field"
                className="h-10 rounded-xl bg-white border-slate-200 font-mono text-xs text-blue-700 font-bold"
              />
            </div>

            {/* Part of the match key? Only meaningful in Upsert mode. */}
            <div className="col-span-1 flex justify-center">
              {isUpsert && (
                <input
                  type="checkbox"
                  checked={isKey(mapping.destination_column)}
                  onChange={() => toggleKey(mapping.destination_column)}
                  // A blank target column has no name to match on.
                  disabled={!mapping.destination_column.trim()}
                  title={
                    mapping.destination_column.trim()
                      ? `Match rows on "${mapping.destination_column}"`
                      : "Name the target column first"
                  }
                  className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                />
              )}
            </div>

            {/* Type & Required */}
            <div className="col-span-2 flex items-center gap-2">
              <Select 
                value={mapping.data_type} 
                onValueChange={(val) =>
                  handleUpdateMapping(idx, {
                    data_type: val as IntegrationColumnMapping["data_type"],
                  })
                }
              >
                <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-[10px] font-mono uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="integer">Integer</SelectItem>
                  <SelectItem value="float">Float</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-xl transition-colors",
                  mapping.is_required ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                )}
                onClick={() => handleUpdateMapping(idx, { is_required: !mapping.is_required })}
              >
                <AlertCircle className="w-4 h-4" />
              </Button>
            </div>

            {/* Remove */}
            <div className="col-span-1 flex justify-end">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveMapping(idx)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* The free-text "Transformation SQL/Expression" input was removed.
                Any value already stored on a mapping is preserved — it rides
                along in localMappings and is saved untouched — it just is not
                editable here any more. */}
          </div>
        ))}

        {mappingsOpen && (
          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl border-dashed border-2 border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30 transition-all"
            onClick={handleAddMapping}
          >
            <Plus className="w-4 h-4 mr-2" /> Add New Column Mapping
          </Button>
        )}
      </div>
    </div>
  );
}
