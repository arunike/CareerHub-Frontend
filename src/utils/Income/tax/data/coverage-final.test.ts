import { describe, expect, it } from 'vitest';
import { annualLimits, federalTable, modelledYears, resolveTaxYear } from './index';
import { annualLiability } from '../liability';

describe('final coverage', () => {
  it('covers 2013 to 2026 coherently', () => {
    const years = modelledYears();
    expect(years.at(-1)).toBe(2013);
    expect(years[0]).toBe(2026);
    for (const year of years) {
      expect(federalTable(year).year).toBe(year);
      expect(annualLimits(year).year).toBe(year);
    }
    // 2016 now resolves exactly, with its exemption modelled.
    expect(resolveTaxYear(2016)).toEqual({ year: 2016, kind: 'exact' });
    expect(federalTable(2016).personalExemption).toBe(4050);
    expect(annualLimits(2016).elective401k).toBe(18000);
    expect(annualLiability(80000, federalTable(2016), 'SINGLE')).toBeGreaterThan(0);
    // 2010 still has no source anywhere.
    expect(resolveTaxYear(2010).kind).toBe('earlier');
  });
});
