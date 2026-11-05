import { Axios } from "@/app/config/axios";

export const testDatasetsAPI = async () => {
  try {
    console.log("Testing datasets API endpoint...");
    const response = await Axios.get("/data/metadata/datasets");
    console.log("API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// Mock data for testing purposes when the API is not ready
export const mockDatasets = [
  {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    dataset_name: "Sales Data 2024",
    company_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    description: "Comprehensive sales data for Q1-Q4 2024",
    schema_name: "sales",
    table_name: "transactions",
    connector: "PostgreSQL",
    function: "sales",
    columns: ["id", "customer_id", "amount", "date", "product", "region"],
    row_count: 150000,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-12-01T00:00:00Z",
    quality_score: 95,
    tags: ["sales", "revenue", "2024"]
  },
  {
    id: "4fb96f65-6828-5673-c4fd-3d074g77bfb7", 
    dataset_name: "Customer Analytics",
    company_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    description: "Customer behavior and demographic data",
    schema_name: "analytics",
    table_name: "customers",
    connector: "BigQuery",
    function: "marketing",
    columns: ["customer_id", "age", "gender", "location", "segment", "lifetime_value"],
    row_count: 50000,
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-11-30T00:00:00Z",
    quality_score: 88,
    tags: ["customers", "analytics", "segmentation"]
  },
  {
    id: "5gc07g76-7939-6784-d5ge-4e185h88cgc8",
    dataset_name: "Financial Metrics",
    company_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    description: "Monthly financial KPIs and performance indicators",
    schema_name: "finance", 
    table_name: "metrics",
    connector: "Snowflake",
    function: "finance",
    columns: ["month", "revenue", "expenses", "profit", "cash_flow", "budget_variance"],
    row_count: 120,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-12-01T00:00:00Z",
    quality_score: 98,
    tags: ["finance", "kpis", "monthly"]
  }
]; 