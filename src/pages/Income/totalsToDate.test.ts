import { describe, expect, it } from 'vitest';
import { rowsToDate, totalsToDate } from './effectiveRows';
import type { EffectiveRow } from './effectiveRows';

const row = (payDate: string | null, gross: number): EffectiveRow =>
  ({
    periodIndex: 1,
    note: '',
    payDate,
    isAdjustedDate: false,
    isMatchAdjusted: false,
    isOffCycle: false,
    isAdjusted: false,
    gross,
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
    payrollTaxes: [],
    taxTotal: 0,
    net: gross,
    employerMatch401k: 0,
    deferralPercent: 0,
    matchedDeferralPercent: 0,
    notes: [],
    actualFields: [],
    balancedFields: [],
    residual: 0,
    modelledGross: gross,
    modelledNet: gross,
  }) as EffectiveRow;

describe('totalsToDate', () => {
  const rows = [row('2026-08-14', 100), row('2026-08-28', 100), row('2026-09-11', 100)];

  it('counts a paycheck dated today', () => {
    expect(totalsToDate(rows, '2026-08-28').count).toBe(2);
    expect(totalsToDate(rows, '2026-08-28').gross).toBe(200);
  });

  it('leaves out a paycheck still to come', () => {
    expect(totalsToDate(rows, '2026-09-01').count).toBe(2);
    expect(totalsToDate(rows, '2026-09-11').count).toBe(3);
  });

  it('treats an undated row as landed', () => {
    expect(rowsToDate([row(null, 50)], '2020-01-01')).toHaveLength(1);
  });

  it('is everything once the year is done', () => {
    expect(totalsToDate(rows, '2027-01-01').gross).toBe(300);
  });
});
