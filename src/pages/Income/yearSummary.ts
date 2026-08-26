import { buildIncomeModel, type IncomeModelInput } from './incomeModel';
import type { IncomeSettings } from './incomeSettings';
import { activeInYear, type IncomeSource } from './incomeSources';

export interface Earnings {
  // Everything payroll reports as wages, which already includes bonus and vested equity.
  gross: number;
  bonus: number;
  equityVested: number;
  taxWithheld: number;
  // Everything withheld that was not tax: 401(k), insurance, HSA, and anything post-tax.
  deductions: number;
  takeHome: number;
  // Traditional and Roth together, which is what the 402(g) limit counts.
  employee401k: number;
  // Employer money, so this is the only line that adds on top of gross.
  employerMatch: number;
  totalComp: number;
  // The parts each figure above is built from, summed from the effective rows.
  supplementalGross: number;
  taxableAllowance: number;
  taxFreeAllowance: number;
  section125: number;
  hsa: number;
  pretax401k: number;
  pretaxIncomeOnly: number;
  roth401k: number;
  postTax: number;
  federalTax: number;
  stateTax: number;
  payrollTax: number;
}

export interface RoleEarnings extends Earnings {
  sourceKey: string;
  company: string;
  roleTitle: string;
  paychecks: number;
  electiveLimit: number;
}

export interface YearEarnings extends Earnings {
  taxYear: number;
  roles: RoleEarnings[];
  electiveLimit: number;
}

const EMPTY: Earnings = {
  gross: 0,
  bonus: 0,
  equityVested: 0,
  taxWithheld: 0,
  deductions: 0,
  takeHome: 0,
  employee401k: 0,
  employerMatch: 0,
  totalComp: 0,
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
  payrollTax: 0,
};

type TaxContext = Omit<IncomeModelInput, 'settings' | 'source' | 'taxYear'>;

export type SettingsResolver = (taxYear: number, sourceKey: string) => IncomeSettings;

const earningsFor = (
  source: IncomeSource,
  taxYear: number,
  settings: IncomeSettings,
  context: TaxContext
): RoleEarnings => {
  const { ledger, bonusEvents, vestEvents, effectiveRows } = buildIncomeModel({
    ...context,
    settings,
    source,
    taxYear,
  });
  // Recorded paychecks win over modelled ones, so the summary agrees with the ledger table.
  const gross = effectiveRows.reduce((total, row) => total + row.gross, 0);
  const taxWithheld = effectiveRows.reduce((total, row) => total + row.taxTotal, 0);
  const takeHome = effectiveRows.reduce((total, row) => total + row.net, 0);
  // Taken as the residual of the ledger's own identity, so it stays correct whatever
  // deduction lines a paycheck happens to carry.
  const deductions = effectiveRows.reduce(
    (total, row) => total + (row.gross + row.taxFreeAllowance - row.taxTotal - row.net),
    0
  );
  // From the effective rows, so a recorded paycheck that deferred more moves this too.
  const employee401k = effectiveRows.reduce(
    (total, row) => total + row.pretax401k + row.roth401k,
    0
  );
  const employerMatch = ledger.totals.employerMatch401k;
  const sum = (pick: (row: (typeof effectiveRows)[number]) => number) =>
    effectiveRows.reduce((total, row) => total + pick(row), 0);

  return {
    sourceKey: source.key,
    company: source.company,
    roleTitle: source.roleTitle,
    paychecks: effectiveRows.length,
    gross,
    bonus: bonusEvents.reduce((total, event) => total + event.amount, 0),
    equityVested: vestEvents.reduce((total, event) => total + event.amount, 0),
    taxWithheld,
    deductions,
    takeHome,
    employee401k,
    employerMatch,
    totalComp: gross + employerMatch,
    electiveLimit: ledger.elective401kLimit,
    supplementalGross: sum((row) => row.supplementalGross),
    taxableAllowance: sum((row) => row.taxableAllowance),
    taxFreeAllowance: sum((row) => row.taxFreeAllowance),
    section125: sum((row) => row.section125),
    hsa: sum((row) => row.hsa),
    pretax401k: sum((row) => row.pretax401k),
    pretaxIncomeOnly: sum((row) => row.pretaxIncomeOnly),
    roth401k: sum((row) => row.roth401k),
    postTax: sum((row) => row.postTax),
    federalTax: sum((row) => row.federalTax),
    stateTax: sum((row) => row.stateTax),
    payrollTax: sum((row) => row.payrollTaxes.reduce((t, tax) => t + tax.amount, 0)),
  };
};

const add = (a: Earnings, b: Earnings): Earnings => ({
  gross: a.gross + b.gross,
  bonus: a.bonus + b.bonus,
  equityVested: a.equityVested + b.equityVested,
  taxWithheld: a.taxWithheld + b.taxWithheld,
  deductions: a.deductions + b.deductions,
  takeHome: a.takeHome + b.takeHome,
  employee401k: a.employee401k + b.employee401k,
  employerMatch: a.employerMatch + b.employerMatch,
  totalComp: a.totalComp + b.totalComp,
  supplementalGross: a.supplementalGross + b.supplementalGross,
  taxableAllowance: a.taxableAllowance + b.taxableAllowance,
  taxFreeAllowance: a.taxFreeAllowance + b.taxFreeAllowance,
  section125: a.section125 + b.section125,
  hsa: a.hsa + b.hsa,
  pretax401k: a.pretax401k + b.pretax401k,
  pretaxIncomeOnly: a.pretaxIncomeOnly + b.pretaxIncomeOnly,
  roth401k: a.roth401k + b.roth401k,
  postTax: a.postTax + b.postTax,
  federalTax: a.federalTax + b.federalTax,
  stateTax: a.stateTax + b.stateTax,
  payrollTax: a.payrollTax + b.payrollTax,
});

// What every role held in one year paid, and the year's total across all of them.
export const summarizeYear = (
  taxYear: number,
  sources: IncomeSource[],
  settingsFor: SettingsResolver,
  context: TaxContext
): YearEarnings => {
  const roles = sources
    .filter((source) => activeInYear(source, taxYear))
    .map((source) => earningsFor(source, taxYear, settingsFor(taxYear, source.key), context))
    // A role that was not paid in this year would only add a zero row.
    .filter((role) => role.paychecks > 0)
    .sort((a, b) => b.gross - a.gross);

  return {
    taxYear,
    roles,
    ...roles.reduce(add, EMPTY),
    // One limit per person, so take it; summing would claim a multi-role year may defer more.
    electiveLimit: Math.max(0, ...roles.map((role) => role.electiveLimit)),
  };
};

export const summarizeYears = (
  years: number[],
  sources: IncomeSource[],
  settingsFor: SettingsResolver,
  context: TaxContext
): YearEarnings[] =>
  years
    .map((year) => summarizeYear(year, sources, settingsFor, context))
    .filter((year) => year.roles.length > 0);
