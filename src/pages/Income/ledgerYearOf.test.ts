import { describe, expect, it } from 'vitest';
import { ledgerYearOf } from './useLedgerEarnings';

const role = (over: Partial<Parameters<typeof ledgerYearOf>[0]> = {}) => ({
  sourceKey: 'experience-1',
  toDate: { gross: 60000, base: 50000, bonus: 8000, equity: 2000 },
  projectedGross: 160000,
  paychecks: 26,
  paychecksToDate: 10,
  ...over,
});

describe('ledgerYearOf', () => {
  it('reports pay to date and the full year as different figures', () => {
    const year = ledgerYearOf(role(), 2026)!;
    expect(year.total).toBe(60000);
    expect(year.projected).toBe(160000);
  });

  it('splits the components so they add back to the total', () => {
    const { byComponent, total } = ledgerYearOf(role(), 2026)!;
    expect(byComponent).toEqual({ base: 50000, bonus: 8000, equity: 2000 });
    expect(byComponent.base + byComponent.bonus + byComponent.equity).toBe(total);
  });

  it('gives base the rounding, so the parts still add up', () => {
    const { byComponent, total } = ledgerYearOf(
      role({ toDate: { gross: 100.4, base: 60.2, bonus: 30.3, equity: 10.1 } }),
      2026
    )!;
    expect(byComponent.base + byComponent.bonus + byComponent.equity).toBe(total);
  });

  it('drops a year nothing was paid in, so an unstarted role adds no rows', () => {
    expect(
      ledgerYearOf(role({ toDate: { gross: 0, base: 0, bonus: 0, equity: 0 } }), 2026)
    ).toBeNull();
  });

  it('keeps the projection even when nothing has been paid yet this year', () => {
    const year = ledgerYearOf(
      role({ toDate: { gross: 1, base: 1, bonus: 0, equity: 0 }, projectedGross: 160000 }),
      2026
    )!;
    expect(year.total).toBe(1);
    expect(year.projected).toBe(160000);
  });
});
