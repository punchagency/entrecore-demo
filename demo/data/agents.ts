import { ago } from "./time";

/**
 * Demo agents ("Guides" in the current UI). Shapes follow GET /data/guides and
 * GET /data/guides/{id}/architecture on the backend (routers/agent.py,
 * agent/guide_architecture.py at origin/dev 2026-11-02).
 */

// Step and tool catalogs copied from agent/guide_architecture.py so the
// architecture diagram matches what a real run does.
export const ARCHITECTURE_STEPS = [
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

const TOOLKITS: Record<string, { name: string; description: string }> = {
  lineage: { name: "Lineage toolkit", description: "Traces how datasets and tables connect, using the lineage graph." },
  bigquery: { name: "BigQuery toolkit", description: "Queries the guide's BigQuery datasets with SQL." },
  netsuite: { name: "NetSuite toolkit", description: "Reads the guide's NetSuite data." },
  airtable: { name: "Airtable toolkit", description: "Reads the guide's Airtable data." },
  notion: { name: "Notion toolkit", description: "Reads the guide's Notion content." },
  business_rules: { name: "Business rules", description: "Looks up and manages business rules on the guide's datasets." },
};

const ALWAYS_ON_TOOLS = [
  { id: "dataset_listing", name: "Dataset explorer", description: "Lists the tables and columns of the guide's datasets." },
  { id: "knowledge_search", name: "Knowledge search", description: "Searches the company's uploaded documents and knowledge base." },
  { id: "integration_mapping", name: "Integration mapping", description: "Helps map fields when connecting data sources." },
  { id: "feedback", name: "Feedback", description: "Records feedback on the guide's answers." },
];

export const DATASETS = {
  finance: { id: "ds-netsuite-finance", name: "NetSuite — Consolidated Finance", source: "netsuite" },
  warehouse: { id: "ds-bq-ops-warehouse", name: "BigQuery — Operations Warehouse", source: "bigquery" },
  contracts: { id: "ds-airtable-contracts", name: "Airtable — Vendor Contracts", source: "airtable" },
  policies: { id: "ds-notion-policies", name: "Notion — Policies & Procedures", source: "notion" },
} as const;

type DatasetKey = keyof typeof DATASETS;

interface ScriptedReply {
  /** Lower-case words; the reply is used when any of them appears in the question. */
  keywords: string[];
  reply: string;
}

export interface DemoAgent {
  id: string;
  name: string;
  description: string;
  model_type: string;
  model_version: string;
  status: "active" | "inactive";
  agent_persona: string;
  specialization: string;
  technical_level: string;
  datasets: DatasetKey[];
  actions: string[];
  toolkits: string[];
  created: { days: number };
  updated: { days?: number; hours?: number };
  replies: ScriptedReply[];
  fallback: string;
}

export const AGENTS: DemoAgent[] = [
  {
    id: "a1d4e7c2-0f5b-4a6e-9d3c-1b2a3c4d5e01",
    name: "Revenue Analyst",
    description:
      "Answers revenue, margin and bookings questions across all six Larkspur businesses from consolidated NetSuite and warehouse data.",
    model_type: "data-analyst",
    model_version: "3.2.0",
    status: "active",
    agent_persona: "financial_analyst",
    specialization: "revenue_analytics",
    technical_level: "intermediate",
    datasets: ["finance", "warehouse"],
    actions: ["trend-analysis", "correlation-analysis", "report-generation"],
    toolkits: ["netsuite", "bigquery", "business_rules"],
    created: { days: 96 },
    updated: { hours: 3 },
    replies: [
      {
        keywords: ["revenue", "sales", "bookings", "quarter", "q3"],
        reply:
          "Q3 consolidated revenue was $48.2M, up 11.4% year over year.\n\nBy business:\n• Larkspur Logistics: $17.9M (+14.2%)\n• Halden Precision Parts: $11.3M (+9.8%)\n• Corvin Facility Services: $8.6M (+6.1%)\n• Other three businesses: $10.4M (+12.7%)\n\nLogistics drove most of the growth: two new freight contracts went live in July. Source: NetSuite consolidated income statement, reconciled against the warehouse fct_revenue table (difference under 0.1%).",
      },
      {
        keywords: ["margin", "gross", "ebitda", "profit"],
        reply:
          "Gross margin was 34.8% in Q3, down 0.9 points from Q2.\n\nThe drop is concentrated in Halden Precision Parts, where raw-material costs rose 6% while prices were fixed under annual contracts. Excluding Halden, margin was flat at 36.1%.\n\nI calculated this with the \"Gross margin\" business rule (revenue net of returns, cost of goods including freight-in), so it matches the board-pack definition.",
      },
      {
        keywords: ["customer", "churn", "top", "largest"],
        reply:
          "Your top five customers made up 27% of Q3 revenue, up from 24% a year ago. The largest, Meridale Grocers, accounted for 8.1% on its own. No top-20 customer left this quarter; two reduced volume by more than 20% and are flagged for account review.",
      },
    ],
    fallback:
      "I can answer questions on revenue, margin, bookings and customers across the six Larkspur businesses, using consolidated NetSuite data and the operations warehouse. Try: \"How did Q3 revenue compare to last year?\"",
  },
  {
    id: "a1d4e7c2-0f5b-4a6e-9d3c-1b2a3c4d5e02",
    name: "Data Quality Sentinel",
    description:
      "Watches the operations warehouse for broken rules, late loads and anomalies, and explains each issue with its lineage.",
    model_type: "data-quality",
    model_version: "3.2.0",
    status: "active",
    agent_persona: "data_steward",
    specialization: "data_quality",
    technical_level: "advanced",
    datasets: ["warehouse", "finance"],
    actions: ["data-quality-check", "anomaly-detection", "data-validation"],
    toolkits: ["bigquery", "lineage", "business_rules"],
    created: { days: 81 },
    updated: { hours: 1 },
    replies: [
      {
        keywords: ["issue", "issues", "problem", "quality", "broken", "fail"],
        reply:
          "There are 3 open data-quality issues; 1 is critical.\n\n1. Critical: fct_shipments.delivered_at is empty for 4.2% of rows loaded since Tuesday, which breaks the rule \"Delivered shipments have a delivery date\". Lineage traces it to the TMS connector's new API version.\n2. dim_customer.tax_id has 18 duplicates across Halden and Corvin. They look like real shared customers, so I suggest merging them into golden records.\n3. The NetSuite sync ran 2 hours late overnight. All data is present.",
      },
      {
        keywords: ["lineage", "where", "source", "upstream"],
        reply:
          "fct_shipments is built from TMS → raw.tms_events → stg_shipments → fct_shipments, joined with dim_customer from NetSuite. Three data products depend on it: On-time Delivery, Freight Cost per Lane and Customer 360.",
      },
    ],
    fallback:
      "I monitor rule checks, freshness and anomalies on Larkspur's warehouse and finance data. Try: \"What data-quality issues are open?\"",
  },
  {
    id: "a1d4e7c2-0f5b-4a6e-9d3c-1b2a3c4d5e03",
    name: "Document Intake Agent",
    description:
      "Reads incoming invoices, W-9s and contracts, extracts their fields with the Entrecore extraction model, and files them to the right entity.",
    model_type: "automation",
    model_version: "2.0.1",
    status: "active",
    agent_persona: "operations_specialist",
    specialization: "document_processing",
    technical_level: "intermediate",
    datasets: ["contracts", "policies"],
    actions: ["data-validation", "report-generation"],
    toolkits: ["airtable", "notion"],
    created: { days: 64 },
    updated: { hours: 6 },
    replies: [
      {
        keywords: ["today", "processed", "documents", "invoices", "how many"],
        reply:
          "I processed 142 documents in the last 24 hours.\n\n• 118 invoices: all fields extracted; 6 sent to review because the total didn't match the line items\n• 17 W-9s: filed to their vendor records\n• 7 contracts: key terms extracted (term, renewal date, notice period)\n\nAverage time per document: 3.1 seconds.",
      },
    ],
    fallback:
      "I process invoices, tax forms and contracts as they arrive: I extract their fields, check them and file them to the right entity. Try: \"What did you process today?\"",
  },
  {
    id: "a1d4e7c2-0f5b-4a6e-9d3c-1b2a3c4d5e04",
    name: "Board Pack Insights",
    description:
      "Drafts the monthly board-pack commentary: what moved, why, and what to watch, using the governed KPI data products.",
    model_type: "insight-generator",
    model_version: "3.2.0",
    status: "inactive",
    agent_persona: "executive_advisor",
    specialization: "executive_reporting",
    technical_level: "basic",
    datasets: ["finance", "warehouse"],
    actions: ["automated-insights", "trend-analysis", "report-generation"],
    toolkits: ["netsuite", "bigquery"],
    created: { days: 40 },
    updated: { days: 2, hours: 4 },
    replies: [],
    fallback:
      "Draft commentary for October: Revenue grew 11% year over year, led by Logistics. Gross margin slipped 0.9 points on Halden input costs; pricing resets in January should recover about half of that. To watch: customer concentration, with the top 5 customers now at 27% of revenue.",
  },
  {
    id: "a1d4e7c2-0f5b-4a6e-9d3c-1b2a3c4d5e05",
    name: "Vendor Contract Reviewer",
    description: "Answers questions about vendor contracts: renewal dates, notice periods, pricing terms and obligations.",
    model_type: "custom",
    model_version: "3.2.0",
    status: "inactive",
    agent_persona: "legal_analyst",
    specialization: "contract_review",
    technical_level: "intermediate",
    datasets: ["contracts"],
    actions: ["data-validation"],
    toolkits: ["airtable"],
    created: { days: 22 },
    updated: { days: 5 },
    replies: [
      {
        keywords: ["renew", "renewal", "expire", "notice"],
        reply:
          "4 vendor contracts renew in the next 90 days, and 2 have notice deadlines within the next 2 weeks:\n\n• Atlas Fleet Leasing: auto-renews in 41 days; 30-day notice deadline in 11 days\n• Brightwave Telecom: auto-renews in 58 days; 45-day notice deadline in 13 days\n• Northgate Insurance Brokers: renews in 74 days (60-day notice)\n• Quarry Lane Software: renews in 88 days (30-day notice)",
      },
    ],
    fallback: "Ask me about renewals, notice periods or pricing terms across Larkspur's vendor contracts.",
  },
];

/** The agent as GET /data/guides returns it. */
export function toGuide(agent: DemoAgent) {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    model_type: agent.model_type,
    model_version: agent.model_version,
    model_metadata: JSON.stringify({ memory_enabled: true, chat_enabled: true, use_tools: true }),
    status: agent.status as string,
    agent_persona: agent.agent_persona,
    specialization: agent.specialization,
    technical_level: agent.technical_level,
    created_at: ago(agent.created),
    updated_at: ago(agent.updated),
    datasets: agent.datasets.map((key): { id: string; name: string } => ({ id: DATASETS[key].id, name: DATASETS[key].name })),
    actions: agent.actions.map((id) => ({ id, name: id, description: "" })),
  };
}

/** GET /data/guides/{id}/architecture. */
export function toArchitecture(agent: DemoAgent) {
  const toolkits = agent.toolkits.map((id) => ({
    id,
    ...TOOLKITS[id],
    data_products: agent.datasets.filter((key) => DATASETS[key].source === id).map((key) => DATASETS[key].name),
    always_on: false,
  }));
  return {
    guide_type: "dataset" as const,
    model_type: agent.model_type,
    model_version: agent.model_version,
    steps: ARCHITECTURE_STEPS.map((step, index) => ({ ...step, order: index + 1 })),
    tools: [...toolkits, ...ALWAYS_ON_TOOLS.map((tool) => ({ ...tool, data_products: [], always_on: true }))],
    memory: { enabled: true },
  };
}

/** The scripted answer for a question: first keyword match, else the agent's fallback. */
export function scriptedReply(agent: DemoAgent, question: string): string {
  const text = question.toLowerCase();
  return agent.replies.find((r) => r.keywords.some((word) => text.includes(word)))?.reply ?? agent.fallback;
}
