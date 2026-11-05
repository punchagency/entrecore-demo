import { useQuery } from "@tanstack/react-query";
import { Axios } from "@/app/config/axios";
import { useUserStore } from "@/app/store/userStore";
import { useEffect, useRef, useState } from "react";

export interface Dataset {
  id: string;
  dataset_name: string;
  company_id: string;
  description?: string;
  schema_name?: string;
  table_name?: string;
  connector?: string;
  function?: string;
  columns?: string[];
  row_count?: number;
  created_at?: string;
  updated_at?: string;
  quality_score?: number;
  tags?: string[];
}

export interface DatasetsResponse {
  items: Dataset[];
  total: number;
  skip: number;
  limit: number;
}

export interface DatasetsParams {
  skip?: number;
  limit?: number;
  company_id?: string;
}

export const useDatasets = (params?: DatasetsParams) => {
  console.log(params, "params");
  return useQuery({
    queryKey: ["datasets", params],
    queryFn: async (): Promise<Dataset[]> => {
      const queryParams = new URLSearchParams();
      console.log(queryParams, "queryParams");

      if (params?.skip !== undefined) {
        queryParams.append("skip", params.skip.toString());
      }
      if (params?.limit !== undefined) {
        queryParams.append("limit", params.limit.toString());
      }
      if (params?.company_id) {
        queryParams.append("company_id", params.company_id);
      }

      const url = `/data/metadata/datasets${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const response = await Axios.get<DatasetsResponse>(url);
      return response.data.items || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
  });
};

export const useDataset = (datasetId: string) => {
  return useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: async (): Promise<Dataset> => {
      const response = await Axios.get<Dataset>(`/data/metadata/datasets/${datasetId}`);
      return response.data;
    },
    enabled: !!datasetId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Convenience hook that automatically uses the current user's company_id
export const useCompanyDatasets = (additionalParams?: Omit<DatasetsParams, "company_id">) => {
  const { user } = useUserStore();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateCompanyId = () => {
      const storedId =
        window.localStorage.getItem("selectedCompanyId") || user?.active_company || "";
      setSelectedCompanyId(storedId);
    };

    // Initial load
    updateCompanyId();

    // Listen for storage changes (when localStorage is updated from other components/tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedCompanyId") {
        updateCompanyId();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user?.active_company]);

  const params: DatasetsParams = {
    company_id: selectedCompanyId,
    ...additionalParams,
  };

  return useDatasets(params);
};
