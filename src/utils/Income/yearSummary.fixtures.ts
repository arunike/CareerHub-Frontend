import { DEFAULT_SETTINGS } from './incomeSettings';
import type { IncomeSettings } from './incomeSettings';
import type { IncomeSource } from './incomeSources';
import type { RoleEarnings } from './yearSummary';
import { DEFAULT_STATE_NAME_TO_ABBR } from '../OfferComparison/calculations';

export const source = (overrides: Partial<IncomeSource> = {}): IncomeSource => ({
  key: 'experience-1',
  kind: 'experience',
  payFrom: 'role',
  isCurrent: false,
  company: 'Google',
  roleTitle: 'Software Engineer',
  location: 'Mountain View, CA, United States',
  startDate: '2025-01-01',
  endDate: null,
  annualSalary: 160000,
  bonus: 0,
  totalGrant: 0,
  paychecksPerYear: 26,
  premiumsPerPeriod: 0,
  medicalPerPeriod: 0,
  dentalPerPeriod: 0,
  visionPerPeriod: 0,
  dependentPerPeriod: 0,
  hasDependents: false,
  offerId: null,
  dependentMedicalPerPeriod: 0,
  dependentDentalPerPeriod: 0,
  dependentVisionPerPeriod: 0,
  employer: { match401kPercent: 0, match401kLimitPercent: 0, hsaAnnual: 0 },
  cliffMonths: 12,
  vestsPerYear: 4,
  vestingYears: 4,
  raises: [],
  hasBenefitData: true,
  ...overrides,
});

export const context = {
  stateNames: DEFAULT_STATE_NAME_TO_ABBR,
  stateTaxRates: {},
};

export const resolver =
  (settings: Partial<IncomeSettings> = {}) =>
  () => ({
    ...DEFAULT_SETTINGS,
    ...settings,
  });
export const roleEarnings = (overrides: Partial<RoleEarnings> = {}): RoleEarnings =>
  ({
    sourceKey: 'experience-1',
    company: 'Google',
    roleTitle: 'Software Engineer',
    paychecks: 26,
    electiveLimit: 24500,
    startingBalance: null,
    currentValue: null,
    contributedToDate: 0,
    employee401k: 0,
    employerMatch: 0,
    gross: 0,
    bonus: 0,
    equityVested: 0,
    taxWithheld: 0,
    deductions: 0,
    takeHome: 0,
    totalComp: 0,
    supplementalGross: 0,
    taxableAllowance: 0,
    taxFreeAllowance: 0,
    section125: 0,
    hsa: 0,
    pretax401k: 0,
    pretaxIncomeOnly: 0,
    roth401k: 0,
    postTax: 0,
    federalTax: 0,
    stateTax: 0,
    payrollTax: 0,
    ...overrides,
  }) as RoleEarnings;
