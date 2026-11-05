import { DATASETS } from "./agents";
import { COMPANY_ID } from "./tenant";
import { ago } from "./time";

/** Datasets (GET /data/metadata/datasets), industry verticals and knowledge documents. */

const DATASET_DETAILS: Record<
  string,
  { description: string; connector: string; table_name: string; columns: string[]; row_count: number; quality_score: number; tags: string[] }
> = {
  [DATASETS.finance.id]: {
    description: "Consolidated general ledger, income statement and AR/AP for all six Larkspur businesses.",
    connector: "netsuite",
    table_name: "consolidated_gl",
    columns: ["entity", "account", "period", "amount_usd", "department", "class"],
    row_count: 1_284_220,
    quality_score: 97,
    tags: ["finance", "governed"],
  },
  [DATASETS.warehouse.id]: {
    description: "Shipments, orders, production and service tickets from operating systems, modelled in BigQuery.",
    connector: "bigquery",
    table_name: "fct_shipments",
    columns: ["shipment_id", "customer_id", "lane", "shipped_at", "delivered_at", "freight_cost_usd"],
    row_count: 18_402_115,
    quality_score: 91,
    tags: ["operations"],
  },
  [DATASETS.contracts.id]: {
    description: "Vendor and customer contracts with extracted key terms: term, renewal, notice period, pricing.",
    connector: "airtable",
    table_name: "contracts",
    columns: ["contract_id", "counterparty", "entity", "start_date", "renewal_date", "notice_days", "annual_value_usd"],
    row_count: 1_146,
    quality_score: 94,
    tags: ["legal", "extracted"],
  },
  [DATASETS.policies.id]: {
    description: "Finance and operations policies, procedures and approval matrices.",
    connector: "notion",
    table_name: "policies",
    columns: ["page_id", "title", "owner", "last_reviewed"],
    row_count: 212,
    quality_score: 88,
    tags: ["knowledge"],
  },
};

export const datasets = Object.values(DATASETS).map((ds, index) => ({
  id: ds.id,
  dataset_name: ds.name,
  company_id: COMPANY_ID,
  schema_name: ds.source,
  ...DATASET_DETAILS[ds.id],
  function: "source",
  created_at: ago({ days: 180 - index * 20 }),
  updated_at: ago({ hours: 2 + index * 3 }),
}));

export const verticals = [
  { key: "finance", name: "Finance", description: "Accounting, FP&A, treasury and reporting." },
  { key: "operations", name: "Operations", description: "Logistics, production and service delivery." },
  { key: "legal", name: "Legal & Compliance", description: "Contracts, entities, filings and policies." },
  { key: "commercial", name: "Commercial", description: "Customers, pricing, sales and marketing." },
  { key: "people", name: "People", description: "Headcount, payroll and org structure." },
];

/** Which verticals each dataset is tagged with. */
export const DATASET_VERTICALS: Record<string, string[]> = {
  [DATASETS.finance.id]: ["finance", "commercial"],
  [DATASETS.warehouse.id]: ["operations", "commercial"],
  [DATASETS.contracts.id]: ["legal", "finance"],
  [DATASETS.policies.id]: ["legal", "people"],
};

/** Which verticals each demo agent is tagged with. */
export const AGENT_VERTICALS: Record<string, string[]> = {
  "a1d4e7c2-0f5b-4a6e-9d3c-1b2a3c4d5e01": ["finance", "commercial"],
  "a1d4e7c2-0f5b-4a6e-9d3c-1b2a3c4d5e02": ["operations", "finance"],
  "a1d4e7c2-0f5b-4a6e-9d3c-1b2a3c4d5e03": ["legal", "finance"],
  "a1d4e7c2-0f5b-4a6e-9d3c-1b2a3c4d5e04": ["finance"],
  "a1d4e7c2-0f5b-4a6e-9d3c-1b2a3c4d5e05": ["legal"],
};

export const knowledgeDocs = [
  { knowledge_id: "kd-0001", title: "FY2026 Board Pack — September", file_name: "board-pack-2026-09.pdf", tags: ["finance", "board"], created_at: ago({ days: 33 }) },
  { knowledge_id: "kd-0002", title: "Revenue Recognition Policy", file_name: "revenue-recognition-policy.pdf", tags: ["finance", "policy"], created_at: ago({ days: 120 }) },
  { knowledge_id: "kd-0003", title: "Delegation of Authority Matrix", file_name: "delegation-of-authority.xlsx", tags: ["governance"], created_at: ago({ days: 75 }) },
  { knowledge_id: "kd-0004", title: "Larkspur Logistics — Carrier Rate Card 2026", file_name: "carrier-rate-card-2026.pdf", tags: ["operations", "pricing"], created_at: ago({ days: 41 }) },
  { knowledge_id: "kd-0005", title: "Data Glossary: Margin & KPI Definitions", file_name: "kpi-definitions.docx", tags: ["finance", "glossary"], created_at: ago({ days: 12 }) },
];
