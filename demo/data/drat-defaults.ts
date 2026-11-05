/**
 * DRAT (document routing) defaults a new company gets. Source:
 * services/drat_prompt_defaults.py and services/drat_settings_service.py at
 * backend origin/dev @ aed5ff3b.
 *
 * DELIBERATE DIFFERENCE FROM PRODUCTION: the backend's default classify prompt
 * (fixtures/drat/classify_prompt_legal.txt) was written for one customer, a
 * law firm, and names that firm and its clients. A new company sees it as its
 * default today. The demo shows the neutral prompt below instead; see
 * docs/demo/UPSTREAM_FIXES.md.
 */

export const DEFAULT_FILENAME_TEMPLATE_DATED = "{date} - {entity} - {doc_name}";
export const DEFAULT_FILENAME_TEMPLATE_UNDATED = "{entity} - {doc_name}";

export const DEFAULT_CLASSIFY_PROMPT = `You are a document analysis system. You read business documents and extract the metadata used to file each one in the right place with a consistent name.

ENTITY LIST:
{client_list}

The document belongs to {{company}}, one of the entities on the ENTITY LIST above. Check the whole document against the list before you answer: filing a document under the wrong entity is the most costly mistake. Match names that differ only in punctuation or suffixes (for example "Acme, Inc." and "Acme Inc"). If a second party in the document is also on the ENTITY LIST, say so in counterparty_reasoning instead of choosing one.

Extract the following fields.

1. DATE (date_yyyy_mm_dd)
   Use the effective date if the document states one; otherwise the date of the last signature; otherwise the issue date. Use 0000-00-00 for templates and undated forms.

2. DOCUMENT NAME (doc_name)
   A short, standard name for the type of document, for example "Master Services Agreement", "Invoice", "W-9", "Board Consent", "Lease Amendment".

3. COUNTERPARTY OR DETAIL (detail)
   For agreements, the other party's name. For internal documents, a two-to-five word description. Never both.

4. SUBJECT MATTER (subject_matter)
   One short phrase for what the document is about, for example "office lease" or "Q3 invoice".

5. COUNTERPARTY REASONING (counterparty_reasoning)
   One sentence explaining how you identified the entity and the counterparty.

Return only the JSON object with these fields.`;
