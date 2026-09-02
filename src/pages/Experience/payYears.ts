import type { LedgerYear } from '../Income/useLedgerEarnings';
import type { YearEarnings } from '../Income/raiseSchedule';

export interface PayYear {
  year: number;
  total: number;
  byComponent: { base: number; bonus: number; equity: number };
  // How the figure was reached: real paychecks, or the rate-and-days estimate that stands in.
  detail: string;
  fromLedger: boolean;
  // What the whole year comes to, so a part-year figure can be read against the Income tab's.
  projected: number;
}

const round = (value: number) => Math.round(value);

const fromEstimate = (year: YearEarnings): PayYear => {
  const byComponent = {
    base: round(year.byComponent.base),
    bonus: round(year.byComponent.bonus),
    equity: round(year.byComponent.equity),
  };
  return {
    year: year.year,
    total: byComponent.base + byComponent.bonus + byComponent.equity,
    byComponent,
    detail: `${year.daysWorked} of ${year.daysInYear} days${year.segments.length > 1 ? ` · ${year.segments.length} pay rates` : ''}`,
    fromLedger: false,
    projected: byComponent.base + byComponent.bonus + byComponent.equity,
  };
};

const fromLedger = (year: LedgerYear): PayYear => ({
  year: year.year,
  total: year.total,
  byComponent: year.byComponent,
  detail:
    year.paychecksToDate < year.paychecks
      ? `${year.paychecksToDate} of ${year.paychecks} paychecks paid`
      : `${year.paychecks} paycheck${year.paychecks === 1 ? '' : 's'}`,
  fromLedger: true,
  projected: year.projected,
});

// The Income tab's ledger wins: it counts the paychecks that were actually issued.
export const payYearsOf = (
  ledgerYears: LedgerYear[] | undefined,
  earningsYears: YearEarnings[] | undefined
): PayYear[] => {
  if (ledgerYears?.length) return ledgerYears.map(fromLedger).sort((a, b) => b.year - a.year);
  return (earningsYears ?? []).map(fromEstimate).sort((a, b) => b.year - a.year);
};

export const payYearsTotal = (years: PayYear[]) => years.reduce((sum, year) => sum + year.total, 0);
