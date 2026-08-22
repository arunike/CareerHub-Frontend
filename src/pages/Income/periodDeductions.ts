import type { CustomDeduction } from './deductions';
import { splitCustomDeductions } from './deductions';
import {
  resolveAllowances,
  splitResolved,
  type Allowance,
  type AllowancePeriodTotals,
} from './allowances';
import type { PeriodOverride } from './tax/ledger';

export interface DeductionLines {
  medical: number;
  dental: number;
  vision: number;
  dependent: number;
}

// Everything that can differ on a single paycheck: the premium lines plus the deferral
// rates, since people change contributions for one cheque and then change back.
export interface PeriodDefaults extends DeductionLines {
  pretax401kPercent: number;
  roth401kPercent: number;
  regularGross: number;
}

export interface PeriodPatch extends Partial<PeriodDefaults> {
  // Keyed by custom deduction id, so a renamed or deleted line resolves cleanly.
  customAmounts?: Record<string, number>;
  // Keyed by allowance id. An override is the amount that paycheck paid, so it bypasses
  // the allowance's frequency entirely.
  allowanceAmounts?: Record<string, number>;
  // The employer contribution for this paycheck, when the formula does not describe it.
  employerMatch?: number;
}

export type PeriodDeductionOverride = PeriodPatch & { periodIndex: number };

export interface StandingDeductions {
  postTaxPerPeriod: number;
  pretaxIncomeOnlyPerPeriod: number;
  allowances: Allowance[];
  // Per period, from allowanceSchedule: which paycheck each allowance actually lands on.
  allowanceSchedule: Record<number, AllowancePeriodTotals>;
}

export const DEDUCTION_KEYS: Array<keyof DeductionLines> = [
  'medical',
  'dental',
  'vision',
  'dependent',
];

export const OVERRIDE_KEYS: Array<keyof PeriodDefaults> = [
  ...DEDUCTION_KEYS,
  'pretax401kPercent',
  'roth401kPercent',
  'regularGross',
];

// Only the fields present on the override differ; the rest fall back to the standing values.
export const resolvePeriodValues = (
  defaults: PeriodDefaults,
  override?: PeriodDeductionOverride
): PeriodDefaults =>
  OVERRIDE_KEYS.reduce(
    (resolved, key) => ({ ...resolved, [key]: override?.[key] ?? defaults[key] }),
    {} as PeriodDefaults
  );

export const resolveDeductionLines = (
  defaults: PeriodDefaults,
  override?: PeriodDeductionOverride
): DeductionLines => {
  const resolved = resolvePeriodValues(defaults, override);
  return {
    medical: resolved.medical,
    dental: resolved.dental,
    vision: resolved.vision,
    dependent: resolved.dependent,
  };
};

export const resolveCustomDeductions = (
  customDeductions: CustomDeduction[],
  override?: PeriodDeductionOverride
): CustomDeduction[] =>
  customDeductions.map((deduction) => ({
    ...deduction,
    amount: override?.customAmounts?.[deduction.id] ?? deduction.amount,
  }));

export const totalOf = (lines: DeductionLines) =>
  lines.medical + lines.dental + lines.vision + lines.dependent;

export const findOverride = (overrides: PeriodDeductionOverride[], periodIndex: number) =>
  overrides.find((override) => override.periodIndex === periodIndex);

// An override that matches the standing values carries no information, so it is dropped.
export const isRedundant = (
  defaults: PeriodDefaults,
  customDeductions: CustomDeduction[],
  override: PeriodDeductionOverride
) => {
  const scalarsMatch = OVERRIDE_KEYS.every(
    (key) => override[key] === undefined || override[key] === defaults[key]
  );
  if (!scalarsMatch) return false;

  const standing = new Map(customDeductions.map((deduction) => [deduction.id, deduction.amount]));
  const customMatches = Object.entries(override.customAmounts ?? {}).every(
    // An amount for a deleted line is dead weight, so it counts as redundant too.
    ([id, amount]) => !standing.has(id) || standing.get(id) === amount
  );
  // An allowance or match override always carries information: those standing figures are
  // derived per paycheck, so an equal value still pins it.
  return (
    customMatches &&
    Object.keys(override.allowanceAmounts ?? {}).length === 0 &&
    override.employerMatch === undefined
  );
};

export const upsertOverride = (
  overrides: PeriodDeductionOverride[],
  defaults: PeriodDefaults,
  customDeductions: CustomDeduction[],
  periodIndex: number,
  patch: PeriodPatch
): PeriodDeductionOverride[] => {
  const existing = findOverride(overrides, periodIndex);
  const merged: PeriodDeductionOverride = {
    ...(existing ?? { periodIndex }),
    ...patch,
    ...(patch.customAmounts || existing?.customAmounts
      ? {
          customAmounts: { ...(existing?.customAmounts ?? {}), ...(patch.customAmounts ?? {}) },
        }
      : {}),
    ...(patch.allowanceAmounts || existing?.allowanceAmounts
      ? {
          allowanceAmounts: {
            ...(existing?.allowanceAmounts ?? {}),
            ...(patch.allowanceAmounts ?? {}),
          },
        }
      : {}),
  };
  const others = overrides.filter((override) => override.periodIndex !== periodIndex);

  if (isRedundant(defaults, customDeductions, merged)) return others.sort(byPeriod);
  return [...others, merged].sort(byPeriod);
};

export const removeOverride = (overrides: PeriodDeductionOverride[], periodIndex: number) =>
  overrides.filter((override) => override.periodIndex !== periodIndex);

// Applying the same change to many paychecks expands to one override each, so a single
// paycheck can still be edited afterwards without unpicking a rule.
export const applyOverrideToPeriods = (
  overrides: PeriodDeductionOverride[],
  defaults: PeriodDefaults,
  customDeductions: CustomDeduction[],
  periodIndexes: number[],
  patch: PeriodPatch
): PeriodDeductionOverride[] =>
  periodIndexes.reduce(
    (accumulated, periodIndex) =>
      upsertOverride(accumulated, defaults, customDeductions, periodIndex, patch),
    overrides
  );

export const clearOverridesFor = (
  overrides: PeriodDeductionOverride[],
  periodIndexes: number[]
): PeriodDeductionOverride[] => {
  const dropped = new Set(periodIndexes);
  return overrides.filter((override) => !dropped.has(override.periodIndex));
};

const byPeriod = (a: PeriodDeductionOverride, b: PeriodDeductionOverride) =>
  a.periodIndex - b.periodIndex;

// Which paychecks pin a given field, so a change to the standing value can say what it
// will not reach. The key is either a PeriodDefaults field or a custom deduction id.
export const periodsOverriding = (overrides: PeriodDeductionOverride[], key: string): number[] =>
  overrides
    .filter(
      (override) =>
        (override as unknown as Record<string, unknown>)[key] !== undefined ||
        override.customAmounts?.[key] !== undefined
    )
    .map((override) => override.periodIndex);

// Drops one field from every override, and any override left holding nothing.
export const clearFieldFromOverrides = (
  overrides: PeriodDeductionOverride[],
  key: string
): PeriodDeductionOverride[] =>
  overrides
    .map((override) => {
      const { customAmounts, ...rest } = override;
      const next = { ...rest } as Record<string, unknown>;
      delete next[key];

      if (customAmounts) {
        const remaining = { ...customAmounts };
        delete remaining[key];
        if (Object.keys(remaining).length > 0) next.customAmounts = remaining;
      }
      return next as unknown as PeriodDeductionOverride;
    })
    .filter((override) => Object.keys(override).some((key) => key !== 'periodIndex'))
    .sort(byPeriod);

export const buildPeriodOverrides = (
  overrides: PeriodDeductionOverride[],
  defaults: PeriodDefaults,
  customDeductions: CustomDeduction[],
  standing: StandingDeductions
): Record<number, PeriodOverride> => {
  const result: Record<number, PeriodOverride> = {};
  for (const override of overrides) {
    const resolved = resolvePeriodValues(defaults, override);
    const custom = splitCustomDeductions(resolveCustomDeductions(customDeductions, override));
    const scheduled = standing.allowanceSchedule[override.periodIndex]?.byAllowance ?? {};
    const allowance = splitResolved(
      resolveAllowances(standing.allowances, scheduled, override.allowanceAmounts)
    );
    result[override.periodIndex] = {
      section125PerPeriod: totalOf(resolved) + custom.section125,
      pretaxIncomeOnlyPerPeriod: standing.pretaxIncomeOnlyPerPeriod + custom.pretaxIncomeOnly,
      postTaxPerPeriod: standing.postTaxPerPeriod + custom.postTax,
      pretax401kPercent: resolved.pretax401kPercent,
      roth401kPercent: resolved.roth401kPercent,
      regularGross: resolved.regularGross,
      taxableAllowancePerPeriod: allowance.taxable,
      taxFreeAllowancePerPeriod: allowance.taxFree,
      ...(override.employerMatch !== undefined ? { employerMatch: override.employerMatch } : {}),
    };
  }
  return result;
};

// Shared by both editors: the value in force for a field across the chosen paychecks, or
// null when they disagree.
export const uniformValue = <T>(values: T[]): T | null => {
  if (values.length === 0) return null;
  const [first] = values;
  return values.every((value) => value === first) ? first : null;
};
