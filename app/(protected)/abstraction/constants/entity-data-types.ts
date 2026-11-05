import { EntityDefinition } from "@/app/store/abstractionStore";

/**
 * The data types a protocol entity can hold, and their labels in the editor's
 * dropdown.
 *
 * Lifted out of protocol-editor.tsx so the Auto Create dialog can reuse the
 * same list as a guard: anything the backend proposes that is not in here is
 * coerced to "text" rather than rendered as a broken <Select> with no matching
 * option. That guard exists in two places now (mapConfigToProtocol for loaded
 * configs, mapInferredEntity for scaffolded ones) and both must agree, which is
 * exactly why the list is shared rather than duplicated.
 *
 * Mirrors the Literal in OCRInferredEntity (BackEnd .../schemas/ocr.py) and the
 * dataType handling in _entity_field_type (ocr_service.py). Adding a value here
 * without adding it there produces an entity the extractor cannot type.
 */
export const ENTITY_DATA_TYPE_OPTIONS: {
  value: EntityDefinition["dataType"];
  label: string;
}[] = [
  { value: "text", label: "Text" },
  { value: "long_text", label: "Long Text" },
  { value: "single_select", label: "Single Select" },
  { value: "multi_select", label: "Multiple Select" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "currency", label: "Currency" },
  { value: "integer", label: "Integer" },
  { value: "float", label: "Float" },
];

/** Narrow an arbitrary backend string to a dataType the editor can render. */
export function asEntityDataType(value: unknown): EntityDefinition["dataType"] {
  return ENTITY_DATA_TYPE_OPTIONS.some((o) => o.value === value)
    ? (value as EntityDefinition["dataType"])
    : "text";
}
