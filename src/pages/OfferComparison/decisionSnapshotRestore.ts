import type { OfferDecisionSnapshot } from '../../api';
import type {
  ApplicationLike as Application,
  BenefitItem,
  OfferLike as Offer,
} from './calculations';
import { normalizeEquityLiquidity } from './equityLiquidity';

const normalizeBenefitItem = (item: Partial<BenefitItem>, fallbackId: string): BenefitItem => ({
  id: item.id || fallbackId,
  label: item.label || '',
  amount: Number(item.amount) || 0,
  frequency: item.frequency === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
  is_taxable: Boolean(item.is_taxable),
});

const snapshotValue = (snapshot: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(snapshot, key) ? snapshot[key] : undefined;

export const buildSnapshotRestorePatches = (
  snapshot: OfferDecisionSnapshot,
  targetOffer: Offer
) => {
  const offerSnapshot = snapshot.offer_snapshot || {};
  const adjustmentSnapshot = snapshot.adjustment_snapshot || {};
  const restoredBenefitItems =
    Array.isArray(offerSnapshot.benefit_items) && offerSnapshot.benefit_items.length > 0
      ? offerSnapshot.benefit_items.map((item, idx) =>
          normalizeBenefitItem(
            item as Partial<BenefitItem>,
            `snapshot-benefit-${snapshot.id}-${idx}`
          )
        )
      : [
          {
            id: `snapshot-benefit-${snapshot.id}`,
            label: 'Benefits',
            amount: Number(offerSnapshot.benefits_value ?? targetOffer.benefits_value ?? 0),
            frequency: 'YEARLY' as const,
          },
        ];

  const offerPatch = {
    base_salary: Number(offerSnapshot.base_salary ?? targetOffer.base_salary),
    bonus: Number(offerSnapshot.bonus ?? targetOffer.bonus),
    equity: Number(offerSnapshot.equity ?? targetOffer.equity),
    equity_total_grant:
      offerSnapshot.equity_total_grant == null
        ? targetOffer.equity_total_grant
        : Number(offerSnapshot.equity_total_grant),
    equity_vesting_percent:
      offerSnapshot.equity_vesting_percent == null
        ? targetOffer.equity_vesting_percent
        : Number(offerSnapshot.equity_vesting_percent),
    equity_vesting_schedule: Array.isArray(offerSnapshot.equity_vesting_schedule)
      ? offerSnapshot.equity_vesting_schedule.map(Number)
      : targetOffer.equity_vesting_schedule,
    equity_liquidity: normalizeEquityLiquidity(
      offerSnapshot.equity_liquidity ?? targetOffer.equity_liquidity
    ),
    equity_buyback_value: Number(
      offerSnapshot.equity_buyback_value ?? targetOffer.equity_buyback_value ?? 0
    ),
    sign_on: Number(offerSnapshot.sign_on ?? targetOffer.sign_on),
    benefits_value: Number(offerSnapshot.benefits_value ?? targetOffer.benefits_value),
    benefit_items: restoredBenefitItems,
    pto_days: Number(offerSnapshot.pto_days ?? targetOffer.pto_days),
    is_unlimited_pto: Boolean(offerSnapshot.is_unlimited_pto ?? targetOffer.is_unlimited_pto),
    sick_leave_days: Number(offerSnapshot.sick_leave_days ?? targetOffer.sick_leave_days ?? 0),
    sick_leave_included_in_unlimited_pto:
      (offerSnapshot.sick_leave_included_in_unlimited_pto ??
        targetOffer.sick_leave_included_in_unlimited_pto ??
        true) !== false,
    holiday_days:
      offerSnapshot.holiday_days == null
        ? targetOffer.holiday_days
        : Number(offerSnapshot.holiday_days),
    health_premium_monthly: Number(
      offerSnapshot.health_premium_monthly ?? targetOffer.health_premium_monthly ?? 0
    ),
    hsa_employer_contribution: Number(
      offerSnapshot.hsa_employer_contribution ?? targetOffer.hsa_employer_contribution ?? 0
    ),
    health_plan_type: String(offerSnapshot.health_plan_type ?? targetOffer.health_plan_type ?? ''),
    health_oop_max: Number(offerSnapshot.health_oop_max ?? targetOffer.health_oop_max ?? 0),
    forty_one_k_match_percent: Number(
      offerSnapshot.forty_one_k_match_percent ?? targetOffer.forty_one_k_match_percent ?? 0
    ),
    forty_one_k_max_match: Number(
      offerSnapshot.forty_one_k_max_match ?? targetOffer.forty_one_k_max_match ?? 0
    ),
    relocation_bonus: Number(offerSnapshot.relocation_bonus ?? targetOffer.relocation_bonus ?? 0),
  };

  const applicationPatch: Record<string, unknown> = {
    company_name: typeof offerSnapshot.company === 'string' ? offerSnapshot.company : undefined,
    role_title: typeof offerSnapshot.role === 'string' ? offerSnapshot.role : undefined,
    office_location:
      typeof offerSnapshot.office_location === 'string' ? offerSnapshot.office_location : undefined,
    rto_policy: (snapshotValue(adjustmentSnapshot, 'rto_policy') ??
      snapshotValue(offerSnapshot, 'work_mode')) as Application['rto_policy'],
    flexible_hours_policy: (snapshotValue(adjustmentSnapshot, 'flexible_hours_policy') ??
      snapshotValue(offerSnapshot, 'flexible_hours_policy') ??
      'UNKNOWN') as string,
    travel_frequency: (snapshotValue(adjustmentSnapshot, 'travel_frequency') ??
      snapshotValue(offerSnapshot, 'travel_frequency') ??
      'UNKNOWN') as string,
    rto_days_per_week: snapshotValue(adjustmentSnapshot, 'rto_days_per_week') as number | undefined,
    commute_cost_value: snapshotValue(adjustmentSnapshot, 'commute_cost_value') as
      | number
      | undefined,
    commute_cost_frequency: snapshotValue(
      adjustmentSnapshot,
      'commute_cost_frequency'
    ) as Application['commute_cost_frequency'],
    free_food_perk_value: snapshotValue(adjustmentSnapshot, 'free_food_perk_value') as
      | number
      | undefined,
    free_food_perk_frequency: snapshotValue(
      adjustmentSnapshot,
      'free_food_perk_frequency'
    ) as Application['free_food_perk_frequency'],
    tax_base_rate: snapshotValue(adjustmentSnapshot, 'tax_base_rate'),
    tax_bonus_rate: snapshotValue(adjustmentSnapshot, 'tax_bonus_rate'),
    tax_equity_rate: snapshotValue(adjustmentSnapshot, 'tax_equity_rate'),
    monthly_rent_override: snapshotValue(adjustmentSnapshot, 'monthly_rent_override'),
    growth_score: snapshotValue(adjustmentSnapshot, 'growth_score') as number | null | undefined,
    work_life_score: snapshotValue(adjustmentSnapshot, 'work_life_score') as
      | number
      | null
      | undefined,
    brand_score: snapshotValue(adjustmentSnapshot, 'brand_score') as number | null | undefined,
    team_score: snapshotValue(adjustmentSnapshot, 'team_score') as number | null | undefined,
    visa_sponsorship: snapshotValue(
      adjustmentSnapshot,
      'visa_sponsorship'
    ) as Application['visa_sponsorship'],
    day_one_gc: snapshotValue(adjustmentSnapshot, 'day_one_gc') as Application['day_one_gc'],
  };

  return { offerPatch, applicationPatch, offerSnapshot };
};
