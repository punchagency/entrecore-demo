import { Trash2, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Axios } from "@/app/config/axios";
import { useDataCountsStore } from "@/app/store/dataCountsStore";

interface DeleteKnowledgeGraphDialogProps {
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  selectedItem: any;
}

const DeleteKnowledgeGraphDialog = ({ deleteOpen, setDeleteOpen, selectedItem }: DeleteKnowledgeGraphDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const updateKnowledgeGraphTimestamp = useDataCountsStore(state => state.updateKnowledgeGraphTimestamp);

  const handleDelete = async () => {
    if (!selectedItem?.id) {
      toast.error("No entry selected for deletion");
      return;
    }

    setIsDeleting(true);

    try {
      await Axios.delete(`/data/glossary/${selectedItem.id}`);
      toast.success("Knowledge Graph entry deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph"] });
      setDeleteOpen(false);
      updateKnowledgeGraphTimestamp();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Failed to delete entry");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogContent className="bg-white max-w-xl rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden">
        <div className="bg-destructive/5 px-8 py-8 border-b border-destructive/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-destructive/10 rounded-2xl flex items-center justify-center shrink-0">
              <Trash2 size={28} className="text-destructive animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                Confirm Deletion
              </DialogTitle>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Are you sure you want to remove this entry from your Knowledge Graph?
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200 space-y-6 relative overflow-hidden">
            {/* Decorative background accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200/20 rounded-full blur-3xl -mr-16 -mt-16" />

            <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-sm relative z-10">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Function</p>
                <p className="font-bold text-slate-700">{selectedItem?.function}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Company</p>
                <p className="font-bold text-slate-700">{selectedItem?.company}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Domain</p>
                <p className="font-bold text-slate-700">{selectedItem?.domain}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Term</p>
                <p className="font-bold text-slate-800">{selectedItem?.term}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Description</p>
                <p className="text-slate-600 leading-relaxed font-medium italic">"{selectedItem?.description}"</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-8 justify-end">
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              className="rounded-xl px-6 h-11 font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-none"
            >
              No, keep it
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="rounded-xl px-8 h-11 font-bold shadow-lg shadow-destructive/20 transition-all active:scale-95 flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Entry
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteKnowledgeGraphDialog;