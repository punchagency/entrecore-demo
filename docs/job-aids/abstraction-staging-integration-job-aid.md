# Entrecore Job Aid: Abstraction → Staging → Integration

**Audience:** New or inexperienced Entrecore users  
**Purpose:** Walk through the full document abstraction workflow end to end — from source setup through staging and integration execution.  
**Demo workflow used in screenshots:** `Document Abstraction` (`/abstraction/wf-001`)

---

## How to use this guide

| Use case                 | How                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| **Onboarding training**  | Work through Phases 1–4 in order; complete each checkpoint before continuing.                        |
| **Day-to-day reference** | Jump to the phase you need (tabs on the workflow detail page mirror these phases).                   |
| **Google Docs**          | Copy sections below; insert images from `docs/job-aids/screenshots/` (filenames match step numbers). |

### Glossary (plain language)

| Term              | What it means                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| **Abstraction**   | Extracting structured data (entities, fields, clauses) from documents using OCR and your protocol rules. |
| **Protocol**      | The rule set that defines _what_ to extract and _how_ to validate it.                                    |
| **Pipeline**      | Where you upload documents, run OCR, and monitor processing status.                                      |
| **Staging table** | A temporary database table holding OCR results, ready to map into a target system.                       |
| **Integrate**     | Mapping staged columns to a destination table and running the integration job.                           |
| **HITL**          | Human-in-the-loop — a reviewer approves AI-suggested field mappings before activation.                   |

### Guided demo scenario

Use workflow **Document Abstraction** and sample documents your team already uses for legal/employee record extraction. Expected staging table pattern:

`ocr_staging_employee_records_extraction_config_test`

---

## Phase overview

```text
Phase 1: Abstraction Setup     → Open workflow, configure protocol & pipeline rules
Phase 2: Staging Layer         → Upload docs, OCR, stage table for Integrate
Phase 3: Integration Mapping   → Connectors, AI suggest mappings, edit & review
Phase 4: Execution & Validation → Activate, run, verify results
```

**Lifecycle tabs** on `/abstraction/[id]`:

`Workflow` · `Protocol` · `Pipeline` · `OCR Review` · `Integrate` · `Results`

---

# Phase 1 — Abstraction Setup

## Step 1.1 — Open Abstraction Workflows

**Purpose:** Find and open the workflow you will run.

**UI actions:**

1. In the left sidebar, click **Abstraction**.
2. You land on **Abstraction Workflows** (`/abstraction`).

**Expected outcome:** Hero banner **Legal Document Abstraction**, metrics, and **Configured Workflows** table.

**Screenshot:** `screenshots/01-abstraction-landing.png`

| #   | Callout | Element                                                   |
| --- | ------- | --------------------------------------------------------- |
| 1   | Sidebar | **Abstraction** (highlighted when active)                 |
| 2   | Hero    | **Upload Documents**, **Configure Protocol**, **Refresh** |
| 3   | Table   | Click any workflow row to open its detail page            |

> **What this means:** The landing page is your hub. You do not run OCR from here — open a workflow first.

**✓ Checkpoint:** You can see at least one workflow with status **Active** or **In Development**.

**Common mistake:** Clicking **Upload Documents** on the landing hero without opening a workflow.  
**Fix:** Click a row (e.g. **Document Abstraction**) → use **Pipeline** tab to upload.

---

## Step 1.2 — Open a workflow

**Purpose:** Enter the workflow workspace where all lifecycle tabs live.

**UI actions:**

1. In **Configured Workflows**, locate **Document Abstraction** (or your workflow).
2. Click anywhere on the row.
3. URL becomes `/abstraction/wf-001` (your ID may differ).

**Expected outcome:** Workflow name, status badge, four KPI cards, and six lifecycle tabs.

**Screenshot:** `screenshots/02-workflow-detail-overview.png`

| #   | Callout | Element                                                      |
| --- | ------- | ------------------------------------------------------------ |
| 1   | Header  | Back arrow → returns to `/abstraction`                       |
| 2   | KPIs    | Success Rate, Records Processed, Processing Time, Error Rate |
| 3   | Tabs    | Workflow, Protocol, Pipeline, OCR Review, Integrate, Results |

**✓ Checkpoint:** Tab bar is visible; **Workflow** tab shows the pipeline builder (drag-and-drop or beautiful view).

---

## Step 1.3 — Configure extraction protocol (source rules)

**Purpose:** Define _what_ the system extracts from documents (entities, clauses, validation).

**UI actions:**

1. Click the **Protocol** tab.
2. Set **Protocol name** and **Description**.
3. Add or edit **entities** and **clauses** (search fields: **Search entities...**, **Search clauses...**).
4. Save protocol changes using the editor save actions.

**Expected outcome:** A named protocol aligned with your document type (e.g. employee records, contract clauses).

**Screenshot:** `screenshots/03-protocol-tab.png`

> **What this means:** The protocol is your “abstraction rules.” Pipeline uploads use an OCR **configuration** tied to this protocol.

**✓ Checkpoint:** Protocol has a clear name; at least one entity or clause is defined for your use case.

**Common mistake:** Skipping protocol setup and uploading with the wrong OCR configuration.  
**Fix:** Confirm **Choose configuration for this upload** on the Pipeline tab matches your protocol.

---

## Step 1.4 — Review workflow structure (optional)

**Purpose:** Understand or adjust the high-level processing DAG (intake → OCR → classification → validation → integration).

**UI actions:**

1. Click the **Workflow** tab.
2. Toggle **Edit (Drag & Drop)** vs **← Beautiful View** if needed.
3. Optionally click **Run Pipeline** to execute the configured DAG.

**Expected outcome:** Visual flow from document intake through integration/export nodes.

**Try it yourself:** Identify where **OCR Extraction** and **Integration** nodes sit in your workflow.

**Power tip:** Use drag-and-drop only when you need custom branching; default layouts work for most legal OCR flows.

---

# Phase 2 — Staging Layer Configuration

## Step 2.1 — Upload documents on Pipeline

**Purpose:** Send source documents into OCR and extraction using the correct configuration.

**UI actions:**

1. Click the **Pipeline** tab.
2. Review stat cards: **Total Documents**, **Processing**, **Pending Review**, **Avg. OCR Accuracy**.
3. In the upload zone, click **Upload** or drag files.
4. In **Choose configuration for this upload**, select the protocol/configuration for this batch.
5. Wait for status badges: **Uploading** → **OCR Processing** → **Extracting** → **Completed** or **Needs Review**.

**Expected outcome:** Documents appear in **Document Queue** with progressing status.

**Screenshot:** `screenshots/04-pipeline-tab-staging.png`

| #   | Callout    | Element                                    |
| --- | ---------- | ------------------------------------------ |
| 1   | Stats      | Document pipeline metrics                  |
| 2   | Stage card | **Stage for Integrate** (violet card)      |
| 3   | Queue      | Per-document **Review** / **View** actions |
| 4   | Upload     | File drop zone + configuration selector    |

**✓ Checkpoint:** At least one document shows **Completed** or **Needs Review** (not stuck on **Failed**).

**Common mistake:** Staging before OCR finishes.  
**Fix:** Wait for **Completed** or complete **OCR Review** first; staging needs a populated staging table.

---

## Step 2.2 — Human review (when required)

**Purpose:** Correct low-confidence extractions before data lands in staging.

**UI actions:**

1. For documents with **Needs Review**, click **Review** (opens **OCR Review** tab) or go to **OCR Review** directly.
2. Walk through extracted fields; approve, correct, or flag items.
3. Under **Staging**, open **Select Connector** and pick a BigQuery (or configured) connector.
4. Click **Complete Review** (shows **Submitting...** while saving).

**Expected outcome:** Review counters update (**reviewed** / **pending**); connector staged for integration handoff.

**Screenshot:** `screenshots/05-ocr-review-tab.png`

**✓ Checkpoint:** **Complete Review** succeeds; badge shows **Staged** when done.

**Common mistake:** Leaving **Select Connector** empty.  
**Fix:** Choose the staging connector your company uses for OCR tables.

---

## Step 2.3 — Stage data for Integrate

**Purpose:** Push the OCR **staging table** into the Integrate tab so mapping can begin.

**UI actions:**

1. Return to **Pipeline** tab.
2. In **Stage for Integrate**:
   - Read **Last staged:** line if you re-stage.
   - Optionally set **Source table override (optional)** (only if auto-detection is wrong).
3. Click **Stage & open Integrate** (button shows **Staging...** while working).

**Expected outcome:**

- Toast success; app switches to **Integrate** tab.
- **Source Table** on Integrate pre-fills from staged data.
- Hint text: `Staged from Pipeline (timestamp): {table}`

**Screenshot:** `screenshots/04-pipeline-tab-staging.png` (callout 2 — violet **Stage & open Integrate** button)

**✓ Checkpoint:** Integrate tab opens with a non-empty **Source Table** field.

**Common mistake:** Clicking stage with zero completed OCR runs.  
**Fix:** Error: _“No staging table found. Complete OCR on a document…”_ — finish upload + OCR first.

### Schema alignment & naming

| Check        | What to verify                                                          |
| ------------ | ----------------------------------------------------------------------- |
| Table name   | Matches `ocr_staging_{workflow}_{config}` pattern or your override      |
| Column names | Stable after protocol changes (renaming breaks existing mappings)       |
| Validation   | Spot-check staged rows in BigQuery (or source connector) before mapping |

---

# Phase 3 — Integration Mapping

## Step 3.1 — Integration setup

**Purpose:** Connect staged source data to a destination system.

**UI actions:**

1. On **Integrate** tab, find **Integration Setup**.
2. Fill in:

| Field                     | Guidance                                            |
| ------------------------- | --------------------------------------------------- |
| **Job Name**              | Descriptive slug (default: `ocr_staging_to_target`) |
| **Source Table**          | Auto-filled after staging; verify table name        |
| **Source Connector**      | e.g. `bigquery`                                     |
| **Destination Connector** | e.g. `airtable`                                     |
| **Destination Table**     | Pick from dropdown when loaded                      |

3. Confirm pipeline hint shows your staged table and timestamp.

**Expected outcome:** All required fields populated; flow step indicator at **Suggest**.

**Screenshot:** `screenshots/06-integrate-tab.png`

**Flow steps (top of Integrate):**

`Suggest` → `Edit mappings` → `Submit review` → `HITL review` → `Activate` → `Run`

---

## Step 3.2 — AI-suggested mappings

**Purpose:** Let the system propose column-level mappings between staging and destination.

**UI actions:**

1. Click **Suggest Mappings** (shows **Suggesting...** while running).
2. Review **Source vs Target Comparison** table.
3. Note badges: `auto`, `review_suggested`, `unmatched`, and match scores.

**Expected outcome:** Draft integration job created; mapping rows visible with statuses.

> **What this means:** **auto** = high-confidence match; **review_suggested** = needs human confirmation; **unmatched** = no target column yet.

**✓ Checkpoint:** Job status shows draft / mappings setup; no blocking compile errors.

**Common mistake:** Changing destination table after suggest.  
**Fix:** Re-suggest or use **Unlock & re-suggest mappings** if the job is locked.

---

## Step 3.3 — Edit and save mappings

**Purpose:** Override AI suggestions where business rules require different targets.

**UI actions:**

1. Click **Edit Mappings** (opens mapping editor).
2. Adjust source → target pairs; resolve **unmatched** columns.
3. Use **Confirm all (N)** for review-suggested rows when appropriate.
4. Click **Save Mappings** (**Saving...** while persisting).
5. Click **Close Editor** when done.

**Expected outcome:** Mappings saved to job; compile errors cleared (if any were shown).

**✓ Checkpoint:** **Save Mappings** succeeds; comparison table reflects your changes.

**Power tip:** Fix compile errors before HITL — the UI blocks activation until errors are resolved.

---

## Step 3.4 — Submit for HITL review

**Purpose:** Route mappings to a human approver before production activation.

**UI actions:**

1. In the review panel, click **Submit for Review**.
2. Wait for status **Awaiting Review** / **pending_review**.
3. Reviewer opens the same job (or **Data Room → Integrations → Review Queue** for company-wide review).
4. Reviewer clicks **Approve** or **Reject**.

**Expected outcome:** After approval, status becomes **Approved — ready to activate**; job is **locked**.

**✓ Checkpoint:** No pending review blocking activation; **Activate** becomes available.

---

# Phase 4 — Execution & Validation

## Step 4.1 — Activate the integration job

**Purpose:** Promote the approved mapping job to a runnable state.

**UI actions:**

1. On **Integrate**, click **Activate** (**Activating...** while processing).
2. If disabled, read the inline reason (e.g. pending review, compile errors, no job yet).

**Expected outcome:** Job status **Active — can be run**.

**✓ Checkpoint:** **Run** button enabled; flow step shows **Run**.

---

## Step 4.2 — Run the pipeline

**Purpose:** Execute the integration and load data into the destination.

**UI actions:**

1. Click **Run** (**Running...** during execution).
2. Watch run status badges on the Integrate tab.
3. On failure, open run details (Data Room integrations run page if linked).

**Expected outcome:** Run completes; destination table receives rows.

**Screenshot:** `screenshots/06-integrate-tab.png` (post-run state with run status)

---

## Step 4.3 — Validate results

**Purpose:** Confirm extracted and integrated data is correct.

**UI actions:**

1. Click **Results** tab to view extraction output per document.
2. In destination system (Airtable, etc.), spot-check record counts and key fields.
3. Compare against **Source vs Target Comparison** on Integrate.

**Expected outcome:** Results tab shows completed extractions; destination matches staging semantics.

**Screenshot:** `screenshots/07-results-tab.png`

| Validation   | Pass criteria                                  |
| ------------ | ---------------------------------------------- |
| Record count | Destination rows ≈ staged rows (minus filters) |
| Key fields   | IDs, dates, names map correctly                |
| Errors       | Error rate KPI on workflow header not spiking  |

**✓ Final checkpoint:** End-to-end path complete: upload → OCR → stage → map → approve → activate → run → verify.

---

# Quick reference card

| Phase       | Tab        | Primary action          | Key button                            |
| ----------- | ---------- | ----------------------- | ------------------------------------- |
| Setup       | Protocol   | Define extraction rules | Save protocol                         |
| Setup       | Workflow   | View/edit DAG           | Run Pipeline                          |
| Staging     | Pipeline   | Upload & OCR            | Upload, Reload                        |
| Staging     | Pipeline   | Hand off to Integrate   | **Stage & open Integrate**            |
| Staging     | OCR Review | Fix extractions         | **Complete Review**                   |
| Integration | Integrate  | AI mappings             | **Suggest Mappings**                  |
| Integration | Integrate  | Manual fixes            | **Edit Mappings** → **Save Mappings** |
| Integration | Integrate  | Governance              | **Submit for Review** → Approve       |
| Execution   | Integrate  | Go live                 | **Activate** → **Run**                |
| Validation  | Results    | Audit output            | **View** on documents                 |

---

# Troubleshooting

| Symptom                             | Likely cause                   | What to do                                      |
| ----------------------------------- | ------------------------------ | ----------------------------------------------- |
| Stage button disabled / error toast | No OCR staging table yet       | Complete upload + OCR on Pipeline               |
| Empty Source Table on Integrate     | Skipped staging                | Re-run **Stage & open Integrate** from Pipeline |
| Activate disabled                   | Pending HITL or compile errors | Complete review; fix mapping errors             |
| Suggest fails                       | Wrong connector or table       | Verify connectors and destination table list    |
| High **Error Rate** KPI             | Failed documents in queue      | Open **Failed** docs; re-upload or fix protocol |

---

# Screenshot index (for Google Docs)

Copy images from: `E:\Mazdoori\Entrecore-OI-FE\docs\job-aids\screenshots\`

| File                              | Insert after step |
| --------------------------------- | ----------------- |
| `01-abstraction-landing.png`      | 1.1               |
| `02-workflow-detail-overview.png` | 1.2               |
| `03-protocol-tab.png`             | 1.3               |
| `04-pipeline-tab-staging.png`     | 2.1 & 2.3         |
| `05-ocr-review-tab.png`           | 2.2               |
| `06-integrate-tab.png`            | 3.1 – 4.2         |
| `07-results-tab.png`              | 4.3               |

### Regenerating screenshots (optional)

```powershell
# Terminal 1 — start app
Set-Location "e:\Mazdoori\Entrecore-OI-FE"
npm run dev

# Terminal 2 — capture (requires one-time: npm install -D playwright && npx playwright install chromium)
node scripts/capture-abstraction-job-aid-screenshots.mjs
```

---

**Document version:** 1.0  
**Last updated:** May 22, 2026  
**App routes:** `/abstraction`, `/abstraction/[id]`
