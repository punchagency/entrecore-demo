/**
 * Client-side draft for one pipeline step, split out from the editor UI so
 * non-UI code can use it without pulling in React.
 *
 * A pipeline is an ordered list of steps; each step extracts with one OCR
 * configuration (`ocr_config_id`) and pushes the result to one
 * `integration_destinations` handle (`destination_id`, never a raw job/bundle
 * id). `destination_type` is display-only. `uid` is a React key, never sent.
 */
export interface PipelineChain {
  /** Stable client-side id for React keys; never sent to the API. */
  uid: string;
  ocr_config_id: string | null;
  destination_id: string | null;
  destination_type: string | null;
  label: string;
}

let chainCounter = 0;

export function createEmptyChain(): PipelineChain {
  chainCounter += 1;
  return {
    uid: `chain-${Date.now()}-${chainCounter}`,
    ocr_config_id: null,
    destination_id: null,
    destination_type: null,
    label: "",
  };
}
