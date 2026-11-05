/**
 * Parse API timestamps that are stored/returned as naive UTC.
 *
 * FastAPI often serializes naive UTC datetimes without a `Z` suffix. Browsers
 * then treat the string as local wall-clock time. Appending `Z` forces UTC
 * parsing so date-fns format/formatDistanceToNow render in the viewer's TZ.
 */
export function parseApiUtcDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const trimmed = value.trim();
  if (!trimmed) return new Date(NaN);

  // Already has an explicit offset or Z
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }

  // Space-separated SQL-style → ISO, then treat as UTC
  const iso = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  return new Date(`${iso}Z`);
}
