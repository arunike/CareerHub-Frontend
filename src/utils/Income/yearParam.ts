import { LATEST_TAX_YEAR } from './tax/data';

export const YEAR_PARAM = 'year';

// Unparseable falls back to the latest year the tables cover, not to an empty page.
export const parseYearParam = (raw: string | null): number => {
  const year = Number(raw);
  return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : LATEST_TAX_YEAR;
};
