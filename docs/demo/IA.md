# Demo page structure (IA): draft for review

**Status:** draft, 2026-11-02. Decides what the demo shows and in what order, before screens get built.

## The story the demo tells

Every screen should support one storyline:

> **Data and documents come in → skills (each backed by a model from our private fleet) do the work → agents and workflows use the skills → the result is a governed data product.**

Worked example in the demo tenant (Larkspur Holdings, made up): invoices arrive → the _Invoice intake_ workflow runs the skills _Classify document_ → _Extract invoice fields_ → _Validate against vendor master_ → _File to entity_ → the **AP Invoice Ledger** data product updates → the _Revenue Analyst_ agent answers questions from it.

## Proposed navigation

| #   | Nav item (ideal)                              | Today in the app                                                                                                    | Today for customers in prod\* | Demo phase                                                            |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| 1   | **Home**                                      | CoreOS (`/coreos`)                                                                                                  | hidden                        | P1 as-is, P2 redesign as the command centre                           |
| 2   | **Agents**                                    | Guides (`/guides`)                                                                                                  | hidden                        | P1 done (this proof); P2 adds skills, model and run history per agent |
| 3   | **Skills**                                    | Static list inside the data-room workflow builder (`skill-library-data.ts`, 15 categories, no API)                  | n/a                           | P2 new page                                                           |
| 4   | **Model Fleet**                               | Nothing; closest is Training (`/training`, real API) and the hosted-LLM selector in Guides                          | hidden                        | P2 new page, absorbs Training                                         |
| 5   | **Workflows**                                 | Two areas: `/workflows` (in the sidebar) and `/data-room/workflows` (skill library, canvas, draft-from-description) | hidden                        | P1 as-is; P2 one Workflows area                                       |
| 6   | **Data Products**                             | `/data-room/data-products` (catalog API)                                                                            | hidden                        | P1 as-is; P2 shows the workflow that produced each one                |
| 7   | **Data**                                      | Data Intelligence Hub, Connectors                                                                                   | Connectors only               | P1 as-is                                                              |
| 8   | **Document Intake**                           | DRAT, Abstraction                                                                                                   | yes                           | P1 as-is; shown as a solution built on 3–6                            |
| —   | Settings, Notifications                       | same                                                                                                                | yes                           | P1 as-is                                                              |
| —   | Investor Access, Market, Portfolio, Diligence | exist, not in the demo user's nav                                                                                   | hidden                        | Out of the demo                                                       |

\* Verified in `components/app-sidebar.tsx`: in production, users outside the superadmin company only see Abstraction, DRAT, Connectors, Settings and Notifications. So "live" in the roadmap view means _built and on the real API_, not _customers have it_.

## Model Fleet: what each card shows

One card per model: purpose, base model, version, status, evaluation versus the frontier model it replaces, cost and latency per call, training data volume, last trained, and which skills, agents and workflows use it.

| Model                                                        | Base                                              | Verified in backend code (`origin/dev`, 2026-11-02)                                                                                                                                                                                                                                                                                                                                 | Demo status                     |
| ------------------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Entrecore Extract** (document field extraction)            | Qwen3-4B + LoRA (a small fine-tuned add-on layer) | Real. Pipeline for building the dataset, training, evaluation and merging in `data_ingestion_service/scripts/` (`train_ocr_sft.py`, `eval_ocr_extraction.py`, `merge_ocr_adapter.py`); comparison against Gemini in `eval_gemini_extraction.py`; `merge_ocr_adapter.py`'s usage example names run `2026-10-14_run2_qwen3-4b_v2` (which run is in production: confirm with the team) | Production                      |
| **Entrecore Orchestrator** (agent reasoning and tool use)    | Qwen3-14B (ART default)                           | Training pipeline real (`agent/art_training.py`); usage logs grouped by task into catalog, data quality, lineage and ingestion (`agent/task_types.py`)                                                                                                                                                                                                                              | Training                        |
| **Entrecore Classify** (match a DRAT document to its entity) | —                                                 | Not an SLM today: `services/drat_classify_service.py` calls the company's configured general model (`get_llm_for_company`)                                                                                                                                                                                                                                                          | Roadmap, labelled "in training" |

**Needed from the team:** the evaluation numbers for Extract v2 (field accuracy versus Gemini, cost and speed per document), so the demo shows real figures. Until then the card shows clearly marked placeholder figures.

## Decisions for you

1. **Rename Guides → Agents** in the demo nav? _(Recommended: yes. It matches how we pitch it.)_
2. **One Workflows area.** Which of the two builders is the one going forward? I'd base the ideal on `/data-room/workflows` (skill library plus draft from a description), but the team should confirm.
3. **Home page.** Should the demo open on Home (CoreOS) or on Agents? The demo currently opens on Agents (`DEMO_HOME` in `demo/config.ts`).
4. **Document Intake as a "solution".** Should DRAT and Abstraction be shown as a solution built from the platform pieces, or as top-level modules as today?

## Build order after sign-off

1. P1: recreate the remaining as-is screens by recording from a made-up demo company on staging (needs a staging account for that company).
2. P2: Model Fleet → Skills → Agents (ideal) → Workflows (one area, a scripted run ending in a data product) → Data Products (with the workflow that produced each) → Home.
