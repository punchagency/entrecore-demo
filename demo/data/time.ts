/**
 * Demo dates are relative to page load, so "updated 3 hours ago" stays true on
 * any day the demo is opened. Fixed offsets keep it deterministic within a visit.
 */
const LOADED_AT = Date.now();

interface Offset {
  minutes?: number;
  hours?: number;
  days?: number;
}

const toMs = ({ minutes = 0, hours = 0, days = 0 }: Offset) =>
  ((days * 24 + hours) * 60 + minutes) * 60_000;

/** ISO timestamp `offset` before page load. */
export const ago = (offset: Offset): string => new Date(LOADED_AT - toMs(offset)).toISOString();

/** ISO timestamp for "now" (the moment of the request). */
export const now = (): string => new Date().toISOString();
