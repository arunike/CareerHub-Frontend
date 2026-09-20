import { LATEST_TAX_YEAR } from './tax/data';

export const YEAR_PARAM = 'year';

// The role picker is a filter like the year, so it belongs in the URL beside it.
export const ROLE_ID_PARAM = 'role_id';
// Read only: links written before the codes carried a name slug or the raw record key.
export const LEGACY_ROLE_PARAM = 'role';

// Unparseable falls back to the latest year the tables cover, not to an empty page.
export const parseYearParam = (raw: string | null): number => {
  const year = Number(raw);
  return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : LATEST_TAX_YEAR;
};
