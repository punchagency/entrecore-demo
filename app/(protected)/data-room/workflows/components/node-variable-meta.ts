// ─── Node Variable Metadata & Helper Utilities ───────────────────────────
// Centralised definition for all action nodes containing an 'x' variable.
// Provides target labels, context-aware placeholders, suggestions, and helper utilities.

export interface ActionVariableMeta {
  hasVariable: boolean;
  variableName: string; // "x"
  targetLabel: string;
  placeholder: string;
  description: string;
  inputType: "text" | "email" | "sql" | "date" | "url" | "textarea";
  suggestions: string[];
}

/**
 * Checks if a given action label contains or refers to variable 'x'.
 */
export function hasVariableX(label: string): boolean {
  if (!label) return false;
  // Match trailing " x", " to x", " table x", " for x", etc., or standalone 'x'
  return /\b(to|into|table|record|rule|key|query|pipeline|step|date|metric|dashboard|prompt|agent|model|version|endpoint|URL|user|team|item|queue|service|folder\/bucket|schema|form|device|policy|type|labels)\s+x$/i.test(label) ||
    /\bx$/i.test(label.trim()) ||
    /\b(to|into|for)\s+x\b/i.test(label);
}

/**
 * Registry of action labels containing variable 'x' to their specific metadata.
 */
const VARIABLE_METADATA_REGISTRY: Record<string, Partial<ActionVariableMeta>> = {
  // ─── 1. Communication & Messaging ──────────────────────────────────────────
  "Send an email to x": {
    targetLabel: "Recipient Email Address",
    placeholder: "e.g. founder@acme.com or {{lead.email}}",
    description: "Specify the target email address or workflow variable reference.",
    inputType: "email",
    suggestions: ["{{trigger.payload.email}}", "{{contact.email}}", "alerts@entrecore.io", "finance@company.com"],
  },
  "Send email using template x": {
    targetLabel: "Email Template ID / Key",
    placeholder: "e.g. welcome-onboarding-v2",
    description: "Select or input the email template identifier from your provider.",
    inputType: "text",
    suggestions: ["welcome_onboarding", "monthly_investor_report", "kyc_approval_notice", "invoice_due_reminder"],
  },
  "Reply to email thread x": {
    targetLabel: "Email Thread ID / Message-ID",
    placeholder: "e.g. {{trigger.thread_id}} or th_892348",
    description: "Provide the conversation thread ID to append this reply to.",
    inputType: "text",
    suggestions: ["{{trigger.thread_id}}", "{{email.message_id}}", "{{lead.active_thread}}"],
  },
  "Send Slack/Teams message to channel x": {
    targetLabel: "Channel Name or Channel ID",
    placeholder: "e.g. #ops-alerts or C08234919",
    description: "Target Slack or Microsoft Teams channel for this broadcast.",
    inputType: "text",
    suggestions: ["#general", "#ops-alerts", "#investor-relations", "#engineering-alerts"],
  },
  "Send direct message to user x": {
    targetLabel: "User Handle or ID",
    placeholder: "e.g. @sarah_cfo or U09238472",
    description: "User handle, email, or Slack/Teams user ID to DM directly.",
    inputType: "text",
    suggestions: ["@manager", "{{trigger.user_id}}", "@data-steward", "{{assignee.slack_id}}"],
  },
  "Send SMS to x": {
    targetLabel: "Recipient Phone Number (E.164)",
    placeholder: "e.g. +14155552671 or {{user.phone}}",
    description: "Destination phone number with country code for SMS delivery.",
    inputType: "text",
    suggestions: ["{{trigger.payload.phone}}", "{{user.mobile_number}}", "+1 (555) 019-2834"],
  },
  "Add note or comment to thread x": {
    targetLabel: "Conversation / Ticket ID",
    placeholder: "e.g. tkt-98214 or {{trigger.ticket_id}}",
    description: "Internal thread or ticket ID where the comment will be posted.",
    inputType: "text",
    suggestions: ["{{trigger.ticket_id}}", "{{task.thread_id}}", "tkt-general-discussion"],
  },

  // ─── 2. Database & Data Store ──────────────────────────────────────────────
  "Insert record into table x": {
    targetLabel: "Target Database Table",
    placeholder: "e.g. customers, portfolio_metrics, audit_logs",
    description: "The name of the database table where rows will be inserted.",
    inputType: "text",
    suggestions: ["portfolio_companies", "audit_logs", "user_transactions", "daily_metrics"],
  },
  "Update record x": {
    targetLabel: "Record Identifier / Criteria",
    placeholder: "e.g. {{trigger.record_id}} or rec_98124",
    description: "Primary key or identifier of the record to update.",
    inputType: "text",
    suggestions: ["{{trigger.record_id}}", "{{payload.id}}", "uuid-primary-key"],
  },
  "Delete record x": {
    targetLabel: "Record Identifier to Remove",
    placeholder: "e.g. {{trigger.record_id}} or rec_98124",
    description: "Unique identifier of the record slated for deletion.",
    inputType: "text",
    suggestions: ["{{trigger.deleted_id}}", "{{payload.record_id}}"],
  },
  "Upsert based on key x": {
    targetLabel: "Conflict Target Key / Column",
    placeholder: "e.g. email, user_uuid, external_id",
    description: "Unique constraint column used to determine insert vs update.",
    inputType: "text",
    suggestions: ["email", "external_id", "company_id", "slug"],
  },
  "Query table x": {
    targetLabel: "Source Database Table",
    placeholder: "e.g. diligence_documents",
    description: "Table to query records from for downstream pipeline steps.",
    inputType: "text",
    suggestions: ["diligence_documents", "deals_pipeline", "investor_commitments", "users"],
  },
  "Execute SQL query x": {
    targetLabel: "Raw SQL Statement",
    placeholder: "e.g. SELECT * FROM transactions WHERE amount > 10000;",
    description: "SQL statement or parameterized query string to execute.",
    inputType: "sql",
    suggestions: [
      "SELECT * FROM deals WHERE status = 'active';",
      "UPDATE metrics SET recalculated_at = NOW();",
      "SELECT COUNT(*) AS total_rows FROM raw_documents;"
    ],
  },
  "Run stored procedure x": {
    targetLabel: "Stored Procedure Name",
    placeholder: "e.g. sp_reconcile_month_end",
    description: "Pre-compiled database routine or function to trigger.",
    inputType: "text",
    suggestions: ["sp_reconcile_month_end", "sp_archive_stale_records", "sp_compute_portfolio_nav"],
  },
  "Create or alter table x": {
    targetLabel: "Table Name",
    placeholder: "e.g. staging_vendor_invoices",
    description: "Target table schema definition to create or modify.",
    inputType: "text",
    suggestions: ["staging_vendor_invoices", "temp_embeddings_cache", "analytics_aggregates"],
  },
  "Validate dataset against rule x": {
    targetLabel: "Data Quality Rule Identifier",
    placeholder: "e.g. rule_no_null_emails or null_percentage < 0.05",
    description: "Integrity check or rule definition to evaluate.",
    inputType: "text",
    suggestions: ["rule_non_null_primary_keys", "rule_valid_email_syntax", "rule_positive_amount"],
  },
  "Snapshot table x": {
    targetLabel: "Table to Snapshot",
    placeholder: "e.g. cap_table_shareholders",
    description: "Table name to produce a point-in-time snapshot backup for.",
    inputType: "text",
    suggestions: ["cap_table_shareholders", "quarterly_financials", "audit_trails"],
  },

  // ─── 3. Data Pipeline & ELT/ETL ────────────────────────────────────────────
  "Initiate pipeline x": {
    targetLabel: "Pipeline Name or UUID",
    placeholder: "e.g. pipeline-drat-ingest or pipe-0192",
    description: "The identifier of the ETL/ELT pipeline to trigger.",
    inputType: "text",
    suggestions: ["pipeline-drat-ingest", "daily-warehouse-sync", "market-intelligence-feed"],
  },
  "Retry or cancel pipeline x": {
    targetLabel: "Active Pipeline Run ID",
    placeholder: "e.g. run-8921-prod or {{trigger.run_id}}",
    description: "The execution run ID to retry or cancel.",
    inputType: "text",
    suggestions: ["{{trigger.run_id}}", "run-latest-failed", "{{step.execution_id}}"],
  },
  "Apply remediation step x": {
    targetLabel: "Remediation Action / Policy",
    placeholder: "e.g. fill_median_values or quarantine_corrupt_rows",
    description: "Automated remediation handler to execute upon anomaly.",
    inputType: "text",
    suggestions: ["quarantine_corrupt_rows", "impute_median_values", "notify_data_owner"],
  },
  "Create partition for date x": {
    targetLabel: "Partition Date / Pattern",
    placeholder: "e.g. {{trigger.date}} or 2026-10-21",
    description: "Date string (YYYY-MM-DD) or dynamic expression for the partition.",
    inputType: "date",
    suggestions: ["{{trigger.date}}", "{{workflow.run_date}}", "2026-10-21"],
  },

  // ─── 4. Analytics, Metrics & KPI ───────────────────────────────────────────
  "Recalculate metric x": {
    targetLabel: "Business Metric Key",
    placeholder: "e.g. net_burn_rate, mrr, irr",
    description: "Key of the KPI or metric to recalculate across the corpus.",
    inputType: "text",
    suggestions: ["net_mrr", "churn_rate_pct", "portfolio_irr", "customer_ltv"],
  },
  "Refresh dashboard x": {
    targetLabel: "Dashboard ID or Slug",
    placeholder: "e.g. executive-overview or dash-fin-2026",
    description: "Target dashboard slug to invalidate cache and refresh.",
    inputType: "text",
    suggestions: ["executive-overview", "investor-portal-kpis", "diligence-tracking"],
  },

  // ─── 5. AI & Model-Driven ──────────────────────────────────────────────────
  "Run LLM prompt x": {
    targetLabel: "Prompt Template or Instructions",
    placeholder: "e.g. Extract company revenue and valuation from: {{doc.text}}",
    description: "Prompt or prompt template with variables to execute with LLM.",
    inputType: "textarea",
    suggestions: [
      "Analyze the risk factors in this contract: {{document.content}}",
      "Extract structured financial metrics into JSON: {{input.text}}",
      "Summarize executive changes announced in the earnings transcript: {{trigger.text}}"
    ],
  },
  "Trigger autonomous agent x": {
    targetLabel: "Autonomous Agent Name",
    placeholder: "e.g. financial-auditor-agent or kyc-researcher",
    description: "Agent persona or workflow orchestrator to dispatch.",
    inputType: "text",
    suggestions: ["financial-auditor-agent", "due-diligence-researcher", "contract-redline-agent"],
  },
  "Retrain model x": {
    targetLabel: "Model Registry Name / Version",
    placeholder: "e.g. drat-classifier-v3 or doc-embedder-large",
    description: "Model registry identifier slated for re-training.",
    inputType: "text",
    suggestions: ["drat-classifier-v3", "sentiment-predictor", "anomaly-detector-core"],
  },
  "Deploy model version x": {
    targetLabel: "Target Model Version Tag",
    placeholder: "e.g. v2.4.0-prod or sha-7c82a1",
    description: "Target release version or commit SHA to deploy to serving.",
    inputType: "text",
    suggestions: ["v2.4.0-prod", "v3.0.0-rc1", "champion-model-latest"],
  },

  // ─── 6. Integration & API ──────────────────────────────────────────────────
  "Call API endpoint x": {
    targetLabel: "API Endpoint URL",
    placeholder: "e.g. https://api.stripe.com/v1/charges or {{env.API_URL}}",
    description: "Full URL or path for the external HTTP request.",
    inputType: "url",
    suggestions: [
      "https://api.entrecore.io/v1/sync",
      "https://api.hubapi.com/crm/v3/objects/contacts",
      "{{env.BACKEND_API_URL}}/ingest"
    ],
  },
  "Send webhook to URL x": {
    targetLabel: "Destination Webhook URL",
    placeholder: "e.g. https://hooks.slack.com/services/xxx or https://webhook.site/xxx",
    description: "External HTTP endpoint to send JSON payload to.",
    inputType: "url",
    suggestions: [
      "https://hooks.slack.com/workflows/T00/B00/xxx",
      "https://api.external-partner.com/events",
      "{{trigger.callback_url}}"
    ],
  },

  // ─── 7. User Interaction & Human-in-the-Loop ──────────────────────────────
  "Request approval from user x": {
    targetLabel: "Approver Email or User ID",
    placeholder: "e.g. investment-committee@firm.com or {{lead.partner}}",
    description: "Designated user or email required to sign off on the step.",
    inputType: "email",
    suggestions: ["compliance-officer@entrecore.io", "{{portfolio.lead_partner}}", "cfo@company.com"],
  },
  "Assign task to team x": {
    targetLabel: "Team or Department",
    placeholder: "e.g. legal-diligence, ops-tier-1, underwriting",
    description: "Team identifier or group queue assigned to this task.",
    inputType: "text",
    suggestions: ["legal-diligence", "financial-analysts", "compliance-team", "devops"],
  },
  "Notify user to review item x": {
    targetLabel: "Review Item Identifier",
    placeholder: "e.g. doc-9823 or {{trigger.extracted_doc_id}}",
    description: "Object or document ID the user is prompted to inspect.",
    inputType: "text",
    suggestions: ["{{trigger.document_id}}", "audit-finding-892", "{{payload.submission_id}}"],
  },
  "Route item to review queue x": {
    targetLabel: "Target Review Queue",
    placeholder: "e.g. high-risk-queue or unclassified-docs",
    description: "Designated queue for human-in-the-loop triaging.",
    inputType: "text",
    suggestions: ["high-risk-review", "kyc-escalations", "ocr-exceptions-queue"],
  },

  // ─── 9. System & Infrastructure ────────────────────────────────────────────
  "Scale service x": {
    targetLabel: "Service / Worker Cluster Name",
    placeholder: "e.g. worker-drat-ocr or vector-indexer-pool",
    description: "Service name or container deployment to scale.",
    inputType: "text",
    suggestions: ["worker-drat-ocr", "api-gateway-cluster", "pdf-extractor-pool"],
  },
  "Deploy version x": {
    targetLabel: "Release Version Tag",
    placeholder: "e.g. v2026.10.4 or release-stable",
    description: "Semantic release tag or Docker image tag to deploy.",
    inputType: "text",
    suggestions: ["v2026.10.4", "release-candidate-1", "prod-latest"],
  },

  // ─── 10. File & Storage ────────────────────────────────────────────────────
  "Upload file to folder/bucket x": {
    targetLabel: "Folder / S3 Bucket Path",
    placeholder: "e.g. s3://entrecore-data-room/raw-uploads or /vault/contracts",
    description: "Target cloud bucket or directory path to store files.",
    inputType: "text",
    suggestions: [
      "s3://entrecore-data-room/raw-uploads",
      "gs://investor-documents/quarterly",
      "/data-room/confidential-contracts"
    ],
  },
  "Parse file using schema x": {
    targetLabel: "Schema Name or URI",
    placeholder: "e.g. financial-statement-schema-v2.json",
    description: "Schema definition to validate and structure the parsed content.",
    inputType: "text",
    suggestions: ["financial-statement-v2", "term-sheet-schema", "sec-10k-template"],
  },
  "Extract data into table x": {
    targetLabel: "Destination Database Table",
    placeholder: "e.g. extracted_portfolio_metrics",
    description: "Target database table where parsed rows will be saved.",
    inputType: "text",
    suggestions: ["extracted_portfolio_metrics", "staged_invoice_items", "parsed_cap_tables"],
  },

  // ─── 11. Web & Application ─────────────────────────────────────────────────
  "Submit form x": {
    targetLabel: "Form ID or Endpoint",
    placeholder: "e.g. form-vendor-onboarding or /forms/lead-submit",
    description: "Identifier or URL of the web form to programmatically submit.",
    inputType: "text",
    suggestions: ["form-vendor-onboarding", "form-diligence-submission", "portal-kyc-intake"],
  },

  // ─── 13. Location, Device & IoT ────────────────────────────────────────────
  "Send command to device x": {
    targetLabel: "Device Serial / Identifier",
    placeholder: "e.g. edge-node-0819 or {{device.uuid}}",
    description: "Target IoT gateway or peripheral device identifier.",
    inputType: "text",
    suggestions: ["edge-gateway-alpha", "vault-door-sensor-01", "{{trigger.device_id}}"],
  },

  // ─── 14. Governance & Compliance ───────────────────────────────────────────
  "Enforce policy x": {
    targetLabel: "Governance Policy Identifier",
    placeholder: "e.g. POL-GDPR-RETENTION-90D or POL-SOX-ACCESS-CONTROL",
    description: "Organizational compliance policy to enforce on data assets.",
    inputType: "text",
    suggestions: ["POL-GDPR-RETENTION-90D", "POL-HIPAA-PII-REDACTION", "POL-SOC2-ACCESS-EXPIRY"],
  },

  // ─── 15. Document Abstraction ──────────────────────────────────────────────
  "Classify document into type x": {
    targetLabel: "Target Document Type / Category",
    placeholder: "e.g. invoice, contract, pitch_deck, term_sheet",
    description: "Expected document category to classify and tag against.",
    inputType: "text",
    suggestions: ["invoice", "master-services-agreement", "cap-table", "term-sheet", "w9-tax-form"],
  },
  "Validate document against schema x": {
    targetLabel: "Document Schema Key",
    placeholder: "e.g. audited-financials-schema-v1",
    description: "Schema to assert document structure and required fields.",
    inputType: "text",
    suggestions: ["audited-financials-schema", "series-a-term-sheet", "nda-standard-schema"],
  },
  "Store extracted fields into table x": {
    targetLabel: "Target Database Table",
    placeholder: "e.g. extracted_document_entities",
    description: "Database table where extracted key-value attributes are persisted.",
    inputType: "text",
    suggestions: ["extracted_document_entities", "diligence_structured_data", "cap_table_lines"],
  },
  "Tag document with labels x": {
    targetLabel: "Document Labels / Tags (comma-separated)",
    placeholder: "e.g. confidential, Q4-2026, Series-A",
    description: "One or more metadata tags to attach to the document.",
    inputType: "text",
    suggestions: ["confidential, audited", "series-b, diligence", "urgent-review, compliance"],
  },
};

/**
 * Returns complete variable metadata for an action.
 */
export function getActionVariableMeta(actionLabel: string): ActionVariableMeta {
  const isVar = hasVariableX(actionLabel);
  const matched = VARIABLE_METADATA_REGISTRY[actionLabel];

  if (matched) {
    return {
      hasVariable: true,
      variableName: "x",
      targetLabel: matched.targetLabel || "Variable Parameter (x)",
      placeholder: matched.placeholder || "Enter value or {{variable}}",
      description: matched.description || "Configure and bind the variable parameter for this action node.",
      inputType: matched.inputType || "text",
      suggestions: matched.suggestions || ["{{trigger.payload}}", "{{step_1.output}}"],
    };
  }

  // Fallback for any other label that ends with or contains 'x'
  if (isVar) {
    // Derive a reasonable target label from the text before 'x'
    const cleanPrefix = actionLabel.replace(/\s+x$/i, "").replace(/^.*(to|into|against|for|with)\s+/i, "");
    const derivedTarget = cleanPrefix
      ? `${cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1)} (x)`
      : "Variable Value (x)";

    return {
      hasVariable: true,
      variableName: "x",
      targetLabel: derivedTarget,
      placeholder: "e.g. value, identifier, or {{variable}}",
      description: `Provide the specific target for '${actionLabel}'.`,
      inputType: "text",
      suggestions: ["{{trigger.data}}", "{{payload.id}}", "{{env.DEFAULT_VALUE}}"],
    };
  }

  return {
    hasVariable: false,
    variableName: "",
    targetLabel: "",
    placeholder: "",
    description: "",
    inputType: "text",
    suggestions: [],
  };
}

/**
 * Formats a node label dynamically by injecting the confirmed variable value into the 'x' slot.
 */
export function formatDisplayLabelWithVariable(
  originalLabel: string,
  variableValue?: string,
  isConfirmed?: boolean
): string {
  if (!originalLabel) return "";
  if (!hasVariableX(originalLabel)) return originalLabel;

  if (isConfirmed && variableValue && variableValue.trim().length > 0) {
    // Replace the trailing " x" with the variable value
    if (/\s+x$/i.test(originalLabel)) {
      return originalLabel.replace(/\s+x$/i, ` [${variableValue.trim()}]`);
    }
    // Replace inline " x " or " x"
    return originalLabel.replace(/\bx\b/i, `[${variableValue.trim()}]`);
  }

  return originalLabel;
}
