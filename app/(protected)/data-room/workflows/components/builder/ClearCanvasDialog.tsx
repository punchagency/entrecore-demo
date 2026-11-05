"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ClearCanvasDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClear: () => void;
}

export default function ClearCanvasDialog({
  isOpen,
  onClose,
  onConfirmClear,
}: ClearCanvasDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Clear Canvas
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-500 font-medium leading-relaxed">
              Are you sure you want to remove all nodes and connections? This action will
              permanently clear your current draft.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8 flex gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50 h-11 px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirmClear}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold h-11 px-6 shadow-lg shadow-red-200 transition-all active:scale-95"
            >
              Clear Everything
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
