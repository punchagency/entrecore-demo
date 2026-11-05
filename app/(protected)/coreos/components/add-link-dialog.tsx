"use client";
import { useState } from "react";
import { Star, Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { categories } from "../constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AddLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateLink: () => void;
}

export const AddLinkDialog = ({ isOpen, onClose, onCreateLink }: AddLinkDialogProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleCategoryClick = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleCreate = () => {
    onCreateLink();
    setIsFavorite(false);
    setSelectedCategories([]);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setTimeout(() => {
            onClose();
          }, 0);
        }
      }}
    >
      <DialogContent
        className="sm:max-w-md w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] mx-auto bg-white/90 backdrop-blur-3xl rounded-[2.5rem] border-white/60 shadow-[0_30px_100px_rgba(37,99,235,0.12)] border p-8 max-h-[90vh] overflow-y-auto custom-scrollbar [&>button]:hidden"
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
                Deploy <span className="text-blue-600">New Asset</span>
              </DialogTitle>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1.5">Map external resources to your AI core</p>
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
          className="flex flex-col gap-6 py-1"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Asset Name</label>
              <Input
                placeholder="e.g. Finance Hub"
                className="w-full h-12 bg-white/50 border-white/60 rounded-2xl focus-visible:ring-blue-600 focus-visible:ring-offset-0 font-bold text-gray-800"
                size="lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Resource URL</label>
              <Input
                placeholder="https://..."
                className="w-full h-12 bg-white/50 border-white/60 rounded-2xl focus-visible:ring-blue-600 focus-visible:ring-offset-0 font-bold text-gray-800"
                size="lg"
              />
            </div>
          </div>

          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="flex items-center justify-between w-full p-4 bg-white/40 hover:bg-white rounded-2xl border border-white/60 transition-all duration-300 group"
          >
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Add to Orchestrator Favorites</p>
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              isFavorite ? "bg-amber-100 text-amber-600" : "bg-gray-50 text-gray-300 group-hover:text-gray-400"
            )}>
              <Star className={cn("w-4 h-4", isFavorite && "fill-current")} />
            </div>
          </button>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Domain Classification</h3>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => handleCategoryClick(category.name)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-300",
                    selectedCategories.includes(category.name)
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "bg-white/40 border-white/60 text-gray-500 hover:bg-white hover:text-gray-900"
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">{category.name}</span>
                  <Plus className={cn("w-3.5 h-3.5 transition-transform", selectedCategories.includes(category.name) && "rotate-45")} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button
          className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] shadow-xl shadow-blue-500/25 mt-6 text-[11px] font-black uppercase tracking-[0.2em]"
          onClick={handleCreate}
        >
          Finalize Deployment
        </Button>
      </DialogContent>
    </Dialog>
  );
};
