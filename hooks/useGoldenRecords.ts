import { Axios } from "@/app/config/axios";
import { useQuery } from "@tanstack/react-query";

interface GoldenRecord {
    id: string;
    // Add other fields as needed based on the actual response
    [key: string]: any;
}

interface FetchGoldenRecordsParams {
    canonicalId: string;
    limit?: number;
    page?: number;
    filter?: string;
}

export const fetchGoldenRecords = async ({
    canonicalId,
    limit = 10,
    page = 1,
    filter,
}: FetchGoldenRecordsParams) => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("page", page.toString());
    if (filter) params.append("filter", filter);

    const response = await Axios.get(
        `/api/v1/data/view360/golden_records/${canonicalId}?${params.toString()}`
    );
    return response.data;
};

export const useGoldenRecords = (
    canonicalId: string,
    options?: { limit?: number; page?: number; filter?: string }
) => {
    return useQuery({
        queryKey: ["goldenRecords", canonicalId, options],
        queryFn: () =>
            fetchGoldenRecords({
                canonicalId,
                limit: options?.limit ?? 10,
                page: options?.page ?? 1,
                filter: options?.filter,
            }),
        enabled: !!canonicalId,
    });
};
