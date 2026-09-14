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
}

export interface VestOccasion {
  monthsFromGrant: number;
  fraction: number;
}

// Value accrued before the cliff is not forfeited; it is released on the cliff date.
export const vestOccasions = (terms: VestTerms): VestOccasion[] => {
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

const daysInYear = (year: number) => (new Date(year, 1, 29).getMonth() === 1 ? 366 : 365);

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

  return vestOccasions(terms)
    .map((occasion) => {
      const vestDate = new Date(grantDate);
      vestDate.setMonth(vestDate.getMonth() + occasion.monthsFromGrant);
      return { occasion, vestDate };
    })
    .filter(({ vestDate }) => vestDate.getFullYear() === terms.taxYear)
    .map(({ occasion, vestDate }) => ({
      id: `vest-${terms.taxYear}-${occasion.monthsFromGrant}`,
      kind: 'vest' as const,
      periodIndex: periodForVest(vestDate, terms),
      amount: terms.totalGrant * occasion.fraction,
      label: `Vest ${vestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    }));
};
