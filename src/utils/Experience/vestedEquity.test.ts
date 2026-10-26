import { describe, expect, it } from 'vitest';
import { buildEquityVesting, type EquityGrantFields } from './equityVesting';
import { splitEquityByVesting, upcomingVesting } from './vestedEquity';
import type { PayYear } from './payYears';

const GRANT_DATE = '2025-07-01';
const TODAY = '2026-11-01';

const grant = (over: Partial<EquityGrantFields> = {}): EquityGrantFields => ({
  equity: 50000,
  equity_total_grant: 200000,
  equity_vesting_percent: 25,
  equity_vesting_years: 4,
  equity_vests_per_year: 4,
  equity_cliff_months: 12,
  equity_liquidity: 'LIQUID',
  ...over,
});

const planOn = (today: string, over: Partial<EquityGrantFields> = {}) =>
  buildEquityVesting(grant(over), GRANT_DATE, today).plan!;

const payYear = (year: number, equity: number, over: Partial<PayYear> = {}): PayYear => ({
  year,
  total: 165000 + equity,
  byComponent: { base: 165000, bonus: 0, equity },
  detail: `${year}`,
  fromLedger: false,
  projected: 165000 + equity,
  ...over,
});

describe('splitEquityByVesting', () => {
  it('counts none of the accrual while the cliff has not landed', () => {
    const split = splitEquityByVesting([payYear(2025, 25000)], planOn('2026-01-01'));
    expect(split.vested).toBe(0);
    expect(split.unvested).toBe(25000);
    expect(split.vestedByYear[2025]).toBe(0);
  });

  it('counts the accrual only up to what the vest dates have released', () => {
    const years = [payYear(2026, 50000), payYear(2025, 25000)];
    const split = splitEquityByVesting(years, planOn(TODAY));
    // 2026 holds both vests released by then, so it carries what 2025 accrued towards the cliff.
    expect(split.vestedByYear[2025]).toBe(0);
    expect(split.vestedByYear[2026]).toBe(62500);
    expect(split.vested).toBe(62500);
    expect(split.unvested).toBe(12500);
  });

  it('never counts more in total than the role accrued', () => {
    const years = [payYear(2025, 10000), payYear(2026, 10000)];
    const split = splitEquityByVesting(years, planOn(TODAY));
    expect(split.vested).toBe(20000);
    expect(split.unvested).toBe(0);
  });

  it('leaves a paycheck ledger year alone, because a vest is what put it there', () => {
    const years = [payYear(2025, 25000, { fromLedger: true })];
    const split = splitEquityByVesting(years, planOn('2026-01-01'));
    expect(split.vested).toBe(25000);
    expect(split.unvested).toBe(0);
    expect(split.vestedByYear[2025]).toBe(25000);
  });

  it('counts the whole accrual when there is no grant to check it against', () => {
    const split = splitEquityByVesting([payYear(2025, 25000)], null);
    expect(split.vested).toBe(25000);
    expect(split.unvested).toBe(0);
    expect(split.repriced).toBe(false);
  });

  it('reports what the grant still has to vest, even where no year accrued any of it', () => {
    const split = splitEquityByVesting([payYear(2025, 0)], planOn(TODAY));
    expect(split.unvested).toBe(0);
    expect(split.outstanding).toBe(137500);
  });

  it('reports the share price move the row shows beside the window', () => {
    const priced = buildEquityVesting(
      grant({ equity_grant_price: 125, equity_ticker: 'GOOG', equity_shares: 1600 }),
      GRANT_DATE,
      '2026-01-01',
      { GOOG: 137.5 }
    ).plan!;
    const split = splitEquityByVesting([payYear(2025, 25000)], priced);
    expect(split.repriced).toBe(true);
    expect(split.growthPercent).toBeCloseTo(10);
    expect(split.unvested).toBe(25000);
  });

  it('reports nothing for a role with no dated years', () => {
    expect(splitEquityByVesting([], planOn(TODAY))).toMatchObject({
      vested: 0,
      unvested: 0,
      outstanding: 137500,
    });
  });
});

describe('upcomingVesting', () => {
  it('adds up the vests falling in the twelve months ahead', () => {
    const upcoming = upcomingVesting(planOn(TODAY), TODAY);
    // Four quarters of 6.25% sit between 2026-11-01 and 2027-11-01, the cliff having passed.
    expect(upcoming.value).toBe(50000);
    expect(upcoming.nextDate).toBe('2027-01-01');
    // A month of the 92-day wait since the October vest has passed.
    expect(upcoming.progress).toBeCloseTo(31 / 92, 4);
  });

  it('counts the cliff where the window reaches it', () => {
    const upcoming = upcomingVesting(planOn('2026-01-01'), '2026-01-01');
    expect(upcoming.value).toBe(75000);
    expect(upcoming.nextDate).toBe('2026-07-01');
    // Nothing has vested, so the bar fills across the cliff from the grant date.
    expect(upcoming.progress).toBeCloseTo(184 / 365, 4);
  });

  it('prices the window at the latest share price', () => {
    const priced = buildEquityVesting(
      grant({ equity_grant_price: 125, equity_ticker: 'GOOG', equity_shares: 1600 }),
      GRANT_DATE,
      TODAY,
      { GOOG: 137.5 }
    ).plan!;
    expect(upcomingVesting(priced, TODAY).atCurrentPrice).toBe(55000);
  });

  it('reports nothing when there is no grant', () => {
    expect(upcomingVesting(null, TODAY)).toEqual({
      value: 0,
      atCurrentPrice: 0,
      nextDate: null,
      progress: 0,
    });
  });
});
