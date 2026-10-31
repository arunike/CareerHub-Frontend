import { isRepriced, retainedGrant, type EquityVestingPlan } from './equityVesting';
import { vestDateFor } from '../Income/vestEvents';
import { daysApart, localDay, toIsoDate } from '../localDay';

export interface EquityAccrualYear {
  year: number;
  byComponent: { equity: number };
  // A ledger year was put there by a vest event, so it needs no second opinion.
  fromLedger?: boolean;
}

export interface VestedEquitySplit {
  // Equity credited to each year: what vested inside it, not what accrued across it.
  vestedByYear: Record<number, number>;
  vested: number;
  unvested: number;
  // The grant's own value still to vest, which the accrual above need not have reached at all.
  outstanding: number;
  // The move the share price has made since the grant.
  growthPercent: number;
  repriced: boolean;
}

const round = (value: number) => Math.round(value);

const vestedThroughYear = (plan: EquityVestingPlan, year: number) =>
  plan.vests
    .filter((vest) => vest.vested && Number(vest.date.slice(0, 4)) <= year)
    .reduce((sum, vest) => sum + vest.value, 0);

const fromPlan = (plan: EquityVestingPlan | null | undefined) => ({
  outstanding: plan ? Math.max(0, round(retainedGrant(plan) - plan.vestedToDate)) : 0,
  growthPercent: ((plan?.priceRatio ?? 1) - 1) * 100,
  repriced: plan != null && isRepriced(plan),
});

// Equity is earned on its vest date, so an accrual that has run ahead of the vests is not earned.
export const splitEquityByVesting = (
  years: EquityAccrualYear[],
  plan: EquityVestingPlan | null | undefined
): VestedEquitySplit => {
  if (years.length === 0) return { vestedByYear: {}, vested: 0, unvested: 0, ...fromPlan(plan) };
  // The ledger credits equity only when a vest event lands in a paycheck, so its figure is vested.
  const splits = plan != null && !years.some((year) => year.fromLedger);
  const vestedByYear: Record<number, number> = {};
  let accrued = 0;
  let counted = 0;

  for (const year of [...years].sort((a, b) => a.year - b.year)) {
    accrued += year.byComponent.equity;
    let vested = year.byComponent.equity;
    if (splits) {
      // A cliff releases what earlier years accrued, so it is credited to the year it landed in.
      const reached = round(Math.min(accrued, vestedThroughYear(plan, year.year)));
      vested = Math.max(0, reached - counted);
      counted = reached;
    }
    vestedByYear[year.year] = vested;
  }

  const vested = Object.values(vestedByYear).reduce((sum, value) => sum + value, 0);

  return {
    vestedByYear,
    vested,
    unvested: Math.max(0, round(accrued) - vested),
    ...fromPlan(plan),
  };
};

export interface UpcomingVesting {
  // What the twelve months ahead release, at the grant's price and at the latest one.
  value: number;
  atCurrentPrice: number;
  // The first vest still to come, which can fall outside that window.
  nextDate: string | null;
  // How far today sits between the last vest and that one, for a bar that fills as it nears.
  progress: number;
}

export const upcomingVesting = (
  plan: EquityVestingPlan | null | undefined,
  todayIso: string
): UpcomingVesting => {
  const coming = plan?.vests.filter((vest) => !vest.vested) ?? [];
  const through = toIsoDate(vestDateFor(localDay(todayIso), 12));
  const value = round(
    coming.filter((vest) => vest.date <= through).reduce((sum, vest) => sum + vest.value, 0)
  );
  const nextDate = coming[0]?.date ?? null;
  // The wait runs from the vest before it, or from the grant date for the first one.
  const since = plan?.vests.filter((vest) => vest.vested).at(-1)?.date ?? plan?.grantDate ?? null;
  const span = since && nextDate ? daysApart(since, nextDate) : 0;
  return {
    value,
    atCurrentPrice: round(value * (plan?.priceRatio ?? 1)),
    nextDate,
    progress: since && span > 0 ? Math.min(1, Math.max(0, daysApart(since, todayIso) / span)) : 0,
  };
};
