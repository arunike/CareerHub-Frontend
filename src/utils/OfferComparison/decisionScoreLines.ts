import { moneyWhole as formatCurrency } from '../Income/format';
import {
  computeNonTaxableBenefitsTotal,
  computeTaxableBenefitsTotal,
  type BenefitItem,
  type OfferLike as Offer,
  type SimulatedOffer,
} from './calculations';
import { FINANCIAL_SCORE_LOG_SCALE, FINANCIAL_SCORE_REFERENCE_VALUE } from './financialScore';
import type { AdjustedOfferMetrics } from './types';
import { getEquityLiquidityCopy, getRealizableEquity } from './equityLiquidity';
import { asNumber } from './decisionScoring';

// The operation, not just the endpoints: "$24,750 - 41% = $14,603" says where a figure came from.
export const lessTax = (gross: number, ratePercent: number, net: number) => {
  const rate = Math.round(Number(ratePercent) || 0);
  if (rate <= 0 || Math.round(gross) === Math.round(net)) return formatCurrency(net);
  return `${formatCurrency(gross)} - ${rate}% = ${formatCurrency(net)}`;
};

const signedCurrency = (value: number) => {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? '+' : '−'}${formatCurrency(Math.abs(rounded))}`;
};

export const buildFinancialCalculationLines = ({
  offer,
  metrics,
  financialValue,
}: {
  offer: Offer | SimulatedOffer;
  metrics?: Partial<AdjustedOfferMetrics>;
  financialValue: number;
}) => {
  const base = asNumber(offer.base_salary);
  const bonus = asNumber(offer.bonus);
  const signOn = asNumber(offer.sign_on);
  const equity = getRealizableEquity(offer);
  const equityInfo = getEquityLiquidityCopy(offer);
  const benefits = asNumber(offer.benefits_value);
  const relocation = asNumber(offer.relocation_bonus);

  const healthPremiumMonthly = asNumber(offer.health_premium_monthly);
  const healthPremiumAnnual = healthPremiumMonthly * 12;
  const hsaEmployerContribution = asNumber(offer.hsa_employer_contribution);

  const matchPercent = asNumber(offer.forty_one_k_match_percent);
  const maxMatch = asNumber(offer.forty_one_k_max_match);
  const fortyOneKMatchAnnual = base * (maxMatch / 100) * (matchPercent / 100);

  const baseTaxRate = asNumber(metrics?.usedBaseTaxRate, 0);
  const bonusTaxRate = asNumber(metrics?.usedBonusTaxRate, 0);
  const equityTaxRate = asNumber(metrics?.usedEquityTaxRate, 0);

  const afterTaxBase = asNumber(
    metrics?.afterTaxBase,
    Math.max(0, base - healthPremiumAnnual) * (1 - baseTaxRate / 100)
  );
  const benefitItems: BenefitItem[] = Array.isArray(offer.benefit_items)
    ? (offer.benefit_items as BenefitItem[])
    : [];
  const taxableBenefitSum =
    benefitItems.length > 0 ? computeTaxableBenefitsTotal(benefitItems) : benefits;
  const nonTaxableBenefitSum =
    benefitItems.length > 0 ? computeNonTaxableBenefitsTotal(benefitItems) : 0;
  const afterTaxBenefits = taxableBenefitSum * (1 - baseTaxRate / 100) + nonTaxableBenefitSum;
  const afterTaxBonus = asNumber(metrics?.afterTaxBonus, bonus * (1 - bonusTaxRate / 100));
  const afterTaxSignOn = asNumber(metrics?.afterTaxSignOn, signOn * (1 - bonusTaxRate / 100));
  const afterTaxRelocation = asNumber(
    metrics?.afterTaxRelocation,
    relocation * (1 - bonusTaxRate / 100)
  );
  const afterTaxEquity = asNumber(metrics?.afterTaxEquity, equity * (1 - equityTaxRate / 100));
  const afterTaxHsa = asNumber(metrics?.afterTaxHsa, hsaEmployerContribution);

  const afterTaxTotal =
    afterTaxBase +
    afterTaxBenefits +
    afterTaxBonus +
    afterTaxSignOn +
    afterTaxRelocation +
    afterTaxEquity +
    afterTaxHsa +
    fortyOneKMatchAnnual;

  const colIndex = asNumber(metrics?.costOfLivingIndex, 100);
  const purchasingPowerAdjusted = afterTaxTotal * (100 / Math.max(colIndex, 1));
  const cashAdjustment = asNumber(metrics?.cashAdjustment, 0);
  const monthlyRent = asNumber(metrics?.monthlyRent, 0);
  const rentAnnual = monthlyRent * 12;
  const commuteAnnual = asNumber(metrics?.commuteAnnualCost, 0);
  const freeFoodAnnual = asNumber(metrics?.freeFoodAnnualValue, 0);

  return [
    `Gross inputs: base ${formatCurrency(base)}, bonus ${formatCurrency(bonus)}, sign-on ${formatCurrency(
      signOn
    )}, granted equity ${formatCurrency(equityInfo.granted)}, counted equity ${formatCurrency(
      equity
    )} (${equityInfo.label}), benefits ${formatCurrency(benefits)}, relocation ${formatCurrency(
      relocation
    )}`,
    `Health Ins: premium -${formatCurrency(healthPremiumAnnual)}/yr (${formatCurrency(
      healthPremiumMonthly
    )}/mo pre-tax), HSA employer +${formatCurrency(hsaEmployerContribution)}/yr`,
    `401(k) retirement match: +${formatCurrency(fortyOneKMatchAnnual)}/yr (${matchPercent}% match up to ${maxMatch}%)`,
    `Tax rates: base ${baseTaxRate}%, W2 bonus/relocation ${bonusTaxRate}%, equity ${equityTaxRate}%; benefits split: taxable ${formatCurrency(taxableBenefitSum)} + tax-free ${formatCurrency(nonTaxableBenefitSum)}`,
    // One row per component: eight figures on a single line gave no way to see which rate made
    ...[
      { label: 'Base after tax', gross: base, rate: baseTaxRate, net: afterTaxBase },
      { label: 'Bonus after tax', gross: bonus, rate: bonusTaxRate, net: afterTaxBonus },
      { label: 'Sign-on after tax', gross: signOn, rate: bonusTaxRate, net: afterTaxSignOn },
      {
        label: 'Relocation after tax',
        gross: relocation,
        rate: bonusTaxRate,
        net: afterTaxRelocation,
      },
      { label: 'Equity after tax', gross: equity, rate: equityTaxRate, net: afterTaxEquity },
      {
        label: 'Benefits after tax',
        gross: taxableBenefitSum + nonTaxableBenefitSum,
        rate: baseTaxRate,
        net: afterTaxBenefits,
      },
    ]
      .filter((row) => Math.round(row.gross) !== 0 || Math.round(row.net) !== 0)
      .map((row) => `${row.label}: ${lessTax(row.gross, row.rate, row.net)}`),
    ...(Math.round(afterTaxHsa) !== 0
      ? [`HSA employer: +${formatCurrency(afterTaxHsa)} (untaxed)`]
      : []),
    ...(Math.round(fortyOneKMatchAnnual) !== 0
      ? [`401(k) match: +${formatCurrency(fortyOneKMatchAnnual)} (untaxed)`]
      : []),
    `After-tax total: ${formatCurrency(afterTaxTotal)}`,
    `COL adjustment: ${formatCurrency(afterTaxTotal)} x 100 / ${colIndex} = ${formatCurrency(
      purchasingPowerAdjusted
    )}`,
    // Signed contributions, not a subtraction chain: food can be negative.
    `Cash adjustments: ${formatCurrency(cashAdjustment)} total; food ${signedCurrency(
      freeFoodAnnual
    )} (meals provided on office days, less any you pay for), commute ${signedCurrency(
      -commuteAnnual
    )}. Remote/RTO preferences are scored in Location and WLB, not Financial`,
    `Rent subtraction: ${formatCurrency(monthlyRent)} x 12 = ${formatCurrency(rentAnnual)}`,
    `Adjusted value: ${formatCurrency(purchasingPowerAdjusted)} + ${formatCurrency(
      cashAdjustment
    )} - ${formatCurrency(rentAnnual)} = ${formatCurrency(financialValue)}`,
  ];
};

// Landmarks beat a logarithm: seeing what $100k and $200k score explains the curve immediately.
const SCORE_LADDER = [50000, 100000, 200000, 300000, 500000];

const scoreForLadder = (value: number) =>
  (100 * Math.log1p(value / FINANCIAL_SCORE_LOG_SCALE)) /
  Math.log1p(FINANCIAL_SCORE_REFERENCE_VALUE / FINANCIAL_SCORE_LOG_SCALE);

// Invisible separator: whatever follows it is explanation, rendered as a tooltip.
export const LINE_NOTE = '\u241F';

// The score runs on a different number from the adjusted value, so the gap is spelled out in full.

export const buildScoreValueLines = ({
  financialValue,
  benefitsPortion,
  oneTimeRemoved,
  oneTimeCounted,
  scoreValue,
  financialScore,
}: {
  financialValue: number;
  benefitsPortion: number;
  oneTimeRemoved: number;
  oneTimeCounted: number;
  scoreValue: number;
  financialScore: number;
}) => {
  const afterBenefits = financialValue - benefitsPortion;
  const oneTimeTotal = oneTimeRemoved + oneTimeCounted;
  // Nothing one-time means those two steps read "- $0" then "+ $0" and only had to be read past.
  const hasOneTime = oneTimeTotal !== 0;
  const steps = [
    `start from adjusted value: ${formatCurrency(financialValue)}`,
    `take out benefits, scored in their own category: ${formatCurrency(
      financialValue
    )} - ${formatCurrency(benefitsPortion)} = ${formatCurrency(afterBenefits)}`,
    ...(hasOneTime
      ? [
          `take out the one-time payment at full value: ${formatCurrency(
            afterBenefits
          )} - ${formatCurrency(oneTimeTotal)} = ${formatCurrency(afterBenefits - oneTimeTotal)}`,
          `add back this year's quarter of it: ${formatCurrency(
            afterBenefits - oneTimeTotal
          )} + ${formatCurrency(oneTimeCounted)} = ${formatCurrency(scoreValue)}`,
        ]
      : []),
    `turn that into a score out of 100: ${formatCurrency(scoreValue)} scores ${Math.round(
      financialScore
    )}`,
  ];

  return [
    // Numbered here rather than written in, so hiding a step does not leave a gap in the sequence.
    ...steps.map((step, index) => `Step ${index + 1} - ${step}`),
    `${formatCurrency(FINANCIAL_SCORE_REFERENCE_VALUE)} is the benchmark that scores 100. The scale is not a straight line: the first dollars move the score much more than the last, because doubling a small package changes your life more than doubling a large one. Nothing is capped, so an exceptional offer can score above 100`,
    `For scale: ${SCORE_LADDER.map(
      (value) => `${formatCurrency(value)} = ${Math.round(scoreForLadder(value))}`
    ).join(', ')}`,
    `Exact formula, if you want it: 100 x ln(1 + value / ${formatCurrency(
      FINANCIAL_SCORE_LOG_SCALE
    )}) / ln(1 + ${formatCurrency(FINANCIAL_SCORE_REFERENCE_VALUE)} / ${formatCurrency(
      FINANCIAL_SCORE_LOG_SCALE
    )})`,
  ];
};
