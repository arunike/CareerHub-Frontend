import { getRealizableEquity, normalizeEquityLiquidity } from './equityLiquidity';

export const PROJECTION_YEARS = 4;

export type EquityPreset = 'downside' | 'base' | 'upside' | 'custom';

export interface VestingOfferFields {
  equity?: number | null;
  equity_total_grant?: number | null;
  equity_vesting_percent?: number | null;
  equity_vesting_schedule?: number[];
  equity_liquidity?: string | null;
  equity_buyback_value?: number | null;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getEquityGrowth = (preset: EquityPreset, customGrowthPct: number) => {
  if (preset === 'downside') return -20;
  if (preset === 'upside') return 25;
  if (preset === 'custom') return customGrowthPct;
  return 0;
};

export const getTotalGrant = (offer: VestingOfferFields) => {
  const annualEquity = Number(offer.equity || 0);
  const explicitGrant = Number(offer.equity_total_grant || 0);
  if (explicitGrant > 0) return explicitGrant;
  const vestPct = Number(offer.equity_vesting_percent || 25);
  return vestPct > 0 ? annualEquity / (vestPct / 100) : annualEquity * 4;
};

export const buildGrossVestingYears = (
  offer: VestingOfferFields,
  equityGrowthPct: number
): number[] => {
  const liquidity = normalizeEquityLiquidity(offer.equity_liquidity);
  if (liquidity === 'ILLIQUID') return Array<number>(PROJECTION_YEARS).fill(0);
  if (liquidity === 'BUYBACK') {
    const annualBuybackValue = getRealizableEquity(offer);
    return Array<number>(PROJECTION_YEARS).fill(annualBuybackValue);
  }

  const totalGrant = getTotalGrant(offer);
  const vestPct = clamp(Number(offer.equity_vesting_percent || 25), 1, 100);
  const explicitSchedule = Array.isArray(offer.equity_vesting_schedule)
    ? offer.equity_vesting_schedule
        .slice(0, PROJECTION_YEARS)
        .map((pct) => clamp(Number(pct) || 0, 0, 100))
    : [];
  const schedule =
    explicitSchedule.length > 0
      ? Array.from({ length: PROJECTION_YEARS }, (_, index) => explicitSchedule[index] ?? 0)
      : null;
  const vestingYears = clamp(Math.round(100 / vestPct), 1, 6);
  const annualGrantSlice = totalGrant / vestingYears;
  const growthMultiplier = equityGrowthPct / 100;

  return Array.from({ length: PROJECTION_YEARS }, (_, index) => {
    const year = index + 1;
    const vestedGrant = schedule
      ? totalGrant * ((schedule[index] || 0) / 100)
      : year > vestingYears
        ? 0
        : annualGrantSlice;
    const marketValue = vestedGrant * Math.pow(1 + growthMultiplier, year - 1);
    return Math.max(0, marketValue);
  });
};
