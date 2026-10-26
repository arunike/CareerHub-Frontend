import { daysInYear, localDay, toIsoDate } from '../localDay';
import type { IncomeEvent } from './tax/ledger';
import { inclusiveDayCount, parseIsoDate, type PayPeriod } from './paySchedule';

export interface VestTerms {
  totalGrant: number;
  vestingYears: number;
  cliffMonths: number;
  // Vest occasions per year. 2 means twice a year; nothing is assumed about the cadence.
  vestsPerYear: number;
  grantDate: string | null;
  taxYear: number;
  paychecksPerYear: number;
  // When supplied, a vest lands on the first paycheck on or after the vest date.
  periods?: PayPeriod[];
  // Dates the company actually vested on, which outrank the cadence.
  vestOverrides?: VestDateOverride[];
}

export interface VestDateOverride {
  // The occasion it moves, counted in whole months from the grant date.
  months: number;
  date: string;
}

export interface ScheduledVest extends VestOccasion {
  date: string;
  // Where the cadence put it, which a moved vest shows beside its new date.
  scheduledDate: string;
  moved: boolean;
}

export interface VestOccasion {
  monthsFromGrant: number;
  fraction: number;
}

// Value accrued before the cliff is not forfeited; it is released on the cliff date.
export const vestOccasions = (
  terms: Pick<VestTerms, 'vestsPerYear' | 'vestingYears' | 'cliffMonths'>
): VestOccasion[] => {
  const vestsPerYear = Math.max(1, Math.round(terms.vestsPerYear));
  const years = Math.max(1, Math.round(terms.vestingYears));
  const total = years * vestsPerYear;
  const fractionEach = 1 / total;

  const occasions: VestOccasion[] = [];
  let heldBackByCliff = 0;

  for (let index = 1; index <= total; index += 1) {
    const monthsFromGrant = Math.round((index * 12) / vestsPerYear);
    if (monthsFromGrant < terms.cliffMonths) {
      heldBackByCliff += fractionEach;
      continue;
    }
    occasions.push({ monthsFromGrant, fraction: fractionEach + heldBackByCliff });
    heldBackByCliff = 0;
  }

  // A cliff past the end of the schedule vests everything at once on the final date.
  if (heldBackByCliff > 0) {
    occasions.push({
      monthsFromGrant: Math.max(terms.cliffMonths, 12 * years),
      fraction: heldBackByCliff,
    });
  }

  return occasions;
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// A stored list outlives the shape it was written in, so an unusable entry is dropped, not fixed.
export const parseVestOverrides = (value: unknown): VestDateOverride[] =>
  Array.isArray(value)
    ? value.flatMap((entry) => {
        const months = Math.round(Number((entry as VestDateOverride)?.months));
        const date = (entry as VestDateOverride)?.date;
        const usable = Number.isFinite(months) && months >= 0 && ISO_DAY.test(String(date));
        return usable ? [{ months, date }] : [];
      })
    : [];

// One definition of a vest date, so the ledger and the Experience chart cannot disagree.
export const vestDateFor = (grantDate: Date, monthsFromGrant: number) => {
  const vestDate = new Date(grantDate);
  vestDate.setMonth(vestDate.getMonth() + monthsFromGrant);
  return vestDate;
};

// A moved vest re-anchors the ones after it, stepped in months so a quarter keeps its day.
export const scheduleVests = (
  grantDate: Date,
  occasions: VestOccasion[],
  overrides: VestDateOverride[] = []
): ScheduledVest[] => {
  const moved = new Map(overrides.map((override) => [override.months, override.date]));
  let anchor = { date: grantDate, months: 0 };
  return occasions.map((occasion) => {
    const scheduledDate = toIsoDate(vestDateFor(grantDate, occasion.monthsFromGrant));
    const override = moved.get(occasion.monthsFromGrant);
    if (override != null) anchor = { date: localDay(override), months: occasion.monthsFromGrant };
    return {
      ...occasion,
      date:
        override ?? toIsoDate(vestDateFor(anchor.date, occasion.monthsFromGrant - anchor.months)),
      scheduledDate,
      moved: override != null,
    };
  });
};

export const periodForDate = (date: Date, paychecksPerYear: number) => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = inclusiveDayCount(startOfYear, date);
  const period = Math.ceil((dayOfYear / daysInYear(date.getFullYear())) * paychecksPerYear);
  return Math.min(paychecksPerYear, Math.max(1, period));
};

const periodForVest = (vestDate: Date, terms: VestTerms) => {
  if (!terms.periods?.length) return periodForDate(vestDate, terms.paychecksPerYear);
  const onOrAfter = terms.periods.find((period) => {
    const payDate = parseIsoDate(period.payDate);
    return payDate !== null && payDate >= vestDate;
  });
  return (onOrAfter ?? terms.periods.at(-1)!).periodIndex;
};

// Only vests landing inside the tax year become paycheck events.
export const buildVestEvents = (terms: VestTerms): IncomeEvent[] => {
  if (terms.totalGrant <= 0 || terms.vestingYears <= 0) return [];

  const grantDate = terms.grantDate ? parseIsoDate(terms.grantDate) : new Date(terms.taxYear, 0, 1);
  if (!grantDate) return [];

  return scheduleVests(grantDate, vestOccasions(terms), terms.vestOverrides)
    .map((occasion) => ({ occasion, vestDate: localDay(occasion.date) }))
    .filter(({ vestDate }) => vestDate.getFullYear() === terms.taxYear)
    .map(({ occasion, vestDate }) => ({
      id: `vest-${terms.taxYear}-${occasion.monthsFromGrant}`,
      kind: 'vest' as const,
      periodIndex: periodForVest(vestDate, terms),
      amount: terms.totalGrant * occasion.fraction,
      label: `Vest ${vestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    }));
};
