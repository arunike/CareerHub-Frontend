import { LATEST_TAX_YEAR } from './tax/data';

export const YEAR_PARAM = 'year';

// The URL is the source of truth for the year. Anything unparseable falls back to the latest
// year the tables cover rather than showing an empty page.
export const parseYearParam = (raw: string | null): number => {
  const year = Number(raw);
  return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : LATEST_TAX_YEAR;
};
