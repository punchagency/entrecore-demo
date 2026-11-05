"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Entity } from "../services/entities-api";
import { useUpdateEntity } from "../hooks/use-entities";

interface EntityEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Entity | null;
  onSaved: () => void;
}

/** Edit an entity's display name and aliases. Uses the same PATCH that toggle uses. */
export function EntityEditDialog({
  open,
  onOpenChange,
  entity,
  onSaved,
}: EntityEditDialogProps) {
  const updateMutation = useUpdateEntity();
  const [name, setName] = useState("");
  const [aliases, setAliases] = useState("");

  useEffect(() => {
    if (!open || !entity) return;
    setName(entity.name);
    setAliases((entity.aliases ?? []).join(", "));
  }, [open, entity]);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && !updateMutation.isPending;

  const handleSave = () => {
    if (!canSave || !entity) return;
    const nextAliases = aliases
      .split(",")
      .map((alias) => alias.trim())
      .filter(Boolean);
    updateMutation.mutate(
      { id: entity.id, payload: { name: trimmedName, aliases: nextAliases } },
      {
        onSuccess: () => {
          toast.success(`Updated "${trimmedName}"`);
          onOpenChange(false);
          onSaved();
        },
        onError: (err: unknown) => {
          showApiErrorToast(err, "Failed to update entity");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit entity</DialogTitle>
          <DialogDescription>
            Update the display name and aliases used for document matching. Aliases are
            comma-separated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-entity-name" className="text-xs font-semibold text-slate-600">
              Entity name
            </Label>
            <Input
              id="edit-entity-name"
              placeholder="Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border-slate-200 bg-slate-50/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-entity-aliases" className="text-xs font-semibold text-slate-600">
              Aliases
            </Label>
            <Input
              id="edit-entity-aliases"
              placeholder="Acme Co, Acme Corporation"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              className="rounded-xl border-slate-200 bg-slate-50/50"
            />
            <p className="text-xs text-slate-500">
              Matches documents filed under an older or alternate name.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!canSave}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}