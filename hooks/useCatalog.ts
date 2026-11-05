import { useQuery } from "@tanstack/react-query";
import { Axios } from "@/app/config/axios";


interface CatalogParams {
    companyId: string;
    schemaName: string;
}

export const fetchCatalog = async ({ companyId, schemaName }: CatalogParams) => {
    const response = await Axios.get(`/data/catalog/`, {
        params: {
            company_id: companyId,
            schema_name: schemaName,
        },
    });
    return response.data;
};

export const useCatalog = (companyId: string, schemaName: string) => {
    return useQuery({
        queryKey: ["catalog", companyId, schemaName],
        queryFn: () => fetchCatalog({ companyId, schemaName }),
        enabled: !!companyId && !!schemaName,
    });
};
