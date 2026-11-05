import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DriftEvent } from "../services/drift-api";

interface DriftAckDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: DriftEvent | null;
  onSubmit: (eventId: string, note: string) => Promise<void>;
}

export function DriftAckDialog({ isOpen, onClose, event, onSubmit }: DriftAckDialogProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNote("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!event) return;
    try {
      setIsSubmitting(true);
      await onSubmit(event.id, note);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-xl rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Acknowledge Drift Event</DialogTitle>
          <DialogDescription>
            You are acknowledging the{" "}
            <span className="font-semibold text-gray-800">{event?.event_type}</span> event on table{" "}
            <span className="font-mono text-xs bg-gray-100 px-1 rounded">{event?.table_name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <Textarea
            id="note"
            placeholder="Add context about why this drift occurred or how it was resolved..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="resize-none h-24 rounded-xl"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
            {isSubmitting ? "Acknowledging..." : "Acknowledge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
