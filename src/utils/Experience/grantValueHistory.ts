import type { PriceSeriesPeriod } from '../../api/career/offers';
import { epochDay } from '../localDay';
import type { EquityVestingPlan } from './equityVesting';

export type PriceGranularity = 'day' | 'week' | 'month';

export interface GrantValuePoint {
  date: string;
  price: number;
  grantValue: number;
  vestedValue: number;
}

interface PriceRow {
  as_of: string;
  price: string | number;
}

// Shares are what a price multiplies; a grant recorded only in dollars implies them from its price.
const sharesOf = (plan: EquityVestingPlan) => {
  if (plan.shares && plan.shares > 0) return plan.shares;
  if (plan.grantPrice && plan.grantPrice > 0) return plan.totalGrant / plan.grantPrice;
  return null;
};

const bucketKey = (iso: string, granularity: PriceGranularity) => {
  if (granularity === 'month') return iso.slice(0, 7);
  // Day 0 of the epoch is a Thursday, so +4 puts the week boundary on Sunday, as the calendar has it.
  if (granularity === 'week') return String(Math.floor((epochDay(iso) + 4) / 7));
  return iso;
};

export const buildGrantValueHistory = (
  plan: EquityVestingPlan,
  rows: PriceRow[],
  granularity: PriceGranularity
): GrantValuePoint[] => {
  const shares = sharesOf(plan);
  if (shares == null) return [];

  const dated = rows
    .map((row) => ({ date: String(row.as_of).slice(0, 10), price: Number(row.price) }))
    .filter((row) => row.price > 0 && row.date >= plan.grantDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  // The last price in a bucket is that period's close; nothing here invents a price for a gap.
  const byBucket = new Map<string, { date: string; price: number }>();
  dated.forEach((row) => byBucket.set(bucketKey(row.date, granularity), row));

  return [...byBucket.values()].map((row) => {
    const vestedFraction = plan.vests
      .filter((vest) => vest.date <= row.date)
      .reduce((sum, vest) => sum + vest.value / plan.totalGrant, 0);
    return {
      date: row.date,
      price: row.price,
      grantValue: shares * row.price,
      vestedValue: shares * vestedFraction * row.price,
    };
  });
};

const DAYS_PER_MONTH = 30.44;

const PERIOD_MONTHS: Array<[PriceSeriesPeriod, number]> = [
  ['3mo', 3],
  ['6mo', 6],
  ['1y', 12],
  ['2y', 24],
  ['5y', 60],
  ['10y', 120],
];

// The provider serves fixed ranges, so a grant needs the shortest one that still reaches its date.
export const seriesPeriodFor = (grantDate: string, todayIso: string): PriceSeriesPeriod => {
  const months = (epochDay(todayIso) - epochDay(grantDate)) / DAYS_PER_MONTH;
  return PERIOD_MONTHS.find(([, span]) => span >= months)?.[0] ?? 'max';
};
