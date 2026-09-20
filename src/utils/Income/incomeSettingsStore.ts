import { DEFAULT_SETTINGS, type IncomeSettings } from './incomeSettings';
import { normalizeDeferralPlan } from './deferralSchedule';
import { NO_ELECTIONS, type Elections, type IncomeEvent } from './tax/ledger';
import { EMPTY_W4 } from './tax/withholding';
import type { BonusExtra, BonusPayout } from './bonusSchedule';
import type { CustomDeduction } from './deductions';
import type { Allowance } from './allowances';
import type { MatchTier } from './matchTiers';
import type { PeriodDeductionOverride } from './periodDeductions';
import type { IncomeYearPayload } from '../../api';
import type { SettingsResolver } from './yearSummary';

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Keyed by role as well as year: two roles in the same year have different plans.
export const storageKey = (taxYear: number, sourceKey: string) =>
  `careerhub.income.${taxYear}.${sourceKey}`;

export const readLocal = (taxYear: number, sourceKey: string): IncomeSettings | null => {
  try {
    const raw =
      window.localStorage.getItem(storageKey(taxYear, sourceKey)) ??
      // Settings saved before elections were scoped per role.
      window.localStorage.getItem(`careerhub.income.${taxYear}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IncomeSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      elections: { ...NO_ELECTIONS, ...(parsed.elections ?? {}) },
      w4: { ...EMPTY_W4, ...(parsed.w4 ?? {}) },
    };
  } catch {
    return null;
  }
};

const dismissKey = (taxYear: number, sourceKey: string) =>
  `careerhub.income.driftSeen.${taxYear}.${sourceKey}`;

export const readDismissedDrift = (taxYear: number, sourceKey: string): string | null => {
  try {
    return window.localStorage.getItem(dismissKey(taxYear, sourceKey));
  } catch {
    return null;
  }
};

export const writeDismissedDrift = (taxYear: number, sourceKey: string, signature: string) => {
  try {
    window.localStorage.setItem(dismissKey(taxYear, sourceKey), signature);
  } catch {
    // The prompt simply returns next load.
  }
};

export const writeLocal = (taxYear: number, sourceKey: string, settings: IncomeSettings) => {
  try {
    window.localStorage.setItem(storageKey(taxYear, sourceKey), JSON.stringify(settings));
  } catch {
    // A full or blocked storage quota should not break the page.
  }
};

export const fromPayload = (payload: IncomeYearPayload): Partial<IncomeSettings> => ({
  salaryOverride: payload.salary_override === null ? null : num(payload.salary_override),
  // An absent or empty plan is the default, so an older row reads as "no schedule" not as broken.
  deferralPlan: normalizeDeferralPlan(payload.deferral_plan),
  paychecksPerYearOverride: payload.paychecks_per_year_override ?? null,
  payLagDays: Number(payload.pay_lag_days) || 0,
  firstPayDate: payload.first_pay_date ?? null,
  elections: {
    ...NO_ELECTIONS,
    pretax401kPercent: num(payload.pretax_401k_percent),
    roth401kPercent: num(payload.roth_401k_percent),
    hsaPerPeriod: num(payload.hsa_per_period),
    fsaPerPeriod: num(payload.fsa_per_period),
    postTaxPerPeriod: num(payload.post_tax_deductions_per_period),
    hsaFamilyCoverage: Boolean(payload.hsa_family_coverage),
    age50Plus: Boolean(payload.age_50_plus),
    deferralBase:
      (payload.deferral_base as Elections['deferralBase'] | undefined) ??
      (payload.exclude_allowances_from_deferral_base ? 'NO_ALLOWANCES' : 'ALL'),
  },
  includeBonus: payload.include_bonus ?? false,
  bonusOverride: payload.bonus_override == null ? null : num(payload.bonus_override),
  bonusPayouts: (payload.bonus_payouts ?? []) as unknown as BonusPayout[],
  bonusMultiplierPercent:
    payload.bonus_multiplier_percent == null ? 100 : num(payload.bonus_multiplier_percent),
  bonusExtras: (payload.bonus_extras ?? []) as unknown as BonusExtra[],
  bonusProrated: payload.bonus_prorated ?? true,
  bonusPerformanceYear: payload.bonus_performance_year ?? null,
  includeVestEvents: payload.include_vest_events ?? false,
  totalGrantOverride:
    payload.total_grant_override === null || payload.total_grant_override === undefined
      ? null
      : num(payload.total_grant_override),
  vestsPerYearOverride: payload.vests_per_year_override ?? null,
  cliffMonthsOverride: payload.cliff_months_override ?? null,
  vestingYearsOverride: payload.vesting_years_override ?? null,
  firstVestDate: payload.first_vest_date ?? null,
  // Premiums live on the offer now; these four are an in-session edit buffer, never loaded.
  medicalOverride: null,
  dentalOverride: null,
  visionOverride: null,
  dependentOverride: null,
  dependentMedicalOverride: null,
  dependentDentalOverride: null,
  dependentVisionOverride: null,
  hasDependentsOverride: null,
  customDeductions: (payload.custom_deductions ?? []) as unknown as CustomDeduction[],
  allowances: (payload.allowances ?? []) as unknown as Allowance[],
  matchTiers: payload.match_tiers?.length ? (payload.match_tiers as unknown as MatchTier[]) : null,
  periodDeductions: (payload.period_deductions ?? []) as unknown as PeriodDeductionOverride[],
  extraEvents: (payload.income_events ?? []) as unknown as IncomeEvent[],
  actuals: (payload.actuals ?? []).map((actual) => ({
    periodIndex: actual.period_index,
    gross: actual.actual_gross == null ? null : num(actual.actual_gross),
    net: actual.actual_net == null ? null : num(actual.actual_net),
    note: actual.note ?? '',
    payDate: actual.pay_date ?? null,
  })),
});

// One place decides what a role's settings are for a year: saved record over local draft over default.
export const createSettingsResolver =
  (records: IncomeYearPayload[] | null): SettingsResolver =>
  (year, key) => {
    const match = records?.find((row) => row.tax_year === year && (row.source_key ?? '') === key);
    const local = readLocal(year, key);
    return { ...DEFAULT_SETTINGS, ...(local ?? {}), ...(match ? fromPayload(match) : {}) };
  };
