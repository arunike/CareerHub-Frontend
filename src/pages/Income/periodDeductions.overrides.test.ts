import { describe, expect, it } from 'vitest';
import {
  applyOverrideToPeriods,
  buildPeriodOverrides,
  clearOverridesFor,
  findOverride,
  isRedundant,
  removeOverride,
  resolveDeductionLines,
  resolvePeriodValues,
  totalOf,
  upsertOverride,
  type PeriodDefaults,
  type PeriodDeductionOverride,
} from './periodDeductions';
import {
  clearFieldFromOverrides,
  periodsOverriding,
  resolveCustomDeductions,
  uniformValue,
} from './periodDeductions';

const custom = [
  { id: 'life', label: 'Life insurance', amount: 25, treatment: 'SECTION_125' as const },
  { id: 'espp', label: 'Stock purchase', amount: 100, treatment: 'POST_TAX' as const },
];

const defaults: PeriodDefaults = {
  medical: 120,
  dental: 20,
  vision: 6,
  dependent: 0,
  pretax401kPercent: 6,
  roth401kPercent: 0,
  regularGross: 5000,
};

describe('resolveDeductionLines', () => {
  it('falls back to the standing amount for lines the override omits', () => {
    const lines = resolveDeductionLines(defaults, { periodIndex: 3, medical: 200 });
    expect(lines).toEqual({ medical: 200, dental: 20, vision: 6, dependent: 0 });
  });

  it('returns the defaults when there is no override', () => {
    expect(resolvePeriodValues(defaults)).toEqual(defaults);
  });

  it('keeps an explicit zero rather than treating it as unset', () => {
    expect(resolveDeductionLines(defaults, { periodIndex: 3, medical: 0 }).medical).toBe(0);
  });
});

describe('upsertOverride', () => {
  it('adds an override for a period that has none', () => {
    const result = upsertOverride([], defaults, custom, 4, { medical: 200 });
    expect(result).toEqual([{ periodIndex: 4, medical: 200 }]);
  });

  it('merges into an existing override for the same period', () => {
    const start = upsertOverride([], defaults, custom, 4, { medical: 200 });
    const result = upsertOverride(start, defaults, custom, 4, { dental: 30 });
    expect(result).toEqual([{ periodIndex: 4, medical: 200, dental: 30 }]);
  });

  it('drops an override that just restates the standing amounts', () => {
    const start = upsertOverride([], defaults, custom, 4, { medical: 200 });
    const result = upsertOverride(start, defaults, custom, 4, { medical: 120 });
    expect(result).toEqual([]);
  });

  it('keeps overrides ordered by period', () => {
    let result: PeriodDeductionOverride[] = [];
    result = upsertOverride(result, defaults, custom, 9, { medical: 200 });
    result = upsertOverride(result, defaults, custom, 2, { medical: 150 });
    expect(result.map((override) => override.periodIndex)).toEqual([2, 9]);
  });

  it('leaves other periods untouched', () => {
    let result = upsertOverride([], defaults, custom, 2, { medical: 150 });
    result = upsertOverride(result, defaults, custom, 9, { medical: 200 });
    expect(findOverride(result, 2)?.medical).toBe(150);
  });
});

describe('removeOverride and isRedundant', () => {
  it('removes only the requested period', () => {
    const start = upsertOverride(
      upsertOverride([], defaults, custom, 2, { medical: 1 }),
      defaults,
      custom,
      5,
      { medical: 2 }
    );
    expect(removeOverride(start, 2).map((o) => o.periodIndex)).toEqual([5]);
  });

  it('treats an all-matching override as redundant', () => {
    expect(isRedundant(defaults, custom, { periodIndex: 1, medical: 120, dental: 20 })).toBe(true);
    expect(isRedundant(defaults, custom, { periodIndex: 1, medical: 121 })).toBe(false);
  });
});

describe('applyOverrideToPeriods', () => {
  it('applies one change across every chosen paycheck', () => {
    const result = applyOverrideToPeriods([], defaults, custom, [3, 4, 5], { medical: 200 });
    expect(result.map((override) => override.periodIndex)).toEqual([3, 4, 5]);
    expect(result.every((override) => override.medical === 200)).toBe(true);
  });

  it('merges into overrides that already exist', () => {
    const start = upsertOverride([], defaults, custom, 4, { medical: 200 });
    const result = applyOverrideToPeriods(start, defaults, custom, [4, 5], {
      pretax401kPercent: 20,
    });
    expect(findOverride(result, 4)).toEqual({
      periodIndex: 4,
      medical: 200,
      pretax401kPercent: 20,
    });
    expect(findOverride(result, 5)).toEqual({ periodIndex: 5, pretax401kPercent: 20 });
  });

  it('leaves paychecks outside the selection alone', () => {
    const result = applyOverrideToPeriods([], defaults, custom, [3], { medical: 200 });
    expect(findOverride(result, 4)).toBeUndefined();
  });

  it('drops entries where the batch value matches the standing amount', () => {
    const result = applyOverrideToPeriods([], defaults, custom, [3, 4], {
      medical: defaults.medical,
    });
    expect(result).toEqual([]);
  });

  it('applies several fields at once', () => {
    const result = applyOverrideToPeriods([], defaults, custom, [2], {
      medical: 300,
      pretax401kPercent: 15,
    });
    expect(findOverride(result, 2)).toEqual({
      periodIndex: 2,
      medical: 300,
      pretax401kPercent: 15,
    });
  });

  it('is stable when given an empty selection', () => {
    const start = upsertOverride([], defaults, custom, 4, { medical: 200 });
    expect(applyOverrideToPeriods(start, defaults, custom, [], { medical: 999 })).toEqual(start);
  });
});

describe('clearOverridesFor', () => {
  it('removes overrides for the chosen paychecks only', () => {
    const start = applyOverrideToPeriods([], defaults, custom, [1, 2, 3], { medical: 200 });
    const result = clearOverridesFor(start, [1, 3]);
    expect(result.map((override) => override.periodIndex)).toEqual([2]);
  });

  it('is a no-op for paychecks with no override', () => {
    const start = applyOverrideToPeriods([], defaults, custom, [1], { medical: 200 });
    expect(clearOverridesFor(start, [9])).toEqual(start);
  });
});

describe('custom deduction overrides', () => {
  it('overrides one custom line and leaves the others standing', () => {
    const result = upsertOverride([], defaults, custom, 4, { customAmounts: { life: 60 } });
    const resolved = resolveCustomDeductions(custom, findOverride(result, 4));
    expect(resolved.find((entry) => entry.id === 'life')!.amount).toBe(60);
    expect(resolved.find((entry) => entry.id === 'espp')!.amount).toBe(100);
  });

  it('merges a second custom override into the same paycheck', () => {
    let result = upsertOverride([], defaults, custom, 4, { customAmounts: { life: 60 } });
    result = upsertOverride(result, defaults, custom, 4, { customAmounts: { espp: 250 } });
    expect(findOverride(result, 4)!.customAmounts).toEqual({ life: 60, espp: 250 });
  });

  it('keeps a scalar override when a custom override is added', () => {
    let result = upsertOverride([], defaults, custom, 4, { medical: 300 });
    result = upsertOverride(result, defaults, custom, 4, { customAmounts: { life: 60 } });
    expect(findOverride(result, 4)).toEqual({
      periodIndex: 4,
      medical: 300,
      customAmounts: { life: 60 },
    });
  });

  it('drops a custom override that matches the standing amount', () => {
    expect(upsertOverride([], defaults, custom, 4, { customAmounts: { life: 25 } })).toEqual([]);
  });

  it('treats an amount for a deleted custom line as redundant', () => {
    expect(upsertOverride([], defaults, custom, 4, { customAmounts: { gone: 99 } })).toEqual([]);
  });

  it('routes an overridden custom line into its own tax bucket', () => {
    const overrides = upsertOverride([], defaults, custom, 3, { customAmounts: { espp: 400 } });
    const built = buildPeriodOverrides(overrides, defaults, custom, {
      postTaxPerPeriod: 10,
      pretaxIncomeOnlyPerPeriod: 0,
      allowances: [],
      allowanceSchedule: {},
    });
    // espp is post-tax, so it lands there rather than in Section 125.
    expect(built[3].postTaxPerPeriod).toBe(410);
    expect(built[3].section125PerPeriod).toBe(totalOf(defaults) + 25);
  });

  it('applies a custom override across a batch', () => {
    const result = applyOverrideToPeriods([], defaults, custom, [1, 2], {
      customAmounts: { life: 75 },
    });
    expect(result).toHaveLength(2);
    expect(result.every((override) => override.customAmounts?.life === 75)).toBe(true);
  });
});

describe('uniformValue', () => {
  it('returns the shared value', () => {
    expect(uniformValue([5, 5, 5])).toBe(5);
  });

  it('returns null when the values disagree', () => {
    expect(uniformValue([5, 6])).toBeNull();
  });

  it('returns null for an empty selection', () => {
    expect(uniformValue([])).toBeNull();
  });
});

describe('periodsOverriding', () => {
  it('finds the paychecks pinning a scalar field', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2, 5], { medical: 300 });
    expect(periodsOverriding(overrides, 'medical')).toEqual([2, 5]);
  });

  it('ignores paychecks that pin a different field', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2], { dental: 40 });
    expect(periodsOverriding(overrides, 'medical')).toEqual([]);
  });

  it('finds the paychecks pinning a custom deduction', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [3], {
      customAmounts: { life: 60 },
    });
    expect(periodsOverriding(overrides, 'life')).toEqual([3]);
  });

  it('treats an explicit zero as an override', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [4], { medical: 0 });
    expect(periodsOverriding(overrides, 'medical')).toEqual([4]);
  });
});

describe('clearFieldFromOverrides', () => {
  it('removes one field and keeps the rest of the override', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2], {
      medical: 300,
      dental: 40,
    });
    const result = clearFieldFromOverrides(overrides, 'medical');
    expect(findOverride(result, 2)).toEqual({ periodIndex: 2, dental: 40 });
  });

  it('drops an override that held only that field', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2, 3], { medical: 300 });
    expect(clearFieldFromOverrides(overrides, 'medical')).toEqual([]);
  });

  it('removes a custom amount without touching the others', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2], {
      customAmounts: { life: 60, espp: 250 },
    });
    const result = clearFieldFromOverrides(overrides, 'life');
    expect(findOverride(result, 2)!.customAmounts).toEqual({ espp: 250 });
  });

  it('drops an override whose last custom amount was removed', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2], {
      customAmounts: { life: 60 },
    });
    expect(clearFieldFromOverrides(overrides, 'life')).toEqual([]);
  });

  it('leaves overrides alone when the field is not pinned anywhere', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2], { medical: 300 });
    expect(clearFieldFromOverrides(overrides, 'vision')).toEqual(overrides);
  });
});
