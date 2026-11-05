import { Axios } from "@/app/config/axios";

// ==========================================
// TYPES — Data Integration Preview
// ==========================================

export type DataType =
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "date"
  | "datetime"
  | "json"
  | "text"
  | "uuid"
  | "decimal";

export interface ConnectorConfig {
  /** The CONFIG id. Most connector routes are keyed on `connector_id` instead. */
  id: string;
  /**
   * The connector this config belongs to. The backend has always sent it
   * (CompanyConfigResponse); it was simply missing from this type, so anything
   * needing a `/connectors/{connector_id}/…` route had no id to use.
   */
  connector_id?: string;
  connector_name: string;
  erp_type: string;
  is_active: boolean;
  company_id: string;
}

export interface SourceColumn {
  name: string;
  data_type: DataType;
  nullable: boolean;
  sample_values: (string | null)[];
  distinct_count?: number;
  null_count?: number;
  total_rows?: number;
}

export interface TargetColumn {
  name: string;
  data_type: DataType;
  nullable: boolean;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  is_unique: boolean;
  default_value?: string | null;
  description?: string;
  fk_reference?: string; // e.g. "users.id"
}

export type TransformationType =
  | "direct"       // straight copy
  | "cast"         // type conversion
  | "expression"   // custom formula
  | "derive"       // derived from multiple sources
  | "constant"     // hardcoded value
  | "lookup";      // lookup from another table

export interface TransformationRule {
  type: TransformationType;
  expression?: string;          // e.g. "CAST(source AS INTEGER)"
  cast_to?: DataType;
  constant_value?: string;
  lookup_table?: string;
  lookup_key?: string;
}

export type NullHandling = "keep_null" | "use_default" | "reject_row";
export type ErrorRouting = "reject_row" | "quarantine" | "skip";

export interface ExceptionRule {
  default_value?: string;
  null_handling: NullHandling;
  error_routing: ErrorRouting;
}

export interface ColumnMapping {
  id: string;
  source_column: string | null;    // null = unmapped / constant
  target_column: string;
  transformation: TransformationRule;
  confidence: number;               // 0.0 - 1.0
  ai_generated: boolean;
  human_modified: boolean;
  exception_rule?: ExceptionRule;
  validation_issues: MappingValidationIssue[];
}

export type MappingIssueSeverity = "error" | "warning" | "info";

export interface MappingValidationIssue {
  severity: MappingIssueSeverity;
  code: string;
  message: string;
}

export type MappingDecision = "approve" | "modify" | "reject";
export type MappingVersionStatus = "draft" | "approved" | "rejected" | "superseded";

export interface MappingVersion {
  id: string;
  version: number;
  status: MappingVersionStatus;
  created_at: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  mapping_count: number;
  ai_generated_count: number;
  human_modified_count: number;
}

export interface PreviewRow {
  [column: string]: string | number | boolean | null;
}

export interface PreviewStats {
  total_rows: number;
  null_percentage: Record<string, number>;
  distinct_values: Record<string, number>;
}

export interface IntegrationPreviewResponse {
  workflow_id: string;
  source_table: string;
  target_table: string;
  source_columns: SourceColumn[];
  target_columns: TargetColumn[];
  mappings: ColumnMapping[];
  source_sample_data: PreviewRow[];
  preview_stats: PreviewStats;
}

export interface TransformedPreviewResponse {
  rows: PreviewRow[];
  stats: PreviewStats;
  errors: { row_index: number; column: string; message: string }[];
  row_count_source: number;
  row_count_output: number;
}

export interface MappingSaveRequest {
  mappings: ColumnMapping[];
  decision: MappingDecision;
  feedback_notes?: string;
}

export interface PostExecutionResult {
  status: "success" | "partial" | "failed";
  row_count_source: number;
  row_count_target: number;
  row_count_rejected: number;
  row_count_quarantined: number;
  constraint_violations: { constraint: string; count: number; sample: string }[];
  quality_checks: { check: string; passed: boolean; detail: string }[];
  lineage: { stage: string; table: string; columns: string[] }[];
  ai_vs_human: { ai_generated: number; human_modified: number; manual_added: number };
  executed_at: string;
  duration_seconds: number;
}

// ==========================================
// MOCK DATA
// ==========================================

const MOCK_SOURCE_COLUMNS: SourceColumn[] = [
  { name: "cust_id", data_type: "string", nullable: false, sample_values: ["C-1001", "C-1002", "C-1003"], distinct_count: 4850, null_count: 0, total_rows: 5000 },
  { name: "full_name", data_type: "string", nullable: true, sample_values: ["John Doe", "Jane Smith", "Bob Wilson"], distinct_count: 4702, null_count: 12, total_rows: 5000 },
  { name: "email_addr", data_type: "string", nullable: true, sample_values: ["john@acme.com", "jane@corp.io", "bob@mail.net"], distinct_count: 4845, null_count: 5, total_rows: 5000 },
  { name: "signup_dt", data_type: "string", nullable: true, sample_values: ["2024-01-15", "2023-11-02", "2024-03-22"], distinct_count: 890, null_count: 3, total_rows: 5000 },
  { name: "acct_balance", data_type: "string", nullable: true, sample_values: ["15420.50", "8930.25", "102050.00"], distinct_count: 4990, null_count: 8, total_rows: 5000 },
  { name: "is_active", data_type: "string", nullable: false, sample_values: ["true", "false", "true"], distinct_count: 2, null_count: 0, total_rows: 5000 },
  { name: "region_code", data_type: "string", nullable: true, sample_values: ["US-EAST", "EU-WEST", "APAC-SE"], distinct_count: 12, null_count: 45, total_rows: 5000 },
  { name: "last_login", data_type: "string", nullable: true, sample_values: ["2024-06-10T14:30:00Z", "2024-06-09T09:15:00Z", null], distinct_count: 4200, null_count: 150, total_rows: 5000 },
  { name: "phone_num", data_type: "string", nullable: true, sample_values: ["+1-555-0101", "+44-20-7946-0958", null], distinct_count: 4500, null_count: 320, total_rows: 5000 },
];

const MOCK_TARGET_COLUMNS: TargetColumn[] = [
  { name: "customer_id", data_type: "uuid", nullable: false, is_primary_key: true, is_foreign_key: false, is_unique: true, description: "Unique customer identifier" },
  { name: "display_name", data_type: "string", nullable: false, is_primary_key: false, is_foreign_key: false, is_unique: false, description: "Customer full name" },
  { name: "email", data_type: "string", nullable: false, is_primary_key: false, is_foreign_key: false, is_unique: true, description: "Primary email address" },
  { name: "created_at", data_type: "datetime", nullable: false, is_primary_key: false, is_foreign_key: false, is_unique: false, description: "Account creation timestamp" },
  { name: "balance", data_type: "decimal", nullable: true, is_primary_key: false, is_foreign_key: false, is_unique: false, default_value: "0.00", description: "Current account balance" },
  { name: "active", data_type: "boolean", nullable: false, is_primary_key: false, is_foreign_key: false, is_unique: false, default_value: "true", description: "Account active status" },
  { name: "region_id", data_type: "integer", nullable: true, is_primary_key: false, is_foreign_key: true, is_unique: false, fk_reference: "regions.id", description: "Foreign key to regions table" },
  { name: "last_login_at", data_type: "datetime", nullable: true, is_primary_key: false, is_foreign_key: false, is_unique: false, description: "Last login timestamp" },
  { name: "phone", data_type: "string", nullable: true, is_primary_key: false, is_foreign_key: false, is_unique: false, description: "Contact phone number" },
  { name: "risk_score", data_type: "float", nullable: true, is_primary_key: false, is_foreign_key: false, is_unique: false, description: "Computed risk assessment score" },
];

const MOCK_MAPPINGS: ColumnMapping[] = [
  {
    id: "map-001", source_column: "cust_id", target_column: "customer_id",
    transformation: { type: "cast", cast_to: "uuid", expression: "CAST(cust_id AS UUID)" },
    confidence: 0.92, ai_generated: true, human_modified: false,
    validation_issues: [{ severity: "warning", code: "TYPE_CAST", message: "String → UUID cast may fail for non-UUID formatted values" }]
  },
  {
    id: "map-002", source_column: "full_name", target_column: "display_name",
    transformation: { type: "direct" },
    confidence: 0.96, ai_generated: true, human_modified: false, validation_issues: []
  },
  {
    id: "map-003", source_column: "email_addr", target_column: "email",
    transformation: { type: "expression", expression: "LOWER(TRIM(email_addr))" },
    confidence: 0.94, ai_generated: true, human_modified: false, validation_issues: []
  },
  {
    id: "map-004", source_column: "signup_dt", target_column: "created_at",
    transformation: { type: "cast", cast_to: "datetime", expression: "TO_TIMESTAMP(signup_dt, 'YYYY-MM-DD')" },
    confidence: 0.88, ai_generated: true, human_modified: false, validation_issues: []
  },
  {
    id: "map-005", source_column: "acct_balance", target_column: "balance",
    transformation: { type: "cast", cast_to: "decimal", expression: "CAST(acct_balance AS DECIMAL(12,2))" },
    confidence: 0.91, ai_generated: true, human_modified: false, validation_issues: []
  },
  {
    id: "map-006", source_column: "is_active", target_column: "active",
    transformation: { type: "cast", cast_to: "boolean", expression: "CAST(is_active AS BOOLEAN)" },
    confidence: 0.97, ai_generated: true, human_modified: false, validation_issues: []
  },
  {
    id: "map-007", source_column: "region_code", target_column: "region_id",
    transformation: { type: "lookup", lookup_table: "regions", lookup_key: "code" },
    confidence: 0.62, ai_generated: true, human_modified: false,
    validation_issues: [{ severity: "warning", code: "FK_LOOKUP", message: "Lookup may not resolve all region codes to valid IDs" }]
  },
  {
    id: "map-008", source_column: "last_login", target_column: "last_login_at",
    transformation: { type: "cast", cast_to: "datetime" },
    confidence: 0.85, ai_generated: true, human_modified: false, validation_issues: []
  },
  {
    id: "map-009", source_column: "phone_num", target_column: "phone",
    transformation: { type: "direct" },
    confidence: 0.78, ai_generated: true, human_modified: false, validation_issues: []
  },
];

const MOCK_SAMPLE_DATA: PreviewRow[] = [
  { cust_id: "C-1001", full_name: "John Doe", email_addr: "john@acme.com", signup_dt: "2024-01-15", acct_balance: "15420.50", is_active: "true", region_code: "US-EAST", last_login: "2024-06-10T14:30:00Z", phone_num: "+1-555-0101" },
  { cust_id: "C-1002", full_name: "Jane Smith", email_addr: "JANE@Corp.IO", signup_dt: "2023-11-02", acct_balance: "8930.25", is_active: "false", region_code: "EU-WEST", last_login: "2024-06-09T09:15:00Z", phone_num: "+44-20-7946-0958" },
  { cust_id: "C-1003", full_name: "Bob Wilson", email_addr: "bob@mail.net", signup_dt: "2024-03-22", acct_balance: "102050.00", is_active: "true", region_code: "APAC-SE", last_login: null, phone_num: null },
  { cust_id: "C-1004", full_name: null, email_addr: "alice@startup.dev", signup_dt: "2024-05-01", acct_balance: "450.75", is_active: "true", region_code: null, last_login: "2024-06-11T08:00:00Z", phone_num: "+1-555-0204" },
  { cust_id: "C-1005", full_name: "Carlos Rivera", email_addr: "carlos@enterprise.mx", signup_dt: "2023-08-14", acct_balance: "67200.00", is_active: "true", region_code: "LATAM-N", last_login: "2024-06-08T16:45:00Z", phone_num: "+52-555-0303" },
];

const MOCK_TRANSFORMED_DATA: PreviewRow[] = [
  { customer_id: "a1b2c3d4-e5f6-0001-0000-000000001001", display_name: "John Doe", email: "john@acme.com", created_at: "2024-01-15T00:00:00Z", balance: 15420.50, active: true, region_id: 1, last_login_at: "2024-06-10T14:30:00Z", phone: "+1-555-0101", risk_score: null },
  { customer_id: "a1b2c3d4-e5f6-0001-0000-000000001002", display_name: "Jane Smith", email: "jane@corp.io", created_at: "2023-11-02T00:00:00Z", balance: 8930.25, active: false, region_id: 3, last_login_at: "2024-06-09T09:15:00Z", phone: "+44-20-7946-0958", risk_score: null },
  { customer_id: "a1b2c3d4-e5f6-0001-0000-000000001003", display_name: "Bob Wilson", email: "bob@mail.net", created_at: "2024-03-22T00:00:00Z", balance: 102050.00, active: true, region_id: 5, last_login_at: null, phone: null, risk_score: null },
  { customer_id: "a1b2c3d4-e5f6-0001-0000-000000001004", display_name: null, email: "alice@startup.dev", created_at: "2024-05-01T00:00:00Z", balance: 450.75, active: true, region_id: null, last_login_at: "2024-06-11T08:00:00Z", phone: "+1-555-0204", risk_score: null },
  { customer_id: "a1b2c3d4-e5f6-0001-0000-000000001005", display_name: "Carlos Rivera", email: "carlos@enterprise.mx", created_at: "2023-08-14T00:00:00Z", balance: 67200.00, active: true, region_id: 8, last_login_at: "2024-06-08T16:45:00Z", phone: "+52-555-0303", risk_score: null },
];

const MOCK_VERSIONS: MappingVersion[] = [
  { id: "ver-003", version: 3, status: "draft", created_at: "2024-06-11T10:30:00Z", created_by: "user-001", mapping_count: 9, ai_generated_count: 9, human_modified_count: 0 },
  { id: "ver-002", version: 2, status: "rejected", created_at: "2024-06-10T14:20:00Z", created_by: "user-001", rejection_reason: "Region mapping needs lookup table, not direct cast", mapping_count: 9, ai_generated_count: 9, human_modified_count: 2 },
  { id: "ver-001", version: 1, status: "approved", created_at: "2024-06-09T09:00:00Z", created_by: "agent-ai", approved_by: "user-002", approved_at: "2024-06-09T11:30:00Z", mapping_count: 8, ai_generated_count: 8, human_modified_count: 1 },
];

const MOCK_POST_EXECUTION: PostExecutionResult = {
  status: "partial",
  row_count_source: 5000,
  row_count_target: 4952,
  row_count_rejected: 38,
  row_count_quarantined: 10,
  constraint_violations: [
    { constraint: "PK_customer_id", count: 0, sample: "" },
    { constraint: "FK_region_id", count: 8, sample: "region_code 'LATAM-N' not found in regions table" },
    { constraint: "NOT_NULL_display_name", count: 12, sample: "Row C-1004: full_name is NULL, target requires NOT NULL" },
    { constraint: "UNIQUE_email", count: 3, sample: "Duplicate email: 'test@example.com' in rows C-2010, C-2015" },
  ],
  quality_checks: [
    { check: "Row count reconciliation", passed: false, detail: "Source: 5000, Target: 4952 (48 rows lost)" },
    { check: "Null percentage threshold", passed: true, detail: "All columns within 5% null tolerance" },
    { check: "Data type conformance", passed: true, detail: "All values conform to target schema types" },
    { check: "Referential integrity", passed: false, detail: "8 region_id values reference non-existent regions" },
    { check: "Balance range check", passed: true, detail: "All balances within expected range [0, 10M]" },
  ],
  lineage: [
    { stage: "Staging", table: "stg_customers_raw", columns: ["cust_id", "full_name", "email_addr", "signup_dt", "acct_balance", "is_active", "region_code", "last_login", "phone_num"] },
    { stage: "Integration", table: "int_customers_mapped", columns: ["customer_id", "display_name", "email", "created_at", "balance", "active", "region_id", "last_login_at", "phone"] },
    { stage: "Target", table: "dim_customers", columns: ["customer_id", "display_name", "email", "created_at", "balance", "active", "region_id", "last_login_at", "phone", "risk_score"] },
  ],
  ai_vs_human: { ai_generated: 7, human_modified: 2, manual_added: 0 },
  executed_at: "2024-06-11T12:00:00Z",
  duration_seconds: 34.5,
};

// ==========================================
// API FUNCTIONS (with mock fallback)
// ==========================================

export const fetchIntegrationPreview = async (workflowId: string): Promise<IntegrationPreviewResponse> => {
  try {
    const response = await Axios.get(`/data/workflows/${workflowId}/integration/preview`);
    return response.data;
  } catch {
    // Return mock data for development
    return {
      workflow_id: workflowId,
      source_table: "stg_customers_raw",
      target_table: "dim_customers",
      source_columns: MOCK_SOURCE_COLUMNS,
      target_columns: MOCK_TARGET_COLUMNS,
      mappings: MOCK_MAPPINGS,
      source_sample_data: MOCK_SAMPLE_DATA,
      preview_stats: {
        total_rows: 5000,
        null_percentage: { full_name: 0.24, email_addr: 0.1, region_code: 0.9, last_login: 3.0, phone_num: 6.4 },
        distinct_values: { cust_id: 4850, full_name: 4702, email_addr: 4845, region_code: 12, is_active: 2 },
      },
    };
  }
};

export const saveMappings = async (
  workflowId: string,
  data: MappingSaveRequest
): Promise<{ version_id: string; status: MappingVersionStatus }> => {
  try {
    const response = await Axios.post(`/data/workflows/${workflowId}/integration/mappings`, data);
    return response.data;
  } catch {
    return { version_id: `ver-${Date.now()}`, status: data.decision === "approve" ? "approved" : data.decision === "reject" ? "rejected" : "draft" };
  }
};

export const fetchMappingVersions = async (workflowId: string): Promise<MappingVersion[]> => {
  try {
    const response = await Axios.get(`/data/workflows/${workflowId}/integration/versions`);
    if (Array.isArray(response.data)) return response.data;
    if (response.data?.versions) return response.data.versions;
    return [];
  } catch {
    return MOCK_VERSIONS;
  }
};

export const fetchMappingVersion = async (
  workflowId: string,
  versionId: string
): Promise<IntegrationPreviewResponse> => {
  try {
    const response = await Axios.get(`/data/workflows/${workflowId}/integration/mappings/${versionId}`);
    return response.data;
  } catch {
    return {
      workflow_id: workflowId,
      source_table: "stg_customers_raw",
      target_table: "dim_customers",
      source_columns: MOCK_SOURCE_COLUMNS,
      target_columns: MOCK_TARGET_COLUMNS,
      mappings: MOCK_MAPPINGS,
      source_sample_data: MOCK_SAMPLE_DATA,
      preview_stats: {
        total_rows: 5000,
        null_percentage: {},
        distinct_values: {},
      },
    };
  }
};

export const runPreviewSample = async (
  workflowId: string,
  mappings: ColumnMapping[]
): Promise<TransformedPreviewResponse> => {
  try {
    const response = await Axios.post(`/data/workflows/${workflowId}/integration/preview-sample`, { mappings });
    return response.data;
  } catch {
    return {
      rows: MOCK_TRANSFORMED_DATA,
      stats: {
        total_rows: 5,
        null_percentage: { display_name: 20, region_id: 20, last_login_at: 20, phone: 20, risk_score: 100 },
        distinct_values: { customer_id: 5, email: 5, active: 2, region_id: 4 },
      },
      errors: [
        { row_index: 3, column: "display_name", message: "NULL value for NOT NULL target column" },
      ],
      row_count_source: 5,
      row_count_output: 5,
    };
  }
};

export const fetchPostExecutionResult = async (workflowId: string): Promise<PostExecutionResult> => {
  try {
    const response = await Axios.get(`/data/workflows/${workflowId}/integration/execution-result`);
    return response.data;
  } catch {
    return MOCK_POST_EXECUTION;
  }
};

export const fetchCompanyConnectors = async (companyId: string): Promise<ConnectorConfig[]> => {
  try {
    const response = await Axios.get(`/data/connectors/company/${companyId}/configs`);
    return response.data?.configs || response.data || [];
  } catch {
    return [
      { id: "conn-101", connector_name: "NetSuite Production", erp_type: "netsuite", is_active: true, company_id: companyId },
      { id: "conn-102", connector_name: "BigQuery Data Lake", erp_type: "bigquery", is_active: true, company_id: companyId },
      { id: "conn-103", connector_name: "Airtable Marketing", erp_type: "airtable", is_active: true, company_id: companyId },
    ];
  }
};
