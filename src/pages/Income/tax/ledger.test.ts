import { describe, expect, it } from 'vitest';
import { FEDERAL_2026, LIMITS_2026 } from './data/federal-2026';
import { flatStateTable } from './data/states/flat';
import {
  buildLedger,
  NO_ELECTIONS,
  NO_EMPLOYER_CONTRIBUTIONS,
  type Elections,
  type LedgerInput,
} from './ledger';
import { EMPTY_W4 } from './withholding';
import { buildPayPeriods } from '../paySchedule';

const NO_STATE = flatStateTable('WA', 0, 2026);

const input = (overrides: Partial<LedgerInput> = {}): LedgerInput => ({
  filingStatus: 'SINGLE',
  periodsPerYear: 24,
  annualSalary: 120000,
  incomeEvents: [],
  elections: NO_ELECTIONS,
  employer: NO_EMPLOYER_CONTRIBUTIONS,
  w4: EMPTY_W4,
  federal: FEDERAL_2026,
  state: NO_STATE,
  limits: LIMITS_2026,
  ...overrides,
});

const elections = (overrides: Partial<Elections>): Elections => ({ ...NO_ELECTIONS, ...overrides });

describe('buildLedger over real pay periods', () => {
  it('only pays the periods on or after the start date', () => {
    const periods = buildPayPeriods(2026, 26, {
      firstPayDate: '2026-01-09',
      startDate: '2026-07-01',
    });
    const { rows, totals } = buildLedger(
      input({ periodsPerYear: 26, periods, annualSalary: 130000 })
    );

    expect(rows).toHaveLength(periods.length);
    expect(rows[0].periodIndex).toBe(periods[0].periodIndex);
    expect(rows[0].payDate).toBe(periods[0].payDate);
    expect(totals.gross).toBeCloseTo((130000 / 26) * periods.length, 6);
  });

  it('stops paying after the role ends', () => {
    const periods = buildPayPeriods(2026, 26, {
      firstPayDate: '2026-01-09',
      endDate: '2026-09-11',
    });
    const { rows } = buildLedger(input({ periodsPerYear: 26, periods }));
    expect(rows.at(-1)!.payDate! <= '2026-09-11').toBe(true);
  });

  // Payroll annualizes each paycheck, so a part year over-withholds and refunds.
  it('over-withholds a part year because withholding annualizes every paycheck', () => {
    const periods = buildPayPeriods(2026, 26, {
      firstPayDate: '2026-01-09',
      startDate: '2026-07-01',
    });
    const partYear = buildLedger(input({ periodsPerYear: 26, periods, annualSalary: 130000 }));
    const fullYear = buildLedger(input({ periodsPerYear: 26, annualSalary: 130000 }));

    const partRate = partYear.totals.federalWithheld / partYear.totals.gross;
    const fullRate = fullYear.totals.federalWithheld / fullYear.totals.gross;
    expect(partRate).toBeCloseTo(fullRate, 6);
    expect(partYear.totals.gross).toBeLessThan(fullYear.totals.gross);
  });

  it('carries year-to-date state across the paid periods only', () => {
    const periods = buildPayPeriods(2026, 26, { startDate: '2026-07-01' });
    const { totals } = buildLedger(
      input({
        periodsPerYear: 26,
        periods,
        annualSalary: 500000,
        elections: elections({ pretax401kPercent: 20 }),
      })
    );
    expect(totals.pretax401k).toBeLessThanOrEqual(24500);
  });
});

describe('buildLedger', () => {
  it('emits one row per pay period', () => {
    expect(buildLedger(input()).rows).toHaveLength(24);
    expect(buildLedger(input({ periodsPerYear: 26 })).rows).toHaveLength(26);
  });

  it('returns an empty ledger rather than dividing by zero', () => {
    expect(buildLedger(input({ periodsPerYear: 0 })).rows).toEqual([]);
  });

  // $120,000 over 24 periods: 17,570 federal, 7,440 Social Security, 1,740 Medicare.
  it('matches a hand-computed salary-only year', () => {
    const { rows, totals } = buildLedger(input());
    expect(totals.gross).toBeCloseTo(120000, 6);
    expect(totals.federalWithheld).toBeCloseTo(17570, 6);
    expect(totals.payrollWithheld).toBeCloseTo(7440 + 1740, 6);
    expect(totals.net).toBeCloseTo(120000 - 17570 - 9180, 6);
    expect(rows[0].net).toBeCloseTo(5000 - 17570 / 24 - 310 - 72.5, 6);
  });

  it('withholds no state tax in a state that has none', () => {
    const { totals } = buildLedger(input());
    expect(totals.stateWithheld).toBe(0);
  });

  it('withholds state tax at the flat rate where one applies', () => {
    const { totals } = buildLedger(input({ state: flatStateTable('IL', 4.95, 2026) }));
    expect(totals.stateWithheld).toBeCloseTo(120000 * 0.0495, 4);
  });

  it('stops Social Security at the wage base and raises net pay afterwards', () => {
    const { rows } = buildLedger(input({ annualSalary: 300000, periodsPerYear: 12 }));
    const ssOf = (index: number) =>
      rows[index].payrollTaxes.find((tax) => tax.label === 'Social Security')!.amount;

    expect(ssOf(6)).toBeCloseTo(25000 * 0.062, 6);
    // Period 8 crosses 184,500 with 175,000 already paid, so only 9,500 is still taxable.
    expect(ssOf(7)).toBeCloseTo(9500 * 0.062, 6);
    expect(ssOf(8)).toBe(0);
    expect(rows[7].notes).toContain('Social Security wage base reached');
    expect(rows[8].net).toBeGreaterThan(rows[6].net);
  });

  it('caps Social Security at the annual maximum across the year', () => {
    const { rows } = buildLedger(input({ annualSalary: 300000, periodsPerYear: 12 }));
    const total = rows.reduce(
      (sum, row) => sum + row.payrollTaxes.find((tax) => tax.label === 'Social Security')!.amount,
      0
    );
    expect(total).toBeCloseTo(184500 * 0.062, 6);
  });

  it('starts the Additional Medicare surtax only above the withholding threshold', () => {
    const { rows } = buildLedger(input({ annualSalary: 300000, periodsPerYear: 12 }));
    const surtaxOf = (index: number) =>
      rows[index].payrollTaxes.find((tax) => tax.label === 'Additional Medicare')!.amount;

    expect(surtaxOf(6)).toBe(0);
    expect(surtaxOf(8)).toBeCloseTo(25000 * 0.009, 6);
  });

  it('stops 401(k) contributions at the elective deferral limit', () => {
    const { rows, totals } = buildLedger(
      input({
        annualSalary: 500000,
        periodsPerYear: 12,
        elections: elections({ pretax401kPercent: 20 }),
      })
    );
    expect(totals.pretax401k).toBeCloseTo(24500, 6);
    expect(rows[3].pretax401k).toBe(0);
    expect(rows[3].notes).toContain('401(k) contribution limit reached');
  });

  it('raises the deferral limit by the catch-up amount at 50 and over', () => {
    const { totals } = buildLedger(
      input({
        annualSalary: 500000,
        periodsPerYear: 12,
        elections: elections({ pretax401kPercent: 20, age50Plus: true }),
      })
    );
    expect(totals.pretax401k).toBeCloseTo(24500 + 8000, 6);
  });

  it('shares the deferral limit between traditional and Roth contributions', () => {
    const { totals } = buildLedger(
      input({
        annualSalary: 500000,
        periodsPerYear: 12,
        elections: elections({ pretax401kPercent: 15, roth401kPercent: 15 }),
      })
    );
    expect(totals.pretax401k + totals.roth401k).toBeCloseTo(24500, 6);
  });

  it('does not let a traditional 401(k) reduce FICA wages', () => {
    const plain = buildLedger(input());
    const deferring = buildLedger(input({ elections: elections({ pretax401kPercent: 10 }) }));

    expect(deferring.rows[0].ficaWages).toBeCloseTo(plain.rows[0].ficaWages, 6);
    expect(deferring.rows[0].regularTaxable).toBeLessThan(plain.rows[0].regularTaxable);
  });

  it('lets Section 125 premiums reduce FICA wages', () => {
    const plain = buildLedger(input());
    const insured = buildLedger(input({ elections: elections({ section125PerPeriod: 500 }) }));

    expect(insured.rows[0].ficaWages).toBeCloseTo(plain.rows[0].ficaWages - 500, 6);
  });

  it('lets a payroll HSA reduce FICA wages and counts the employer contribution against the cap', () => {
    const { rows, totals, hsaLimit } = buildLedger(
      input({
        elections: elections({ hsaPerPeriod: 300 }),
        employer: { ...NO_EMPLOYER_CONTRIBUTIONS, hsaAnnual: 1000 },
      })
    );
    expect(hsaLimit).toBeCloseTo(4400 - 1000, 6);
    expect(totals.hsa).toBeCloseTo(3400, 6);
    expect(rows[0].ficaWages).toBeCloseTo(5000 - 300, 6);
  });

  it('caps the FSA at the annual limit', () => {
    const { rows, totals } = buildLedger(input({ elections: elections({ fsaPerPeriod: 500 }) }));
    expect(totals.section125).toBeCloseTo(3400, 6);
    expect(rows.at(-1)!.fsa).toBe(0);
  });

  it('withholds a vest at the flat supplemental rate in the period it lands', () => {
    const { rows } = buildLedger(
      input({
        incomeEvents: [
          { id: 'v1', kind: 'vest', periodIndex: 6, amount: 50000, label: 'RSU vest' },
        ],
      })
    );
    expect(rows[5].supplementalGross).toBe(50000);
    expect(rows[5].federalSupplemental).toBeCloseTo(50000 * 0.22, 6);
    expect(rows[5].notes).toContain('RSU vest paid this period');
    expect(rows[4].federalSupplemental).toBe(0);
  });

  it('earns no match when the employee defers nothing', () => {
    const { totals } = buildLedger(
      input({ employer: { match401kPercent: 50, match401kLimitPercent: 6, hsaAnnual: 0 } })
    );
    expect(totals.employerMatch401k).toBe(0);
  });

  it('matches the employer contribution only up to the matched percent of pay', () => {
    const { totals } = buildLedger(
      input({
        elections: elections({ pretax401kPercent: 10 }),
        employer: { match401kPercent: 50, match401kLimitPercent: 6, hsaAnnual: 0 },
      })
    );
    expect(totals.employerMatch401k).toBeCloseTo(120000 * 0.06 * 0.5, 6);
  });

  it('excludes the employer match from net pay', () => {
    const deferring = elections({ pretax401kPercent: 6 });
    const withMatch = buildLedger(
      input({
        elections: deferring,
        employer: { match401kPercent: 100, match401kLimitPercent: 6, hsaAnnual: 0 },
      })
    );
    const withoutMatch = buildLedger(input({ elections: deferring }));
    expect(withMatch.totals.net).toBeCloseTo(withoutMatch.totals.net, 6);
    expect(withMatch.totals.employerMatch401k).toBeGreaterThan(0);
  });

  it('lets a pre-tax income-only deduction cut income tax without touching FICA', () => {
    const plain = buildLedger(input());
    const deducting = buildLedger(
      input({ elections: elections({ pretaxIncomeOnlyPerPeriod: 300 }) })
    );

    expect(deducting.rows[0].ficaWages).toBeCloseTo(plain.rows[0].ficaWages, 6);
    expect(deducting.rows[0].regularTaxable).toBeCloseTo(plain.rows[0].regularTaxable - 300, 6);
    expect(deducting.rows[0].net).toBeLessThan(plain.rows[0].net);
  });

  it('keeps net equal to gross less every deduction and tax', () => {
    const { rows } = buildLedger(
      input({
        elections: elections({
          pretax401kPercent: 6,
          roth401kPercent: 2,
          section125PerPeriod: 250,
          hsaPerPeriod: 100,
          pretaxIncomeOnlyPerPeriod: 60,
          postTaxPerPeriod: 40,
        }),
        incomeEvents: [{ id: 'b1', kind: 'bonus', periodIndex: 3, amount: 20000 }],
      })
    );

    for (const row of rows) {
      const outflow =
        row.section125 +
        row.hsa +
        row.pretax401k +
        row.pretaxIncomeOnly +
        row.postTax +
        row.taxTotal;
      expect(row.net).toBeCloseTo(row.gross - outflow, 6);
    }
  });
});

describe('the deferral base', () => {
  const BONUS = 12000;
  const ALLOWANCE = 200;
  const rowsFor = (deferralBase: Elections['deferralBase']) =>
    buildLedger(
      input({
        incomeEvents: [{ id: 'b1', kind: 'bonus', periodIndex: 1, amount: BONUS, label: 'Bonus' }],
        elections: {
          ...NO_ELECTIONS,
          pretax401kPercent: 10,
          taxableAllowancePerPeriod: ALLOWANCE,
          deferralBase,
        },
      })
    ).rows;

  it('defers on every taxable dollar by default', () => {
    const row = rowsFor('ALL')[0];
    expect(row.pretax401k).toBeCloseTo(row.gross * 0.1, 6);
  });

  it('leaves allowances out but keeps the bonus in', () => {
    const row = rowsFor('NO_ALLOWANCES')[0];
    expect(row.pretax401k).toBeCloseTo((row.gross - ALLOWANCE) * 0.1, 6);
    // The bonus is still deferred on, which is what separates this from salary only.
    expect(row.pretax401k).toBeGreaterThan(BONUS * 0.1);
  });

  it('leaves the bonus out too on salary only, which the old flag could not express', () => {
    const row = rowsFor('SALARY_ONLY')[0];
    expect(row.pretax401k).toBeCloseTo((row.gross - ALLOWANCE - BONUS) * 0.1, 6);
  });

  it('orders the three bases from widest to narrowest', () => {
    const all = rowsFor('ALL')[0].pretax401k;
    const noAllowances = rowsFor('NO_ALLOWANCES')[0].pretax401k;
    const salaryOnly = rowsFor('SALARY_ONLY')[0].pretax401k;
    expect(all).toBeGreaterThan(noAllowances);
    expect(noAllowances).toBeGreaterThan(salaryOnly);
  });

  it('matches on the same base it defers on', () => {
    const rows = buildLedger(
      input({
        incomeEvents: [{ id: 'b1', kind: 'bonus', periodIndex: 1, amount: BONUS, label: 'Bonus' }],
        elections: {
          ...NO_ELECTIONS,
          pretax401kPercent: 10,
          taxableAllowancePerPeriod: ALLOWANCE,
          deferralBase: 'SALARY_ONLY',
        },
        employer: { match401kPercent: 100, match401kLimitPercent: 5, hsaAnnual: 0 },
      })
    ).rows;
    const base = rows[0].gross - ALLOWANCE - BONUS;
    expect(rows[0].employerMatch401k).toBeCloseTo(base * 0.05, 6);
  });

  it('never drops below zero when the carve-out exceeds the gross', () => {
    const rows = buildLedger(
      input({
        annualSalary: 0,
        incomeEvents: [{ id: 'b1', kind: 'bonus', periodIndex: 1, amount: 500, label: 'Bonus' }],
        elections: { ...NO_ELECTIONS, pretax401kPercent: 10, deferralBase: 'SALARY_ONLY' },
      })
    ).rows;
    expect(rows[0].pretax401k).toBe(0);
  });
});
