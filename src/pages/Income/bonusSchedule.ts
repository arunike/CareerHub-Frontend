import type { IncomeEvent } from './tax/ledger';
import type { PayPeriod } from './paySchedule';
import { formatPayDateShort, inclusiveDayCount, OFF_CYCLE_BASE, parseIsoDate } from './paySchedule';

export interface BonusPayout {
  id: string;
  // Set when the bonus rides along with a regular paycheck.
  periodIndex: number | null;
  // Set when the bonus is paid on its own date, separate from payroll.
  payDate: string | null;
  // Share of the total bonus paid here.
  percent: number;
}

export interface BonusExtra {
  id: string;
  label: string;
  amount: number;
}

// Common one-off awards, offered as a list so the label is not retyped every time. They are all
// supplemental wages taxed the same way, so a preset carries nothing but its wording.
export const BONUS_EXTRA_PRESETS = [
  'Referral bonus',
  'Spot bonus',
  'Sign-on bonus',
  'Retention bonus',
  'Exceeded expectations',
  'Project milestone',
  'Patent or publication award',
  'On-call or overtime award',
  'Holiday bonus',
  'Relocation bonus',
];

// Percent is the source of truth; it survives a change to the total.
export const amountFromPercent = (percent: number, bonusTotal: number) =>
  bonusTotal * (Math.max(0, percent) / 100);

export const percentFromAmount = (amount: number, bonusTotal: number) =>
  bonusTotal > 0 ? (Math.max(0, amount) / bonusTotal) * 100 : 0;

export const payoutSharesTotal = (payouts: BonusPayout[]) =>
  payouts.reduce((total, payout) => total + (Number(payout.percent) || 0), 0);

// Target bonus is usually quoted as a percent of base, so both directions are shown.
export const bonusPercentOfBase = (annualBonus: number, annualSalary: number) =>
  annualSalary > 0 ? (annualBonus / annualSalary) * 100 : 0;

export const bonusFromPercent = (percentOfBase: number, annualSalary: number) =>
  (Math.max(0, percentOfBase) / 100) * Math.max(0, annualSalary);

export const extrasTotal = (extras: BonusExtra[]) =>
  extras.reduce((total, extra) => total + Math.max(0, Number(extra.amount) || 0), 0);

const daysInYear = (year: number) => (new Date(year, 1, 29).getMonth() === 1 ? 366 : 365);

// Years the role actually covers, newest last. A bonus cannot be earned in a year the role did
// not exist, so offering one is how the target silently prorated to nothing.
export const performanceYearOptions = (
  taxYear: number,
  startDate?: string | null,
  endDate?: string | null
): number[] => {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  // Two years back is as far as a bonus is ever quoted; never past the year being modelled.
  const first = Math.max(start ? start.getFullYear() : taxYear - 2, taxYear - 2);
  const last = Math.min(end ? end.getFullYear() : taxYear, taxYear);
  if (last < first) return [taxYear];
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
};

// Prorated against the performance year, not the year the money arrives.
export const resolvePerformanceYear = (
  performanceYear: number | null | undefined,
  taxYear: number,
  options?: number[]
) => {
  const fallback = taxYear - 1;
  if (!options || options.length === 0) return performanceYear ?? fallback;
  if (
    performanceYear !== null &&
    performanceYear !== undefined &&
    options.includes(performanceYear)
  ) {
    return performanceYear;
  }
  // The year before is the usual case; when the role did not exist then, take the closest year
  // it did rather than leaving a target that prorates to zero.
  return options.includes(fallback) ? fallback : (options.at(-1) as number);
};

export interface ProrationDetail {
  factor: number;
  daysHeld: number;
  daysInYear: number;
}

// Share of the performance year the role covers: a September start earns about a third.
export const prorationDetail = (
  taxYear: number,
  startDate?: string | null,
  endDate?: string | null
): ProrationDetail => {
  const yearStart = new Date(taxYear, 0, 1);
  const yearEnd = new Date(taxYear, 11, 31);
  const total = daysInYear(taxYear);

  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const from = start && start > yearStart ? start : yearStart;
  const to = end && end < yearEnd ? end : yearEnd;

  if (to < from) return { factor: 0, daysHeld: 0, daysInYear: total };
  const daysHeld = Math.min(total, inclusiveDayCount(from, to));
  return { factor: Math.min(1, daysHeld / total), daysHeld, daysInYear: total };
};

export const prorationFactor = (
  taxYear: number,
  startDate?: string | null,
  endDate?: string | null
) => prorationDetail(taxYear, startDate, endDate).factor;

// Extras are not prorated: a spot award is not earned over the year.
export const totalBonus = (
  targetBonus: number,
  multiplierPercent: number,
  extras: BonusExtra[],
  proration = 1
) =>
  Math.max(0, targetBonus) *
    (Math.max(0, multiplierPercent) / 100) *
    Math.max(0, Math.min(1, proration)) +
  extrasTotal(extras);

export interface NextYearBonusEstimate {
  // The year the money would arrive, which is the year after the one being earned.
  paidInYear: number;
  earnedInYear: number;
  amount: number;
  proration: number;
}

// Display only, and null unless the role is still there at year end: no payout without that.
export const nextYearBonusEstimate = (
  taxYear: number,
  targetBonus: number,
  startDate?: string | null,
  endDate?: string | null
): NextYearBonusEstimate | null => {
  if (targetBonus <= 0) return null;

  const end = parseIsoDate(endDate);
  // Not `endDate < Dec 31`: a role ending on the last day of the year still saw it through.
  if (end && (end.getFullYear() < taxYear || (end.getFullYear() === taxYear && !isYearEnd(end)))) {
    return null;
  }

  const proration = prorationFactor(taxYear, startDate, endDate);
  if (proration <= 0) return null;

  return {
    paidInYear: taxYear + 1,
    earnedInYear: taxYear,
    amount: targetBonus * proration,
    proration,
  };
};

const isYearEnd = (date: Date) => date.getMonth() === 11 && date.getDate() === 31;

// A payout on its own date becomes a period of its own so the ledger can withhold on it.
export const offCyclePeriods = (payouts: BonusPayout[], taxYear: number): PayPeriod[] =>
  payouts
    .map((payout, index) => ({ payout, index }))
    .filter(({ payout }) => {
      if (!payout.payDate || payout.periodIndex !== null) return false;
      const date = parseIsoDate(payout.payDate);
      return date !== null && date.getFullYear() === taxYear;
    })
    .map(({ payout, index }) => ({
      periodIndex: OFF_CYCLE_BASE + index,
      payDate: payout.payDate as string,
      isOffCycle: true,
    }));

const periodIndexFor = (payout: BonusPayout, index: number, periods: PayPeriod[]) => {
  if (payout.periodIndex !== null) return payout.periodIndex;
  const offCycle = OFF_CYCLE_BASE + index;
  return periods.some((period) => period.periodIndex === offCycle) ? offCycle : null;
};

// Dropped, not shifted: a payout after the role ended must not reappear on the last cheque.
export const buildBonusEvents = (
  bonusTotal: number,
  payouts: BonusPayout[],
  periods: PayPeriod[]
): IncomeEvent[] => {
  if (bonusTotal <= 0) return [];
  const byIndex = new Map(periods.map((period) => [period.periodIndex, period]));

  return payouts
    .map((payout, index) => ({ payout, periodIndex: periodIndexFor(payout, index, periods) }))
    .filter(
      ({ payout, periodIndex }) =>
        periodIndex !== null && byIndex.has(periodIndex) && (Number(payout.percent) || 0) > 0
    )
    .map(({ payout, periodIndex }) => {
      const period = byIndex.get(periodIndex as number)!;
      return {
        id: `bonus-${payout.id}`,
        kind: 'bonus' as const,
        periodIndex: periodIndex as number,
        amount: bonusTotal * (Number(payout.percent) / 100),
        label: `Bonus ${formatPayDateShort(period.payDate)}`,
      };
    });
};

export const defaultBonusPayout = (periods: PayPeriod[]): BonusPayout => ({
  id: `payout-${periods[0]?.periodIndex ?? 1}`,
  periodIndex: periods.find((period) => !period.isOffCycle)?.periodIndex ?? 1,
  payDate: null,
  percent: 100,
});
