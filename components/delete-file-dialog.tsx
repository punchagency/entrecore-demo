import Image from "next/image";
import { toast } from "sonner";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { deleteFromS3 } from "@/utils/s3-utils";
import { deleteFileMetadata } from "@/utils/api-utils";
import { useDataCountsStore } from "@/app/store/dataCountsStore";

const DeleteFileDialog = ({
  deleteOpen,
  setDeleteOpen,
  selectedItem,
  getFileIcon,
}: {
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  selectedItem: any;
  getFileIcon: (name: string) => string;
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const updateCompanyDocumentsTimestamp = useDataCountsStore(state => state.updateCompanyDocumentsTimestamp);
  const handleDelete = async () => {
    if (!selectedItem?.id) {
      toast.error("No file selected for deletion");
      return;
    }

    setIsDeleting(true);

    try {
      await deleteFileMetadata(selectedItem.id);

      if (selectedItem.document_url) {
        await deleteFromS3(selectedItem.document_url);
      }

      toast.success("File deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["company-documents"] });
      setDeleteOpen(false);
      updateCompanyDocumentsTimestamp();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
     <DialogContent className="bg-[#EFF4FF] max-h-[70vh] overflow-auto ">
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
        <div className="flex flex-col gap-1 sm:gap-2">
          <Trash2 size={24} className="text-primary" />
          <p className="text-sm md:text-base font-bold text-left text-[#3064F6]">
            Delete {selectedItem?.document_name} from
          </p>
          <h4 className="text-xl md:text-2xl font-bold my-2 text-soft-black text-left">Data Room</h4>
        </div>
      </DialogTitle>
      <DialogDescription className="pt-4">
        <div className="flex items-center justify-between gap-2 bg-white p-2 sm:p-4 rounded-md text-sm md:text-base font-medium">
          <div className="flex items-center gap-2 text-soft-black">
            <div className="rounded-sm bg-[#EFF4FF] flex items-center justify-center p-2">
              <Image
                src={getFileIcon(selectedItem?.document_url || "")}
                alt="pdf"
                width={20}
                height={20}
              />
              </div>
              <p className="text-soft-black">{selectedItem?.document_name}</p>
            </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 pt-4">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="cursor-pointer bg-primary text-white"
          >
            Delete File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteFileDialog;
