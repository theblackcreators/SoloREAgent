export function localISODate(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseISODateToUTC(dateStr: string) {
  // Treat log_date as "date" (no timezone). Use UTC midnight for deterministic arithmetic.
  return new Date(`${dateStr}T00:00:00Z`);
}

export function toISODateUTC(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function addDaysUTC(dateStr: string, days: number) {
  const d = parseISODateToUTC(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODateUTC(d);
}

