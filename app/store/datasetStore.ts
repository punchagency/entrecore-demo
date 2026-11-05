import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SelectedDataset {
  id: string;
  name: string;
  type: string;
  columns?: string[];
  timestamp: number;
}

interface DatasetState {
  selectedDatasets: SelectedDataset[];
  setSelectedDataset: (dataset: Omit<SelectedDataset, "timestamp">) => void;
  removeSelectedDataset: (datasetId: string) => void;
  clearSelectedDatasets: () => void;
  getDatasetByType: (type: string) => SelectedDataset | null;
  isDatasetSelected: (datasetId: string) => boolean;
  refreshDatasetTimestamp: (datasetId: string) => void;
}

export const useDatasetStore = create<DatasetState>()(
  persist(
    (set, get) => ({
      selectedDatasets: [],

      setSelectedDataset: (dataset) => {
        const datasetWithTimestamp = {
          ...dataset,
          timestamp: Date.now(),
        };

        set((state) => {
          const existingIndex = state.selectedDatasets.findIndex(
            (existing) => existing.id === dataset.id
          );

          if (existingIndex !== -1) {
            const updatedDatasets = [...state.selectedDatasets];
            updatedDatasets[existingIndex] = datasetWithTimestamp;
            return { selectedDatasets: updatedDatasets };
          } else {
            return {
              selectedDatasets: [...state.selectedDatasets, datasetWithTimestamp],
            };
          }
        });
      },

      removeSelectedDataset: (datasetId) => {
        set((state) => ({
          selectedDatasets: state.selectedDatasets.filter((dataset) => dataset.id !== datasetId),
        }));
      },

      clearSelectedDatasets: () => set({ selectedDatasets: [] }),

      getDatasetByType: (type) => {
        const datasets = get().selectedDatasets;
        return datasets.find((dataset) => dataset.type === type) || null;
      },

      isDatasetSelected: (datasetId) => {
        const datasets = get().selectedDatasets;
        return datasets.some((dataset) => dataset.id === datasetId);
      },

      refreshDatasetTimestamp: (datasetId) => {
        set((state) => {
          const updatedDatasets = state.selectedDatasets.map((dataset) => {
            if (dataset.id === datasetId) {
              return { ...dataset, timestamp: Date.now() };
            }
            return dataset;
          });
          return { selectedDatasets: updatedDatasets };
        });
      },
    }),
    {
      name: "selected-datasets",
      onRehydrateStorage: () => (state) => {
        if (state && state.selectedDatasets && state.selectedDatasets.length > 0) {
          const now = Date.now();
          const validDatasets = state.selectedDatasets.filter((dataset) => {
            const minutesPassed = (now - dataset.timestamp) / (1000 * 60);
            return minutesPassed <= 60;
          });

          if (validDatasets.length !== state.selectedDatasets.length) {
            console.log(
              `Cleared ${state.selectedDatasets.length - validDatasets.length} expired datasets from storage on rehydration`
            );
            state.selectedDatasets = validDatasets;
          }
        }
      },
    }
  )
);

if (typeof window !== "undefined") {
  if (localStorage.getItem("selected-dataset")) {
    localStorage.removeItem("selected-dataset");
    console.log("Cleaned up old single dataset storage");
  }

  setInterval(() => {
    const state = useDatasetStore.getState();
    if (state.selectedDatasets.length > 0) {
      const now = Date.now();
      const expiredDatasets = state.selectedDatasets.filter((dataset) => {
        const minutesPassed = (now - dataset.timestamp) / (1000 * 60);
        return minutesPassed > 60;
      });

      if (expiredDatasets.length > 0) {
        console.log(
          `Auto-cleared ${expiredDatasets.length} expired datasets (older than 60 minutes)`
        );
        expiredDatasets.forEach((dataset) => state.removeSelectedDataset(dataset.id));
      }
    }
  }, 300000);
}
