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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Database, X, Loader2 } from "lucide-react";
import { useGuidesStore, Guide } from "@/app/store/aiAgentsStore";
import { useCompanyDatasets, Dataset } from "@/hooks/use-datasets";
import { toast } from "sonner";

interface AssignDatasetDialogProps {
  guide: Guide;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignDatasetDialog({ guide, open, onOpenChange }: AssignDatasetDialogProps) {
  const { assignDatasetToGuide, unassignDatasetFromGuide } = useGuidesStore();
  const { data: datasets = [], isLoading: isDatasetsLoading, error } = useCompanyDatasets();
  console.log(datasets, "datasets");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSelectedDatasetId("");
  }, [guide.datasets]);

  const handleAssignDataset = async () => {
    if (!selectedDatasetId) {
      toast.error("Please select a dataset");
      return;
    }

    const dataset = datasets.find((d: Dataset) => d.id === selectedDatasetId);
    if (!dataset) {
      toast.error("Selected dataset not found");
      return;
    }

    setIsLoading(true);

    try {
      assignDatasetToGuide(guide.id || "", dataset.id, dataset.dataset_name);
      toast.success(`Dataset "${dataset.dataset_name}" has been assigned to "${guide.name}"`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to assign dataset");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassignDataset = async (datasetId: string) => {
    setIsLoading(true);

    try {
      await unassignDatasetFromGuide(guide.id || "", datasetId);
      toast.success(`Dataset has been unassigned from "${guide.name}"`);
      setSelectedDatasetId("");
    } catch (error) {
      toast.error("Failed to unassign dataset");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedIds = new Set((guide?.datasets || []).map((d) => d.id));

  const selected = datasets.filter((i) => selectedIds.has(i.id));
  const notSelected = datasets.filter((i) => !selectedIds.has(i.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Data Products to Guide</DialogTitle>
          <DialogDescription>
            Select which data products the guide "{guide.name}" should work on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Assignment */}
          {guide.datasets && guide.datasets.length > 0 && (
            <div className="space-y-2">
              <Label>Current Assignments</Label>
              <div className="flex flex-wrap gap-2">
                {selected.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between w-full p-2 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">{d.dataset_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Datasets */}
          <div className="space-y-2">
            <Label htmlFor="dataset-select">Assign a dataset</Label>

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
            ) : notSelected.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No data products available</p>
                <p className="text-xs text-gray-400">Please check your data connections</p>
              </div>
            ) : (
              <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Data Products..." />
                </SelectTrigger>
                <SelectContent>
                  {notSelected.map((dataset: Dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      <div className="flex items-center gap-2">
                        <span>{dataset.dataset_name}</span>
                        {dataset.connector && (
                          <Badge variant="outline" className="text-xs">
                            {dataset.connector}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Data Products Info */}
          {selectedDatasetId && (
            <div className="space-y-2">
              <Label>Data Products Information</Label>
              {(() => {
                const dataset = datasets.find((d: Dataset) => d.id === selectedDatasetId);
                return dataset ? (
                  <div className="p-3 bg-gray-50 rounded-lg border">
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
                          <span className="font-medium">Rows:</span>{" "}
                          {dataset.row_count.toLocaleString()}
                        </div>
                      )}
                      {dataset.quality_score && (
                        <div>
                          <span className="font-medium">Quality:</span> {dataset.quality_score}%
                        </div>
                      )}
                    </div>

                    {dataset.columns && dataset.columns.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">
                          Columns ({dataset.columns.length}):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {dataset.columns.slice(0, 5).map((column: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {column}
                            </Badge>
                          ))}
                          {dataset.columns.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{dataset.columns.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {dataset.tags && dataset.tags.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">Tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {dataset.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}
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
          {!isDatasetsLoading && !error && datasets.length > 0 && (
            <Button
              onClick={handleAssignDataset}
              disabled={
                isLoading ||
                !selectedDatasetId ||
                !!guide.datasets?.some((d) => d.id === selectedDatasetId)
              }
              className="bg-[#3064f6] hover:bg-[#2050d6]"
            >
              {isLoading ? "Assigning..." : "Assign Data Products"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
