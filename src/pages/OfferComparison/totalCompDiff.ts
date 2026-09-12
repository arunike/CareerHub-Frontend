import { formatCurrency } from './decisionScoring';
import { getRealizableEquity } from './equityLiquidity';
import type { OfferLike as Offer } from './calculations';
import type { SimulatedOffer } from './offerTypes';

// Paper equity is excluded: only what you could realise counts against the current package.
export const totalCompFor = (offer: Offer | SimulatedOffer) =>
  Number(offer.base_salary) +
  Number(offer.bonus) +
  getRealizableEquity(offer) +
  Number(offer.sign_on);

export interface TotalCompDiff {
  diff: number;
  amount: string;
  percent: string;
  isGain: boolean;
}

// Formatted here, not at the call site: a raw toLocaleString printed cents off a float.
export const totalCompDiff = (
  offer: Offer | SimulatedOffer,
  currentTotal: number
): TotalCompDiff => {
  const diff = totalCompFor(offer) - currentTotal;
  const sign = diff > 0 ? '+' : '';
  return {
    diff,
    amount: `${sign}${formatCurrency(diff)}`,
    percent: currentTotal > 0 ? `${sign}${((diff / currentTotal) * 100).toFixed(1)}%` : '0%',
    isGain: diff >= 0,
  };
};
