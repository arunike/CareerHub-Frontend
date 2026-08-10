import { calculateScenarioValue } from './calculations';
import type { ScenarioRow } from './offerAdjustmentsTypes';
import {
  buildGrossVestingYears,
  PROJECTION_YEARS,
  type VestingOfferFields,
} from './vestingSchedule';

type ProjectionOffer = ScenarioRow['offer'] &
  VestingOfferFields & {
    base_salary?: number;
    bonus?: number;
    sign_on?: number;
    sign_on_schedule?: number[];
    benefits_value?: number;
    relocation_bonus?: number;
    health_premium_monthly?: number;
    hsa_employer_contribution?: number;
    forty_one_k_match_percent?: number;
    forty_one_k_max_match?: number;
    paychecks_per_year?: number;
    health_premium_paycheck?: number;
    dental_premium_paycheck?: number;
    dental_monthly_premium?: number;
    vision_premium_paycheck?: number;
    vision_monthly_premium?: number;
    has_dependents?: boolean;
    dependent_health_premium_paycheck?: number;
    dependent_dental_premium_paycheck?: number;
    dependent_vision_premium_paycheck?: number;
    benefit_items?: never[];
  };

export interface YearlyFigure {
  year: number;
  // Cash + vesting equity + any one-time money, before tax and cost of living.
  gross: number;
  // After tax, cost-of-living indexed, net of rent — same basis as Adjusted Value.
  adjusted: number;
  recurringCash: number;
  equity: number;
  // Sign-on and relocation, which land in year 1 only.
  oneTime: number;
}

export interface OfferProjection {
  key: string;
  label: string;
  isCurrent: boolean;
  years: YearlyFigure[];
  grossTotal: number;
  adjustedTotal: number;
}

export interface CrossoverInsight {
  earlyLeader: string;
  lateLeader: string;
  // First year in which cumulative standing flips.
  year: number;
  gapAtFlip: number;
}

export type ProjectionBasis = 'gross' | 'adjusted';

// Merit/inflation raise assumed for every role, including the current one, so
// the comparison stays apples-to-apples. Overridable from the assumptions panel.
export const DEFAULT_BASE_GROWTH_PCT = 3;
export const DEFAULT_EQUITY_GROWTH_PCT = 0;

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Compounding factor for year N, where year 1 is always the offer letter as written.
const growthFactor = (growthPct: number, year: number) => Math.pow(1 + growthPct / 100, year - 1);

export const buildOfferProjection = (
  row: ScenarioRow,
  equityGrowthPct: number,
  baseGrowthPct: number = DEFAULT_BASE_GROWTH_PCT
): OfferProjection => {
  const offer = row.offer as ProjectionOffer;
  const vesting = buildGrossVestingYears(offer, equityGrowthPct);

  const base = num(offer.base_salary);
  const bonus = num(offer.bonus);
  const signOn = num(offer.sign_on);
  // Per-year sign-on amounts. An empty schedule means the whole thing lands in year 1.
  const signOnByYear =
    Array.isArray(offer.sign_on_schedule) && offer.sign_on_schedule.length
      ? offer.sign_on_schedule.map(num)
      : [signOn];
  const relocation = num(offer.relocation_bonus);
  const annualHealthPremium = num(offer.health_premium_monthly) * 12;

  const years: YearlyFigure[] = Array.from({ length: PROJECTION_YEARS }, (_, index) => {
    const year = index + 1;
    const equity = vesting[index] ?? 0;
    const signOnThisYear = signOnByYear[index] ?? 0;
    const oneTime = signOnThisYear + (year === 1 ? relocation : 0);

    // Bonus is normally a fixed percentage of base, so it rides the same raise.
    const raise = growthFactor(baseGrowthPct, year);
    const yearBase = base * raise;
    const yearBonus = bonus * raise;
    const recurringCash = yearBase + yearBonus;

    const scenario = calculateScenarioValue({
      base_salary: yearBase,
      bonus: yearBonus,
      // Relocation is always year 1; the sign-on follows its payout schedule.
      sign_on: signOnThisYear,
      relocation_bonus: year === 1 ? relocation : 0,
      benefits_value: num(offer.benefits_value),
      equity,
      freeFoodPerkAnnual: row.freeFoodAnnualValue,
      commuteAnnualCost: row.commuteAnnualCost,
      baseTaxRate: row.usedBaseTaxRate,
      bonusTaxRate: row.usedBonusTaxRate,
      equityTaxRate: row.usedEquityTaxRate,
      costOfLivingIndex: row.colIndex,
      paychecks_per_year: offer.paychecks_per_year,
      health_premium_paycheck: offer.health_premium_paycheck,
      health_premium_monthly: num(offer.health_premium_monthly),
      dental_premium_paycheck: offer.dental_premium_paycheck,
      dental_monthly_premium: offer.dental_monthly_premium,
      vision_premium_paycheck: offer.vision_premium_paycheck,
      vision_monthly_premium: offer.vision_monthly_premium,
      has_dependents: offer.has_dependents,
      dependent_health_premium_paycheck: offer.dependent_health_premium_paycheck,
      dependent_dental_premium_paycheck: offer.dependent_dental_premium_paycheck,
      dependent_vision_premium_paycheck: offer.dependent_vision_premium_paycheck,
      hsa_employer_contribution: offer.hsa_employer_contribution,
      forty_one_k_match_percent: offer.forty_one_k_match_percent,
      forty_one_k_max_match: offer.forty_one_k_max_match,
      benefit_items: offer.benefit_items ?? [],
    });

    const fortyOneKMatch = scenario.breakdown.fortyOneKMatchValue || 0;
    const hsa = scenario.breakdown.taxedHsa || 0;

    return {
      year,
      // Mirrors the existing total_comp column so year 1 reconciles with the table.
      gross: recurringCash + equity + oneTime + fortyOneKMatch + hsa - annualHealthPremium,
      adjusted: scenario.adjustedValue - row.monthlyRent * 12,
      recurringCash,
      equity,
      oneTime,
    };
  });

  return {
    key: `${row.kind}-${String(row.offer.id ?? row.appName)}`,
    label: row.appName,
    isCurrent: !!row.offer.is_current,
    years,
    grossTotal: years.reduce((sum, entry) => sum + entry.gross, 0),
    adjustedTotal: years.reduce((sum, entry) => sum + entry.adjusted, 0),
  };
};

const cumulativeThrough = (
  projection: OfferProjection,
  year: number,
  basis: ProjectionBasis
): number =>
  projection.years
    .slice(0, year)
    .reduce((sum, entry) => sum + (basis === 'gross' ? entry.gross : entry.adjusted), 0);

export const findCrossover = (
  projections: OfferProjection[],
  basis: ProjectionBasis
): CrossoverInsight | null => {
  const contenders = projections.filter((projection) => !projection.isCurrent);
  if (contenders.length < 2) return null;

  const leaderAt = (year: number) =>
    contenders.reduce((best, projection) =>
      cumulativeThrough(projection, year, basis) > cumulativeThrough(best, year, basis)
        ? projection
        : best
    );

  const earlyLeader = leaderAt(1);
  const lateLeader = leaderAt(PROJECTION_YEARS);
  if (earlyLeader.key === lateLeader.key) return null;

  for (let year = 2; year <= PROJECTION_YEARS; year++) {
    const lateTotal = cumulativeThrough(lateLeader, year, basis);
    const earlyTotal = cumulativeThrough(earlyLeader, year, basis);
    if (lateTotal > earlyTotal) {
      return {
        earlyLeader: earlyLeader.label,
        lateLeader: lateLeader.label,
        year,
        gapAtFlip: lateTotal - earlyTotal,
      };
    }
  }

  return null;
};

export const buildYearByYearProjections = (
  rows: ScenarioRow[],
  equityGrowthPct: number,
  baseGrowthPct: number = DEFAULT_BASE_GROWTH_PCT
): OfferProjection[] =>
  rows.map((row) => buildOfferProjection(row, equityGrowthPct, baseGrowthPct));

export interface MatchGap {
  leader: string;
  candidate: string;
  totalGap: number;
  // Divided across the projected years because base repeats; extraGrant is the
  // same shortfall taken as equity instead.
  perYearBase: number;
  extraGrant: number;
}

export const findMatchGap = (
  projections: OfferProjection[],
  baseGrowthPct: number = DEFAULT_BASE_GROWTH_PCT
): MatchGap | null => {
  const contenders = projections.filter((projection) => !projection.isCurrent);
  if (contenders.length < 2) return null;

  const ranked = [...contenders].sort((a, b) => b.grossTotal - a.grossTotal);
  const leader = ranked[0];
  const candidate = ranked[1];
  const totalGap = leader.grossTotal - candidate.grossTotal;
  if (totalGap <= 0) return null;

  // A raise negotiated now compounds too, so $1 of year-1 base is worth more than
  // $4 over four years. Divide by the compounded sum rather than the year count.
  const compoundedYears = Array.from({ length: PROJECTION_YEARS }, (_, index) =>
    growthFactor(baseGrowthPct, index + 1)
  ).reduce((sum, factor) => sum + factor, 0);

  return {
    leader: leader.label,
    candidate: candidate.label,
    totalGap,
    perYearBase: compoundedYears > 0 ? totalGap / compoundedYears : totalGap / PROJECTION_YEARS,
    extraGrant: totalGap,
  };
};
