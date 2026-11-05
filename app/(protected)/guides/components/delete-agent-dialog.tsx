"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { useGuidesStore, Guide } from "@/app/store/aiAgentsStore";
import { toast } from "sonner";

interface DeleteGuideDialogProps {
  guide: Guide;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteGuideDialog({ guide, open, onOpenChange }: DeleteGuideDialogProps) {
  const { deleteGuide } = useGuidesStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      await deleteGuide(guide.id || "");
      toast.success(`Guide "${guide.name}" has been deleted`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to delete guide");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <DialogTitle>Delete Guide</DialogTitle>
          </div>
          <DialogDescription>
            This action cannot be undone. Are you sure you want to delete this guide?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">You're about to delete "{guide.name}"</h4>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>This guide will be permanently removed</li>
                    <li>All configured actions will be lost</li>
                    {guide.datasets && guide.datasets.length > 0 && (
                      <li>All dataset assignments will be removed</li>
                    )}
                    <li>Any scheduled tasks will be cancelled</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleDelete} disabled={isLoading} variant="destructive">
            {isLoading ? "Deleting..." : "Delete Guide"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
