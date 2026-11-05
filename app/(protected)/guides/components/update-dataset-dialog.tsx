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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Database, Loader2, Check } from "lucide-react";
import { useGuidesStore, Guide } from "@/app/store/aiAgentsStore";
import { useCompanyDatasets, Dataset } from "@/hooks/use-datasets";
import { toast } from "sonner";

interface UpdateDatasetDialogProps {
  guide: Guide;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateDatasetDialog({ guide, open, onOpenChange }: UpdateDatasetDialogProps) {
  const { assignDatasetToGuide } = useGuidesStore();
  const { data: datasets = [], isLoading: isDatasetsLoading, error } = useCompanyDatasets();

  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initial = (guide.datasets || []).map((d) => d.id || "").filter(Boolean);
    setSelectedDatasetIds(initial);
  }, [guide.datasets]);

  const handleUpdateDataset = async () => {
    if (!selectedDatasetIds.length) {
      toast.error("Please select at least one dataset");
      return;
    }

    setIsLoading(true);
    try {
      for (const datasetId of selectedDatasetIds) {
        const dataset = datasets.find((d: Dataset) => d.id === datasetId);
        if (dataset) {
          assignDatasetToGuide(guide.id || "", dataset.id, dataset.dataset_name);
        }
      }
      toast.success(`Selected datasets have been assigned to "${guide.name}"`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to assign datasets");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckboxChange = (datasetId: string, checked: boolean) => {
    setSelectedDatasetIds((prev) =>
      checked ? [...prev, datasetId] : prev.filter((id) => id !== datasetId)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Data Products</DialogTitle>
          <DialogDescription>
            Select which data products the guide "{guide.name}" should work on.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Current Assignments */}
          {guide.datasets && guide.datasets.length > 0 && (
            <div className="space-y-2">
              <Label>Current Assignments</Label>
              <div className="flex flex-wrap gap-2 ">
                {guide.datasets.map((d) => (
                  <div
                    key={d.id}
                    className="w-full flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <Database className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Available Datasets */}
          <div className="space-y-2">
            <Label htmlFor="dataset-checkbox-list">Change or Add Datasets</Label>
            {isDatasetsLoading ? (
              <div className="text-center py-8 text-gray-500">
                <Loader2 className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-spin" />
                <p className="text-sm">Loading data products...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <Database className="h-8 w-8 mx-auto mb-2 text-red-400" />
                <p className="text-sm">Failed to load data products</p>
                <p className="text-xs text-red-400">Please try again later</p>
              </div>
            ) : datasets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No data products available</p>
                <p className="text-xs text-gray-400">Please check your data connections</p>
              </div>
            ) : (
              <div
                id="dataset-checkbox-list"
                className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg"
              >
                {datasets.map((dataset: Dataset) => {
                  const selected = selectedDatasetIds.includes(dataset.id);
                  return (
                    <div
                      key={dataset.id}
                      className={`flex items-center justify-between px-2 py-2 rounded cursor-pointer transition-colors select-none ${selected ? "bg-blue-50" : "hover:bg-gray-100"}`}
                      onClick={() => handleCheckboxChange(dataset.id, !selected)}
                      tabIndex={0}
                      role="option"
                      aria-selected={selected}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          handleCheckboxChange(dataset.id, !selected);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span>{dataset.dataset_name}</span>
                        {dataset.connector && (
                          <Badge variant="outline" className="text-xs ml-2">
                            {dataset.connector}
                          </Badge>
                        )}
                      </div>
                      {selected && <Check className="h-4 w-4 text-blue-600 ml-2" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Selected Data Products Info */}
          {selectedDatasetIds.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Data Products Information</Label>
              {selectedDatasetIds.map((id) => {
                const dataset = datasets.find((d: Dataset) => d.id === id);
                return dataset ? (
                  <div key={id} className="p-3 bg-gray-50 rounded-lg border mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{dataset.dataset_name}</span>
                      {dataset.connector && <Badge variant="outline">{dataset.connector}</Badge>}
                    </div>
                    {dataset.description && (
                      <p className="text-xs text-gray-600 mb-2">{dataset.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {dataset.schema_name && (
                        <div>
                          <span className="font-medium">Schema:</span> {dataset.schema_name}
                        </div>
                      )}
                      {dataset.table_name && (
                        <div>
                          <span className="font-medium">Table:</span> {dataset.table_name}
                        </div>
                      )}
                      {dataset.row_count && (
                        <div>
                          <span className="font-medium">Rows:</span> {dataset.row_count}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            {!isDatasetsLoading && !error && datasets.length > 0 && (
              <Button
                onClick={handleUpdateDataset}
                disabled={isLoading || selectedDatasetIds.length === 0}
                className="bg-[#3064f6] hover:bg-[#2050d6]"
              >
                {isLoading ? "Updating..." : "Update Data Products"}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
