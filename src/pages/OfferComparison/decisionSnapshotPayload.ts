import type { OfferDecisionSnapshotPayload } from '../../api';
import type { DecisionRow } from './decisionScoring';
import {
  type ApplicationLike as Application,
  type OfferLike as Offer,
  annualizeAmount,
} from './calculations';
import { getRealizableEquity, normalizeEquityLiquidity } from './equityLiquidity';
import type { AdjustedOfferMetrics } from './types';

export const buildDecisionSnapshotPayload = (
  offer: Offer,
  row: DecisionRow,
  {
    applicationsById,
    adjustedByOfferId,
    maritalStatus,
    referenceLocation,
  }: {
    applicationsById: Record<number, Application>;
    adjustedByOfferId: Record<string, AdjustedOfferMetrics | undefined>;
    maritalStatus: string;
    referenceLocation: string;
  }
): Partial<OfferDecisionSnapshotPayload> | null => {
  if (!offer.id) return null;
  const application = applicationsById[offer.application];
  const metrics = adjustedByOfferId[offer.id];
  const base = Number(offer.base_salary || 0);
  const matchPercent = Number(offer.forty_one_k_match_percent || 0);
  const maxMatch = Number(offer.forty_one_k_max_match || 0);
  const fortyOneKMatchValue = base * (maxMatch / 100) * (matchPercent / 100);
  const healthPremiumAnnual = Number(offer.health_premium_monthly || 0) * 12;

  const totalComp =
    base +
    Number(offer.bonus || 0) +
    getRealizableEquity(offer) +
    Number(offer.sign_on || 0) +
    Number(offer.benefits_value || 0) +
    Number(offer.relocation_bonus || 0) +
    Number(offer.hsa_employer_contribution || 0) +
    fortyOneKMatchValue -
    healthPremiumAnnual;
  const titleDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    offer: offer.id,
    title: `${application?.company_name || offer.application_details?.company || 'Offer'} decision - ${titleDate}`,
    notes: '',
    decision_score: row.score ?? null,
    rank: row.rank ?? null,
    total_comp: totalComp.toFixed(2),
    adjusted_value: metrics?.adjustedValue != null ? metrics.adjustedValue.toFixed(2) : null,
    monthly_rent: metrics?.monthlyRent != null ? metrics.monthlyRent.toFixed(2) : null,
    commute_cost_annual: annualizeAmount(
      Number(application?.commute_cost_value || 0),
      application?.commute_cost_frequency || 'MONTHLY'
    ).toFixed(2),
    tax_snapshot: {
      base: metrics?.usedBaseTaxRate ?? application?.tax_base_rate ?? null,
      bonus: metrics?.usedBonusTaxRate ?? application?.tax_bonus_rate ?? null,
      equity: metrics?.usedEquityTaxRate ?? application?.tax_equity_rate ?? null,
    },
    score_categories: row.categories || [],
    offer_snapshot: {
      company: application?.company_name || offer.application_details?.company || '',
      role: application?.role_title || offer.application_details?.role_title || '',
      base_salary: offer.base_salary,
      bonus: offer.bonus,
      equity: offer.equity,
      equity_total_grant: offer.equity_total_grant,
      equity_vesting_percent: offer.equity_vesting_percent,
      equity_vesting_schedule: offer.equity_vesting_schedule || [],
      equity_liquidity: normalizeEquityLiquidity(offer.equity_liquidity),
      equity_buyback_value: Number(offer.equity_buyback_value) || 0,
      sign_on: offer.sign_on,
      benefits_value: offer.benefits_value,
      benefit_items: offer.benefit_items || [],
      pto_days: offer.pto_days,
      is_unlimited_pto: offer.is_unlimited_pto || false,
      sick_leave_days: Number(offer.sick_leave_days) || 0,
      sick_leave_included_in_unlimited_pto: offer.sick_leave_included_in_unlimited_pto !== false,
      holiday_days: offer.holiday_days || 0,
      work_mode: application?.rto_policy || '',
      office_location: application?.office_location || '',
      health_premium_monthly: offer.health_premium_monthly,
      hsa_employer_contribution: offer.hsa_employer_contribution,
      health_plan_type: offer.health_plan_type,
      health_oop_max: offer.health_oop_max,
      forty_one_k_match_percent: offer.forty_one_k_match_percent,
      forty_one_k_max_match: offer.forty_one_k_max_match,
      relocation_bonus: offer.relocation_bonus,
    },
    adjustment_snapshot: {
      marital_status: maritalStatus,
      reference_location: referenceLocation,
      adjusted_diff: metrics?.adjustedDiff ?? null,
      after_tax_base: metrics?.afterTaxBase ?? null,
      after_tax_bonus: metrics?.afterTaxBonus ?? null,
      after_tax_sign_on: metrics?.afterTaxSignOn ?? null,
      after_tax_equity: metrics?.afterTaxEquity ?? null,
      rto_policy: application?.rto_policy || '',
      rto_days_per_week: application?.rto_days_per_week ?? 0,
      commute_cost_value: application?.commute_cost_value ?? 0,
      commute_cost_frequency: application?.commute_cost_frequency || 'MONTHLY',
      free_food_perk_value: application?.free_food_perk_value ?? 0,
      free_food_perk_frequency: application?.free_food_perk_frequency || 'YEARLY',
      tax_base_rate: application?.tax_base_rate ?? null,
      tax_bonus_rate: application?.tax_bonus_rate ?? null,
      tax_equity_rate: application?.tax_equity_rate ?? null,
      monthly_rent_override: application?.monthly_rent_override ?? null,
      flexible_hours_policy: application?.flexible_hours_policy || '',
      travel_frequency: application?.travel_frequency || '',
      growth_score: application?.growth_score ?? null,
      work_life_score: application?.work_life_score ?? null,
      brand_score: application?.brand_score ?? null,
      team_score: application?.team_score ?? null,
      visa_sponsorship: application?.visa_sponsorship || '',
      day_one_gc: application?.day_one_gc || '',
    },
    is_locked: false,
  };
};
