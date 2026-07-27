export type MaritalStatus =
  | 'SINGLE'
  | 'MARRIED_FILING_JOINTLY'
  | 'MARRIED_FILING_SEPARATELY'
  | 'HEAD_OF_HOUSEHOLD';

export type VisaSponsorshipStatus =
  | ''
  | 'UNKNOWN'
  | 'NOT_NEEDED'
  | 'AVAILABLE'
  | 'TRANSFER_ONLY'
  | 'NOT_AVAILABLE';

export type DayOneGcStatus = '' | 'UNKNOWN' | 'YES' | 'NO' | 'NOT_APPLICABLE';

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
  benefits_value: number;
  benefit_items?: BenefitItem[];
  work_mode: 'REMOTE' | 'HYBRID' | 'ONSITE';
  rto_days_per_week: number;
  commute_cost_value: number;
  commute_cost_frequency: 'DAILY' | 'MONTHLY' | 'YEARLY';
  free_food_perk_value: number;
  free_food_perk_frequency: 'DAILY' | 'MONTHLY' | 'YEARLY';
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

export interface OfferLike {
  id?: number;
  application: number;
  application_details?: { company: string; role_title: string };
  base_salary: number;
  bonus: number;
  equity: number;
  equity_total_grant?: number;
  equity_vesting_percent?: number;
  equity_vesting_schedule?: number[];
  equity_liquidity?: 'LIQUID' | 'BUYBACK' | 'ILLIQUID';
  equity_buyback_value?: number;
  sign_on: number;
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

export function computeTotalAnnualHealthPremiums(
  offer: Partial<SimulatedOffer | OfferLike>
): number {
  const paychecks = Number(offer.paychecks_per_year) || 26;

  let medicalPaycheck = 0;
  if (
    offer.health_premium_paycheck !== undefined &&
    offer.health_premium_paycheck !== null &&
    Number(offer.health_premium_paycheck) > 0
  ) {
    medicalPaycheck = Number(offer.health_premium_paycheck);
  } else {
    medicalPaycheck = ((Number(offer.health_premium_monthly) || 0) * 12) / paychecks;
  }

  let dentalPaycheck = 0;
  if (
    offer.dental_premium_paycheck !== undefined &&
    offer.dental_premium_paycheck !== null &&
    Number(offer.dental_premium_paycheck) > 0
  ) {
    dentalPaycheck = Number(offer.dental_premium_paycheck);
  } else {
    dentalPaycheck = ((Number(offer.dental_monthly_premium) || 0) * 12) / paychecks;
  }

  let visionPaycheck = 0;
  if (
    offer.vision_premium_paycheck !== undefined &&
    offer.vision_premium_paycheck !== null &&
    Number(offer.vision_premium_paycheck) > 0
  ) {
    visionPaycheck = Number(offer.vision_premium_paycheck);
  } else {
    visionPaycheck = ((Number(offer.vision_monthly_premium) || 0) * 12) / paychecks;
  }

  if (offer.has_dependents) {
    medicalPaycheck += Number(offer.dependent_health_premium_paycheck) || 0;
    dentalPaycheck += Number(offer.dependent_dental_premium_paycheck) || 0;
    visionPaycheck += Number(offer.dependent_vision_premium_paycheck) || 0;
  }

  const medicalAnnual = medicalPaycheck * paychecks;
  const dentalAnnual = dentalPaycheck * paychecks;
  const visionAnnual = visionPaycheck * paychecks;

  return medicalAnnual + dentalAnnual + visionAnnual;
}

export function computeNetAnnualHealthCost(offer: Partial<SimulatedOffer | OfferLike>): number {
  const totalPremiums = computeTotalAnnualHealthPremiums(offer);
  const hsa = Number(offer.hsa_employer_contribution) || 0;
  return Math.max(0, totalPremiums - hsa);
}

export function computeMedicalWorstCaseRisk(offer: Partial<SimulatedOffer | OfferLike>): number {
  const totalPremiums = computeTotalAnnualHealthPremiums(offer);
  const oopMax = offer.has_dependents
    ? Number(offer.health_family_oop_max) || Number(offer.health_oop_max) || 0
    : Number(offer.health_oop_max) || 0;
  const hsa = Number(offer.hsa_employer_contribution) || 0;
  return Math.max(0, totalPremiums + oopMax - hsa);
}

export interface DetailedMedicalBreakdown {
  paychecks: number;
  totalMedPaycheck: number;
  annualMedPrem: number;
  totalDenPaycheck: number;
  annualDenPrem: number;
  totalVisPaycheck: number;
  annualVisPrem: number;
  totalAnnualPremiums: number;
  indDeductible: number;
  famDeductible: number;
  indOopMax: number;
  famOopMax: number;
  effectiveOopMax: number;
  hsaMatch: number;
  pcpCopay: number;
  specCopay: number;
  worstCaseRisk: number;
  hasDependents: boolean;
  dependentTier: string;
  planType: string;
  dentalPlanName: string;
  dentalAnnualMax: number;
  dentalDeductible: number;
  visionPlanName: string;
  visionFramesAllowance: number;
  visionContactsAllowance: number;
}

export function computeDetailedMedicalBreakdown(
  offer: Partial<SimulatedOffer | OfferLike>
): DetailedMedicalBreakdown {
  const paychecks = Number(offer.paychecks_per_year) || 26;

  let medPaycheck = 0;
  if (
    offer.health_premium_paycheck !== undefined &&
    offer.health_premium_paycheck !== null &&
    Number(offer.health_premium_paycheck) > 0
  ) {
    medPaycheck = Number(offer.health_premium_paycheck);
  } else {
    medPaycheck = ((Number(offer.health_premium_monthly) || 0) * 12) / paychecks;
  }

  let denPaycheck = 0;
  if (
    offer.dental_premium_paycheck !== undefined &&
    offer.dental_premium_paycheck !== null &&
    Number(offer.dental_premium_paycheck) > 0
  ) {
    denPaycheck = Number(offer.dental_premium_paycheck);
  } else {
    denPaycheck = ((Number(offer.dental_monthly_premium) || 0) * 12) / paychecks;
  }

  let visPaycheck = 0;
  if (
    offer.vision_premium_paycheck !== undefined &&
    offer.vision_premium_paycheck !== null &&
    Number(offer.vision_premium_paycheck) > 0
  ) {
    visPaycheck = Number(offer.vision_premium_paycheck);
  } else {
    visPaycheck = ((Number(offer.vision_monthly_premium) || 0) * 12) / paychecks;
  }

  if (offer.has_dependents) {
    medPaycheck += Number(offer.dependent_health_premium_paycheck) || 0;
    denPaycheck += Number(offer.dependent_dental_premium_paycheck) || 0;
    visPaycheck += Number(offer.dependent_vision_premium_paycheck) || 0;
  }

  const annualMedPrem = Math.round(medPaycheck * paychecks);
  const annualDenPrem = Math.round(denPaycheck * paychecks);
  const annualVisPrem = Math.round(visPaycheck * paychecks);
  const totalAnnualPremiums = annualMedPrem + annualDenPrem + annualVisPrem;

  const indDeductible = Number(offer.health_deductible) || 0;
  const famDeductible = Number(offer.health_family_deductible) || 0;
  const indOopMax = Number(offer.health_oop_max) || 0;
  const famOopMax = Number(offer.health_family_oop_max) || 0;
  const effectiveOopMax = offer.has_dependents ? famOopMax || indOopMax : indOopMax;

  const hsaMatch = Number(offer.hsa_employer_contribution) || 0;
  const pcpCopay = Number(offer.health_pcp_copay) || 0;
  const specCopay = Number(offer.health_specialist_copay) || 0;

  const worstCaseRisk = Math.max(0, totalAnnualPremiums + effectiveOopMax - hsaMatch);

  return {
    paychecks,
    totalMedPaycheck: Math.round(medPaycheck * 100) / 100,
    annualMedPrem,
    totalDenPaycheck: Math.round(denPaycheck * 100) / 100,
    annualDenPrem,
    totalVisPaycheck: Math.round(visPaycheck * 100) / 100,
    annualVisPrem,
    totalAnnualPremiums,
    indDeductible,
    famDeductible,
    indOopMax,
    famOopMax,
    effectiveOopMax,
    hsaMatch,
    pcpCopay,
    specCopay,
    worstCaseRisk,
    hasDependents: !!offer.has_dependents,
    dependentTier: offer.dependent_coverage_tier || 'EMPLOYEE_SPOUSE',
    planType: offer.health_plan_type || 'Standard Plan',
    dentalPlanName: offer.dental_plan_name || '',
    dentalAnnualMax: Number(offer.dental_annual_max) || 0,
    dentalDeductible: Number(offer.dental_deductible) || 0,
    visionPlanName: offer.vision_plan_name || '',
    visionFramesAllowance: Number(offer.vision_frames_allowance) || 0,
    visionContactsAllowance: Number(offer.vision_contacts_allowance) || 0,
  };
}

export interface ApplicationLike {
  id: number;
  company_name: string;
  role_title: string;
  location?: string;
  office_location?: string;
  is_locked?: boolean;
  rto_policy?: string;
  rto_days_per_week?: number;
  commute_cost_value?: number;
  commute_cost_frequency?: 'DAILY' | 'MONTHLY' | 'YEARLY';
  free_food_perk_value?: number;
  free_food_perk_frequency?: 'DAILY' | 'MONTHLY' | 'YEARLY';
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

export const DEFAULT_MARITAL_STATUS_OPTIONS: MaritalStatusOption[] = [
  { code: 'SINGLE', label: 'Single' },
  { code: 'MARRIED_FILING_JOINTLY', label: 'Married Filing Jointly' },
  { code: 'MARRIED_FILING_SEPARATELY', label: 'Married Filing Separately' },
  { code: 'HEAD_OF_HOUSEHOLD', label: 'Head of Household' },
];

export const DEFAULT_CITY_COST_OF_LIVING: Record<string, number> = {
  'San Francisco, CA': 168,
  'San Jose, CA': 156,
  'Seattle, WA': 132,
  'New York, NY': 154,
  'Austin, TX': 111,
  'Chicago, IL': 117,
  'Boston, MA': 148,
  'Los Angeles, CA': 149,
  'Atlanta, GA': 104,
  'Denver, CO': 121,
  'Remote / National Average': 100,
};

export const DEFAULT_STATE_COL_BASE: Record<string, number> = {
  AL: 89,
  AK: 128,
  AZ: 104,
  AR: 88,
  CA: 134,
  CO: 112,
  CT: 115,
  DE: 103,
  FL: 102,
  GA: 97,
  HI: 186,
  ID: 101,
  IL: 101,
  IN: 90,
  IA: 89,
  KS: 90,
  KY: 91,
  LA: 92,
  ME: 108,
  MD: 112,
  MA: 123,
  MI: 92,
  MN: 98,
  MS: 86,
  MO: 90,
  MT: 101,
  NE: 92,
  NV: 105,
  NH: 111,
  NJ: 118,
  NM: 94,
  NY: 123,
  NC: 95,
  ND: 95,
  OH: 91,
  OK: 89,
  OR: 113,
  PA: 99,
  RI: 109,
  SC: 94,
  SD: 94,
  TN: 91,
  TX: 97,
  UT: 104,
  VT: 110,
  VA: 105,
  WA: 114,
  WV: 89,
  WI: 95,
  WY: 97,
  DC: 152,
};

export const DEFAULT_STATE_TAX_RATE: Record<string, number> = {
  AK: 0,
  FL: 0,
  NV: 0,
  SD: 0,
  TN: 0,
  TX: 0,
  WA: 0,
  WY: 0,
  NH: 0,
  AL: 4.5,
  AZ: 2.5,
  AR: 4.4,
  CA: 8.5,
  CO: 4.4,
  CT: 5.0,
  DE: 5.0,
  GA: 5.2,
  HI: 7.0,
  ID: 5.8,
  IL: 4.95,
  IN: 3.15,
  IA: 4.5,
  KS: 5.2,
  KY: 4.0,
  LA: 3.5,
  ME: 6.0,
  MD: 5.0,
  MA: 5.0,
  MI: 4.25,
  MN: 6.2,
  MS: 4.7,
  MO: 4.9,
  MT: 5.5,
  NE: 5.8,
  NJ: 6.0,
  NM: 4.7,
  NY: 6.8,
  NC: 4.5,
  ND: 2.5,
  OH: 3.5,
  OK: 4.8,
  OR: 7.8,
  PA: 3.07,
  RI: 5.0,
  SC: 5.4,
  UT: 4.85,
  VT: 6.0,
  VA: 4.8,
  WV: 4.5,
  WI: 5.1,
  DC: 7.0,
};

export const DEFAULT_STATE_NAME_TO_ABBR: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
  'District of Columbia': 'DC',
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

export const extractStateAbbr = (city: string, stateNameToAbbr: Record<string, string>) => {
  const abbrMatch = city.match(/,\s*([A-Z]{2})(?:\b|$)/);
  if (abbrMatch?.[1]) return abbrMatch[1];
  const stateName = Object.keys(stateNameToAbbr).find((name) => city.includes(name));
  return stateName ? stateNameToAbbr[stateName] : '';
};

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

export const calculateProgressiveTax = (
  income: number,
  brackets: Array<{ cap: number; rate: number }>
) => {
  let tax = 0;
  let previousCap = 0;
  for (const bracket of brackets) {
    if (income <= previousCap) break;
    const taxableAmount = Math.min(income, bracket.cap) - previousCap;
    tax += taxableAmount * bracket.rate;
    previousCap = bracket.cap;
  }
  return tax;
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
