import type { FilingStatus, JurisdictionTable } from '../../../types/tax';
import { calculateProgressiveTax } from '../../../utils/taxMath';

export const standardDeductionFor = (table: JurisdictionTable, filingStatus: FilingStatus) =>
  table.standardDeduction?.[filingStatus] ?? 0;

// One exemption for the filer, a second for a joint spouse, plus one per dependent.
export const exemptionsClaimed = (filingStatus: FilingStatus, dependents = 0) =>
  (filingStatus === 'MARRIED_FILING_JOINTLY' ? 2 : 1) + Math.max(0, Math.floor(dependents));

// The pre-2018 personal exemption phase-out: the total is cut by a fixed rate for each
// step, or part of a step, by which income exceeds the threshold.
export const exemptionAmount = (
  income: number,
  table: JurisdictionTable,
  filingStatus: FilingStatus,
  dependents = 0
) => {
  const perExemption = table.personalExemption ?? 0;
  if (perExemption <= 0) return 0;

  const total = perExemption * exemptionsClaimed(filingStatus, dependents);
  const start = table.exemptionPhaseOutStart?.[filingStatus];
  const step = table.exemptionPhaseOutStep?.[filingStatus];
  const rate = table.exemptionPhaseOutRate;
  if (!start || !step || !rate || income <= start) return total;

  const steps = Math.ceil((income - start) / step);
  const reduction = Math.min(1, rate * steps);
  return total * (1 - reduction);
};

// Income tax owed for a full year in one jurisdiction, before credits.
export const annualLiability = (
  grossTaxableIncome: number,
  table: JurisdictionTable,
  filingStatus: FilingStatus,
  dependents = 0
) => {
  const income = Math.max(0, grossTaxableIncome);
  if (table.tier === 'none') return 0;

  if (table.tier === 'flat' || table.tier === 'fallback') {
    return income * ((table.flatRatePercent ?? 0) / 100);
  }

  const brackets = table.brackets?.[filingStatus];
  if (!brackets) return income * ((table.flatRatePercent ?? 0) / 100);

  const deducted =
    income -
    standardDeductionFor(table, filingStatus) -
    exemptionAmount(income, table, filingStatus, dependents);
  return calculateProgressiveTax(Math.max(0, deducted), brackets);
};

export const marginalRate = (
  grossTaxableIncome: number,
  table: JurisdictionTable,
  filingStatus: FilingStatus
) => {
  if (table.tier === 'none') return 0;
  if (table.tier === 'flat' || table.tier === 'fallback') return (table.flatRatePercent ?? 0) / 100;

  const brackets = table.brackets?.[filingStatus];
  if (!brackets) return 0;
  const taxable = Math.max(0, grossTaxableIncome - standardDeductionFor(table, filingStatus));
  return brackets.find((bracket) => taxable <= bracket.cap)?.rate ?? 0;
};
