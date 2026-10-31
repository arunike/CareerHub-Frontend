import { describe, expect, it } from 'vitest';
import { buildEquityVesting } from './equityVesting';
import { buildGrantValueHistory, pricePointRows, seriesPeriodFor } from './grantValueHistory';

const plan = (over = {}) =>
  buildEquityVesting(
    {
      equity: 50000,
      equity_total_grant: 200000,
      equity_vesting_percent: 25,
      equity_vesting_years: 4,
      equity_vests_per_year: 4,
      equity_cliff_months: 12,
      equity_liquidity: 'LIQUID',
      equity_ticker: 'GOOG',
      equity_shares: 1600,
      equity_grant_price: 125,
      ...over,
    },
    '2025-07-01',
    '2026-11-01'
  ).plan!;

const rows = [
  { as_of: '2026-07-01', price: '130' },
  { as_of: '2026-07-02', price: '131' },
  { as_of: '2026-07-08', price: '132' },
  { as_of: '2026-08-03', price: '140' },
];

describe('buildGrantValueHistory', () => {
  it('holds the whole grant at the vested part once the role has ended', () => {
    const left = buildEquityVesting(
      {
        equity: 50000,
        equity_total_grant: 200000,
        equity_vesting_years: 4,
        equity_vests_per_year: 4,
        equity_cliff_months: 12,
        equity_liquidity: 'LIQUID',
        equity_shares: 1600,
        equity_grant_price: 125,
      },
      '2025-07-01',
      '2026-11-01',
      {},
      {},
      '2026-07-01'
    ).plan!;
    const points = buildGrantValueHistory(left, rows, 'day');
    expect(points[0]).toMatchObject({ date: '2026-07-01', grantValue: 208000 });
    // A quarter of the grant vested on the last day, and that is all the holder kept.
    expect(points.at(-1)).toMatchObject({ grantValue: 56000, vestedValue: 56000 });
  });

  it('values the whole grant at each recorded price', () => {
    const points = buildGrantValueHistory(plan(), rows, 'day');
    expect(points).toHaveLength(4);
    expect(points[0]).toMatchObject({ date: '2026-07-01', grantValue: 208000 });
    expect(points.at(-1)).toMatchObject({ date: '2026-08-03', grantValue: 224000 });
  });

  it('values only what had vested by each point', () => {
    const points = buildGrantValueHistory(plan(), rows, 'day');
    // The cliff releases a quarter of the grant on 2026-07-01: 400 of 1,600 shares.
    expect(points[0].vestedValue).toBe(52000);
    expect(points.at(-1)!.vestedValue).toBe(56000);
  });

  it('takes the last price in each week or month rather than inventing one', () => {
    expect(buildGrantValueHistory(plan(), rows, 'week').map((p) => p.date)).toEqual([
      '2026-07-02',
      '2026-07-08',
      '2026-08-03',
    ]);
    expect(buildGrantValueHistory(plan(), rows, 'month').map((p) => p.date)).toEqual([
      '2026-07-08',
      '2026-08-03',
    ]);
  });

  it('ignores a price from before the grant existed', () => {
    const early = [{ as_of: '2025-01-02', price: '90' }, ...rows];
    expect(buildGrantValueHistory(plan(), early, 'day')).toHaveLength(4);
  });

  it('implies the share count from the grant price when none is recorded', () => {
    const points = buildGrantValueHistory(plan({ equity_shares: null }), rows, 'day');
    expect(points[0].grantValue).toBe(208000);
  });

  it('has no series to draw without any per-share basis', () => {
    const noBasis = plan({ equity_shares: null, equity_grant_price: null });
    expect(buildGrantValueHistory(noBasis, rows, 'day')).toEqual([]);
  });

  it('drops an unusable price rather than plotting a zero', () => {
    expect(buildGrantValueHistory(plan(), [{ as_of: '2026-07-01', price: '0' }], 'day')).toEqual(
      []
    );
  });
});

describe('pricePointRows', () => {
  // Vests land 2026-07-01, 2026-10-01 and 2027-01-01, so the later price is priced mid-quarter.
  const vestDates = plan().vests.map((vest) => vest.date);
  const TODAY = '2027-01-04';
  const typed = [
    { date: '2026-07-01', price: 125 },
    { date: '2026-12-20', price: 137.5 },
  ];

  it('holds each price until the next one, over every vest since', () => {
    expect(pricePointRows(typed, vestDates, TODAY)).toEqual([
      { as_of: '2026-07-01', price: 125 },
      // Between the two prices, so it is valued at the first rather than interpolated.
      { as_of: '2026-10-01', price: 125 },
      { as_of: '2026-12-20', price: 137.5 },
      { as_of: '2027-01-01', price: 137.5 },
      { as_of: TODAY, price: 137.5 },
    ]);
  });

  it('values nothing before the first price was recorded', () => {
    const late = [{ date: '2026-12-20', price: 137.5 }];
    expect(pricePointRows(late, vestDates, TODAY).map((row) => row.as_of)).toEqual([
      '2026-12-20',
      '2027-01-01',
      TODAY,
    ]);
  });

  it('has no series until a price is entered', () => {
    expect(pricePointRows([], vestDates, TODAY)).toEqual([]);
  });

  it('draws the grant it prices rather than a market feed', () => {
    const priced = plan({ equity_ticker: '', equity_price_points: typed });
    const points = buildGrantValueHistory(
      priced,
      pricePointRows(priced.pricePoints, vestDates, TODAY),
      'day'
    );
    expect(points.map((point) => point.grantValue)).toEqual([
      200000, 200000, 220000, 220000, 220000,
    ]);
    // The cliff and two quarterly vests had landed by the last row: 37.5% of the grant.
    expect(points.at(-1)!.vestedValue).toBe(82500);
  });
});

describe('seriesPeriodFor', () => {
  it('asks for the shortest range that still reaches the grant date', () => {
    expect(seriesPeriodFor('2026-07-01', '2026-08-01')).toBe('3mo');
    expect(seriesPeriodFor('2026-07-01', '2026-12-01')).toBe('6mo');
    expect(seriesPeriodFor('2025-07-01', '2026-10-01')).toBe('2y');
  });

  it('falls back to everything the provider holds for a grant older than ten years', () => {
    expect(seriesPeriodFor('2010-07-01', '2026-10-01')).toBe('max');
  });

  it('asks for the shortest range when the grant has not happened yet', () => {
    expect(seriesPeriodFor('2027-07-01', '2026-10-01')).toBe('3mo');
  });
});
