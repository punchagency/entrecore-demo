export type PromptValidation = {
  errors: string[];
  warnings: string[];
};

const JSON_OUTPUT_FIELDS = [
  "date_yyyy_mm_dd",
  "doc_name",
  "counterparty",
  "subject_matter",
] as const;

/** Block save on errors; show warnings but allow save. */
export function validateClassifyPrompt(text: string): PromptValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmed = text.trim();

  if (!trimmed) {
    errors.push("Classify prompt cannot be empty.");
    return { errors, warnings };
  }

  if (!trimmed.includes("{client_list}")) {
    warnings.push(
      "Missing {client_list} — recommended for multi-client tenants (Virgil-style). Optional for single-entity setups."
    );
  }

  if (!trimmed.includes("{{company}}") && !trimmed.includes("{{COMPANY}}")) {
    warnings.push(
      "Missing {{company}} — recommended when step 2 should know which client was matched. Optional for custom protocols."
    );
  }

  for (const field of JSON_OUTPUT_FIELDS) {
    if (!trimmed.includes(field)) {
      warnings.push(
        `Prompt does not mention \`${field}\` — the LLM may omit it and filenames can degrade to [NEEDS REVIEW].`
      );
    }
  }

  return { errors, warnings };
}

export function validateFilenameTemplates(dated: string, undated: string): string[] {
  const errors: string[] = [];

  const check = (label: string, template: string, required: string[]) => {
    const t = template.trim();
    if (!t) {
      errors.push(`${label} cannot be empty.`);
      return;
    }
    for (const placeholder of required) {
      if (!t.includes(placeholder)) {
        errors.push(`${label} must include ${placeholder}.`);
      }
    }
  };

  check("Dated filename template", dated, ["{entity}", "{doc_name}"]);
  check("Undated filename template", undated, ["{entity}", "{doc_name}"]);

  return errors;
}
