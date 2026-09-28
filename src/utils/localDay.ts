// Midnight local time for an ISO day, which is what date arithmetic on a calendar day needs.
export const localDay = (iso: string) => new Date(`${iso}T00:00:00`);

export const DAY_MS = 86400000;

// Whole days between two ISO days, so a caller never repeats the division.
export const daysApart = (fromIso: string, toIso: string) =>
  Math.round((localDay(toIso).getTime() - localDay(fromIso).getTime()) / DAY_MS);
