"use client";

import { useState } from "react";
import { BookMarked, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAttachRuleSet,
  useDetachRuleSet,
  usePromoteRules,
  useRuleSetVersions,
  useRuleSets,
} from "../../hooks/use-integration-rules";
import { ruleErrorMessage } from "../../services/rules-api";
import type { RuleSource } from "../../services/rules-api";

/**
 * The library controls: promote, attach, and which version this job is pinned to.
 *
 * A job either owns its rules (`inline`) or references a shared rule set
 * (`rule_set`), never both. Editing a shared set publishes a NEW version and
 * moves nobody — jobs stay pinned until someone deliberately bumps them, which
 * is what keeps "fix it once" from meaning "change twelve integrations
 * overnight".
 */

interface Props {
  jobId: string;
  source: RuleSource;
  ruleSetId?: string | null;
  ruleSetVersion?: number | null;
  canPromote: boolean;
  destinationColumns: string[];
}

export function RuleSetBar({
  jobId,
  source,
  ruleSetId,
  ruleSetVersion,
  canPromote,
  destinationColumns,
}: Props) {
  const { data: sets } = useRuleSets();
  const { data: versions } = useRuleSetVersions(ruleSetId);
  const promote = usePromoteRules(jobId);
  const attach = useAttachRuleSet(jobId);
  const detach = useDetachRuleSet(jobId);

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chosenSet, setChosenSet] = useState<string>("");

  const attached = source === "rule_set" && ruleSetId;
  const current = sets?.items.find((s) => s.rule_set_id === ruleSetId);
  const newerExists = current != null && ruleSetVersion != null && current.version > ruleSetVersion;

  const columnsHave = new Set(destinationColumns.map((c) => c.toLowerCase()));

  function doPromote() {
    if (!name.trim()) {
      toast.error("Give the rule set a name — it is how people find it in the list.");
      return;
    }
    promote.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Saved as “${name.trim()}”. Other jobs can now use it.`);
          setPromoteOpen(false);
          setName("");
          setDescription("");
        },
        onError: (err) => toast.error(ruleErrorMessage(err, "Could not save the rule set.")),
      }
    );
  }

  function doAttach(version?: number) {
    if (!chosenSet && !attached) {
      toast.error("Pick a rule set first.");
      return;
    }
    attach.mutate(
      { ruleSetId: chosenSet || (ruleSetId as string), version },
      {
        onSuccess: () => {
          toast.success("This job now uses that rule set.");
          setAttachOpen(false);
        },
        // The 400 here names the missing columns, which is far more useful than
        // a generic failure — a rule set only means anything against a table
        // that has the columns its conditions reference.
        onError: (err) => toast.error(ruleErrorMessage(err, "Could not attach that rule set.")),
      }
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <BookMarked className="h-4 w-4 text-slate-400" />

      {attached ? (
        <>
          <span className="text-xs text-slate-600">
            Using <strong className="text-slate-900">{current?.name ?? "a shared rule set"}</strong>
          </span>
          <Badge variant="outline" className="bg-white text-[10px] font-bold">
            v{ruleSetVersion}
          </Badge>
          {current != null && (
            <span className="text-[11px] text-slate-500">
              shared with {Math.max(current.used_by_jobs - 1, 0)} other job
              {current.used_by_jobs - 1 === 1 ? "" : "s"}
            </span>
          )}

          {newerExists && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-amber-50 text-[10px] font-bold text-amber-800"
              >
                v{current?.version} available
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => doAttach(current?.version)}
                disabled={attach.isPending}
              >
                Move to v{current?.version}
              </Button>
            </div>
          )}

          {versions && versions.versions.length > 1 && (
            <Select
              value={String(ruleSetVersion)}
              onValueChange={(v) => doAttach(Number(v))}
            >
              <SelectTrigger className="h-8 w-[150px] bg-white text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.versions.map((v) => (
                  <SelectItem key={v.version} value={String(v.version)} className="text-xs">
                    v{v.version}
                    {v.pinned_by_jobs > 0 && ` — ${v.pinned_by_jobs} job(s)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto h-8 text-[11px] text-slate-500"
            onClick={() =>
              detach.mutate(
                { keepInline: true },
                {
                  onSuccess: () =>
                    toast.success("Detached. This job now has its own private copy."),
                  onError: (err) =>
                    toast.error(ruleErrorMessage(err, "Could not detach.")),
                }
              )
            }
            disabled={detach.isPending}
          >
            <Unlink className="mr-1 h-3 w-3" />
            Detach and keep a copy
          </Button>
        </>
      ) : (
        <>
          <span className="text-xs text-slate-600">
            These rules belong to this job only.
          </span>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto h-8 text-[11px]"
            onClick={() => setAttachOpen(true)}
          >
            <Link2 className="mr-1 h-3 w-3" />
            Use a saved rule set
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-[11px]"
            onClick={() => setPromoteOpen(true)}
            disabled={!canPromote}
            title={
              canPromote
                ? undefined
                : "Save the rules on this job first, then you can share them."
            }
          >
            <BookMarked className="mr-1 h-3 w-3" />
            Save as reusable rule set
          </Button>
        </>
      )}

      {/* -- promote -- */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as a reusable rule set</DialogTitle>
            <DialogDescription>
              Other jobs can then point at these rules. Editing them later publishes a new
              version — jobs stay on the version they are pinned to until someone moves
              them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Engagement matching"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="What it matches, in a sentence"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={doPromote} disabled={promote.isPending}>
              {promote.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- attach -- */}
      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use a saved rule set</DialogTitle>
            <DialogDescription>
              This replaces the rules currently on this job.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[320px] space-y-2 overflow-y-auto">
            {sets?.items.map((set) => {
              // Surfaced before the click rather than as a 400 after it.
              const missing = set.requires_columns.filter(
                (c) => !columnsHave.has(c.toLowerCase())
              );
              const usable = missing.length === 0 || destinationColumns.length === 0;

              return (
                <button
                  key={set.rule_set_id}
                  type="button"
                  disabled={!usable}
                  onClick={() => setChosenSet(set.rule_set_id)}
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                    chosenSet === set.rule_set_id
                      ? "border-blue-400 bg-blue-50"
                      : usable
                        ? "border-slate-200 hover:border-blue-200"
                        : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{set.name}</span>
                    <Badge variant="outline" className="bg-white text-[10px]">
                      v{set.version}
                    </Badge>
                    <span className="ml-auto text-[11px] text-slate-500">
                      used by {set.used_by_jobs} job{set.used_by_jobs === 1 ? "" : "s"}
                    </span>
                  </div>
                  {set.description && (
                    <p className="mt-1 text-[11px] text-slate-500">{set.description}</p>
                  )}
                  {!usable && (
                    <p className="mt-1 text-[11px] font-medium text-amber-700">
                      Needs {missing.join(", ")} — this job&apos;s table does not have
                      {missing.length === 1 ? " it" : " them"}.
                    </p>
                  )}
                </button>
              );
            })}
            {!sets?.items.length && (
              <p className="text-xs text-slate-500">
                Nothing saved yet. Build rules on a job, then “Save as reusable rule set”.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => doAttach()} disabled={attach.isPending || !chosenSet}>
              {attach.isPending ? "Attaching…" : "Use these rules"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
