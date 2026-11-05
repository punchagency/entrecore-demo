import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Axios } from "@/app/config/axios";
import { Employee } from "@/hooks/use-employees";
import { useDataCountsStore } from "@/app/store/dataCountsStore";
interface DeleteEmployeeDialogProps {
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  selectedEmployee: Employee | null;
}

const DeleteEmployeeDialog = ({ deleteOpen, setDeleteOpen, selectedEmployee }: DeleteEmployeeDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const updateEmployeesTimestamp = useDataCountsStore(state => state.updateEmployeesTimestamp);


  const handleDelete = async () => {
    if (!selectedEmployee?.id) {
      toast.error("No employee selected for deletion");
      return;
    }

    setIsDeleting(true);

    try {
      await Axios.delete(`/data/employees/${selectedEmployee.id}`);
      toast.success("Employee deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDeleteOpen(false);
      updateEmployeesTimestamp();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Failed to delete employee");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogContent className="bg-[#EFF4FF]">
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
              <p className="text-lg text-primary font-bold">
                Delete Employee
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="font-semibold text-soft-black">First Name</p>
              <p className="mt-2">{selectedEmployee?.first_name}</p>
            </div>
            <div>
              <p className="font-semibold text-soft-black">Last Name</p>
              <p className="mt-2">{selectedEmployee?.last_name}</p>
            </div>
            <div>
              <p className="font-semibold text-soft-black">Role</p>
              <p className="mt-2">{selectedEmployee?.role.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}</p>
            </div>
            <div>
              <p className="font-semibold text-soft-black">Email</p>
              <p className="mt-2 truncate">{selectedEmployee?.email}</p>
            </div>
            <div>
              <p className="font-semibold text-soft-black">Department</p>
              <p className="mt-2">{selectedEmployee?.department ? selectedEmployee?.department.charAt(0).toUpperCase() + selectedEmployee?.department.slice(1) : "N/A"}</p>
            </div>
            <div>
              <p className="font-semibold text-soft-black">Hire Date</p>
              <p className="mt-2">{selectedEmployee?.hire_date}</p>
            </div>
            {selectedEmployee?.termination_date && (
              <div>
                <p className="font-semibold text-soft-black">Termination Date</p>
                <p className="mt-2">{selectedEmployee?.termination_date}</p>
              </div>
            )}
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
            Delete Employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteEmployeeDialog;