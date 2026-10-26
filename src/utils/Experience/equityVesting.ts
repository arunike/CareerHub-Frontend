import { localDay, toIsoDate } from '../localDay';
import { vestDateFor, vestOccasions } from '../Income/vestEvents';
import { vestingTermsOf } from '../Income/incomeSources';
import {
  currentPriceOf,
  normalizeSymbol,
  priceRatio,
  type PriceBySymbol,
} from '../OfferComparison/equityPricing';
import { getTotalGrant } from '../OfferComparison/vestingSchedule';

export interface EquityGrantFields {
  equity?: number | null;
  equity_total_grant?: number | null;
  equity_vesting_percent?: number | null;
  equity_vesting_years?: number | null;
  equity_vests_per_year?: number | null;
  equity_cliff_months?: number | null;
  equity_shares?: number | null;
  equity_ticker?: string | null;
  equity_grant_price?: number | null;
  equity_current_price?: number | null;
  equity_buyback_value?: number | null;
  equity_liquidity?: string | null;
}

export interface EquityVest {
  date: string;
  monthsFromGrant: number;
  value: number;
  shares: number | null;
  vested: boolean;
}

export interface EquityVestingYear {
  // Years run from the grant date, so a quarter landing in January belongs to the year it vests in.
  year: number;
  label: string;
  from: string;
  to: string;
  value: number;
  cumulative: number;
  shares: number | null;
  vested: boolean;
  // How much of this year's value has actually vested, which a part-vested year needs stated.
  vestedValue: number;
}

export interface EquityVestingPlan {
  grantDate: string;
  totalGrant: number;
  // Appreciation is kept as its own number: every value below is the grant's own price.
  priceRatio: number;
  ticker: string | null;
  // The yearly figure the total was rebuilt from, or null when a total was recorded outright.
  derivedFromYearly: number | null;
  grantPrice: number | null;
  currentPrice: number | null;
  // The day that price is good for, or null for one typed onto the offer, which carries no date.
  priceAsOf: string | null;
  shares: number | null;
  cliffMonths: number;
  vestsPerYear: number;
  vestingYears: number;
  vests: EquityVest[];
  years: EquityVestingYear[];
  vestedToDate: number;
}

export interface EquityVestingResult {
  plan: EquityVestingPlan | null;
  // Why there is no chart; an absent grant must not look like a broken one.
  reason: string | null;
}

const num = (value: unknown) => Number(value) || 0;

const nothingToDraw = (reason: string): EquityVestingResult => ({ plan: null, reason });

export const buildEquityVesting = (
  offer: EquityGrantFields | null | undefined,
  grantDate: string | null | undefined,
  todayIso: string,
  prices: PriceBySymbol = {},
  priceDates: Record<string, string> = {}
): EquityVestingResult => {
  if (!offer) {
    return nothingToDraw('Link this role to an offer to chart the grant behind its equity.');
  }
  // An unsellable grant is counted as $0 everywhere else, so a dollar trend would contradict it.
  if (offer.equity_liquidity === 'ILLIQUID') {
    return nothingToDraw('This grant is marked not currently sellable, so it counts as $0.');
  }
  if (!grantDate) {
    return nothingToDraw('Add a start date to this role to date its vesting.');
  }

  const totalGrant = getTotalGrant(offer);
  const start = localDay(grantDate);
  if (totalGrant <= 0) {
    return nothingToDraw('No equity grant is recorded on the linked offer.');
  }
  if (Number.isNaN(start.getTime())) {
    return nothingToDraw(`${grantDate} is not a date this can vest from.`);
  }

  const terms = vestingTermsOf(offer as Record<string, unknown>);
  const shareCount = num(offer.equity_shares);
  const vests: EquityVest[] = vestOccasions(terms).map((occasion) => {
    const date = toIsoDate(vestDateFor(start, occasion.monthsFromGrant));
    return {
      date,
      monthsFromGrant: occasion.monthsFromGrant,
      value: totalGrant * occasion.fraction,
      shares: shareCount > 0 ? shareCount * occasion.fraction : null,
      vested: date <= todayIso,
    };
  });

  const years: EquityVestingYear[] = [];
  let cumulative = 0;
  vests.forEach((vest) => {
    cumulative += vest.value;
    const year = Math.max(1, Math.ceil(vest.monthsFromGrant / 12));
    const row = years.find((entry) => entry.year === year);
    if (!row) {
      years.push({
        year,
        label: `Year ${year}`,
        from: vest.date,
        to: vest.date,
        value: vest.value,
        cumulative,
        shares: vest.shares,
        vested: vest.vested,
        vestedValue: vest.vested ? vest.value : 0,
      });
      return;
    }
    row.to = vest.date;
    row.value += vest.value;
    row.vestedValue += vest.vested ? vest.value : 0;
    row.cumulative = cumulative;
    row.shares = row.shares == null ? vest.shares : row.shares + (vest.shares ?? 0);
    row.vested = row.vested && vest.vested;
  });

  const grantPrice =
    num(offer.equity_grant_price) || (shareCount > 0 ? totalGrant / shareCount : 0);
  // The offer form's own resolution: the offer's price for a private grant, else the ticker's.
  const currentPrice = currentPriceOf({ ...offer, equity: num(offer.equity) }, prices);
  const asOf = priceDates[normalizeSymbol(offer.equity_ticker)];

  return {
    plan: {
      grantDate,
      totalGrant,
      priceRatio: priceRatio({ ...offer, equity: num(offer.equity) }, prices),
      ticker: normalizeSymbol(offer.equity_ticker) || null,
      derivedFromYearly:
        num(offer.equity_total_grant) > 0 || num(offer.equity) <= 0 ? null : num(offer.equity),
      grantPrice: grantPrice > 0 ? grantPrice : null,
      currentPrice: currentPrice > 0 ? currentPrice : null,
      priceAsOf: num(offer.equity_current_price) > 0 ? null : (asOf ?? null),
      shares: shareCount > 0 ? shareCount : null,
      ...terms,
      vests,
      years,
      vestedToDate: vests.filter((vest) => vest.vested).reduce((sum, vest) => sum + vest.value, 0),
    },
    reason: null,
  };
};

export const isRepriced = (plan: EquityVestingPlan) =>
  plan.currentPrice != null && plan.priceRatio !== 1;

const CADENCE: Record<number, string> = {
  1: 'once a year',
  2: 'twice a year',
  4: 'quarterly',
  12: 'monthly',
};

export const vestingCadenceLabel = (plan: EquityVestingPlan) => {
  const cadence = CADENCE[plan.vestsPerYear] ?? `${plan.vestsPerYear}× a year`;
  const cliff = plan.cliffMonths > 0 ? `, ${plan.cliffMonths}-month cliff` : '';
  return `${plan.vestingYears} years, ${cadence}${cliff}`;
};
