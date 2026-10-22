import { describe, expect, it } from 'vitest';
import { buildEquityVesting } from './equityVesting';

const offer = {
  equity: 50000,
  equity_total_grant: 200000,
  equity_vesting_percent: 25,
  equity_vesting_years: 4,
  equity_vesting_frequency: 'QUARTERLY',
  equity_cliff_months: 12,
  equity_shares: 1600,
  equity_grant_price: 125,
  equity_ticker: 'GOOG',
  equity_liquidity: 'PUBLIC',
};

const planFor = (todayIso: string) =>
  buildEquityVesting(offer as never, '2026-07-01', todayIso, {}, {}).plan!;

describe('a quarterly grant behind a one-year cliff', () => {
  it('releases the first year in one step on the anniversary', () => {
    const first = planFor('2030-07-01').vests[0];
    expect(first.date).toBe('2027-07-01');
    expect(first.value).toBe(50000);
    expect(first.shares).toBe(400);
  });

  it('releases a quarter of a year every quarter after it', () => {
    const after = planFor('2030-07-01').vests.slice(1);
    expect(after.slice(0, 4).map((vest) => vest.date)).toEqual([
      '2027-10-01',
      '2028-01-01',
      '2028-04-01',
      '2028-07-01',
    ]);
    after.forEach((vest) => expect(vest.value).toBe(12500));
  });

  it('adds up to the whole grant over the four years', () => {
    const vests = planFor('2030-07-01').vests;
    expect(vests).toHaveLength(13);
    expect(vests.reduce((sum, vest) => sum + vest.value, 0)).toBe(200000);
  });

  it('has granted nothing before the cliff and the first year on it', () => {
    expect(planFor('2027-06-30').vestedToDate).toBe(0);
    expect(planFor('2027-07-01').vestedToDate).toBe(50000);
    expect(planFor('2027-10-01').vestedToDate).toBe(62500);
  });
});
