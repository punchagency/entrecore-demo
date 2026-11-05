/** Example + field reference for routing rule file imports. */

export const ROUTING_RULES_JSON_EXAMPLE = `[
  {
    "rule_id": "nda",
    "target_folder": "Data Room/Commercial Contracts & NDAs/NDAs",
    "match_mode": "all",
    "conditions": [
      { "field": "filename", "operator": "contains", "value": "NDA" }
    ],
    "priority": 0,
    "description": "Optional description"
  },
  {
    "rule_id": "board-consent",
    "pattern": "Board Consent",
    "target_folder": "Data Room/Actions & Minutes/Board Consents",
    "priority": 1
  },
  {
    "rule_id": "mutual-nda",
    "target_folder": "Data Room/Commercial Contracts & NDAs/NDAs",
    "match_mode": "all",
    "conditions": [
      { "field": "filename", "operator": "contains", "value": "NDA" },
      {
        "logic": "or",
        "conditions": [
          { "field": "document_text", "operator": "contains", "value": "mutual" },
          { "field": "document_text", "operator": "contains", "value": "bilateral" }
        ]
      }
    ],
    "priority": 2,
    "description": "Nested group: NDA in the name AND either wording in the body"
  }
]`;

export const ROUTING_RULES_IMPORT_FIELDS = [
  { name: "rule_id", required: true, note: "Unique ID within your company (max 100 chars)" },
  {
    name: "target_folder",
    required: true,
    note: "Subfolder path under each entity's Drive folder (max 500 chars). Do not include client name or {clients} — set the client root on Entities.",
  },
  {
    name: "pattern or conditions",
    required: true,
    note: "Simple substring/regex pattern, or at least one compound condition",
  },
  {
    name: "conditions[]",
    required: false,
    note: "field: filename | original_filename | document_type | document_text | extension | kind | source_email; operator: contains | not_contains | exact | regex | glob; value (max 4000)",
  },
  {
    name: "nested groups",
    required: false,
    note: "Any entry in conditions[] may instead be { logic, conditions } to mix AND/OR in one rule. logic: and | or | not (not = none of the children match). Groups nest up to 5 levels.",
  },
  { name: "match_mode", required: false, note: "all (AND) or any (OR) when using conditions; default any" },
  { name: "priority", required: false, note: "Lower numbers run first; default row order" },
] as const;
