import type { FilingStatus, JurisdictionTable } from '../../../types/tax';
import type { PeriodActual } from '../effectiveRows';
import { annualLiability } from './liability';
import type { LedgerTotals, PeriodRow } from './ledger';
import type { W4Inputs } from './withholding';

export interface Reconciliation {
  taxableIncome: number;
  federalLiability: number;
  stateLiability: number;
  incomeTaxLiability: number;
  incomeTaxWithheld: number;
  // Positive is a refund, negative is a balance owed.
  difference: number;
  supplementalShare: number;
  supplementalUnderWithheld: boolean;
}

// FICA is exact by construction, so only income tax is compared against withholding.
export const reconcileYear = (
  totals: LedgerTotals,
  federal: JurisdictionTable,
  state: JurisdictionTable,
  filingStatus: FilingStatus,
  w4: W4Inputs
): Reconciliation => {
  const taxableIncome = totals.regularTaxable + totals.supplementalTaxable;
  const federalLiability = Math.max(
    0,
    annualLiability(taxableIncome, federal, filingStatus, w4.dependents) - w4.dependentsCredit
  );
  const stateLiability = annualLiability(taxableIncome, state, filingStatus, w4.dependents);
  const incomeTaxLiability = federalLiability + stateLiability;
  const incomeTaxWithheld = totals.federalWithheld + totals.stateWithheld;
  const supplementalShare = taxableIncome > 0 ? totals.supplementalTaxable / taxableIncome : 0;
  const difference = incomeTaxWithheld - incomeTaxLiability;

  return {
    taxableIncome,
    federalLiability,
    stateLiability,
    incomeTaxLiability,
    incomeTaxWithheld,
    difference,
    supplementalShare,
    // A flat supplemental rate on a large share of income is the usual cause of a shortfall.
    supplementalUnderWithheld: difference < 0 && supplementalShare >= 0.1,
  };
};

export interface PeriodVariance {
  periodIndex: number;
  modelledNet: number;
  actualNet: number;
  netVariance: number;
  modelledGross: number;
  actualGross: number | null;
  modelledTaxWithheld: number;
  actualTaxWithheld: number | null;
}

export interface DriftSummary {
  periods: PeriodVariance[];
  comparedCount: number;
  totalNetVariance: number;
  meanNetVariance: number;
}

// Rows without a recorded actual are skipped rather than counted as zero variance.
export const compareActuals = (rows: PeriodRow[], actuals: PeriodActual[]): DriftSummary => {
  const byPeriod = new Map(actuals.map((actual) => [actual.periodIndex, actual]));
  const periods: PeriodVariance[] = [];

  for (const row of rows) {
    const actual = byPeriod.get(row.periodIndex);
    if (!actual || actual.net === null || actual.net === undefined) continue;

    periods.push({
      periodIndex: row.periodIndex,
      modelledNet: row.net,
      actualNet: actual.net,
      netVariance: actual.net - row.net,
      modelledGross: row.gross,
      actualGross: actual.gross ?? null,
      modelledTaxWithheld: row.taxTotal,
      actualTaxWithheld: null,
    });
  }

  const totalNetVariance = periods.reduce((total, period) => total + period.netVariance, 0);
  return {
    periods,
    comparedCount: periods.length,
    totalNetVariance,
    meanNetVariance: periods.length > 0 ? totalNetVariance / periods.length : 0,
  };
};
