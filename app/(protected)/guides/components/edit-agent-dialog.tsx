"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,     
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGuidesStore, Guide, AGENT_TYPE_DESCRIPTIONS } from "@/app/store/aiAgentsStore";
import { toast } from "sonner";

interface EditGuideDialogProps {
  guide: Guide;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditGuideDialog({ guide, open, onOpenChange }: EditGuideDialogProps) {
  const { updateGuide } = useGuidesStore();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "data-analyst" as Guide['model_type'],
  });
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (guide) {
      setFormData({
        name: guide.name || "",
        description: guide.description || "",
        type: guide.model_type || "data-analyst",
      });
    }
  }, [guide]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Guide name is required");
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error("Guide description is required");
      return;
    }

    setIsLoading(true);
    
    try {
      updateGuide(guide.id || '', {
        name: formData.name.trim(),
        description: formData.description.trim(),
        model_type: formData.type,
      });
      
      toast.success(`Guide "${formData.name}" updated successfully`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update guide");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Guide</DialogTitle>
          <DialogDescription>
            Update the settings for "{guide?.name}".
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Guide Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Guide Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Sales Data Analyzer"
                required
              />
            </div>
            
            {/* Guide Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe what this guide will do..."
                rows={3}
                required
              />
            </div>
            
            {/* Guide Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Guide Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange("type", value)}
              >
                <SelectTrigger className="w-full" >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AGENT_TYPE_DESCRIPTIONS).map(([key, { title }]) => (
                    <SelectItem key={key} value={key}>
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Type Description */}
              {formData.type && AGENT_TYPE_DESCRIPTIONS[formData.type as keyof typeof AGENT_TYPE_DESCRIPTIONS] && (
                <div className={`p-3 rounded-lg border-l-4 transition-all duration-200 my-6 ${
                  formData.type === 'data-analyst' ? 'bg-blue-50 border-blue-300' :
                  formData.type === 'data-quality' ? 'bg-emerald-50 border-emerald-300' :
                  formData.type === 'automation' ? 'bg-purple-50 border-purple-300' :
                  formData.type === 'insight-generator' ? 'bg-orange-50 border-orange-300' :
                  'bg-gray-50 border-gray-300'
                }`}>
                  <p className={`text-sm leading-relaxed ${
                    formData.type === 'data-analyst' ? 'text-blue-800' :
                    formData.type === 'data-quality' ? 'text-emerald-800' :
                    formData.type === 'automation' ? 'text-purple-800' :
                    formData.type === 'insight-generator' ? 'text-orange-800' :
                    'text-gray-800'
                  }`}>
                    {AGENT_TYPE_DESCRIPTIONS[formData.type as keyof typeof AGENT_TYPE_DESCRIPTIONS].description}
                  </p>
                </div>
              )}
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
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#3064f6] hover:bg-[#2050d6]"
            >
              {isLoading ? "Updating..." : "Update Guide"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 