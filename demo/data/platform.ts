/**
 * Entrecore-provided data: what every company has from its first day, because
 * the platform supplies it rather than the customer. Each block is copied from
 * the backend (Entrecore-OI-Backend origin/dev @ aed5ff3b, 2026-11-05); keep
 * the source reference when updating.
 *
 * Everything company-owned (guides, connector configs, datasets, documents,
 * workflows, notifications…) starts empty: see demo/server/db.ts.
 */

/**
 * Connector catalog. Source: migrations/versions/m1n2o3p4q5r6_seed_platform_connectors.py.
 * Ids are the demo's own; the frontend reads them from NEXT_PUBLIC_*_CONNECTOR_ID (.env).
 */
export const CONNECTOR_CATALOG = [
  { id: "c0000000-0000-4000-8000-000000000001", name: "BigQuery", erp_type: "bigquery" },
  { id: "c0000000-0000-4000-8000-000000000002", name: "NetSuite", erp_type: "netsuite" },
  { id: "c0000000-0000-4000-8000-000000000003", name: "Airtable", erp_type: "airtable" },
  { id: "c0000000-0000-4000-8000-000000000004", name: "Notion", erp_type: "notion" },
  { id: "c0000000-0000-4000-8000-000000000005", name: "Google Drive", erp_type: "google_drive" },
].map((connector) => ({
  ...connector,
  status: "active",
  connector_metadata: null,
  error_count: 0,
  is_active: true,
  created_at: "2026-07-19T00:00:00Z",
  updated_at: "2026-07-19T00:00:00Z",
}));

/** The 14 enterprise verticals. Source: models/vertical_tag_models.py ENTERPRISE_VERTICALS. */
export const VERTICALS = [
  { key: "strategy", name: "Strategy", description: "Corporate direction, executive planning, and transformation initiatives." },
  { key: "finance", name: "Finance", description: "Accounting, financial planning, treasury, reporting, and tax." },
  { key: "operations", name: "Operations", description: "Business processes, logistics, production, and service delivery." },
  { key: "sales", name: "Sales", description: "Pipeline management, account management, pricing, and deals." },
  { key: "marketing", name: "Marketing", description: "Campaigns, brand strategy, acquisition, and market research." },
  { key: "customer", name: "Customer", description: "Customer lifecycle, support, success, and experience." },
  { key: "people", name: "People", description: "Recruiting, workforce planning, performance, and compensation." },
  { key: "technology", name: "Technology", description: "Enterprise architecture, software systems, infrastructure, and cybersecurity." },
  { key: "data", name: "Data", description: "Governance, data engineering, analytics, and machine learning." },
  { key: "legal", name: "Legal", description: "Contracts, corporate law, intellectual property, and litigation." },
  { key: "risk", name: "Risk", description: "Regulatory compliance, internal controls, and risk management." },
  { key: "procurement", name: "Procurement", description: "Vendor management, sourcing, and supplier relationships." },
  { key: "product", name: "Product", description: "Product strategy, lifecycle management, and feature roadmaps." },
  { key: "assets", name: "Assets", description: "Facilities, real estate, equipment, and capital investments." },
];

/**
 * How a guide runs. Source: agent/guide_architecture.py STEP_CATALOG,
 * TOOL_CATALOG and ALWAYS_ON_TOOLS (served by GET /data/guides/{id}/architecture).
 */
export const GUIDE_STEPS = [
  {
    id: "open_conversation",
    title: "Open conversation",
    description:
      "Starts the conversation, or picks up the existing one, and loads the guide's saved history, its settings and its datasets.",
  },
  {
    id: "classify_guide",
    title: "Choose the tools",
    description:
      "Reads the guide's setup to decide which tools it gets. A connector guide uses its connector's toolkit. A dataset guide uses one toolkit for each data source among its datasets.",
  },
  {
    id: "dataset",
    title: "Answer with the data",
    description:
      "Builds the guide's toolkit, adding knowledge search, integration mapping and feedback, and lets the AI use those tools to answer the question.",
  },
  {
    id: "summarize_three",
    title: "Summarize the answer",
    description: "Condenses the latest answer so a follow-up question can build on it.",
  },
  {
    id: "close_conversation",
    title: "Save the conversation",
    description: "Saves the exchange so the guide can pick it up next time.",
  },
];

export const GUIDE_TOOLKITS: Record<string, { name: string; description: string }> = {
  lineage: { name: "Lineage toolkit", description: "Traces how datasets and tables connect, using the lineage graph." },
  bigquery: { name: "BigQuery toolkit", description: "Queries the guide's BigQuery datasets with SQL." },
  netsuite: { name: "NetSuite toolkit", description: "Reads the guide's NetSuite data." },
  airtable: { name: "Airtable toolkit", description: "Reads the guide's Airtable data." },
  notion: { name: "Notion toolkit", description: "Reads the guide's Notion content." },
  business_rules: { name: "Business rules", description: "Looks up and manages business rules on the guide's datasets." },
  business_rules_approve_reject: { name: "Business rule approvals", description: "Approves or rejects pending business rules." },
};

export const GUIDE_ALWAYS_ON_TOOLS = [
  { id: "dataset_listing", name: "Dataset explorer", description: "Lists the tables and columns of the guide's datasets.", datasetGuidesOnly: true },
  { id: "knowledge_search", name: "Knowledge search", description: "Searches the company's uploaded documents and knowledge base.", datasetGuidesOnly: false },
  { id: "integration_mapping", name: "Integration mapping", description: "Helps map fields when connecting data sources.", datasetGuidesOnly: false },
  { id: "feedback", name: "Feedback", description: "Records feedback on the guide's answers.", datasetGuidesOnly: false },
];

/**
 * Workflow trigger types. Source: TriggerType in the workflow trigger models,
 * served by GET /data/triggers/types (routers/triggers.py).
 */
const EVENT_TRIGGER_TYPES = [
  "pipeline_completed", "pipeline_failed", "dq_rule_failed", "file_landed", "model_refresh_completed",
  "rule_created", "rule_updated", "rule_deleted", "rule_failed", "lineage_changed", "abstraction_staging_complete",
];
const POLLING_TRIGGER_TYPES = [
  "db_record_inserted", "db_record_updated", "db_record_deleted", "db_row_threshold", "db_query_result",
  "file_uploaded", "file_pattern_match", "file_size_exceeded", "file_validation_failed", "file_modified",
];
export const TRIGGER_TYPES = {
  event_types: [...EVENT_TRIGGER_TYPES].sort(),
  polling_types: [...POLLING_TRIGGER_TYPES].sort(),
  all_types: [...EVENT_TRIGGER_TYPES, ...POLLING_TRIGGER_TYPES].sort(),
};
