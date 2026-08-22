import { buildIncomeModel, type IncomeModelInput } from './incomeModel';
import type { IncomeSettings } from './incomeSettings';
import { activeInYear, type IncomeSource } from './incomeSources';

export interface Earnings {
  // Everything payroll reports as wages, which already includes bonus and vested equity.
  gross: number;
  bonus: number;
  equityVested: number;
  taxWithheld: number;
  takeHome: number;
  // Employer money, so this is the only line that adds on top of gross.
  employerMatch: number;
  totalComp: number;
}

export interface RoleEarnings extends Earnings {
  sourceKey: string;
  company: string;
  roleTitle: string;
  paychecks: number;
}

export interface YearEarnings extends Earnings {
  taxYear: number;
  roles: RoleEarnings[];
}

const EMPTY: Earnings = {
  gross: 0,
  bonus: 0,
  equityVested: 0,
  taxWithheld: 0,
  takeHome: 0,
  employerMatch: 0,
  totalComp: 0,
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
  const employerMatch = ledger.totals.employerMatch401k;

  return {
    sourceKey: source.key,
    company: source.company,
    roleTitle: source.roleTitle,
    paychecks: effectiveRows.length,
    gross,
    bonus: bonusEvents.reduce((total, event) => total + event.amount, 0),
    equityVested: vestEvents.reduce((total, event) => total + event.amount, 0),
    taxWithheld,
    takeHome,
    employerMatch,
    totalComp: gross + employerMatch,
  };
};

const add = (a: Earnings, b: Earnings): Earnings => ({
  gross: a.gross + b.gross,
  bonus: a.bonus + b.bonus,
  equityVested: a.equityVested + b.equityVested,
  taxWithheld: a.taxWithheld + b.taxWithheld,
  takeHome: a.takeHome + b.takeHome,
  employerMatch: a.employerMatch + b.employerMatch,
  totalComp: a.totalComp + b.totalComp,
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

  return { taxYear, roles, ...roles.reduce(add, EMPTY) };
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
