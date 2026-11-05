import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SelectedColumnData {
  id: string;
  column_id?: string;
  column_name: string;
  technical_description: string | null;
  business_description?: string | null;
  active_status: boolean;
  calculated_value: boolean;
  crawled_status: boolean;
  dataset_id: string;
  date_crawled: string | null;
  date_created: string | null;
  date_profiled: string;
  distinct_value_counts?: Record<string, number>;
  distinct_values?: string[];
  key: string;
  label: string;
  max_value: string;
  min_value: string;
  null_count: number;
  numeric_precision: number | null;
  numeric_scale: number | null;
  table_id: string;
  timestamp: number;
  total_records?: number;
  unique_values_count?: number;
  data_type?: string;
  column_description?: string;
  completeness_score?: number;
  uniqueness_score?: number;
  row_count?: number;
  distinct_count?: number;
}

interface ColumnDataState {
  selectedColumnData: SelectedColumnData | null;
  isLoading: boolean;
  error: string | null;
  hasColumns: boolean | null; // null = unknown, true = has columns, false = no columns
  totalExpectedRecords: number;
  columnRules: any[];
  setColumnRules: (columnRules: any[]) => void;

  setTotalExpectedRecords: (count: number) => void;
  setSelectedColumnData: (columnData: SelectedColumnData) => void;
  clearSelectedColumnData: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasColumns: (hasColumns: boolean | null) => void;
  tableColumns: any[];
  setTableColumns: (columns: any[]) => void;
  getProcessedDistribution: () => Array<{
    id: string;
    value: string;
    count: number;
    percentage: number;
  }> | null;
}

export const useColumnDataStore = create<ColumnDataState>()(
  persist(
    (set, get) => ({
      selectedColumnData: null,
      totalExpectedRecords: 0,
      columnRules: [],
      tableColumns: [],

      isLoading: false,
      error: null,
      hasColumns: null,

      setTotalExpectedRecords: (count: number) => set({ totalExpectedRecords: count }),

      setColumnRules: (rules: any[]) => set({ columnRules: rules }),

      setTableColumns: (columns: any[]) => set({ tableColumns: columns }),

      setSelectedColumnData: (columnData) => {
        if (!columnData) {
          console.warn("setSelectedColumnData called with null/undefined columnData");
          return;
        }

        const distinctValueCounts = columnData?.distinct_value_counts || {};
        const computedTotalRecords = Object.values(distinctValueCounts).reduce(
          (sum, count) => sum + count,
          0
        );

        const distinctValues = columnData?.distinct_values || [];
        const computedUniqueValuesCount = distinctValues.length;

        const totalRecords = Math.max(
          columnData.total_records || 0,
          (columnData as any).record_count || 0,
          columnData.row_count || 0,
          computedTotalRecords || 0,
          columnData.null_count || 0
        );
        const uniqueValuesCount = Math.max(
          columnData.unique_values_count || 0,
          columnData.distinct_count || 0,
          computedUniqueValuesCount || 0
        );

        const columnDataWithComputed = {
          ...columnData,
          distinct_value_counts: distinctValueCounts,
          distinct_values: distinctValues,
          total_records: totalRecords,
          unique_values_count: uniqueValuesCount,
          timestamp: Date.now(),
        };

        set({
          selectedColumnData: columnDataWithComputed,
          error: null,
        });
      },

      clearSelectedColumnData: () =>
        set({
          selectedColumnData: null,
          totalExpectedRecords: 0,
          error: null,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error, isLoading: false }),

      setHasColumns: (hasColumns) => set({ hasColumns }),

      getProcessedDistribution: () => {
        const data = get().selectedColumnData;
        if (!data?.distinct_value_counts) return null;

        const totalRecords = data.total_records || 0;

        return Object.entries(data?.distinct_value_counts)
          .map(([value, count]) => ({
            id: `${value}-${count}`,
            value,
            count,
            percentage: totalRecords > 0 ? (count / totalRecords) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count);
      },
    }),
    {
      name: "column-data-storage",
      onRehydrateStorage: () => (state) => {
        if (state?.selectedColumnData?.timestamp) {
          const minutesPassed = (Date.now() - state.selectedColumnData.timestamp) / (1000 * 60);

          if (minutesPassed > 30) {
            state.clearSelectedColumnData();
            console.log("Cleared expired column data from storage");
          }
        }
      },
    }
  )
);
