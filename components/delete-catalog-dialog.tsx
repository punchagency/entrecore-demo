import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Axios } from "@/app/config/axios";

interface DeleteCatalogDialogProps {
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  selectedItem: any;
}

const DeleteCatalogDialog = ({ deleteOpen, setDeleteOpen, selectedItem }: DeleteCatalogDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!selectedItem?.id) {
      toast.error("No entry selected for deletion");
      return;
    }

    setIsDeleting(true);

    try {
      await Axios.delete(`/data/catalog/${selectedItem.id}`);
      toast.success("Entry deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      setDeleteOpen(false);
    } catch (error: any) {
      console.error("Error deleting entry:", error);
      toast.error("Failed to delete entry");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogContent className="bg-[#EFF4FF] h-[70vh] overflow-y-auto">
        {isDeleting && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#EFF4FF] bg-opacity-70 z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-primary font-medium">Deleting...</p>
            </div>
          </div>
        )}
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-col gap-2">
              <Trash2 size={24} className="text-primary" />
              <p className="text-lg text-left text-primary font-bold">
                Delete Entry Details
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-8 text-sm md:text-base">
            <div>
              <p className="font-semibold text-soft-black">Function</p>
              <p className="mt-2">{selectedItem?.function}</p>
            </div>
            <div>
              <p className="font-semibold text-soft-black">Company</p>
              <p className="mt-2">{selectedItem?.company}</p>
            </div>
            <div>
              <p className="font-semibold text-soft-black">Connector</p>
              <p className="mt-2">{selectedItem?.connector}</p>
            </div>
            <div>
              <p className="font-semibold text-soft-black">Schema</p>
              <p className="mt-2">{selectedItem?.schema}</p>
            </div>
            <div className="col-span-2">
              <p className="font-semibold text-soft-black">Description</p>
              <p className="mt-2">{selectedItem?.description}</p>
            </div>
            <div>
              <p className="font-semibold text-soft-black">Dataset</p>
              <p className="mt-2">{selectedItem?.dataset}</p>
            </div>
            <div>
              <p className="font-semibold text-soft-black">Guide</p>
              <p className="mt-2">{selectedItem?.guide_name}</p>
            </div>
            <div>
              <p className="font-semibold text-soft-black">Quality</p>
              <p className="mt-2">{selectedItem?.quality}</p>
            </div>
            <div className="col-span-2">
              <p className="font-semibold text-soft-black">Rules</p>
              <p className="mt-2">{selectedItem?.rules}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-4">
          <Button
            variant="ghost"
            onClick={() => setDeleteOpen(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            className="cursor-pointer bg-primary text-white"
          >
            Delete Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteCatalogDialog;