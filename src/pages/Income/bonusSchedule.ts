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

// A payout is stored as a share, but it is often easier to think in dollars, so the two
// stay in step. Percent remains the source of truth: it survives a change to the total.
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

// A bonus is normally earned in one year and paid in the next, so proration is measured
// against the performance year rather than the year the money arrives.
export const resolvePerformanceYear = (
  performanceYear: number | null | undefined,
  taxYear: number
) => performanceYear ?? taxYear - 1;

// Share of the performance year the role covers. A target bonus is earned across that
// year, so starting in September earns roughly a third of it.
export const prorationFactor = (
  taxYear: number,
  startDate?: string | null,
  endDate?: string | null
) => {
  const yearStart = new Date(taxYear, 0, 1);
  const yearEnd = new Date(taxYear, 11, 31);

  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const from = start && start > yearStart ? start : yearStart;
  const to = end && end < yearEnd ? end : yearEnd;

  if (to < from) return 0;
  return Math.min(1, inclusiveDayCount(from, to) / daysInYear(taxYear));
};

// Target times the company multiplier, prorated for time worked, plus anything
// discretionary on top. Extras are not prorated: a spot award is not earned over the year.
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

// A payout outside the paid periods is dropped rather than shifted, so a bonus scheduled
// after the role ended does not silently reappear on the last paycheck.
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
