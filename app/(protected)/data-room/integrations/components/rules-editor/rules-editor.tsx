"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Reorder } from "framer-motion";
import { Info, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClearJobRules,
  useJobRules,
  useRuleSchema,
  useSaveJobRules,
  useValidateJobRules,
} from "../../hooks/use-integration-rules";
import { extractRuleErrors, ruleErrorMessage, scannedTables } from "../../services/rules-api";
import type { RuleValidationError } from "../../services/rules-api";
import { CaseCard, blankCase } from "./case-card";
import { CheckOnlyBar } from "./check-only-bar";
import type { EditorCase, EditorDocument } from "./editor-model";
import { reorderByUid, toDocument, toEditor } from "./editor-model";
import { RulePreview } from "./rule-preview";
import { RuleSetBar } from "./rule-set-bar";

/**
 * Matching rules for one job.
 *
 *     switch on the incoming record  ->  pick a case
 *     run that case's conditions in order  ->  1,240 -> 3 -> 2 -> 1
 *     count the survivors  ->  the action you mapped that count to
 *
 * This component holds NO business logic. Columns, operators, actions and
 * normalisers all come from the schema endpoint, so adding an operator is a
 * backend change with no frontend release. Validation is likewise the
 * backend's: it returns errors carrying a case and condition index, and this
 * screen's only job is to put each message on the row that caused it.
 */

interface Props {
  jobId: string;
  destinationTable?: string | null;
  /**
   * The job's upsert key, purely so "Remove rules" can say what the job will
   * fall back to. Removing rules does not clear the key — it is what starts
   * deciding again — so naming it is the difference between an informed
   * confirmation and a shrug.
   */
  upsertKeys?: string[];
  readOnly?: boolean;
}

export function RulesEditor({ jobId, destinationTable, upsertKeys, readOnly }: Props) {
  const { data: stored, isLoading } = useJobRules(jobId);
  const { data: serverSchema } = useRuleSchema(jobId);
  const save = useSaveJobRules(jobId);
  const validate = useValidateJobRules(jobId);
  const clear = useClearJobRules(jobId);

  const [draft, setDraft] = useState<EditorDocument | null>(null);
  const [errors, setErrors] = useState<RuleValidationError[]>([]);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState(false);
  // Set when the server's copy moved while the draft was dirty, so the choice
  // between the two belongs to the user rather than to whichever arrived last.
  const [serverMoved, setServerMoved] = useState(false);

  // The saved document this editor last adopted, serialised. Compared against
  // rather than relying on `stored`'s identity: react-query hands back a NEW
  // object on every refetch even when the bytes are identical, so keying the
  // effect on identity alone made a no-op refetch indistinguishable from a real
  // change.
  const adopted = useRef<string | null>(null);

  function loadFromServer(document: EditorDocument | null, snapshot: string | null) {
    adopted.current = snapshot;
    setDraft(document);
    setDirty(false);
    setErrors([]);
    setServerMoved(false);
  }

  // Load the saved document once it arrives, and whenever the server's copy
  // genuinely changes underneath us (attaching a rule set replaces it wholesale).
  // `toEditor` stamps a stable id on every case and condition so dragging can
  // key by row rather than by position; `toDocument` strips them on the way out.
  //
  // WHAT THIS USED TO DO, AND WHY IT WAS DESTRUCTIVE
  //
  // It was `setDraft(...); setDirty(false)` on every change of `stored`, with no
  // check of either. Because a refetch always produces a fresh object, any
  // refetch — window focus, a remount from switching tabs, an invalidation fired
  // by an unrelated mutation in this file — replaced the draft with the last
  // saved copy AND cleared `dirty`, so the "Unsaved" badge vanished along with
  // the work. Nothing warned, and nothing was recoverable: the draft only ever
  // lived in this state.
  //
  // A dirty draft is now never overwritten. If the saved copy really did move
  // (someone attached a rule set in another tab), that is surfaced as a choice
  // instead of being applied silently.
  useEffect(() => {
    if (!stored) return;
    const snapshot = stored.document ? JSON.stringify(stored.document) : null;
    if (snapshot === adopted.current) return; // same content; nothing to adopt
    if (dirty) {
      setServerMoved(true);
      return;
    }
    loadFromServer(stored.document ? toEditor(stored.document) : null, snapshot);
  }, [stored, dirty]);

  // The browser-level half of the same promise. An editor that holds the only
  // copy of someone's work has to object before the tab closes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Assigning returnValue is what actually triggers the prompt in Chrome;
      // the string itself has been ignored by every browser for years.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const attached = stored?.source === "rule_set";
  const disabled = readOnly || attached;

  // Validate on a pause rather than a keystroke. Firing per character would
  // spend a round trip telling someone their half-typed column name is wrong.
  useEffect(() => {
    if (!draft || !dirty || disabled) return;
    const timer = setTimeout(() => {
      validate.mutate(toDocument(draft), {
        onSuccess: (result) => setErrors(result.errors),
      });
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, dirty, disabled]);

  const errorsByCase = useMemo(() => {
    const map = new Map<number, RuleValidationError[]>();
    for (const error of errors) {
      if (error.case_index == null) continue;
      const list = map.get(error.case_index) ?? [];
      list.push(error);
      map.set(error.case_index, list);
    }
    return map;
  }, [errors]);

  // The schema the editor actually offers: the server's, with the DRAFT's
  // check-only columns folded into `incoming_fields`.
  //
  // Without this the `when` column list came from the SAVED document, so a
  // newly-added check-only column was invisible until save-and-refetch — and
  // the list is a select, not free text, so there was no way to use the name
  // you had just typed. Folding the draft in makes the two controls agree at
  // the moment of editing, which is the only moment that matters.
  const schema = useMemo(() => {
    if (!serverSchema) return serverSchema;
    const carried = draft?.check_only ?? [];
    if (!carried.length) return serverSchema;
    const seen = new Set(serverSchema.incoming_fields.map((f) => f.toLowerCase()));
    const extra = carried.filter((c) => c.trim() && !seen.has(c.trim().toLowerCase()));
    if (!extra.length) return serverSchema;
    return {
      ...serverSchema,
      incoming_fields: [...serverSchema.incoming_fields, ...extra].sort((a, b) =>
        a.localeCompare(b)
      ),
      check_only: carried,
    };
  }, [serverSchema, draft?.check_only]);

  const documentErrors = errors.filter((e) => e.case_index == null);

  function edit(next: EditorDocument) {
    setDraft(next);
    setDirty(true);
  }

  function updateCase(index: number, next: EditorCase) {
    if (!draft) return;
    const cases = [...draft.cases];
    cases[index] = next;
    edit({ ...draft, cases });
  }

  function addCase(isDefault: boolean) {
    const base: EditorDocument = draft ?? { version: "1.0", cases: [] };
    const next = blankCase(schema, isDefault);
    next.target_table = destinationTable ?? "";
    edit({ ...base, cases: [...base.cases, next] });
  }

  function doSave() {
    if (!draft) return;
    const sent = toDocument(draft);
    save.mutate(sent, {
      onSuccess: () => {
        toast.success("Matching rules saved.");
        setErrors([]);
        setDirty(false);
        // What we just sent IS the saved copy now. When the server echoes it
        // back unchanged — the common case — the refetch this mutation triggers
        // is then recognised as "no change" and leaves the draft, and its _uid
        // row keys, alone rather than rebuilding every card the instant someone
        // hits Save. If the server normalises the document, that version differs
        // and is adopted on the refetch, which is also right: it is the copy
        // that will actually run.
        adopted.current = JSON.stringify(sent);
        setServerMoved(false);
      },
      onError: (err) => {
        // The 422 carries a located list, so the offending rows light up rather
        // than one message appearing above the whole form.
        const located = extractRuleErrors(err);
        setErrors(located);
        toast.error(
          located.length
            ? `${located.length} problem${located.length === 1 ? "" : "s"} to fix.`
            : ruleErrorMessage(err, "Could not save these rules.")
        );
      },
    });
  }

  function doRemove() {
    const keys = upsertKeys?.length ? upsertKeys.join(" + ") : null;
    const willBecome = keys
      ? `match on ${keys} again`
      : "append every row, since it has no write key";
    if (!window.confirm(`Remove these rules? This job will ${willBecome}.`)) return;

    clear.mutate(undefined, {
      onSuccess: () => {
        toast.success(
          keys ? `Rules removed. Matching on ${keys} again.` : "Rules removed. This job now appends."
        );
        // Empty IS the saved state now, so record it as adopted — otherwise the
        // refetch that follows reads as a server-side change.
        loadFromServer(null, null);
      },
      onError: (err) => toast.error(ruleErrorMessage(err, "Could not remove the rules.")),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  const hasDefault = draft?.cases.some((c) => c.default) ?? false;
  const tables = draft ? scannedTables(draft) : [];

  return (
    <div className="space-y-4">
      <RuleSetBar
        jobId={jobId}
        source={stored?.source ?? "none"}
        ruleSetId={stored?.rule_set_id}
        ruleSetVersion={stored?.rule_set_version}
        canPromote={stored?.source === "inline" && !dirty}
        destinationColumns={schema?.destination_columns ?? []}
      />

      {/* Above the cases on purpose: a `when` cannot reference a column that is
          not carried, so the list of carried columns has to be visible before
          the switch that uses them, not buried under it. */}
      {draft && (
        <CheckOnlyBar
          value={draft.check_only ?? []}
          schema={serverSchema}
          disabled={!!disabled}
          onChange={(check_only) => edit({ ...draft, check_only })}
        />
      )}

      {/* The saved copy moved while this draft was dirty — someone attached a
          rule set, or saved from another tab. Both versions are real, so this
          asks rather than picks; the old code picked, and picked the one that
          was not being typed into. */}
      {serverMoved && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">
            These rules were changed somewhere else while you were editing. Your unsaved
            changes are still here — saving will overwrite the other version.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              if (!window.confirm("Load the saved rules? Your unsaved changes will be lost."))
                return;
              loadFromServer(
                stored?.document ? toEditor(stored.document) : null,
                stored?.document ? JSON.stringify(stored.document) : null
              );
            }}
          >
            Load the saved version
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setServerMoved(false)}
          >
            Keep mine
          </Button>
        </div>
      )}

      {attached && (
        <p className="flex items-start gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-xs text-blue-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          These rules come from a shared rule set and are read-only here. Detach to make
          this job&apos;s own copy, or publish a new version of the set to change it
          everywhere.
        </p>
      )}

      {!draft || draft.cases.length === 0 ? (
        <EmptyState disabled={!!disabled} onAdd={() => addCase(true)} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] text-slate-500">
              Cases are tried top to bottom; the first match wins. The default is
              considered last whatever its position.
              {tables.length > 0 && (
                <>
                  {" "}
                  Reads <span className="font-mono">{tables.join(", ")}</span> once per
                  run.
                </>
              )}
            </p>

            <div className="ml-auto flex items-center gap-2">
              {dirty && (
                <Badge variant="outline" className="bg-amber-50 text-[10px] text-amber-800">
                  Unsaved
                </Badge>
              )}
              {!dirty && errors.length === 0 && draft.cases.length > 0 && (
                <Badge variant="outline" className="bg-emerald-50 text-[10px] text-emerald-700">
                  Saved
                </Badge>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={disabled || !dirty}
                onClick={() => {
                  if (!window.confirm("Discard your unsaved changes to these rules?")) return;
                  loadFromServer(
                    stored?.document ? toEditor(stored.document) : null,
                    stored?.document ? JSON.stringify(stored.document) : null
                  );
                }}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Discard changes
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs"
                disabled={disabled || !dirty || save.isPending}
                onClick={doSave}
              >
                <Save className="mr-1 h-3 w-3" />
                {save.isPending ? "Saving…" : "Save rules"}
              </Button>
              {/* The way back. Saved rules ARE this job's write mode, so
                  without this there is no route from Matching rules to Append
                  or Upsert — the mapping editor cannot do it, because the mode
                  is derived from whether rules exist rather than stored. */}
              {stored?.document && stored.source === "inline" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500 hover:text-red-600"
                  disabled={disabled || clear.isPending}
                  onClick={doRemove}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Remove rules
                </Button>
              )}
            </div>
          </div>

          {documentErrors.map((error, i) => (
            <p
              key={i}
              className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700"
            >
              {error.message}
            </p>
          ))}

          {/* Cases are tried top to bottom and the first match wins, so their
              order is behaviour rather than presentation — hence draggable. */}
          <Reorder.Group
            as="div"
            axis="y"
            values={draft.cases.map((c) => c._uid)}
            onReorder={(uids) =>
              edit({ ...draft, cases: reorderByUid(draft.cases, uids as string[]) })
            }
            className="space-y-3"
          >
            {draft.cases.map((ruleCase, index) => (
              <CaseCard
                key={ruleCase._uid}
                ruleCase={ruleCase}
                index={index}
                schema={schema}
                errors={errorsByCase.get(index) ?? []}
                collapsed={collapsed.has(index)}
                disabled={disabled}
                onToggle={() =>
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(index)) next.delete(index);
                    else next.add(index);
                    return next;
                  })
                }
                onChange={(next) => updateCase(index, next)}
                onRemove={() =>
                  edit({ ...draft, cases: draft.cases.filter((_, i) => i !== index) })
                }
              />
            ))}
          </Reorder.Group>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={disabled}
              onClick={() => addCase(false)}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add a case
            </Button>
            {!hasDefault && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-amber-300 text-xs text-amber-800"
                disabled={disabled}
                onClick={() => addCase(true)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add the default case
              </Button>
            )}
          </div>

          {!hasDefault && (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-900">
              There is no default case, so nothing says what happens to a record matching
              none of the others. Add one — otherwise that behaviour is written down
              nowhere anyone can see.
            </p>
          )}

          <RulePreview
            jobId={jobId}
            document={toDocument(draft)}
            incomingFields={schema?.incoming_fields ?? []}
          />
        </>
      )}
    </div>
  );
}

function EmptyState({ disabled, onAdd }: { disabled: boolean; onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
      <h4 className="text-sm font-bold text-slate-900">No matching rules yet</h4>
      <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-500">
        This job still decides what to update using its write key. Rules replace that with
        a set of conditions that narrow the candidate rows, and let you choose what happens
        when none, one, or several survive.
      </p>
      <Button type="button" size="sm" className="mt-4 text-xs" disabled={disabled} onClick={onAdd}>
        <Plus className="mr-1 h-3 w-3" />
        Start with a default case
      </Button>
    </div>
  );
}
