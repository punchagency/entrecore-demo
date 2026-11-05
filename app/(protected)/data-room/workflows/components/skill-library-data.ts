// ─── Skill Library Data ───────────────────────────────────────────────────────
// Centralised source of truth for all action categories.
// Contains 15 comprehensive categories with exact action specifications.
// Nodes with 'x' denote parameterised actions configurable on the canvas.

export type ActionColor =
  | "blue"
  | "violet"
  | "indigo"
  | "cyan"
  | "teal"
  | "emerald"
  | "green"
  | "amber"
  | "orange"
  | "rose"
  | "pink"
  | "purple"
  | "slate"
  | "red"
  | "fuchsia";

export interface SkillAction {
  label: string;
  description?: string;
  hasVariable?: boolean;
}

export interface SkillCategory {
  id: string;
  title: string;
  color: ActionColor;
  /** Lucide icon name (string). Resolved in the component. */
  iconName: string;
  actions: SkillAction[];
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  // ─── 1. Communication & Messaging Actions ──────────────────────────────
  {
    id: "communication",
    title: "Communication & Messaging",
    color: "blue",
    iconName: "Mail",
    actions: [
      { label: "Send an email to x", description: "Send an email to a specified recipient", hasVariable: true },
      { label: "Send email using template x", description: "Send an email using a predefined template", hasVariable: true },
      { label: "Reply to email thread x", description: "Reply to an existing email conversation thread", hasVariable: true },
      { label: "Send Slack/Teams message to channel x", description: "Post a message to a team channel", hasVariable: true },
      { label: "Send direct message to user x", description: "Send a DM to a specific user", hasVariable: true },
      { label: "Post to Slack/Teams thread", description: "Reply within a specific communication thread" },
      { label: "Send SMS to x", description: "Send an SMS message to a mobile number", hasVariable: true },
      { label: "Create, update, or cancel calendar event", description: "Manage calendar scheduling and events" },
      { label: "Generate and send meeting summary", description: "Auto-generate and distribute meeting notes" },
      { label: "Add note or comment to thread x", description: "Append a note or comment to a conversation thread", hasVariable: true },
    ],
  },

  // ─── 2. Database & Data Store Actions ──────────────────────────────────
  {
    id: "database",
    title: "Database & Data Store",
    color: "violet",
    iconName: "Database",
    actions: [
      { label: "Insert record into table x", description: "Add a new record row to a database table", hasVariable: true },
      { label: "Update record x", description: "Modify an existing database record", hasVariable: true },
      { label: "Delete record x", description: "Remove a record from the database table", hasVariable: true },
      { label: "Upsert based on key x", description: "Insert or update record based on a unique key", hasVariable: true },
      { label: "Query table x", description: "Fetch records matching a condition from table", hasVariable: true },
      { label: "Execute SQL query x", description: "Run a raw or parameterized SQL statement", hasVariable: true },
      { label: "Run stored procedure x", description: "Execute a pre-defined database stored procedure", hasVariable: true },
      { label: "Create or alter table x", description: "Manage database table schema definitions", hasVariable: true },
      { label: "Validate dataset against rule x", description: "Check dataset integrity against a quality rule", hasVariable: true },
      { label: "Snapshot table x", description: "Create a point-in-time snapshot of a table", hasVariable: true },
    ],
  },

  // ─── 3. Data Pipeline & ELT/ETL Actions ────────────────────────────────
  {
    id: "pipeline",
    title: "Data Pipeline & ELT/ETL",
    color: "cyan",
    iconName: "GitMerge",
    actions: [
      { label: "Initiate pipeline x", description: "Start an automated data pipeline run", hasVariable: true },
      { label: "Retry or cancel pipeline x", description: "Manage active pipeline execution state", hasVariable: true },
      { label: "Trigger downstream pipeline", description: "Chain pipeline executions sequentially" },
      { label: "Run data quality checks", description: "Validate data hygiene before processing" },
      { label: "Apply remediation step x", description: "Fix detected data issues automatically", hasVariable: true },
      { label: "Move or copy data", description: "Transfer data assets between storage targets" },
      { label: "Create partition for date x", description: "Partition dataset by a specific date", hasVariable: true },
      { label: "Publish dataset", description: "Make a curated dataset available to consumers" },
      { label: "Refresh materialized view", description: "Rebuild a pre-computed database view" },
    ],
  },

  // ─── 4. Analytics, Metrics & KPI Actions ───────────────────────────────
  {
    id: "analytics",
    title: "Analytics, Metrics & KPI",
    color: "amber",
    iconName: "BarChart2",
    actions: [
      { label: "Recalculate metric x", description: "Recompute a business KPI or formula", hasVariable: true },
      { label: "Refresh dashboard x", description: "Force cache refresh for an analytics dashboard", hasVariable: true },
      { label: "Generate KPI report", description: "Create a structured KPI summary document" },
      { label: "Send KPI alert", description: "Notify stakeholders of KPI threshold breaches" },
      { label: "Run anomaly detection", description: "Detect statistical anomalies across metrics" },
      { label: "Export analytics results", description: "Export results to CSV, PDF, or cloud storage" },
      { label: "Trigger forecasting model", description: "Run predictive financial forecasting" },
      { label: "Log variance between forecast and actuals", description: "Track variance against forecasted values" },
    ],
  },

  // ─── 5. AI & Model-Driven Actions ──────────────────────────────────────
  {
    id: "ai",
    title: "AI & Model-Driven",
    color: "purple",
    iconName: "Sparkles",
    actions: [
      { label: "Run LLM prompt x", description: "Execute a language model prompt or template", hasVariable: true },
      { label: "Classify text/image/document", description: "Classify incoming content using AI models" },
      { label: "Generate summary or extraction", description: "Summarise or extract key entities from content" },
      { label: "Trigger autonomous agent x", description: "Launch an autonomous AI agent task", hasVariable: true },
      { label: "Request human approval", description: "Pause workflow for human review and sign-off" },
      { label: "Retrain model x", description: "Trigger an ML model retraining job", hasVariable: true },
      { label: "Deploy model version x", description: "Publish a new model version to inference", hasVariable: true },
      { label: "Evaluate model drift", description: "Detect if model performance or distribution degraded" },
      { label: "Generate remediation suggestions", description: "Get AI-generated fixes for data discrepancies" },
    ],
  },

  // ─── 6. Integration & API Actions ──────────────────────────────────────
  {
    id: "integration",
    title: "Integration & API",
    color: "teal",
    iconName: "Plug",
    actions: [
      { label: "Call API endpoint x", description: "Make an HTTP request to an external API", hasVariable: true },
      { label: "Send webhook to URL x", description: "POST JSON data to a webhook endpoint", hasVariable: true },
      { label: "Create or update CRM record", description: "Sync customer details with CRM system" },
      { label: "Create support ticket", description: "Open a new issue or support ticket" },
      { label: "Update ticket status", description: "Change the status or priority of a ticket" },
      { label: "Create invoice or payment request", description: "Generate billing and payment artifacts" },
      { label: "Sync data to external system", description: "Push dataset to a third-party service" },
      { label: "Trigger CI/CD job", description: "Start a build or deployment pipeline" },
      { label: "Create PR or push commit", description: "Interact directly with a git repository" },
    ],
  },

  // ─── 7. User Interaction & Human-in-the-Loop Actions ──────────────────
  {
    id: "human-loop",
    title: "User Interaction & Human-in-the-Loop",
    color: "orange",
    iconName: "Users",
    actions: [
      { label: "Request approval from user x", description: "Pause workflow and ask a user for sign-off", hasVariable: true },
      { label: "Assign task to team x", description: "Route a task to a designated team for completion", hasVariable: true },
      { label: "Create form for user input", description: "Generate a dynamic input form for reviewers" },
      { label: "Notify user to review item x", description: "Send an item review alert to a stakeholder", hasVariable: true },
      { label: "Pause workflow until response", description: "Wait for human action before continuing run" },
      { label: "Capture user feedback", description: "Collect and store human reviewer feedback" },
      { label: "Route item to review queue x", description: "Add an item to a specialized review queue", hasVariable: true },
    ],
  },

  // ─── 8. Business Process Actions ───────────────────────────────────────
  {
    id: "business",
    title: "Business Process",
    color: "emerald",
    iconName: "Briefcase",
    actions: [
      { label: "Create customer record", description: "Add a new customer to the business system" },
      { label: "Update opportunity stage", description: "Move deal to next stage in the pipeline" },
      { label: "Generate invoice", description: "Create a formal invoice document" },
      { label: "Mark invoice as paid", description: "Update invoice ledger payment status" },
      { label: "Create purchase order", description: "Raise a new PO for external vendor" },
      { label: "Update inventory", description: "Adjust stock levels and resource availability" },
      { label: "Trigger renewal workflow", description: "Start a contract renewal procedure" },
      { label: "Validate compliance rule", description: "Check workflow against regulatory compliance" },
      { label: "Generate contract", description: "Auto-generate an agreement or legal document" },
      { label: "Send onboarding sequence", description: "Initiate customer/partner onboarding sequence" },
    ],
  },

  // ─── 9. System & Infrastructure Actions ────────────────────────────────
  {
    id: "system",
    title: "System & Infrastructure",
    color: "slate",
    iconName: "Server",
    actions: [
      { label: "Scale service x", description: "Scale container or worker capacity up or down", hasVariable: true },
      { label: "Restart server or container", description: "Safely restart a compute resource" },
      { label: "Deploy version x", description: "Deploy a new application or service release", hasVariable: true },
      { label: "Rotate credentials", description: "Cycle API keys, passwords, or secrets" },
      { label: "Trigger backup", description: "Initiate an automated database/state backup" },
      { label: "Restore from backup", description: "Restore state from a verified snapshot" },
      { label: "Archive logs", description: "Move historical logs to cold storage" },
      { label: "Create incident", description: "Open an engineering incident ticket" },
      { label: "Run diagnostic script", description: "Execute an infrastructure diagnostic check" },
    ],
  },

  // ─── 10. File & Storage Actions ────────────────────────────────────────
  {
    id: "file-storage",
    title: "File & Storage",
    color: "indigo",
    iconName: "FolderOpen",
    actions: [
      { label: "Upload file to folder/bucket x", description: "Upload a file to cloud storage bucket or folder", hasVariable: true },
      { label: "Download file", description: "Retrieve a file from remote storage" },
      { label: "Move or copy file", description: "Reorganise files within cloud storage" },
      { label: "Rename file", description: "Change file name or path key" },
      { label: "Parse file using schema x", description: "Parse file structure using a defined schema", hasVariable: true },
      { label: "Validate file", description: "Ensure file meets integrity and size standards" },
      { label: "Convert file format", description: "Transform file between formats (PDF, CSV, XLSX)" },
      { label: "Extract data into table x", description: "Parse file contents directly into a database table", hasVariable: true },
    ],
  },

  // ─── 11. Web & Application Actions ─────────────────────────────────────
  {
    id: "web-app",
    title: "Web & Application",
    color: "pink",
    iconName: "Globe",
    actions: [
      { label: "Submit form x", description: "Programmatically submit a web or portal form", hasVariable: true },
      { label: "Update SaaS record", description: "Modify a record in an integrated SaaS app" },
      { label: "Toggle feature flag", description: "Enable or disable a feature flag toggle" },
      { label: "Log event", description: "Record an event in the application telemetry log" },
      { label: "Trigger A/B test variant", description: "Activate an experiment variant" },
      { label: "Clear cache", description: "Invalidate an application or CDN cache layer" },
      { label: "Send push notification", description: "Send a push notification to user devices" },
    ],
  },

  // ─── 12. Time-Based & Schedule Actions ─────────────────────────────────
  {
    id: "schedule",
    title: "Time-Based & Schedule",
    color: "rose",
    iconName: "Clock",
    actions: [
      { label: "Delay workflow", description: "Pause workflow execution for a set duration" },
      { label: "Schedule job", description: "Queue an asynchronous job for future execution" },
      { label: "Set recurring job", description: "Create a cron-based recurring schedule" },
      { label: "Enforce SLA timer", description: "Start an SLA compliance countdown timer" },
      { label: "Trigger escalation", description: "Escalate issue if SLA threshold is breached" },
    ],
  },

  // ─── 13. Location, Device & IoT Actions ────────────────────────────────
  {
    id: "iot",
    title: "Location, Device & IoT",
    color: "green",
    iconName: "Cpu",
    actions: [
      { label: "Send command to device x", description: "Issue a remote command to an IoT device", hasVariable: true },
      { label: "Update firmware", description: "Push an OTA firmware update to hardware" },
      { label: "Log sensor reading", description: "Record an environmental or hardware sensor point" },
      { label: "Trigger maintenance workflow", description: "Start a scheduled equipment maintenance run" },
      { label: "Notify operator", description: "Alert a facility or device operator" },
      { label: "Activate or deactivate device", description: "Control remote device power or active state" },
    ],
  },

  // ─── 14. Governance & Compliance Actions ───────────────────────────────
  {
    id: "governance",
    title: "Governance & Compliance",
    color: "fuchsia",
    iconName: "ShieldCheck",
    actions: [
      { label: "Log rule failure", description: "Record a governance or regulatory breach" },
      { label: "Auto-remediate issue", description: "Automatically apply compliance remediation" },
      { label: "Request compliance approval", description: "Route data request for compliance sign-off" },
      { label: "Update lineage graph", description: "Refresh the enterprise data lineage graph" },
      { label: "Enforce policy x", description: "Apply an organizational governance policy", hasVariable: true },
      { label: "Generate audit report", description: "Create a compliance audit trail report" },
      { label: "Notify data steward", description: "Alert the assigned data steward of an issue" },
      { label: "Quarantine dataset", description: "Isolate suspect data from downstream usage" },
    ],
  },

  // ─── 15. Document Abstraction Actions ──────────────────────────────────
  {
    id: "document",
    title: "Document Abstraction",
    color: "red",
    iconName: "FileText",
    actions: [
      { label: "Extract structured fields from document", description: "Parse key-value attributes from documents" },
      { label: "Classify document into type x", description: "Categorise document against a target type", hasVariable: true },
      { label: "Generate summary of document", description: "Summarise lengthy contracts or filings" },
      { label: "Detect entities, topics, or intents", description: "NLP-powered entity and intent detection" },
      { label: "Convert document to structured format", description: "Transform document to JSON, XML, or Parquet" },
      { label: "Validate document against schema x", description: "Check document structure against a defined schema", hasVariable: true },
      { label: "Compare document versions", description: "Diff two versions of a contract or filing" },
      { label: "Redact sensitive information", description: "Anonymise PII and sensitive data in documents" },
      { label: "Route document for human review", description: "Send document to the DRAT human review queue" },
      { label: "Store extracted fields into table x", description: "Persist extracted attributes into database table", hasVariable: true },
      { label: "Generate embeddings for semantic search", description: "Vectorise document sections for vector search" },
      { label: "Split document into chunks for processing", description: "Chunk long PDFs and docs with overlap" },
      { label: "Apply OCR to scanned document", description: "Convert scanned images or PDFs into text" },
      { label: "Normalize document metadata", description: "Standardise dates, currency, and file headers" },
      { label: "Tag document with labels x", description: "Apply classification tags and labels to document", hasVariable: true },
    ],
  },
];
