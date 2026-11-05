import type { EntityDefinition } from "@/app/store/abstractionStore";

export interface CharterEntityTemplate {
  name: string;
  description: string;
  type: EntityDefinition["type"];
  color: string;
}

/** Standard charter / extraction metadata fields (Lawrence Ubom). */
export const CHARTER_EXTRACTION_ENTITY_TEMPLATES: CharterEntityTemplate[] = [
  {
    name: "charter_id",
    description: "Unique identifier for the charter document",
    type: "reference_number",
    color: "#6366f1",
  },
  {
    name: "extracted_by",
    description: "User or system that performed the extraction",
    type: "custom",
    color: "#8b5cf6",
  },
  {
    name: "review_notes",
    description: "Notes from human review of extracted data",
    type: "custom",
    color: "#ec4899",
  },
  {
    name: "drafting_notes",
    description: "Notes related to document drafting or source content",
    type: "custom",
    color: "#f59e0b",
  },
  {
    name: "extraction_date",
    description: "Date when extraction was performed",
    type: "date",
    color: "#14b8a6",
  },
  {
    name: "extraction_status",
    description: "Status of the extraction (e.g. pending, complete, failed)",
    type: "custom",
    color: "#22c55e",
  },
];

export function buildCharterExtractionEntities(): EntityDefinition[] {
  return CHARTER_EXTRACTION_ENTITY_TEMPLATES.map((template) => ({
    id: `e-charter-${template.name}`,
    name: template.name,
    description: template.description,
    type: template.type,
    dataType: "text",
    required: false,
    color: template.color,
  }));
}
