import { describe, expect, it } from 'vitest';
import { buildEquityVesting, vestingCadenceLabel, type EquityGrantFields } from './equityVesting';

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

describe('buildEquityVestingPlan', () => {
  it('releases the cliff in one vest and then vests quarterly', () => {
    const plan = buildEquityVesting(grant(), GRANT_DATE, TODAY).plan!;
    expect(plan.vests).toHaveLength(13);
    expect(plan.vests[0]).toMatchObject({ date: '2026-07-01', value: 50000 });
    expect(plan.vests[1]).toMatchObject({ date: '2026-10-01', value: 12500 });
    expect(plan.vests.at(-1)).toMatchObject({ date: '2029-07-01', value: 12500 });
  });

  it('vests a quarter of the grant in each year from the grant date', () => {
    const plan = buildEquityVesting(grant(), GRANT_DATE, TODAY).plan!;
    expect(plan.years.map((year) => [year.label, year.value])).toEqual([
      ['Year 1', 50000],
      ['Year 2', 50000],
      ['Year 3', 50000],
      ['Year 4', 50000],
    ]);
    expect(plan.years.at(-1)!.cumulative).toBe(200000);
  });

  it('dates each year by the vests inside it, not by the calendar', () => {
    const plan = buildEquityVesting(grant(), GRANT_DATE, TODAY).plan!;
    expect(plan.years[0]).toMatchObject({ from: '2026-07-01', to: '2026-07-01' });
    expect(plan.years[1]).toMatchObject({ from: '2026-10-01', to: '2027-07-01' });
  });

  it('keeps appreciation out of the vested values and reports both prices', () => {
    const priced = grant({ equity_grant_price: 125, equity_ticker: 'GOOG', equity_shares: 1600 });
    const plan = buildEquityVesting(priced, GRANT_DATE, TODAY, { GOOG: 137.5 }).plan!;
    expect(plan.years.map((year) => year.value)).toEqual([50000, 50000, 50000, 50000]);
    expect(plan.grantPrice).toBe(125);
    expect(plan.currentPrice).toBe(137.5);
    expect(plan.priceRatio).toBeCloseTo(1.1);
  });

  it('carries the day a listed price is good for, so nothing is called today by default', () => {
    const priced = grant({ equity_ticker: 'GOOG', equity_grant_price: 125 });
    const plan = buildEquityVesting(
      priced,
      GRANT_DATE,
      TODAY,
      { GOOG: 137.5 },
      { GOOG: '2026-10-30' }
    ).plan!;
    expect(plan.priceAsOf).toBe('2026-10-30');
    expect(plan.currentPrice).toBe(137.5);
  });

  it('leaves the date null for a price typed onto the offer, which has none', () => {
    const privateGrant = grant({ equity_liquidity: 'BUYBACK', equity_current_price: 140 });
    const plan = buildEquityVesting(
      privateGrant,
      GRANT_DATE,
      TODAY,
      {},
      { GOOG: '2026-10-30' }
    ).plan!;
    expect(plan.currentPrice).toBe(140);
    expect(plan.priceAsOf).toBeNull();
  });

  it('says when the total was rebuilt from a yearly figure rather than recorded', () => {
    expect(buildEquityVesting(grant(), GRANT_DATE, TODAY).plan!.derivedFromYearly).toBeNull();
    const yearly = buildEquityVesting(grant({ equity_total_grant: null }), GRANT_DATE, TODAY).plan!;
    expect(yearly.totalGrant).toBe(200000);
    expect(yearly.derivedFromYearly).toBe(50000);
  });

  it('implies the grant price from the share count when none was recorded', () => {
    const plan = buildEquityVesting(grant({ equity_shares: 1600 }), GRANT_DATE, TODAY).plan!;
    expect(plan.grantPrice).toBe(125);
    expect(plan.currentPrice).toBeNull();
  });

  it('counts only the vests whose date has passed', () => {
    const plan = buildEquityVesting(grant(), GRANT_DATE, TODAY).plan!;
    expect(plan.vestedToDate).toBe(62500);
    expect(plan.years[0].vested).toBe(true);
    expect(plan.years[1].vested).toBe(false);
  });

  it('splits a share count across the years the same way as the value', () => {
    const plan = buildEquityVesting(grant({ equity_shares: 1600 }), GRANT_DATE, TODAY).plan!;
    expect(plan.years.map((year) => year.shares)).toEqual([400, 400, 400, 400]);
  });

  it('rebuilds the grant from a yearly figure when no total is stored', () => {
    const plan = buildEquityVesting(grant({ equity_total_grant: null }), GRANT_DATE, TODAY).plan!;
    expect(plan.totalGrant).toBe(200000);
  });

  it('splits a recorded share count the same way as the value', () => {
    const plan = buildEquityVesting(grant({ equity_shares: 1600 }), GRANT_DATE, TODAY).plan!;
    expect(plan.shares).toBe(1600);
    expect(plan.vests[0].shares).toBe(400);
    expect(plan.vests[1].shares).toBe(100);
  });

  it('leaves shares null when the grant records none', () => {
    const plan = buildEquityVesting(grant(), GRANT_DATE, TODAY).plan!;
    expect(plan.shares).toBeNull();
    expect(plan.vests[0].shares).toBeNull();
  });

  it('says why there is nothing to draw rather than returning silence', () => {
    const reasonFor = (...args: Parameters<typeof buildEquityVesting>) => {
      const result = buildEquityVesting(...args);
      expect(result.plan).toBeNull();
      return result.reason;
    };
    expect(reasonFor(null, GRANT_DATE, TODAY)).toMatch(/Link this role to an offer/);
    expect(reasonFor(grant(), null, TODAY)).toMatch(/Add a start date/);
    expect(reasonFor(grant({ equity: 0, equity_total_grant: 0 }), GRANT_DATE, TODAY)).toMatch(
      /No equity grant is recorded/
    );
    expect(reasonFor(grant({ equity_liquidity: 'ILLIQUID' }), GRANT_DATE, TODAY)).toMatch(
      /not currently sellable/
    );
    expect(reasonFor(grant(), 'not-a-date', TODAY)).toMatch(/not a date this can vest from/);
  });

  it('reports no reason when it has a plan', () => {
    expect(buildEquityVesting(grant(), GRANT_DATE, TODAY).reason).toBeNull();
  });

  it('vests everything at once when the cliff outlasts the schedule', () => {
    const plan = buildEquityVesting(grant({ equity_cliff_months: 60 }), GRANT_DATE, TODAY).plan!;
    expect(plan.vests).toEqual([
      {
        date: '2030-07-01',
        scheduledDate: '2030-07-01',
        moved: false,
        monthsFromGrant: 60,
        value: 200000,
        shares: null,
        vested: false,
      },
    ]);
    expect(plan.years.map((year) => year.label)).toEqual(['Year 5']);
  });
});

describe('vestingCadenceLabel', () => {
  it('names the cadence and drops a cliff that does not exist', () => {
    const plan = buildEquityVesting(grant(), GRANT_DATE, TODAY).plan!;
    expect(vestingCadenceLabel(plan)).toBe('4 years, quarterly, 12-month cliff');
    const noCliff = buildEquityVesting(
      grant({ equity_cliff_months: 0, equity_vests_per_year: 2 }),
      GRANT_DATE,
      TODAY
    ).plan!;
    expect(vestingCadenceLabel(noCliff)).toBe('4 years, twice a year');
    expect(noCliff.vests[0].date).toBe('2026-01-01');
  });
});
