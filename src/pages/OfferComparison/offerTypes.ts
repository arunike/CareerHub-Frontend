import type { CommuteOption } from './commute';
import type { FilingStatus } from '../../types/tax';
import { calculateProgressiveTax, extractStateAbbr } from '../../utils/taxMath';

export type MaritalStatus = FilingStatus;
export { calculateProgressiveTax, extractStateAbbr };

export type VisaSponsorshipStatus =
  | ''
  | 'UNKNOWN'
  | 'NOT_NEEDED'
  | 'AVAILABLE'
  | 'TRANSFER_ONLY'
  | 'NOT_AVAILABLE';

export type DayOneGcStatus = '' | 'UNKNOWN' | 'YES' | 'NO' | 'NOT_APPLICABLE';

import type { FinalDecisionStatus, NegotiationRound } from './offerLifecycle';

export interface MaritalStatusOption {
  code: MaritalStatus;
  label: string;
}

export interface BenefitItem {
  id: string;
  label: string;
  amount: number;
  frequency: 'MONTHLY' | 'YEARLY';
  is_taxable?: boolean;
}

export interface SimulatedOffer {
  id: string;
  application?: number | null;
  custom_company_name?: string;
  custom_role_title?: string;
  location?: string;
  office_location?: string;
  base_salary: number;
  bonus: number;
  equity: number;
  equity_total_grant?: number;
  equity_vesting_percent?: number;
  equity_vesting_schedule?: number[];
  equity_liquidity?: 'LIQUID' | 'BUYBACK' | 'ILLIQUID';
  equity_buyback_value?: number;
  sign_on: number;
  // Per-year amounts; empty means the whole sign-on lands in year 1.
  sign_on_schedule?: number[];
  benefits_value: number;
  benefit_items?: BenefitItem[];
  work_mode: 'REMOTE' | 'HYBRID' | 'ONSITE';
  rto_days_per_week: number;
  commute_cost_value: number;
  commute_options?: CommuteOption[];
  commute_cost_frequency: 'DAILY' | 'MONTHLY' | 'YEARLY';
  free_food_perk_value: number;
  free_food_perk_frequency: 'DAILY' | 'MONTHLY' | 'YEARLY';
  free_food_meals?: unknown[];
  free_food_value_per_meal?: number | null;
  pto_days: number;
  is_unlimited_pto?: boolean;
  sick_leave_days: number;
  sick_leave_included_in_unlimited_pto?: boolean;
  holiday_days: number;
  tax_base_rate?: number;
  tax_bonus_rate?: number;
  tax_equity_rate?: number;
  monthly_rent?: number;
  health_premium_monthly?: number | string;
  hsa_employer_contribution?: number | string;
  health_plan_type?: string;
  health_oop_max?: number | string;
  health_deductible?: number | string;
  health_family_oop_max?: number | string;
  health_pcp_copay?: number | string;
  health_specialist_copay?: number | string;
  rx_specialty_coverage_type?: 'COPAY' | 'COINSURANCE';
  rx_rinvoq_copay?: number;
  rx_copay_assistance_counts_to_oop?: boolean;
  paychecks_per_year?: number;
  health_premium_paycheck?: number | string;
  dental_premium_paycheck?: number | string;
  vision_premium_paycheck?: number | string;
  dental_plan_name?: string;
  dental_monthly_premium?: number | string;
  dental_annual_max?: number | string;
  dental_deductible?: number | string;
  vision_plan_name?: string;
  vision_monthly_premium?: number | string;
  vision_frames_allowance?: number | string;
  vision_contacts_allowance?: number | string;
  // Dependent Coverage
  has_dependents?: boolean;
  dependent_coverage_tier?: string;
  dependent_count?: number;
  health_family_deductible?: number | string;
  dependent_health_premium_paycheck?: number | string;
  dependent_dental_premium_paycheck?: number | string;
  dependent_vision_premium_paycheck?: number | string;
  forty_one_k_match_percent?: number | string;
  forty_one_k_max_match?: number | string;
  relocation_bonus?: number | string;
  flexible_hours_policy?: string;
  travel_frequency?: string;
}

export const OFFER_STATUS_FILTERS = ['all', 'active', 'past', 'rejected'] as const;

export type OfferStatusFilter = (typeof OFFER_STATUS_FILTERS)[number];

export interface LinkedExperience {
  id: number;
  title: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
}

export interface OfferLike {
  id?: number;
  linked_experience?: LinkedExperience | null;
  application: number;
  application_details?: { company: string; role_title: string };
  // ISO date the offer expires, e.g. '2026-08-14'.
  deadline?: string | null;
  negotiation_rounds?: NegotiationRound[];
  risk_notes?: string;
  final_decision_status?: FinalDecisionStatus;
  final_decision_reasoning?: string;
  base_salary: number;
  bonus: number;
  equity: number;
  equity_total_grant?: number;
  equity_vesting_percent?: number;
  equity_vesting_schedule?: number[];
  equity_liquidity?: 'LIQUID' | 'BUYBACK' | 'ILLIQUID';
  equity_buyback_value?: number;
  annual_refresh_value?: number;
  refresh_starts_year?: number;
  sign_on: number;
  // Per-year amounts; empty means the whole sign-on lands in year 1.
  sign_on_schedule?: number[];
  benefits_value: number;
  benefit_items?: BenefitItem[];
  pto_days: number;
  is_unlimited_pto?: boolean;
  sick_leave_days?: number;
  sick_leave_included_in_unlimited_pto?: boolean;
  holiday_days?: number;
  is_current: boolean;
  created_at?: string;
  paychecks_per_year?: number;
  health_premium_paycheck?: number | string;
  health_premium_monthly?: number | string;
  hsa_employer_contribution?: number | string;
  health_plan_type?: string;
  health_oop_max?: number | string;
  health_deductible?: number | string;
  health_family_oop_max?: number | string;
  health_pcp_copay?: number | string;
  health_specialist_copay?: number | string;
  dental_plan_name?: string;
  dental_premium_paycheck?: number | string;
  dental_monthly_premium?: number | string;
  dental_annual_max?: number | string;
  dental_deductible?: number | string;
  vision_plan_name?: string;
  vision_premium_paycheck?: number | string;
  vision_monthly_premium?: number | string;
  vision_frames_allowance?: number | string;
  vision_contacts_allowance?: number | string;
  // Dependent Coverage
  has_dependents?: boolean;
  dependent_coverage_tier?: string;
  dependent_count?: number;
  health_family_deductible?: number | string;
  dependent_health_premium_paycheck?: number | string;
  dependent_dental_premium_paycheck?: number | string;
  dependent_vision_premium_paycheck?: number | string;
  forty_one_k_match_percent?: number | string;
  forty_one_k_max_match?: number | string;
  relocation_bonus?: number | string;
  [key: string]: unknown;
}

export interface ApplicationLike {
  id: number;
  company_name: string;
  role_title: string;
  // When the application was submitted — the year an offer is grouped under.
  date_applied?: string | null;
  location?: string;
  office_location?: string;
  is_locked?: boolean;
  rto_policy?: string;
  rto_days_per_week?: number;
  work_mode?: string;
  commute_cost_value?: number;
  commute_cost_frequency?: 'DAILY' | 'MONTHLY' | 'YEARLY';
  commute_options?: CommuteOption[];
  free_food_perk_value?: number;
  free_food_perk_frequency?: 'DAILY' | 'MONTHLY' | 'YEARLY';
  free_food_meals?: unknown[];
  free_food_value_per_meal?: number | null;
  tax_base_rate?: number;
  tax_bonus_rate?: number;
  tax_equity_rate?: number;
  monthly_rent_override?: number;
  visa_sponsorship?: VisaSponsorshipStatus;
  day_one_gc?: DayOneGcStatus;
  flexible_hours_policy?: string;
  travel_frequency?: string;
  growth_score?: number | null;
  work_life_score?: number | null;
  brand_score?: number | null;
  team_score?: number | null;
  level?: string;
  status?: string;
}
