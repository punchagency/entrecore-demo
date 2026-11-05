import { Link, Layers, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AddToCoreosDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkClick: () => void;
  onAppServiceClick: () => void;
}

export const AddToCoreosDialog = ({
  isOpen,
  onClose,
  onLinkClick,
  onAppServiceClick,
}: AddToCoreosDialogProps) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          // Ensure proper cleanup when dialog closes
          setTimeout(() => {
            onClose();
          }, 0);
        }
      }}
    >
      <DialogContent
        className="sm:max-w-md w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] mx-auto bg-white/90 backdrop-blur-3xl rounded-[2.5rem] border-white/60 shadow-[0_30px_100px_rgba(37,99,235,0.12)] border p-8 [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          onClose();
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <DialogHeader className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-gray-900">
                Add to <span className="text-blue-600">Core</span> OS
              </DialogTitle>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1.5">
                Extend your high-performance workspace
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full bg-gray-50/50 hover:bg-white border border-gray-100/50 hover:border-gray-200 text-gray-400 hover:text-gray-900 transition-all shadow-sm"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>
        <div
          className="flex flex-col gap-4 py-2"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={onLinkClick}
            className="group relative flex items-center justify-between w-full p-5 bg-white/40 hover:bg-white rounded-[1.8rem] border border-white/60 transition-all duration-500 shadow-sm hover:shadow-[0_15px_40px_rgba(37,99,235,0.08)] hover:border-blue-200"
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest leading-none mb-1">
                External
              </span>
              <span className="text-base font-bold text-gray-900 tracking-tight">Direct Link</span>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm">
              <Link className="w-5 h-5" />
            </div>
          </button>
          <button
            onClick={onAppServiceClick}
            className="group relative flex items-center justify-between w-full p-5 bg-white/40 hover:bg-white rounded-[1.8rem] border border-white/60 transition-all duration-500 shadow-sm hover:shadow-[0_15px_40px_rgba(37,99,235,0.08)] hover:border-blue-200"
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest leading-none mb-1">
                Integration
              </span>
              <span className="text-base font-bold text-gray-900 tracking-tight">
                App or Service
              </span>
            </div>
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
