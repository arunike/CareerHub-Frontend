import type { FilingStatus, JurisdictionTable } from '../../../types/tax';
import { annualLiability } from './liability';

export interface W4Inputs {
  dependentsCredit: number;
  // Head count, used by the pre-2018 personal exemption. Distinct from the credit above.
  dependents: number;
  otherIncome: number;
  deductions: number;
  extraPerPeriod: number;
}

export const EMPTY_W4: W4Inputs = {
  dependentsCredit: 0,
  dependents: 0,
  otherIncome: 0,
  deductions: 0,
  extraPerPeriod: 0,
};

// The IRS percentage method: annualize this period's regular pay, compute the annual tax
// on it, then divide back down. Withholding and liability are the same calculation.
export const regularWithholding = (
  periodTaxable: number,
  periodsPerYear: number,
  table: JurisdictionTable,
  filingStatus: FilingStatus,
  w4: W4Inputs = EMPTY_W4
) => {
  if (periodsPerYear <= 0) return 0;
  const annualized = Math.max(0, periodTaxable * periodsPerYear + w4.otherIncome - w4.deductions);
  const annualTax = annualLiability(annualized, table, filingStatus, w4.dependents);
  const afterCredits = Math.max(0, annualTax - w4.dependentsCredit);
  return afterCredits / periodsPerYear + w4.extraPerPeriod;
};

// Bonuses and vests are withheld at a flat supplemental rate, which is why a large vest
// commonly under-withholds against the real marginal rate.
export const supplementalWithholding = (
  amount: number,
  table: JurisdictionTable,
  ytdSupplemental = 0
) => {
  if (amount <= 0) return 0;
  if (table.tier === 'none') return 0;

  const threshold = table.supplementalHighThreshold;
  const highRate = table.supplementalHighRate;
  if (threshold === undefined || highRate === undefined) return amount * table.supplementalRate;

  const overAfter = Math.max(0, ytdSupplemental + amount - threshold);
  const overBefore = Math.max(0, ytdSupplemental - threshold);
  const atHighRate = overAfter - overBefore;
  return (amount - atHighRate) * table.supplementalRate + atHighRate * highRate;
};
