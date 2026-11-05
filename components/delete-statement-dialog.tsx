import Image from "next/image";
import { Receipt, Trash2 } from "lucide-react";
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
import { Axios } from "@/app/config/axios";
import { toast } from "sonner";

interface StatementItem {
  id?: number;
  statement_type?: string;
  period_end?: string;
}

const DeleteStatementDialog = ({
  deleteOpen,
  setDeleteOpen,
  selectedItem,
  getFileIcon,
}: {
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  selectedItem?: StatementItem;
  getFileIcon: (name: string) => string;
}) => {
  const queryClient = useQueryClient();
  const handleDelete = async () => {
    if (selectedItem?.id) {
      const response = await Axios.delete(`data/financial-statements/${selectedItem.id}`);
      console.log(response);
      if (response.statusText === "No Content") {
        toast.success("Financial statement deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["financial-statements"] });
        setDeleteOpen(false);
      } else {
        toast.error("Failed to delete financial statement");
        throw new Error("Failed to delete financial statement");
      }
    }
  };

  return (
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogContent className="bg-[#EFF4FF]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-col gap-2">
              <Trash2 size={24} className="text-primary" />
              <p className="text-sm text-primary font-bold text-left">
                Delete {selectedItem?.statement_type} from
              </p>
              <h4 className="text-base font-bold my-2 text-soft-black text-left">
                Financial Statements

              </h4>
            </div>
          </DialogTitle>
          <DialogDescription className="pt-4">
            <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-md text-sm font-medium">
              <div className="flex items-center gap-2 text-soft-black">
                <div className="rounded-sm bg-[#EFF4FF] flex items-center justify-center p-1">
                  <Receipt className="w-4 h-4 text-primary" />
                </div>
                {selectedItem?.statement_type}
                <span className="text-soft-black ml-6 sm:ml-26"> {selectedItem?.period_end} </span>

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
            Delete Statement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteStatementDialog;
