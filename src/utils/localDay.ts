// Midnight local time for an ISO day, which is what date arithmetic on a calendar day needs.
export const localDay = (iso: string) => new Date(`${iso}T00:00:00`);

export const DAY_MS = 86400000;

// Whole days between two ISO days, so a caller never repeats the division.
export const daysApart = (fromIso: string, toIso: string) =>
  Math.round((localDay(toIso).getTime() - localDay(fromIso).getTime()) / DAY_MS);

// A UTC day index, which is what whole-day comparison needs: a local day is 23 or 25 hours
export const epochDay = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);

// Null for anything unusable: a record with no date cannot be scheduled, chased or ranked.
export const dayIndex = (value: unknown): number | null => {
  if (typeof value !== 'string' || value.length < 10) return null;
  const time = Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(time) ? null : Math.floor(time / DAY_MS);
};

export const daysInYear = (year: number) =>
  epochDay(`${year + 1}-01-01`) - epochDay(`${year}-01-01`);
