import { describe, expect, it } from 'vitest';
import { buildPeriodOverrides } from './periodDeductions';

const defaults = {
  medical: 100,
  dental: 0,
  vision: 0,
  dependent: 0,
  pretax401kPercent: 6,
  roth401kPercent: 0,
  regularGross: 6346.15,
};
const standing = {
  postTaxPerPeriod: 0,
  pretaxIncomeOnlyPerPeriod: 0,
  allowances: [],
  allowanceSchedule: {},
};

describe('a per-paycheck override and the raise schedule', () => {
  it('leaves gross alone when only a deduction was edited', () => {
    // Filling it from defaults pinned the paycheck to the pre-raise rate for good.
    const result = buildPeriodOverrides(
      [{ periodIndex: 14, medical: 150 }],
      defaults,
      [],
      standing
    );
    expect(result[14].regularGross).toBeUndefined();
  });

  it('keeps a gross the user actually typed', () => {
    const result = buildPeriodOverrides(
      [{ periodIndex: 14, regularGross: 7000 }],
      defaults,
      [],
      standing
    );
    expect(result[14].regularGross).toBe(7000);
  });

  it('keeps a typed gross of zero, which is a real unpaid paycheck', () => {
    const result = buildPeriodOverrides(
      [{ periodIndex: 14, regularGross: 0 }],
      defaults,
      [],
      standing
    );
    expect(result[14].regularGross).toBe(0);
  });

  it('still resolves the other lines from defaults', () => {
    const result = buildPeriodOverrides(
      [{ periodIndex: 14, medical: 150 }],
      defaults,
      [],
      standing
    );
    expect(result[14].pretax401kPercent).toBe(6);
    expect(result[14].section125PerPeriod).toBe(150);
  });
});
