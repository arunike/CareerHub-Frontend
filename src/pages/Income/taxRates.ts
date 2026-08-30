import type { PeriodActual } from './effectiveRows';

// Structural, so both the modelled row and the effective row satisfy it.
export interface RateRow {
  periodIndex: number;
  gross: number;
  taxTotal: number;
  section125: number;
  hsa: number;
  pretax401k: number;
  pretaxIncomeOnly: number;
  postTax: number;
}

export const deductionsOf = (row: RateRow) =>
  row.section125 + row.hsa + row.pretax401k + row.pretaxIncomeOnly + row.postTax;

// Share of gross pay withheld as tax, which is what a paycheck actually shows.
export const calculatedRate = (row: RateRow) => (row.gross > 0 ? row.taxTotal / row.gross : 0);

// Implied by a recorded take-home with deductions held constant.
export const impliedRate = (row: RateRow, actualNet: number | null | undefined) => {
  if (actualNet === null || actualNet === undefined || row.gross <= 0) return null;
  const impliedTax = row.gross - deductionsOf(row) - actualNet;
  return impliedTax / row.gross;
};

export interface RateComparison {
  calculated: number;
  actual: number | null;
  // Percentage points, positive when more was withheld than modelled.
  differencePoints: number | null;
  comparedCount: number;
}

export const compareRates = (rows: RateRow[], actuals: PeriodActual[]): RateComparison => {
  const actualByPeriod = new Map(
    actuals
      .filter((actual) => actual.net !== null && actual.net !== undefined)
      .map((actual) => [actual.periodIndex, actual.net as number])
  );

  const grossTotal = rows.reduce((sum, row) => sum + row.gross, 0);
  const taxTotal = rows.reduce((sum, row) => sum + row.taxTotal, 0);
  const calculated = grossTotal > 0 ? taxTotal / grossTotal : 0;

  // Only paychecks with a recorded actual can contribute, so the two rates stay comparable.
  let comparedGross = 0;
  let comparedModelTax = 0;
  let comparedActualTax = 0;
  let comparedCount = 0;

  for (const row of rows) {
    const actualNet = actualByPeriod.get(row.periodIndex);
    if (actualNet === undefined) continue;
    comparedGross += row.gross;
    comparedModelTax += row.taxTotal;
    comparedActualTax += row.gross - deductionsOf(row) - actualNet;
    comparedCount += 1;
  }

  if (comparedCount === 0 || comparedGross <= 0) {
    return { calculated, actual: null, differencePoints: null, comparedCount: 0 };
  }

  const actual = comparedActualTax / comparedGross;
  const modelled = comparedModelTax / comparedGross;
  return {
    calculated,
    actual,
    differencePoints: (actual - modelled) * 100,
    comparedCount,
  };
};
