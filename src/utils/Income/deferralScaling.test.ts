import { describe, expect, it } from 'vitest';
import { toEffectiveRow, type PeriodActual } from './effectiveRows';
import type { PeriodRow } from './tax/ledger';

const MODELLED_GROSS = 6000;
const PERCENT = 0.05;

const modelRow = (over: Partial<PeriodRow> = {}) =>
  ({
    periodIndex: 19,
    payDate: '2026-10-01',
    isAdjustedDate: false,
    isMatchAdjusted: false,
    isOffCycle: false,
    isAdjusted: false,
    gross: MODELLED_GROSS,
    supplementalGross: 0,
    taxableAllowance: 0,
    taxFreeAllowance: 0,
    section125: 100,
    hsa: 0,
    pretax401k: MODELLED_GROSS * PERCENT,
    pretaxIncomeOnly: 0,
    roth401k: 0,
    postTax: 0,
    federalRegular: 0,
    federalSupplemental: 0,
    stateRegular: 0,
    stateSupplemental: 0,
    payrollTaxes: [],
    net: 0,
    employerMatch401k: 120,
    deferralRoom: 20000,
    deferralPercent: 5,
    matchedDeferralPercent: 5,
    notes: [],
    ...over,
  }) as unknown as PeriodRow;

const recorded = (gross: number): PeriodActual => ({ periodIndex: 19, gross });

describe('deferrals follow a recorded gross', () => {
  it('takes the percentage of what was actually paid, not of the model', () => {
    const row = toEffectiveRow(modelRow(), recorded(6240));
    // 5% of 6,240 rather than 5% of 6,000.
    expect(row.pretax401k).toBeCloseTo(312, 6);
  });

  it('leaves the deferral alone when no gross was recorded', () => {
    expect(toEffectiveRow(modelRow()).pretax401k).toBeCloseTo(MODELLED_GROSS * PERCENT, 6);
  });

  it('scales down as well as up', () => {
    expect(toEffectiveRow(modelRow(), recorded(3000)).pretax401k).toBeCloseTo(150, 6);
  });

  it('scales the employer match too, since it is also a percentage', () => {
    expect(toEffectiveRow(modelRow(), recorded(6240)).employerMatch401k).toBeCloseTo(124.8, 6);
  });

  it('leaves a fixed premium untouched, because it is not a percentage of pay', () => {
    expect(toEffectiveRow(modelRow(), recorded(6240)).section125).toBe(100);
  });

  it('never pushes the deferral past the remaining 402(g) room', () => {
    const nearLimit = modelRow({ pretax401k: 300, deferralRoom: 310 });
    expect(toEffectiveRow(nearLimit, recorded(MODELLED_GROSS * 2)).pretax401k).toBe(310);
  });

  it('splits the room between traditional and Roth rather than double-spending it', () => {
    const both = modelRow({ pretax401k: 300, roth401k: 300, deferralRoom: 450 });
    const row = toEffectiveRow(both, recorded(MODELLED_GROSS * 2));
    expect(row.pretax401k + row.roth401k).toBeCloseTo(450, 6);
    expect(row.pretax401k).toBe(450);
    expect(row.roth401k).toBe(0);
  });

  it('feeds the scaled deferral into take-home, not the modelled one', () => {
    const row = toEffectiveRow(modelRow(), recorded(6240));
    // Gross 6,240 less 100 section 125 and 312 deferral, with no tax in this fixture.
    expect(row.net).toBeCloseTo(6240 - 100 - 312, 6);
  });
});
