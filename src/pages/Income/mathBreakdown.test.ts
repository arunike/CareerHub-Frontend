import { describe, expect, it } from 'vitest';
import {
  bonusBreakdown,
  deductionsBreakdown,
  employee401kBreakdown,
  grossBreakdown,
  nextYearBonusBreakdown,
  refundBreakdown,
  resolveMath,
  takeHomeBreakdown,
  taxBreakdown,
  totalCompBreakdown,
} from './mathBreakdown';

// A breakdown whose lines do not replay to its total lies more convincingly than no breakdown.
const addsUp = (breakdown: { steps: Parameters<typeof resolveMath>[0]; total: number }) =>
  expect(resolveMath(breakdown.steps)).toBeCloseTo(breakdown.total, 6);

const YEAR = {
  gross: 274547.36,
  supplementalGross: 24000,
  taxableAllowance: 1200,
  taxFreeAllowance: 450,
  taxWithheld: 85389.97,
  federalTax: 52140.11,
  stateTax: 20834.5,
  payrollTax: 12415.36,
  deductions: 954.12 + 2400 + 9922.15 + 0 + 3040,
  section125: 954.12,
  hsa: 2400,
  pretax401k: 9922.15,
  pretaxIncomeOnly: 0,
  roth401k: 2000,
  postTax: 3040,
  takeHome: 274547.36 + 450 - 85389.97 - (954.12 + 2400 + 9922.15 + 0 + 3040),
  employee401k: 11922.15,
  employerMatch: 6740.69,
  totalComp: 281288.05,
  electiveLimit: 24500,
};

describe('mathBreakdown', () => {
  it('replays gross from salary, supplemental pay and taxable allowances', () => {
    const breakdown = grossBreakdown(YEAR);
    addsUp(breakdown);
    expect(breakdown.steps[0].value).toBeCloseTo(
      YEAR.gross - YEAR.supplementalGross - YEAR.taxableAllowance,
      6
    );
  });

  it('replays tax withheld from its three jurisdictions', () => {
    addsUp(taxBreakdown(YEAR));
  });

  it('replays take-home from gross, tax and deductions', () => {
    addsUp(takeHomeBreakdown(YEAR));
  });

  it('replays total comp as gross plus the match', () => {
    addsUp(totalCompBreakdown(YEAR));
  });

  it('replays the deferral from traditional and Roth', () => {
    addsUp(employee401kBreakdown(YEAR));
  });

  it('itemises deductions by type', () => {
    const breakdown = deductionsBreakdown(YEAR);
    addsUp(breakdown);
    expect(breakdown.steps.map((step) => step.label)).toContain('Traditional 401(k)');
    expect(breakdown.steps.map((step) => step.label)).toContain('HSA');
  });

  it('names the Roth deferral without counting it twice inside post-tax', () => {
    const breakdown = deductionsBreakdown(YEAR);
    addsUp(breakdown);
    const roth = breakdown.steps.find((step) => step.label === 'Roth 401(k)');
    const other = breakdown.steps.find((step) => step.label === 'Other post-tax');
    expect(roth?.value).toBeCloseTo(YEAR.roth401k, 6);
    expect(other?.value).toBeCloseTo(YEAR.postTax - YEAR.roth401k, 6);
    expect(breakdown.steps.every((step) => step.label !== 'Recorded but not itemised')).toBe(true);
  });

  it('states a gap between itemised deductions and a recorded total rather than hiding it', () => {
    const breakdown = deductionsBreakdown({ ...YEAR, deductions: YEAR.deductions + 500 });
    addsUp(breakdown);
    const unexplained = breakdown.steps.find((step) => step.label === 'Recorded but not itemised');
    expect(unexplained?.value).toBeCloseTo(500, 6);
  });

  it('drops an additive zero line but keeps the anchor', () => {
    const breakdown = grossBreakdown({ gross: 120000, supplementalGross: 0, taxableAllowance: 0 });
    expect(breakdown.steps).toHaveLength(1);
    addsUp(breakdown);
  });

  it('replays a refund from withholding minus each liability', () => {
    addsUp(
      refundBreakdown({
        incomeTaxWithheld: 13666.92,
        federalLiability: 6173.85,
        stateLiability: 3000,
        difference: 13666.92 - 6173.85 - 3000,
      })
    );
  });

  it('replays a balance due as a negative total', () => {
    const breakdown = refundBreakdown({
      incomeTaxWithheld: 5000,
      federalLiability: 6000,
      stateLiability: 1000,
      difference: -2000,
    });
    addsUp(breakdown);
    expect(breakdown.totalLabel).toBe('Balance due');
  });

  it('replays a bonus through its multiplier, proration and extras', () => {
    const extras = [{ id: 'x1', label: 'Spot award', amount: 1500 }];
    const target = 24000;
    const bonusTotal = target * 1.1 * 0.5 + 1500;
    const breakdown = bonusBreakdown({
      targetBonus: target,
      multiplierPercent: 110,
      proration: 0.5,
      prorated: true,
      extras,
      performanceYear: 2025,
      bonusTotal,
    });
    addsUp(breakdown);
    expect(breakdown.steps.map((step) => step.op)).toContain('times');
  });

  it('leaves proration out of the arithmetic when the switch is off', () => {
    const target = 24000;
    const breakdown = bonusBreakdown({
      targetBonus: target,
      multiplierPercent: 100,
      proration: 0.4,
      prorated: false,
      extras: [],
      performanceYear: 2025,
      bonusTotal: target,
    });
    addsUp(breakdown);
    expect(breakdown.steps).toHaveLength(2);
  });

  it('replays the next-year estimate as target times the share covered', () => {
    addsUp(
      nextYearBonusBreakdown(
        { paidInYear: 2027, earnedInYear: 2026, amount: 24000 * 0.42, proration: 0.42 },
        24000
      )
    );
  });
});

describe('attribution by company', () => {
  const google = { ...YEAR, gross: 160000, supplementalGross: 20000, taxableAllowance: 800 };
  const netflix = {
    ...YEAR,
    gross: 114547.36,
    supplementalGross: 14805.86,
    taxableAllowance: 400,
    hsa: 900,
    pretax401k: 3922.15,
    roth401k: 500,
    postTax: 700,
  };
  const sources = [
    { label: 'Google', parts: google },
    { label: 'Netflix', parts: netflix },
  ];

  // The same check one level down: named companies must add up to the line.
  const partsAddUp = (steps: ReturnType<typeof resolveMath> extends never ? never : any[]) => {
    for (const step of steps) {
      if (!step.parts) continue;
      const summed = step.parts.reduce((total: number, part: any) => total + part.value, 0);
      expect(summed).toBeCloseTo(step.value, 6);
    }
  };

  it('splits gross by payroll', () => {
    const aggregate = {
      gross: google.gross + netflix.gross,
      supplementalGross: google.supplementalGross + netflix.supplementalGross,
      taxableAllowance: google.taxableAllowance + netflix.taxableAllowance,
    };
    const breakdown = grossBreakdown(aggregate, sources);
    partsAddUp(breakdown.steps);
    expect(breakdown.steps[0].parts?.map((part) => part.label)).toEqual(['Google', 'Netflix']);
  });

  it('splits deductions by payroll, largest first', () => {
    const aggregate = {
      ...YEAR,
      section125: google.section125 + netflix.section125,
      hsa: google.hsa + netflix.hsa,
      pretax401k: google.pretax401k + netflix.pretax401k,
      pretaxIncomeOnly: 0,
      roth401k: google.roth401k + netflix.roth401k,
      postTax: google.postTax + netflix.postTax,
      deductions:
        google.section125 +
        netflix.section125 +
        google.hsa +
        netflix.hsa +
        google.pretax401k +
        netflix.pretax401k +
        google.postTax +
        netflix.postTax,
    };
    const breakdown = deductionsBreakdown(aggregate, sources);
    partsAddUp(breakdown.steps);
    const hsa = breakdown.steps.find((step) => step.label === 'HSA');
    expect(hsa?.parts?.[0].value).toBeGreaterThanOrEqual(hsa?.parts?.[1].value ?? 0);
  });

  it('folds a long tail of roles into one line that still adds up', () => {
    const many = Array.from({ length: 6 }, (_, index) => ({
      label: `Role ${index + 1}`,
      parts: { ...netflix, hsa: 100 * (index + 1) },
    }));
    const aggregate = { ...YEAR, hsa: many.reduce((total, one) => total + one.parts.hsa, 0) };
    const hsa = deductionsBreakdown(aggregate, many).steps.find((step) => step.label === 'HSA');
    expect(hsa?.parts).toHaveLength(4);
    expect(hsa?.parts?.[3].label).toBe('3 other roles');
    expect(hsa?.parts?.reduce((total, part) => total + part.value, 0)).toBeCloseTo(
      hsa?.value ?? 0,
      6
    );
  });

  it('says nothing about companies when only one payroll paid', () => {
    const breakdown = grossBreakdown(google, [{ label: 'Google', parts: google }]);
    expect(breakdown.steps.every((step) => step.parts === undefined)).toBe(true);
  });

  it('drops a company that contributed nothing to a line', () => {
    const noHsa = { ...netflix, hsa: 0 };
    const aggregate = { ...YEAR, hsa: google.hsa };
    const breakdown = deductionsBreakdown(aggregate, [
      { label: 'Google', parts: google },
      { label: 'Netflix', parts: noHsa },
    ]);
    const hsa = breakdown.steps.find((step) => step.label === 'HSA');
    // One company left is not an attribution, it is a repeat of the line.
    expect(hsa?.parts).toBeUndefined();
  });
});

describe('the gross breakdown reconciles with a single role card', () => {
  const role = (label: string, gross: number, supplemental: number, allowance: number) => ({
    label,
    parts: {
      gross,
      supplementalGross: supplemental,
      taxableAllowance: allowance,
    },
  });

  it('splits the total by role, not only the salary line', () => {
    const roles = [role('Google', 134769.23, 24000, 0), role('Netflix', 60000, 5747.05, 425)];
    const totals = {
      gross: 194769.23,
      supplementalGross: 24000,
      taxableAllowance: 425,
    };
    const math = grossBreakdown(totals, roles);
    expect(math.totalParts).toEqual([
      { label: 'Google', value: 134769.23 },
      { label: 'Netflix', value: 60000 },
    ]);
  });

  it('names the salary line as base pay only, since it excludes bonus and equity', () => {
    const math = grossBreakdown({ gross: 100, supplementalGross: 20, taxableAllowance: 0 });
    const salary = math.steps.find((step) => step.label === 'Salary paid');
    expect(salary?.value).toBe(80);
    expect(salary?.note).toContain('bonus and equity');
  });
});
