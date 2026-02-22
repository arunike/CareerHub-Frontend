export type MaritalStatus =
  | 'SINGLE'
  | 'MARRIED_FILING_JOINTLY'
  | 'MARRIED_FILING_SEPARATELY'
  | 'HEAD_OF_HOUSEHOLD';

export interface MaritalStatusOption {
  code: MaritalStatus;
  label: string;
}

export interface BenefitItem {
  id: string;
  label: string;
  amount: number;
  frequency: 'MONTHLY' | 'YEARLY';
}

export interface SimulatedOffer {
  id: string;
  application?: number | null;
  custom_company_name?: string;
  custom_role_title?: string;
  base_salary: number;
  bonus: number;
  equity: number;
  sign_on: number;
  benefits_value: number;
  work_mode: 'REMOTE' | 'HYBRID' | 'ONSITE';
  rto_days_per_week: number;
  free_food: boolean;
  commute_monthly_cost: number;
  wellness_stipend: number;
  wlb_score: number;
}

export interface OfferLike {
  id?: number;
  application: number;
  base_salary: number;
  bonus: number;
  equity: number;
  sign_on: number;
  benefits_value: number;
  pto_days: number;
  is_current: boolean;
  created_at?: string;
  [key: string]: unknown;
}

export interface ApplicationLike {
  id: number;
  company_name: string;
  role_title: string;
  location?: string;
  rto_policy?: string;
  rto_days_per_week?: number;
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
  AL: 89, AK: 128, AZ: 104, AR: 88, CA: 134, CO: 112, CT: 115, DE: 103, FL: 102, GA: 97,
  HI: 186, ID: 101, IL: 101, IN: 90, IA: 89, KS: 90, KY: 91, LA: 92, ME: 108, MD: 112,
  MA: 123, MI: 92, MN: 98, MS: 86, MO: 90, MT: 101, NE: 92, NV: 105, NH: 111, NJ: 118,
  NM: 94, NY: 123, NC: 95, ND: 95, OH: 91, OK: 89, OR: 113, PA: 99, RI: 109, SC: 94,
  SD: 94, TN: 91, TX: 97, UT: 104, VT: 110, VA: 105, WA: 114, WV: 89, WI: 95, WY: 97, DC: 152,
};

export const DEFAULT_STATE_TAX_RATE: Record<string, number> = {
  AK: 0, FL: 0, NV: 0, SD: 0, TN: 0, TX: 0, WA: 0, WY: 0, NH: 0, AL: 4.5, AZ: 2.5,
  AR: 4.4, CA: 8.5, CO: 4.4, CT: 5.0, DE: 5.0, GA: 5.2, HI: 7.0, ID: 5.8, IL: 4.95,
  IN: 3.15, IA: 4.5, KS: 5.2, KY: 4.0, LA: 3.5, ME: 6.0, MD: 5.0, MA: 5.0, MI: 4.25,
  MN: 6.2, MS: 4.7, MO: 4.9, MT: 5.5, NE: 5.8, NJ: 6.0, NM: 4.7, NY: 6.8, NC: 4.5,
  ND: 2.5, OH: 3.5, OK: 4.8, OR: 7.8, PA: 3.07, RI: 5.0, SC: 5.4, UT: 4.85, VT: 6.0,
  VA: 4.8, WV: 4.5, WI: 5.1, DC: 7.0,
};

export const DEFAULT_STATE_NAME_TO_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA',
  Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT',
  Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
  Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI',
  Wyoming: 'WY', 'District of Columbia': 'DC',
};

export const getDefaultLifestyleByWorkMode = (workMode: SimulatedOffer['work_mode']) => {
  if (workMode === 'REMOTE') return { remoteBonus: 8000, rtoPenalty: 0 };
  if (workMode === 'HYBRID') return { remoteBonus: 3000, rtoPenalty: 3600 };
  return { remoteBonus: 0, rtoPenalty: 6000 };
};

export const calculateScenarioValue = ({
  base_salary,
  bonus,
  sign_on,
  benefits_value,
  equity,
  work_mode,
  rto_days_per_week,
  free_food,
  commute_monthly_cost,
  wellness_stipend,
  wlb_score,
  baseTaxRate,
  bonusTaxRate,
  equityTaxRate,
  equityRealization,
  costOfLivingIndex,
}: {
  base_salary: number;
  bonus: number;
  sign_on: number;
  benefits_value: number;
  equity: number;
  work_mode: SimulatedOffer['work_mode'];
  rto_days_per_week: number;
  free_food: boolean;
  commute_monthly_cost: number;
  wellness_stipend: number;
  wlb_score: number;
  baseTaxRate: number;
  bonusTaxRate: number;
  equityTaxRate: number;
  equityRealization: number;
  costOfLivingIndex: number;
}) => {
  const taxedBase = Number(base_salary) * (1 - baseTaxRate / 100);
  const taxedBenefits = Number(benefits_value) * (1 - baseTaxRate / 100);
  const taxedBonus = (Number(bonus) + Number(sign_on)) * (1 - bonusTaxRate / 100);
  const taxedEquity = Number(equity) * (equityRealization / 100) * (1 - equityTaxRate / 100);
  const purchasingPowerAdjusted =
    (taxedBase + taxedBenefits + taxedBonus + taxedEquity) * (100 / costOfLivingIndex);

  const lifestyleDefault = getDefaultLifestyleByWorkMode(work_mode);
  const rtoPenalty = Number(rto_days_per_week) * 1200 || lifestyleDefault.rtoPenalty;
  const remoteBonus = lifestyleDefault.remoteBonus;
  const freeFoodBonus = free_food ? 2500 : 0;
  const commutePenalty = Number(commute_monthly_cost) * 12;
  const wellnessBonus = Number(wellness_stipend) || 0;
  const wlbBonus = (Number(wlb_score) - 5) * 1500;
  const lifestyleAdjustment =
    remoteBonus + freeFoodBonus + wellnessBonus + wlbBonus - rtoPenalty - commutePenalty;

  return {
    adjustedValue: purchasingPowerAdjusted + lifestyleAdjustment,
    lifestyleAdjustment,
  };
};

export const computeBenefitsTotal = (items: BenefitItem[]) =>
  items.reduce((sum, item) => {
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

export const calculateProgressiveTax = (income: number, brackets: Array<{ cap: number; rate: number }>) => {
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
