import { describe, expect, it } from 'vitest';
import { annualLimits, federalTable, modelledYears, resolveTaxYear } from './index';

describe('shipped coverage', () => {
  it('spans 2018 to 2026 with coherent limits', () => {
    const years = modelledYears();
    expect(years.at(-1)).toBe(2013);
    expect(years[0]).toBe(2026);
    // Brackets and limits must resolve to the same year, or a paycheck mixes eras.
    for (const year of years) {
      expect(federalTable(year).year).toBe(year);
      expect(annualLimits(year).year).toBe(year);
    }
    expect(federalTable(2018).standardDeduction!.SINGLE).toBe(12000);
    expect(annualLimits(2018).elective401k).toBe(18500);
    expect(resolveTaxYear(2016)).toEqual({ year: 2016, kind: 'exact' });
    expect(resolveTaxYear(2010)).toEqual({ year: 2013, kind: 'earlier', requested: 2010 });
    expect(resolveTaxYear(2030)).toEqual({ year: 2026, kind: 'later', requested: 2030 });
  });
});
