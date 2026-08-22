import { describe, expect, it } from 'vitest';
import { parseYearParam } from './yearParam';
import { LATEST_TAX_YEAR } from './tax/data';

describe('parseYearParam', () => {
  it('reads a year straight off the URL', () => {
    expect(parseYearParam('2025')).toBe(2025);
    expect(parseYearParam('2019')).toBe(2019);
  });

  it('falls back to the latest year when the param is missing or empty', () => {
    expect(parseYearParam(null)).toBe(LATEST_TAX_YEAR);
    expect(parseYearParam('')).toBe(LATEST_TAX_YEAR);
  });

  it('falls back rather than trusting junk', () => {
    for (const raw of ['abc', '2025.5', 'NaN', '20x5', '1899', '2201', '-2025']) {
      expect(parseYearParam(raw)).toBe(LATEST_TAX_YEAR);
    }
  });
});
