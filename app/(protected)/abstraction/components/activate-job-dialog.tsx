"use client";

/**
 * Activation dialog — optionally name the destination (EP-947).
 *
 * WHY NAMING HAPPENS HERE, AND NOWHERE ELSE
 *
 * A DRAT abstraction pipeline step has to name a destination once and still resolve
 * it months later. It cannot store the job id to do that: saving a job's mappings
 * versions the job and mints a NEW id, so a step pinned to one breaks the next time
 * anyone edits that job — silently, from the user's side, with no edit to the thing
 * that broke. So a step points at a named DESTINATION, which the backend re-points
 * whenever the job versions.
 *
 * The name is offered at ACTIVATION rather than at creation because a job created
 * from a template starts as an unreviewed draft. Naming it earlier would put an
 * unapproved draft in the pipeline picker as though it were ready to run. Tying the
 * two together means "has a name" implies "a steward approved this".
 *
 * Entirely optional. Skipping it activates the job exactly as before; the job just
 * is not offered as a pipeline destination.
 */

import { useEffect, useState } from "react";

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
import { Label } from "@/components/ui/label";

interface ActivateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The job's own name, shown so the user can tell what they are activating. */
  jobName?: string | null;
  destinationTable?: string | null;
  isActivating: boolean;
  /** `referenceName` is undefined when the user chose to skip naming. */
  onConfirm: (referenceName?: string) => void;
}

export function ActivateJobDialog({
  open,
  onOpenChange,
  jobName,
  destinationTable,
  isActivating,
  onConfirm,
}: ActivateJobDialogProps) {
  const [referenceName, setReferenceName] = useState("");

  // Cleared on each open rather than left holding the last attempt's value: after
  // a rejected duplicate name, a stale field would re-submit the name that just
  // failed.
  useEffect(() => {
    if (open) setReferenceName("");
  }, [open]);

  const trimmed = referenceName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Activate this integration</DialogTitle>
          <DialogDescription>
            {jobName ? <span className="font-medium">{jobName}</span> : "This job"}
            {destinationTable ? ` → ${destinationTable}` : ""}
            {" will be approved and become runnable."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="destination-reference-name">
            Reference name <span className="text-slate-400">(optional)</span>
          </Label>
          <Input
            id="destination-reference-name"
            value={referenceName}
            onChange={(event) => setReferenceName(event.target.value)}
            placeholder="e.g. Leases → Airtable"
            maxLength={255}
            disabled={isActivating}
            // Enter submits, since the field is the only thing to fill in.
            onKeyDown={(event) => {
              if (event.key === "Enter" && !isActivating) {
                event.preventDefault();
                onConfirm(trimmed || undefined);
              }
            }}
          />
          <p className="text-xs text-slate-500">
            Give this destination a name to use it as a step in a DRAT abstraction
            pipeline. The name is how people pick it from a list, so it must be
            unique for your company. You can rename it later without breaking any
            pipeline that uses it.
          </p>
          <p className="text-xs text-slate-400">
            Leave it blank to just activate the job — it simply will not appear as a
            pipeline destination.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onConfirm(undefined)}
            disabled={isActivating}
            className="border-slate-200 bg-white"
          >
            {isActivating && !trimmed ? "Activating..." : "Activate without a name"}
          </Button>
          <Button
            onClick={() => onConfirm(trimmed || undefined)}
            disabled={isActivating || !trimmed}
            className="border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isActivating && trimmed ? "Activating..." : "Activate and name it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
