import { summariseCommute, type CommuteOption } from './commute';
import {
  annualizeAmount,
  computeNonTaxableBenefitsTotal,
  computeTaxableBenefitsTotal,
  type ApplicationLike as Application,
  type BenefitItem,
  type OfferLike as Offer,
  type SimulatedOffer,
  type VisaSponsorshipStatus,
} from './calculations';
import type { AdjustedOfferMetrics } from './types';
import { getCountedSickLeaveDays } from '../../utils/offerTimeOff';
import { getEquityLiquidityCopy, getRealizableEquity } from './equityLiquidity';
import { FINANCIAL_SCORE_LOG_SCALE, FINANCIAL_SCORE_REFERENCE_VALUE } from './financialScore';

export type CategoryKey = 'financial' | 'workLife' | 'growth' | 'location' | 'brand' | 'team';

export type CategoryScore = {
  key: CategoryKey | 'visa';
  label: string;
  weight: number;
  score: number;
  detail: string;
  calculationLines?: string[];
  isScored: boolean;
};

export type DecisionRow = {
  id: string;
  applicationId: number;
  company: string;
  role: string;
  score: number;
  rank: number;
  categories: CategoryScore[];
  immigrationLabel: string;
  workModeLabel: string;
  financialValue: number;
  hasImmigrationSignal: boolean;
  offer: Offer | SimulatedOffer;
  isSimulated: boolean;
};

export const DEFAULT_WEIGHTS: Record<CategoryKey, number> = {
  financial: 44,
  workLife: 19,
  growth: 15,
  location: 10,
  brand: 6,
  team: 6,
};

export const CATEGORY_KEYS: CategoryKey[] = [
  'financial',
  'workLife',
  'growth',
  'location',
  'brand',
  'team',
];

export const normalizeScoreWeights = (value: unknown): Record<CategoryKey, number> => {
  if (!value || typeof value !== 'object') return DEFAULT_WEIGHTS;

  const raw = value as Record<string, unknown>;
  const next = CATEGORY_KEYS.reduce(
    (acc, key) => {
      const parsed = Number(raw[key]);
      acc[key] = Number.isFinite(parsed) ? clamp(parsed) : DEFAULT_WEIGHTS[key];
      return acc;
    },
    {} as Record<CategoryKey, number>
  );

  const ignoredWeight = Object.entries(raw)
    .filter(([key]) => !CATEGORY_KEYS.includes(key as CategoryKey))
    .reduce((sum, [, item]) => {
      const parsed = Number(item);
      return sum + (Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
    }, 0);

  if (ignoredWeight <= 0) return next;

  const validTotal = CATEGORY_KEYS.reduce((sum, key) => sum + next[key], 0);
  if (validTotal <= 0) return DEFAULT_WEIGHTS;

  let remaining = 100;
  return CATEGORY_KEYS.reduce(
    (acc, key, index) => {
      const value =
        index === CATEGORY_KEYS.length - 1 ? remaining : Math.round((next[key] / validTotal) * 100);
      acc[key] = value;
      remaining -= value;
      return acc;
    },
    {} as Record<CategoryKey, number>
  );
};

// Added only when a visa/GC signal exists; other weights scale down to make room.
export const VISA_OVERLAY_WEIGHT = 20;

export const CATEGORY_LABELS: Record<CategoryKey | 'visa', string> = {
  financial: 'Financial',
  visa: 'Immigration',
  workLife: 'WLB',
  growth: 'Growth',
  location: 'Location',
  brand: 'Brand',
  team: 'Team',
};

export const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeManualScore = (value: unknown) => {
  const parsed = Number(value);
  return parsed >= 1 && parsed <= 5 ? parsed : null;
};

export const scoreFromManual = (value: unknown) => {
  const manual = normalizeManualScore(value);
  return manual ? manual * 20 : null;
};

export const scoreTimeOff = (offer: Offer | SimulatedOffer) => {
  const isUnlimited = Boolean(offer.is_unlimited_pto);
  const sickLeaveIncluded = isUnlimited && offer.sick_leave_included_in_unlimited_pto !== false;
  const ptoDays = isUnlimited ? 25 : clamp(asNumber(offer.pto_days), 0, 60);
  const sickLeaveDays = clamp(
    getCountedSickLeaveDays({
      sickLeaveDays: offer.sick_leave_days,
      isUnlimitedPto: isUnlimited,
      sickLeaveIncludedInUnlimitedPto: offer.sick_leave_included_in_unlimited_pto !== false,
    }),
    0,
    60
  );
  const holidayDays = clamp(asNumber(offer.holiday_days, 11), 0, 30);
  const totalPaidDays = ptoDays + sickLeaveDays + holidayDays;
  const score = clamp((totalPaidDays / 35) * 100);

  return {
    ptoDays,
    sickLeaveDays,
    holidayDays,
    totalPaidDays,
    score,
    label: isUnlimited
      ? sickLeaveIncluded
        ? `Unlimited PTO counted as ${ptoDays} planning days with sick leave included + ${holidayDays} holidays`
        : `Unlimited PTO counted as ${ptoDays} planning days + ${sickLeaveDays} separate sick days + ${holidayDays} holidays`
      : `${ptoDays} PTO days + ${sickLeaveDays} sick days + ${holidayDays} holidays`,
  };
};

export const scoreWorkLife = (offer: Offer | SimulatedOffer, app?: Application) => {
  const manualScore = scoreFromManual(app?.work_life_score);
  const timeOff = scoreTimeOff(offer);

  const flexibleHours =
    app?.flexible_hours_policy || (offer as any).flexible_hours_policy || 'UNKNOWN';
  const travelFreq = app?.travel_frequency || (offer as any).travel_frequency || 'UNKNOWN';

  let hoursAdjustment = 0;
  let hoursText = 'Not specified';
  if (flexibleHours === 'FLEXIBLE') {
    hoursAdjustment = 10;
    hoursText = 'Flexible Hours (Asynchronous) = +10 pts';
  } else if (flexibleHours === 'CORE_HOURS') {
    hoursAdjustment = 5;
    hoursText = 'Core Hours (e.g. 10am-4pm) = +5 pts';
  } else if (flexibleHours === 'STRICT') {
    hoursAdjustment = -10;
    hoursText = 'Strict / Fixed Hours = -10 pts';
  } else {
    hoursText = 'Not specified = 0 pts';
  }

  let travelAdjustment = 0;
  let travelText = 'Not specified';
  if (travelFreq === 'NONE') {
    travelAdjustment = 5;
    travelText = 'No Travel (0%) = +5 pts';
  } else if (travelFreq === 'LOW') {
    travelAdjustment = 0;
    travelText = 'Low Travel (<10%) = 0 pts';
  } else if (travelFreq === 'MEDIUM') {
    travelAdjustment = -10;
    travelText = 'Medium Travel (10-25%) = -10 pts';
  } else if (travelFreq === 'HIGH') {
    travelAdjustment = -20;
    travelText = 'High Travel (>25%) = -20 pts';
  } else {
    travelText = 'Not specified = 0 pts';
  }

  const baseWlb = manualScore != null ? manualScore * 0.7 + timeOff.score * 0.3 : timeOff.score;
  const finalWlb = clamp(baseWlb + hoursAdjustment + travelAdjustment, 0, 100);

  const calculationLines: string[] = [];
  if (manualScore != null) {
    calculationLines.push(
      `Manual WLB: ${app?.work_life_score}/5 x 20 = ${Math.round(manualScore)}`,
      `Time off: ${timeOff.label} = ${timeOff.totalPaidDays} paid days`,
      `Time-off score: ${timeOff.totalPaidDays} / 35 x 100 = ${Math.round(timeOff.score)}`,
      `Base WLB score: ${Math.round(manualScore)} x 70% + ${Math.round(timeOff.score)} x 30% = ${Math.round(baseWlb)}`
    );
  } else {
    calculationLines.push(
      `Time off: ${timeOff.label} = ${timeOff.totalPaidDays} paid days`,
      `Base WLB score (time-off only): ${timeOff.totalPaidDays} / 35 x 100 = ${Math.round(baseWlb)}`
    );
  }

  calculationLines.push(
    `Flexible Hours adjustment: ${hoursText}`,
    `Travel Frequency adjustment: ${travelText}`,
    `Final WLB score: ${Math.round(baseWlb)} + (${hoursAdjustment}) + (${travelAdjustment}) = ${Math.round(finalWlb)}`
  );

  if (manualScore == null) {
    calculationLines.push('No manual WLB signal filled, so WLB uses time-off only.');
  }

  return {
    score: finalWlb,
    detail: `${app?.work_life_score != null ? `${app.work_life_score}/5 manual + ` : ''}${timeOff.totalPaidDays} paid days${hoursAdjustment !== 0 || travelAdjustment !== 0 ? ' (adjusted)' : ''}`,
    calculationLines,
  };
};

export const totalAnnualComp = (offer: Offer | SimulatedOffer) => {
  const base = asNumber(offer.base_salary);
  const bonus = asNumber(offer.bonus);
  const equity = getRealizableEquity(offer);
  const signOn = asNumber(offer.sign_on);
  const benefits = asNumber(offer.benefits_value);
  const relocation = asNumber(offer.relocation_bonus);

  const healthPremiumMonthly = asNumber(offer.health_premium_monthly);
  const hsaEmployerContribution = asNumber(offer.hsa_employer_contribution);
  const healthPremiumAnnual = healthPremiumMonthly * 12;

  const matchPercent = asNumber(offer.forty_one_k_match_percent);
  const maxMatch = asNumber(offer.forty_one_k_max_match);
  const fortyOneKMatchAnnual = base * (maxMatch / 100) * (matchPercent / 100);

  return (
    base +
    bonus +
    equity +
    signOn +
    benefits +
    relocation +
    hsaEmployerContribution +
    fortyOneKMatchAnnual -
    healthPremiumAnnual
  );
};

export const getWorkMode = (app?: Application, offer?: Offer | SimulatedOffer) => {
  const policy =
    app?.rto_policy ||
    (app as any)?.work_mode ||
    (offer as any)?.work_mode ||
    (offer as any)?.rto_policy;

  if (policy && policy !== 'UNKNOWN') {
    const norm = String(policy).toUpperCase().trim();
    if (norm === 'REMOTE') return 'REMOTE';
    if (norm === 'ONSITE' || norm === 'IN_PERSON' || norm === 'OFFICE') return 'ONSITE';
    if (norm === 'HYBRID') return 'HYBRID';
  }

  const rtoDays = app?.rto_days_per_week ?? (offer as any)?.rto_days_per_week;
  if (rtoDays === 0) return 'REMOTE';
  if (rtoDays === 5) return 'ONSITE';
  if (typeof rtoDays === 'number' && rtoDays > 0) return 'HYBRID';

  return 'HYBRID';
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(value));

export const signedCurrency = (value: number) => {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? '+' : '−'}${formatCurrency(Math.abs(rounded))}`;
};

export const buildFinancialCalculationLines = ({
  offer,
  metrics,
  financialValue,
  financialScore,
}: {
  offer: Offer | SimulatedOffer;
  metrics?: Partial<AdjustedOfferMetrics>;
  financialValue: number;
  financialScore: number;
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
    `After tax: base ${formatCurrency(afterTaxBase)}, bonus ${formatCurrency(
      afterTaxBonus
    )}, sign-on ${formatCurrency(afterTaxSignOn)}, relocation ${formatCurrency(
      afterTaxRelocation
    )}, equity ${formatCurrency(afterTaxEquity)}, benefits ${formatCurrency(
      afterTaxBenefits
    )}, HSA +${formatCurrency(afterTaxHsa)}, 401(k) +${formatCurrency(fortyOneKMatchAnnual)}`,
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
    `Financial score: 100 x ln(1 + ${formatCurrency(
      financialValue
    )} / ${formatCurrency(FINANCIAL_SCORE_LOG_SCALE)}) / ln(1 + ${formatCurrency(
      FINANCIAL_SCORE_REFERENCE_VALUE
    )} / ${formatCurrency(FINANCIAL_SCORE_LOG_SCALE)}) = ${Math.round(
      financialScore
    )} (${formatCurrency(FINANCIAL_SCORE_REFERENCE_VALUE)} benchmark = 100; uncapped logarithmic score)`,
  ];
};

export const scoreVisa = (app?: Application) => {
  const sponsorship =
    app?.visa_sponsorship && app.visa_sponsorship !== 'UNKNOWN' ? app.visa_sponsorship : '';
  const dayOneGc = app?.day_one_gc && app.day_one_gc !== 'UNKNOWN' ? app.day_one_gc : '';
  const baseByStatus: Record<VisaSponsorshipStatus, number> = {
    '': 55,
    NOT_NEEDED: 100,
    AVAILABLE: 84,
    TRANSFER_ONLY: 68,
    UNKNOWN: 55,
    NOT_AVAILABLE: 20,
  };

  let score = baseByStatus[sponsorship];
  if (dayOneGc === 'YES') score = Math.max(score, 94);
  if (dayOneGc === 'NO' && (sponsorship === 'AVAILABLE' || sponsorship === 'TRANSFER_ONLY'))
    score -= 8;
  if (dayOneGc === 'NOT_APPLICABLE' && sponsorship === 'NOT_NEEDED') score = 100;

  return clamp(score);
};

export const hasImmigrationSignal = (app?: Application) =>
  Boolean(
    (app?.visa_sponsorship && app.visa_sponsorship !== 'UNKNOWN') ||
    (app?.day_one_gc && app.day_one_gc !== 'UNKNOWN')
  );

export const scoreLocationWithBreakdown = (app?: Application) => {
  const workMode = getWorkMode(app);
  const rtoDays = clamp(
    asNumber(app?.rto_days_per_week, workMode === 'ONSITE' ? 5 : workMode === 'REMOTE' ? 0 : 3),
    0,
    5
  );
  const commute = summariseCommute(
    (app as { commute_options?: CommuteOption[] } | undefined)?.commute_options,
    {
      workMode,
      rtoDaysPerWeek: rtoDays,
      ptoDays: asNumber((app as { pto_days?: number } | undefined)?.pto_days, 15),
      holidayDays: asNumber((app as { holiday_days?: number } | undefined)?.holiday_days, 11),
    }
  );
  // Same office-day count as time, so a hybrid role is not charged for five days.
  const commuteAnnual = commute.primary
    ? commute.annualCost
    : (app?.commute_cost_frequency || 'MONTHLY') === 'DAILY'
      ? asNumber(app?.commute_cost_value) * commute.officeDays
      : annualizeAmount(
          asNumber(app?.commute_cost_value),
          app?.commute_cost_frequency || 'MONTHLY'
        );
  const base =
    workMode === 'REMOTE' ? 90 : workMode === 'HYBRID' ? 76 : workMode === 'ONSITE' ? 62 : 66;
  const commutePenalty = clamp(commuteAnnual / 1000, 0, 18);
  // Replaces the days-per-week proxy rather than stacking, so one commute is not punished twice.
  const hasTime = !!commute.primary && commute.annualHours > 0;
  const timePenalty = hasTime ? clamp(commute.annualHours / 15, 0, 20) : 0;
  const rtoPenalty = hasTime || workMode === 'REMOTE' ? 0 : Math.max(0, rtoDays - 2) * 2;
  const score = clamp(base - commutePenalty - rtoPenalty - timePenalty);

  return {
    score,
    calculationLines: [
      `Work mode base: ${workMode} = ${base}`,
      `Commute penalty: ${formatCurrency(commuteAnnual)} annual / 1000 = ${commutePenalty.toFixed(
        1
      )}, capped at 18`,
      hasTime
        ? `Commute time penalty: ${Math.round(commute.annualHours)} hrs/yr / 15 = ${timePenalty.toFixed(1)}, capped at 20`
        : `RTO penalty: max(0, ${rtoDays} days - 2) x 2 = ${rtoPenalty.toFixed(1)}`,
      `Location score: ${base} - ${commutePenalty.toFixed(1)} - ${(hasTime
        ? timePenalty
        : rtoPenalty
      ).toFixed(1)} = ${Math.round(score)}`,
    ],
  };
};
