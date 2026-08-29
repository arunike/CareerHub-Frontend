import { describe, expect, it } from 'vitest';
import {
  effectiveTotals,
  hasAnyActual,
  mostRecentPaidRow,
  toEffectiveRow,
  toEffectiveRows,
} from './effectiveRows';
import { buildLedger, NO_ELECTIONS, NO_EMPLOYER_CONTRIBUTIONS } from './tax/ledger';
import { FEDERAL_2026, LIMITS_2026 } from './tax/data/federal-2026';
import { flatStateTable } from './tax/data/states/flat';
import { EMPTY_W4 } from './tax/withholding';

const { rows } = buildLedger({
  filingStatus: 'SINGLE',
  periodsPerYear: 24,
  annualSalary: 120000,
  incomeEvents: [],
  elections: { ...NO_ELECTIONS, section125PerPeriod: 100, pretax401kPercent: 5 },
  employer: NO_EMPLOYER_CONTRIBUTIONS,
  w4: EMPTY_W4,
  federal: FEDERAL_2026,
  state: flatStateTable('CA', 8.5, 2026),
  limits: LIMITS_2026,
});

const row = rows[0];

describe('hasAnyActual', () => {
  it('is false without a record or with an empty one', () => {
    expect(hasAnyActual(undefined)).toBe(false);
    expect(hasAnyActual({ periodIndex: 1 })).toBe(false);
    expect(hasAnyActual({ periodIndex: 1, net: null })).toBe(false);
  });

  it('is true once any line is recorded', () => {
    expect(hasAnyActual({ periodIndex: 1, gross: 5000 })).toBe(true);
    expect(hasAnyActual({ periodIndex: 1, net: 3380.56 })).toBe(true);
  });
});

describe('toEffectiveRow', () => {
  it('falls back to the model when nothing is recorded', () => {
    const effective = toEffectiveRow(row);
    expect(effective.gross).toBe(row.gross);
    expect(effective.net).toBeCloseTo(row.net, 6);
    expect(effective.federalTax).toBeCloseTo(row.federalRegular + row.federalSupplemental, 6);
    expect(effective.actualFields).toEqual([]);
  });

  it('leaves the tax lines modelled, since only gross and take-home are recorded', () => {
    const effective = toEffectiveRow(row, { periodIndex: row.periodIndex, net: 3000 });
    expect(effective.payrollTaxes.find((tax) => tax.label === 'Social Security')!.amount).toBe(
      row.payrollTaxes.find((tax) => tax.label === 'Social Security')!.amount
    );
  });

  it('lets a recorded net win over the derived one', () => {
    const effective = toEffectiveRow(row, { periodIndex: row.periodIndex, net: 3000 });
    expect(effective.net).toBe(3000);
    expect(effective.actualFields).toEqual(['net']);
  });

  it('scales both income tax lines to reconcile with a recorded take-home', () => {
    const effective = toEffectiveRow(row, { periodIndex: row.periodIndex, net: row.net - 200 });
    expect(effective.taxTotal).toBeGreaterThan(0);
    // The column still adds up to the figure that was recorded.
    const deductions =
      row.section125 + row.hsa + row.pretax401k + row.pretaxIncomeOnly + row.postTax;
    expect(effective.gross - deductions - effective.taxTotal + row.taxFreeAllowance).toBeCloseTo(
      effective.net,
      6
    );
  });

  it('recomputes net from a recorded gross', () => {
    const effective = toEffectiveRow(row, { periodIndex: row.periodIndex, gross: row.gross - 500 });
    expect(effective.gross).toBeCloseTo(row.gross - 500, 6);
    expect(effective.net).toBeLessThan(row.net);
  });

  it('keeps the modelled net available for comparison', () => {
    const effective = toEffectiveRow(row, { periodIndex: row.periodIndex, net: 1 });
    expect(effective.modelledNet).toBeCloseTo(row.net, 6);
  });

  it('leaves deductions modelled, since a payslip records pay not elections', () => {
    const effective = toEffectiveRow(row, { periodIndex: row.periodIndex, net: 3000 });
    expect(effective.section125).toBeCloseTo(row.section125, 6);
    expect(effective.pretax401k).toBeCloseTo(row.pretax401k, 6);
  });
});

describe('toEffectiveRows and effectiveTotals', () => {
  it('applies each record to its own period', () => {
    const effective = toEffectiveRows(rows, [{ periodIndex: 2, net: 1 }]);
    expect(effective[0].actualFields).toEqual([]);
    expect(effective[1].actualFields).toEqual(['net']);
  });

  it('totals the effective figures, not the modelled ones', () => {
    const effective = toEffectiveRows(rows, [{ periodIndex: 1, net: 0 }]);
    const totals = effectiveTotals(effective);
    expect(totals.net).toBeCloseTo(
      rows.reduce((sum, candidate) => sum + candidate.net, 0) - rows[0].net,
      6
    );
    expect(totals.recordedCount).toBe(1);
  });

  it('counts nothing recorded when there are no actuals', () => {
    expect(effectiveTotals(toEffectiveRows(rows, [])).recordedCount).toBe(0);
  });
});

describe('balancing to a recorded take-home', () => {
  const deductions = row.section125 + row.hsa + row.pretax401k + row.pretaxIncomeOnly + row.postTax;
  const payrollTotal = row.payrollTaxes.reduce((total, tax) => total + tax.amount, 0);

  it('makes the lines add up to the recorded take-home', () => {
    const recordedNet = row.net - 161.2;
    const effective = toEffectiveRow(row, { periodIndex: row.periodIndex, net: recordedNet });

    const listed =
      effective.federalTax +
      effective.stateTax +
      effective.payrollTaxes.reduce((total, tax) => total + tax.amount, 0) +
      effective.residual;
    expect(effective.gross - deductions - listed + row.taxFreeAllowance).toBeCloseTo(
      recordedNet,
      6
    );
    expect(effective.taxTotal).toBeCloseTo(listed, 6);
  });

  it('leaves FICA untouched, because it is statutory', () => {
    const effective = toEffectiveRow(row, { periodIndex: row.periodIndex, net: row.net - 161.2 });
    expect(effective.payrollTaxes.reduce((total, tax) => total + tax.amount, 0)).toBeCloseTo(
      payrollTotal,
      6
    );
  });

  it('raises the income tax lines when less landed than modelled', () => {
    const effective = toEffectiveRow(row, { periodIndex: row.periodIndex, net: row.net - 161.2 });
    expect(effective.federalTax).toBeGreaterThan(row.federalRegular + row.federalSupplemental);
    expect(effective.stateTax).toBeGreaterThan(row.stateRegular + row.stateSupplemental);
    expect(effective.balancedFields).toEqual(['federalTax', 'stateTax']);
  });

  it('lowers them when more landed than modelled', () => {
    const effective = toEffectiveRow(row, { periodIndex: row.periodIndex, net: row.net + 100 });
    expect(effective.federalTax).toBeLessThan(row.federalRegular + row.federalSupplemental);
  });

  it('keeps the split between federal and state proportional', () => {
    const modelledFederal = row.federalRegular + row.federalSupplemental;
    const modelledState = row.stateRegular + row.stateSupplemental;
    const effective = toEffectiveRow(row, { periodIndex: row.periodIndex, net: row.net - 161.2 });
    expect(effective.federalTax / effective.stateTax).toBeCloseTo(
      modelledFederal / modelledState,
      6
    );
  });

  it('scales both income tax lines together, since neither can be recorded on its own', () => {
    const effective = toEffectiveRow(row, {
      periodIndex: row.periodIndex,
      net: row.net - 161.2,
    });
    expect(effective.balancedFields).toEqual(['federalTax', 'stateTax']);
  });

  it('balances nothing when the recorded take-home already agrees', () => {
    const effective = toEffectiveRow(row, { periodIndex: row.periodIndex, net: row.net });
    expect(effective.balancedFields).toEqual([]);
    expect(effective.residual).toBe(0);
    expect(effective.federalTax).toBeCloseTo(row.federalRegular + row.federalSupplemental, 6);
  });

  it('leaves the model alone when take-home is not recorded', () => {
    const effective = toEffectiveRow(row, { periodIndex: row.periodIndex, gross: row.gross });
    expect(effective.balancedFields).toEqual([]);
    expect(effective.stateTax).toBeCloseTo(row.stateRegular + row.stateSupplemental, 6);
  });

  it('reports a residual rather than a negative tax when take-home exceeds gross', () => {
    const effective = toEffectiveRow(row, {
      periodIndex: row.periodIndex,
      net: row.gross + 1000,
    });
    expect(effective.federalTax).toBe(0);
    expect(effective.stateTax).toBe(0);
    expect(effective.residual).toBeLessThan(0);
  });
});

describe('a recorded take-home larger than the paycheck can support', () => {
  // The symptom that surfaced this: recording only net, against a gross that is too low.
  const overRecorded = toEffectiveRow(row, {
    periodIndex: row.periodIndex,
    net: row.gross + 800,
  });

  it('never reports a negative tax', () => {
    expect(overRecorded.taxTotal).toBeGreaterThanOrEqual(0);
    expect(overRecorded.federalTax).toBeGreaterThanOrEqual(0);
    expect(overRecorded.stateTax).toBeGreaterThanOrEqual(0);
  });

  it('never reports a negative tax rate', () => {
    expect(overRecorded.taxTotal / overRecorded.gross).toBeGreaterThanOrEqual(0);
  });

  it('zeroes the income tax lines rather than inverting them', () => {
    expect(overRecorded.federalTax).toBe(0);
    expect(overRecorded.stateTax).toBe(0);
  });

  it('keeps FICA, which cannot be negative either', () => {
    const payroll = overRecorded.payrollTaxes.reduce((total, tax) => total + tax.amount, 0);
    expect(payroll).toBeGreaterThan(0);
    expect(overRecorded.taxTotal).toBeCloseTo(payroll, 6);
  });

  it('reports the shortfall as a residual so the column still adds up', () => {
    expect(overRecorded.residual).toBeLessThan(0);
    const listed =
      overRecorded.federalTax +
      overRecorded.stateTax +
      overRecorded.payrollTaxes.reduce((total, tax) => total + tax.amount, 0) +
      overRecorded.residual;
    const deductions =
      row.section125 + row.hsa + row.pretax401k + row.pretaxIncomeOnly + row.postTax;
    expect(overRecorded.gross - deductions - listed + row.taxFreeAllowance).toBeCloseTo(
      overRecorded.net,
      6
    );
  });

  it('still keeps the recorded take-home as the displayed figure', () => {
    expect(overRecorded.net).toBeCloseTo(row.gross + 800, 6);
  });

  it('leaves the normal case with no residual', () => {
    const normal = toEffectiveRow(row, { periodIndex: row.periodIndex, net: row.net });
    expect(normal.residual).toBeCloseTo(0, 6);
    expect(normal.taxTotal).toBeGreaterThan(0);
  });
});

describe('mostRecentPaidRow', () => {
  const schedule = [
    { periodIndex: 1, payDate: '2026-01-02' },
    { periodIndex: 2, payDate: '2026-01-16' },
    { periodIndex: 16, payDate: '2026-08-07' },
    { periodIndex: 17, payDate: '2026-08-21' },
    { periodIndex: 18, payDate: '2026-09-04' },
  ];

  it('lands on the latest paycheck already paid, not the first of the year', () => {
    expect(mostRecentPaidRow(schedule, '2026-08-24')?.periodIndex).toBe(17);
  });

  it('counts a paycheck paid today', () => {
    expect(mostRecentPaidRow(schedule, '2026-08-21')?.periodIndex).toBe(17);
  });

  it('falls back to the first paycheck when the year has not paid out yet', () => {
    expect(mostRecentPaidRow(schedule, '2025-12-31')?.periodIndex).toBe(1);
  });

  it('picks the last paycheck of a year that is over', () => {
    expect(mostRecentPaidRow(schedule, '2027-03-01')?.periodIndex).toBe(18);
  });

  it('compares pay dates rather than trusting row order', () => {
    const unsorted = [schedule[4], schedule[0], schedule[3]];
    expect(mostRecentPaidRow(unsorted, '2026-08-24')?.periodIndex).toBe(17);
  });

  it('ignores rows with no pay date', () => {
    const withGap = [...schedule, { periodIndex: 19, payDate: null }];
    expect(mostRecentPaidRow(withGap, '2026-08-24')?.periodIndex).toBe(17);
  });

  it('has nothing to select in an empty year', () => {
    expect(mostRecentPaidRow([], '2026-08-24')).toBeNull();
  });
});
