import { buildIncomeModel, type IncomeModelInput } from './incomeModel';
import type { IncomeSettings } from './incomeSettings';
import { activeInYear, type IncomeSource } from './incomeSources';
import { toIsoDate } from './paySchedule';

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
  // Both null until the balances are recorded on the 401(k) tab for this role.
  startingBalance: number | null;
  currentValue: number | null;
  // Landed paychecks only; the year's projection is the wrong thing to compare a balance to.
  contributedToDate: number;
  // Pay actually received so far, split the way a role's breakdown shows it.
  toDate: { gross: number; base: number; bonus: number; equity: number };
  paychecksToDate: number;
  // The whole year at these settings; every other figure here counts only what has been paid.
  projectedGross: number;
}

// Each role is its own plan, so balances add up — unlike the limit, which follows the person.
export interface RoleRetirement {
  sourceKey: string;
  company: string;
  gain: number;
  gainPercent: number | null;
}

export interface RetirementPerformance {
  startingBalance: number;
  currentValue: number;
  contributed: number;
  gain: number;
  // Per role, so the aggregate names its sources the way every other year figure does.
  roles: RoleRetirement[];
  // Simple return over the money at work, null when nothing was at work.
  gainPercent: number | null;
  // Roles behind the figure, and roles that contributed but recorded no balances.
  countedRoles: number;
  uncountedRoles: number;
}

export interface YearEarnings extends Earnings {
  taxYear: number;
  roles: RoleEarnings[];
  electiveLimit: number;
  // Null until at least one role has both balances; a partial answer would be a wrong one.
  retirement: RetirementPerformance | null;
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
  const todayIso = context.todayIso ?? toIsoDate(new Date());
  const { ledger, bonusEvents, vestEvents, effectiveRows } = buildIncomeModel({
    ...context,
    settings,
    source,
    taxYear,
  });
  // Paid means issued: a paycheck dated in the future has not paid anything yet.
  const landed = effectiveRows.filter((row) => row.payDate === null || row.payDate <= todayIso);
  // Recorded paychecks win over modelled ones, so the summary agrees with the ledger table.
  const gross = landed.reduce((total, row) => total + row.gross, 0);
  const taxWithheld = landed.reduce((total, row) => total + row.taxTotal, 0);
  const takeHome = landed.reduce((total, row) => total + row.net, 0);
  // The residual of the ledger's identity, so any set of deduction lines stays correct.
  const deductions = landed.reduce(
    (total, row) => total + (row.gross + row.taxFreeAllowance - row.taxTotal - row.net),
    0
  );
  // From the effective rows, so a recorded paycheck that deferred more moves this too.
  const employee401k = landed.reduce((total, row) => total + row.pretax401k + row.roth401k, 0);
  const employerMatch = landed.reduce((total, row) => total + row.employerMatch401k, 0);
  const sum = (pick: (row: (typeof landed)[number]) => number) =>
    landed.reduce((total, row) => total + pick(row), 0);
  // The whole year at these settings, kept so a part-year figure can be read against it.
  const projectedGross = effectiveRows.reduce((total, row) => total + row.gross, 0);

  const landedPeriods = new Set(landed.map((row) => row.periodIndex));
  const paid = (events: { periodIndex: number; amount: number }[]) =>
    events
      .filter((event) => landedPeriods.has(event.periodIndex))
      .reduce((total, event) => total + event.amount, 0);
  const grossToDate = landed.reduce((total, row) => total + row.gross, 0);
  const bonusToDate = paid(bonusEvents);
  const equityToDate = paid(vestEvents);

  return {
    sourceKey: source.key,
    company: source.company,
    roleTitle: source.roleTitle,
    paychecks: effectiveRows.length,
    paychecksToDate: landed.length,
    toDate: {
      gross: grossToDate,
      base: grossToDate - bonusToDate - equityToDate,
      bonus: bonusToDate,
      equity: equityToDate,
    },
    startingBalance: settings.retirementStartingBalance,
    currentValue: settings.retirementCurrentValue,
    contributedToDate: employee401k + employerMatch,
    projectedGross,
    gross,
    bonus: bonusToDate,
    equityVested: equityToDate,
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

// Both balances or the role is left out; a partial pairing reports a loss that is a missing number.
export const retirementPerformance = (roles: RoleEarnings[]): RetirementPerformance | null => {
  const counted = roles.filter(
    (role) => role.startingBalance !== null && role.currentValue !== null
  );
  if (counted.length === 0) return null;

  const startingBalance = counted.reduce((total, role) => total + (role.startingBalance ?? 0), 0);
  const currentValue = counted.reduce((total, role) => total + (role.currentValue ?? 0), 0);
  const contributed = counted.reduce((total, role) => total + role.contributedToDate, 0);
  const invested = startingBalance + contributed;
  const gain = currentValue - startingBalance - contributed;

  return {
    startingBalance,
    currentValue,
    contributed,
    gain,
    gainPercent: invested > 0 ? gain / invested : null,
    roles: counted.map((role) => {
      const roleInvested = (role.startingBalance ?? 0) + role.contributedToDate;
      const roleGain =
        (role.currentValue ?? 0) - (role.startingBalance ?? 0) - role.contributedToDate;
      return {
        sourceKey: role.sourceKey,
        company: role.company,
        gain: roleGain,
        gainPercent: roleInvested > 0 ? roleGain / roleInvested : null,
      };
    }),
    countedRoles: counted.length,
    uncountedRoles: roles.filter(
      (role) =>
        (role.startingBalance === null || role.currentValue === null) && role.contributedToDate > 0
    ).length,
  };
};

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
    retirement: retirementPerformance(roles),
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
