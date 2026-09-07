import {
  computeMedicalWorstCaseRisk,
  computeNonTaxableBenefitsTotal,
  computeTaxableBenefitsTotal,
  computeTotalAnnualHealthPremiums,
} from './calculations';
import type { BenefitItem, OfferLike, SimulatedOffer } from './calculations';

type AnyOffer = Partial<OfferLike | SimulatedOffer>;

const num = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Net value of a package worth a full score: employer contributions less what you pay in premiums.
export const BENEFITS_REFERENCE_VALUE = 20000;

export interface BenefitsBreakdown {
  retirementMatch: number;
  hsa: number;
  perks: number;
  premiums: number;
  net: number;
  worstCase: number;
}

export const benefitsBreakdown = (offer: AnyOffer, baseTaxRate = 0): BenefitsBreakdown => {
  const base = num(offer.base_salary);
  const matchPercent = num(offer.forty_one_k_match_percent);
  const maxMatch = num(offer.forty_one_k_max_match);
  const retirementMatch = base * (maxMatch / 100) * (matchPercent / 100);

  const items: BenefitItem[] = Array.isArray(offer.benefit_items)
    ? (offer.benefit_items as BenefitItem[])
    : [];
  // Taxed the same way Financial taxes them, so the two views cannot disagree on a perk's worth.
  const perks = items.length
    ? computeTaxableBenefitsTotal(items) * (1 - baseTaxRate / 100) +
      computeNonTaxableBenefitsTotal(items)
    : num(offer.benefits_value) * (1 - baseTaxRate / 100);

  const hsa = num(offer.hsa_employer_contribution);
  const premiums = computeTotalAnnualHealthPremiums(offer);

  return {
    retirementMatch,
    hsa,
    perks,
    premiums,
    net: retirementMatch + hsa + perks - premiums,
    worstCase: computeMedicalWorstCaseRisk(offer),
  };
};

// 50 is the break-even where the employer gives back exactly what the premiums cost you.
export const benefitsScoreFrom = (net: number) => {
  const scaled = 50 + (net / BENEFITS_REFERENCE_VALUE) * 50;
  return Math.max(0, Math.min(100, Math.round(scaled)));
};

export const scoreBenefitsWithBreakdown = (offer: AnyOffer, baseTaxRate = 0) => {
  const parts = benefitsBreakdown(offer, baseTaxRate);
  const score = benefitsScoreFrom(parts.net);
  const money = (value: number) =>
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return {
    score,
    net: parts.net,
    detail: `${money(parts.net)}/yr net of premiums`,
    calculationLines: [
      `401(k) match: ${money(parts.retirementMatch)}/yr`,
      `HSA employer contribution: ${money(parts.hsa)}/yr`,
      `Perks and other benefits, after tax: ${money(parts.perks)}/yr`,
      `Health, dental and vision premiums you pay: -${money(parts.premiums)}/yr`,
      `Net benefits value: ${money(parts.net)}/yr`,
      `Score: 50 + ${money(parts.net)} / ${money(BENEFITS_REFERENCE_VALUE)} x 50 = ${score}`,
      `Worst case if you use the plan hard: ${money(parts.worstCase)}/yr including the out-of-pocket maximum. Not scored, shown because two plans with the same premium can expose you very differently`,
    ],
  };
};
