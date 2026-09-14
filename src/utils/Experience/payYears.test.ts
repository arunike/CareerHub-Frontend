import { describe, expect, it } from 'vitest';
import { payYearsOf, payYearsTotal } from './payYears';
import type { YearEarnings } from '../Income/raiseSchedule';

const estimate = (year: number, base: number): YearEarnings =>
  ({
    year,
    window: { start: `${year}-01-01`, end: `${year}-12-31`, endsToday: false, wholeYear: true },
    segments: [
      { from: `${year}-01-01`, to: `${year}-12-31`, days: 365, annualRate: base, amount: base },
    ],
    byComponent: { base, bonus: 0, equity: 0 },
    total: base,
    daysInYear: 365,
    daysWorked: 365,
    openingRate: base,
    currentRate: base,
  }) as YearEarnings;

describe('payYearsOf', () => {
  it('prefers the ledger, because it counts paychecks actually issued', () => {
    const years = payYearsOf(
      [
        {
          year: 2025,
          total: 239750,
          byComponent: { base: 239750, bonus: 0, equity: 0 },
          paychecks: 26,
          paychecksToDate: 26,
          projected: 239750,
        },
      ],
      [estimate(2025, 165000)]
    );
    expect(years[0].total).toBe(239750);
    expect(years[0].fromLedger).toBe(true);
    expect(years[0].detail).toBe('26 paychecks');
  });

  it('falls back to the estimate when the ledger has nothing', () => {
    const years = payYearsOf(undefined, [estimate(2025, 165000)]);
    expect(years[0].total).toBe(165000);
    expect(years[0].fromLedger).toBe(false);
    expect(years[0].detail).toContain('365 of 365 days');
  });

  it('orders newest first and totals to whole dollars', () => {
    const years = payYearsOf(undefined, [estimate(2024, 165000), estimate(2026, 336000)]);
    expect(years.map((y) => y.year)).toEqual([2026, 2024]);
    expect(payYearsTotal(years)).toBe(501000);
  });

  it('is empty when neither source has anything', () => {
    expect(payYearsOf(undefined, undefined)).toEqual([]);
    expect(payYearsTotal([])).toBe(0);
  });
});

describe('a year still running shows both figures', () => {
  it('reports what has been paid and what the whole year comes to', () => {
    const [year] = payYearsOf(
      [
        {
          year: 2026,
          total: 114230,
          byComponent: { base: 114230, bonus: 0, equity: 0 },
          paychecks: 26,
          paychecksToDate: 18,
          projected: 165000,
        },
      ],
      undefined
    );
    expect(year.total).toBe(114230);
    expect(year.projected).toBe(165000);
    expect(year.detail).toBe('18 of 26 paychecks paid');
  });

  it('does not label a finished year as partly paid', () => {
    const [year] = payYearsOf(
      [
        {
          year: 2025,
          total: 165000,
          byComponent: { base: 165000, bonus: 0, equity: 0 },
          paychecks: 26,
          paychecksToDate: 26,
          projected: 165000,
        },
      ],
      undefined
    );
    expect(year.detail).toBe('26 paychecks');
  });
});
