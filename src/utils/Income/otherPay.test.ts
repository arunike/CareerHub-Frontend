import { describe, expect, it } from 'vitest';
import { OTHER_PAY_NOTE, toEffectiveRow, type PeriodActual } from './effectiveRows';
import type { PeriodRow } from './tax/ledger';

const MODELLED_GROSS = 165000 / 26;

const modelRow = (over: Partial<PeriodRow> = {}) =>
  ({
    periodIndex: 20,
    payDate: '2026-10-01',
    isAdjustedDate: false,
    isMatchAdjusted: false,
    isOffCycle: false,
    isAdjusted: false,
    gross: MODELLED_GROSS,
    supplementalGross: 0,
    taxableAllowance: 0,
    taxFreeAllowance: 0,
    section125: 0,
    hsa: 0,
    pretax401k: 0,
    pretaxIncomeOnly: 0,
    roth401k: 0,
    postTax: 0,
    federalRegular: 0,
    federalSupplemental: 0,
    stateRegular: 0,
    stateSupplemental: 0,
    payrollTaxes: [],
    net: MODELLED_GROSS,
    employerMatch401k: 0,
    deferralPercent: 0,
    matchedDeferralPercent: 0,
    notes: [],
    ...over,
  }) as unknown as PeriodRow;

const recorded = (gross: number): PeriodActual => ({ periodIndex: 20, gross });

describe('other pay', () => {
  it('attributes a recorded gross above the model to other pay', () => {
    const row = toEffectiveRow(modelRow(), recorded(MODELLED_GROSS + 1200));
    expect(row.otherPay).toBeCloseTo(1200, 6);
  });

  it('says so in the notes, so the bigger figure explains itself', () => {
    const row = toEffectiveRow(modelRow(), recorded(MODELLED_GROSS + 1200));
    expect(row.notes).toContain(OTHER_PAY_NOTE);
  });

  it('is zero when the recorded gross matches the model', () => {
    const row = toEffectiveRow(modelRow(), recorded(MODELLED_GROSS));
    expect(row.otherPay).toBe(0);
    expect(row.notes).not.toContain(OTHER_PAY_NOTE);
  });

  it('is zero rather than negative when the recorded gross is lower', () => {
    const row = toEffectiveRow(modelRow(), recorded(MODELLED_GROSS - 500));
    expect(row.otherPay).toBe(0);
    expect(row.notes).not.toContain(OTHER_PAY_NOTE);
  });

  it('is zero when nothing was recorded at all', () => {
    expect(toEffectiveRow(modelRow()).otherPay).toBe(0);
  });

  it('measures against the model including its own supplements, not against base pay', () => {
    // A period the model already expects a bonus in should not report that bonus as other pay.
    const withBonus = modelRow({
      gross: MODELLED_GROSS + 5000,
      supplementalGross: 5000,
      notes: ['Bonus paid this period'],
    });
    const row = toEffectiveRow(withBonus, recorded(MODELLED_GROSS + 5000));
    expect(row.otherPay).toBe(0);
    expect(row.notes).not.toContain(OTHER_PAY_NOTE);
  });

  it('reports only the part the model could not explain', () => {
    const withBonus = modelRow({ gross: MODELLED_GROSS + 5000, supplementalGross: 5000 });
    const row = toEffectiveRow(withBonus, recorded(MODELLED_GROSS + 5000 + 800));
    expect(row.otherPay).toBeCloseTo(800, 6);
  });

  it('keeps the recorded gross as the figure shown, not the model plus other pay', () => {
    const row = toEffectiveRow(modelRow(), recorded(MODELLED_GROSS + 1200));
    expect(row.gross).toBeCloseTo(MODELLED_GROSS + 1200, 6);
    expect(row.modelledGross).toBeCloseTo(MODELLED_GROSS, 6);
  });
});

describe('a recorded gross below the model', () => {
  it('reports no other pay, since a shortfall is not extra income', () => {
    const row = toEffectiveRow(modelRow(), recorded(MODELLED_GROSS - 163.56));
    expect(row.otherPay).toBe(0);
  });

  it('still keeps the model figure alongside, so the shortfall is recoverable', () => {
    const row = toEffectiveRow(modelRow(), recorded(MODELLED_GROSS - 163.56));
    expect(row.gross).toBeCloseTo(MODELLED_GROSS - 163.56, 2);
    expect(row.modelledGross).toBeCloseTo(MODELLED_GROSS, 2);
    expect(row.modelledGross - row.gross).toBeCloseTo(163.56, 2);
  });
});
