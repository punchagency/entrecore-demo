/**
 * Support expiry is UTC. MySQL returns it without a zone, and
 * `new Date("2026-09-29T11:00:00")` reads that as local time, so a grant
 * looks finished by the timezone offset.
 */
export function parseUtcTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hasZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized = hasZone ? trimmed : `${trimmed.replace(" ", "T")}Z`;
  const ms = new Date(normalized).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function remainingLabel(expiresAt: string | null | undefined, now: number): string {
  const expires = parseUtcTimestamp(expiresAt);
  if (expires == null) return "";
  const ms = expires - now;
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}
