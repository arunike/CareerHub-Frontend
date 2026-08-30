// Split by concern; re-exported so every `from './calculations'` import keeps working.
export * from './offerTypes';
export * from './medicalCosts';
export * from './costOfLivingDefaults';

import { calculateProgressiveTax, extractStateAbbr } from '../../utils/taxMath';
import type { BenefitItem, LinkedExperience, OfferLike, MaritalStatus } from './offerTypes';
import { todayDateOnlyLocal } from '../../utils/dateOnly';
import { computeTotalAnnualHealthPremiums } from './medicalCosts';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const formatExperienceRange = (experience: LinkedExperience): string => {
  const month = (value: string) =>
    // Read off the string: the Date constructor parses a date-only string as UTC.
    `${MONTH_NAMES[Number(value.slice(5, 7)) - 1]} ${value.slice(0, 4)}`;
  if (!experience.start_date) return '';
  const start = month(experience.start_date);
  return `${start} – ${experience.end_date ? month(experience.end_date) : 'Present'}`;
};

export const isPastRole = (offer: Pick<OfferLike, 'linked_experience'>): boolean => {
  const experience = offer.linked_experience;
  if (!experience) return false;
  if (!experience.is_current) return true;
  return experience.end_date != null && experience.end_date < todayDateOnlyLocal();
};

export const annualizeAmount = (
  amount: number,
  frequency: 'DAILY' | 'MONTHLY' | 'YEARLY' = 'YEARLY'
) => {
  const safe = Number(amount) || 0;
  if (frequency === 'DAILY') return safe * 260;
  if (frequency === 'MONTHLY') return safe * 12;
  return safe;
};

export const calculateDirectCashAdjustment = (
  freeFoodPerkAnnual: number,
  commuteAnnualCost: number
) => (Number(freeFoodPerkAnnual) || 0) - (Number(commuteAnnualCost) || 0);

export const calculateScenarioValue = ({
  base_salary,
  bonus,
  sign_on,
  benefits_value,
  equity,
  freeFoodPerkAnnual,
  commuteAnnualCost,
  baseTaxRate,
  bonusTaxRate,
  equityTaxRate,
  costOfLivingIndex,
  paychecks_per_year = 26,
  health_premium_paycheck,
  health_premium_monthly = 0,
  dental_premium_paycheck,
  dental_monthly_premium = 0,
  vision_premium_paycheck,
  vision_monthly_premium = 0,
  has_dependents = false,
  dependent_health_premium_paycheck = 0,
  dependent_dental_premium_paycheck = 0,
  dependent_vision_premium_paycheck = 0,
  hsa_employer_contribution = 0,
  forty_one_k_match_percent = 0,
  forty_one_k_max_match = 0,
  relocation_bonus = 0,
  benefit_items = [],
}: {
  base_salary: number;
  bonus: number;
  sign_on: number;
  benefits_value: number;
  equity: number;
  freeFoodPerkAnnual: number;
  commuteAnnualCost: number;
  baseTaxRate: number;
  bonusTaxRate: number;
  equityTaxRate: number;
  costOfLivingIndex: number;
  paychecks_per_year?: number;
  health_premium_paycheck?: number;
  health_premium_monthly?: number;
  dental_premium_paycheck?: number;
  dental_monthly_premium?: number;
  vision_premium_paycheck?: number;
  vision_monthly_premium?: number;
  has_dependents?: boolean;
  dependent_health_premium_paycheck?: number;
  dependent_dental_premium_paycheck?: number;
  dependent_vision_premium_paycheck?: number;
  hsa_employer_contribution?: number;
  forty_one_k_match_percent?: number;
  forty_one_k_max_match?: number;
  relocation_bonus?: number;
  benefit_items?: BenefitItem[];
}) => {
  const healthPremiumAnnual = computeTotalAnnualHealthPremiums({
    paychecks_per_year,
    health_premium_paycheck,
    health_premium_monthly,
    dental_premium_paycheck,
    dental_monthly_premium,
    vision_premium_paycheck,
    vision_monthly_premium,
    has_dependents,
    dependent_health_premium_paycheck,
    dependent_dental_premium_paycheck,
    dependent_vision_premium_paycheck,
  });
  const taxedBase =
    Math.max(0, Number(base_salary) - healthPremiumAnnual) * (1 - baseTaxRate / 100);

  let taxedBenefits = 0;
  if (benefit_items && benefit_items.length > 0) {
    const taxableBenefits = computeTaxableBenefitsTotal(benefit_items);
    const nonTaxableBenefits = computeNonTaxableBenefitsTotal(benefit_items);
    taxedBenefits = taxableBenefits * (1 - baseTaxRate / 100) + nonTaxableBenefits;
  } else {
    taxedBenefits = Number(benefits_value) * (1 - baseTaxRate / 100);
  }
  const taxedBonus = Number(bonus) * (1 - bonusTaxRate / 100);
  const taxedSignOn = Number(sign_on) * (1 - bonusTaxRate / 100);
  const taxedRelocation = (Number(relocation_bonus) || 0) * (1 - bonusTaxRate / 100);
  const taxedEquity = Number(equity) * (1 - equityTaxRate / 100);
  const taxedHsa = Number(hsa_employer_contribution) || 0;
  const fortyOneKMatchValue =
    Number(base_salary) *
    ((Number(forty_one_k_max_match) || 0) / 100) *
    ((Number(forty_one_k_match_percent) || 0) / 100);

  const purchasingPowerAdjusted =
    (taxedBase +
      taxedBenefits +
      taxedBonus +
      taxedSignOn +
      taxedRelocation +
      taxedEquity +
      taxedHsa +
      fortyOneKMatchValue) *
    (100 / costOfLivingIndex);

  const cashAdjustment = calculateDirectCashAdjustment(freeFoodPerkAnnual, commuteAnnualCost);

  return {
    adjustedValue: purchasingPowerAdjusted + cashAdjustment,
    cashAdjustment,
    breakdown: {
      taxedBase,
      taxedBenefits,
      taxedBonus,
      taxedSignOn,
      taxedRelocation,
      taxedEquity,
      taxedHsa,
      fortyOneKMatchValue,
    },
  };
};

export const computeBenefitsTotal = (items: BenefitItem[]) =>
  items.reduce((sum, item) => {
    const normalized = Number(item.amount) || 0;
    return sum + (item.frequency === 'MONTHLY' ? normalized * 12 : normalized);
  }, 0);

export const computeTaxableBenefitsTotal = (items: BenefitItem[]) =>
  items.reduce((sum, item) => {
    if (!item.is_taxable) return sum;
    const normalized = Number(item.amount) || 0;
    return sum + (item.frequency === 'MONTHLY' ? normalized * 12 : normalized);
  }, 0);

export const computeNonTaxableBenefitsTotal = (items: BenefitItem[]) =>
  items.reduce((sum, item) => {
    if (item.is_taxable) return sum;
    const normalized = Number(item.amount) || 0;
    return sum + (item.frequency === 'MONTHLY' ? normalized * 12 : normalized);
  }, 0);

export const estimateColIndexFromCity = (
  city: string,
  cityCostOfLiving: Record<string, number>,
  stateColBase: Record<string, number>,
  stateNameToAbbr: Record<string, string>
) => {
  const normalizedCity = city.replace(/,\s*United States$/i, '').trim();
  if (cityCostOfLiving[normalizedCity]) return cityCostOfLiving[normalizedCity];
  if (cityCostOfLiving[city]) return cityCostOfLiving[city];
  const stateAbbr = extractStateAbbr(normalizedCity || city, stateNameToAbbr);
  return stateColBase[stateAbbr] || 100;
};

export const estimateEffectiveTaxRate = (
  income: number,
  maritalStatus: MaritalStatus,
  city: string,
  stateTaxRate: Record<string, number>,
  stateNameToAbbr: Record<string, string>
) => {
  const safeIncome = Math.max(20000, income);
  const federalBrackets =
    maritalStatus === 'MARRIED_FILING_JOINTLY'
      ? [
          { cap: 23200, rate: 0.1 },
          { cap: 94300, rate: 0.12 },
          { cap: 201050, rate: 0.22 },
          { cap: 383900, rate: 0.24 },
          { cap: 487450, rate: 0.32 },
          { cap: 731200, rate: 0.35 },
          { cap: Infinity, rate: 0.37 },
        ]
      : [
          { cap: 11600, rate: 0.1 },
          { cap: 47150, rate: 0.12 },
          { cap: 100525, rate: 0.22 },
          { cap: 191950, rate: 0.24 },
          { cap: 243725, rate: 0.32 },
          { cap: 609350, rate: 0.35 },
          { cap: Infinity, rate: 0.37 },
        ];

  const federalTax = calculateProgressiveTax(safeIncome, federalBrackets);
  const socialSecurity = Math.min(safeIncome, 176100) * 0.062;
  const medicare = safeIncome * 0.0145;
  const stateAbbr = extractStateAbbr(city, stateNameToAbbr);
  const stateTax = safeIncome * ((stateTaxRate[stateAbbr] || 0) / 100);
  const effectiveRate = ((federalTax + socialSecurity + medicare + stateTax) / safeIncome) * 100;
  return Math.min(55, Math.max(15, Math.round(effectiveRate)));
};

export const estimateTaxRatesByIncomeType = (
  income: number,
  maritalStatus: MaritalStatus,
  city: string,
  stateTaxRate: Record<string, number>,
  stateNameToAbbr: Record<string, string>
) => {
  const base = estimateEffectiveTaxRate(income, maritalStatus, city, stateTaxRate, stateNameToAbbr);
  return {
    baseTaxRate: base,
    bonusTaxRate: Math.min(55, base + 4),
    equityTaxRate: Math.min(55, base + 6),
  };
};
