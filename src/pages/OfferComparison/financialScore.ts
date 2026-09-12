export const FINANCIAL_SCORE_LOG_SCALE = 50000;
export const FINANCIAL_SCORE_REFERENCE_VALUE = 300000;

// Logarithmic score where $300k = 100; above 100 still separates strong offers.
export const computeIndependentFinancialScore = (financialValue: number) => {
  if (!Number.isFinite(financialValue) || financialValue <= 0) return 0;

  const referenceLog = Math.log1p(FINANCIAL_SCORE_REFERENCE_VALUE / FINANCIAL_SCORE_LOG_SCALE);

  return (100 * Math.log1p(financialValue / FINANCIAL_SCORE_LOG_SCALE)) / referenceLog;
};

// The four-year view the page already models, so a one-off cheque cannot rank like a raise.
export const ONE_TIME_HORIZON_YEARS = 4;

// Most annual bonuses land at the end of the performance year and require you to still be there.
export const BONUS_PAYOUT_MONTH = 12;

// The bonus clock runs from the day you start, not the day you happen to be comparing.
export const bonusClockDate = (offer: unknown, todayIso: string) => {
  const record = (offer ?? {}) as {
    expected_start_date?: unknown;
    linked_experience?: { start_date?: unknown } | null;
  };
  const expected = record.expected_start_date;
  if (typeof expected === 'string' && expected.length >= 10) return expected.slice(0, 10);
  const started = record.linked_experience?.start_date;
  if (typeof started === 'string' && started.length >= 10) return started.slice(0, 10);
  return todayIso;
};

export interface FinancialScoreInput {
  adjustedValue: number;
  // Already cost-of-living scaled, matching how it sits inside adjustedValue.
  benefitsPortion: number;
  afterTaxSignOn: number;
  afterTaxRelocation: number;
  // After tax. The bonus given up by leaving, less what this offer's first pro-rated bonus pays.
  bonusNetOnMove: number;
  colIndex: number;
}

export interface FinancialScoreValue {
  value: number;
  oneTimeTotal: number;
  oneTimeCounted: number;
  oneTimeRemoved: number;
}

// One-time money is counted at a quarter, not dropped: a sign-on is real, just not every year.
export const financialScoreValue = ({
  adjustedValue,
  benefitsPortion,
  afterTaxSignOn,
  afterTaxRelocation,
  bonusNetOnMove: shortfall,
  colIndex,
}: FinancialScoreInput): FinancialScoreValue => {
  const colFactor = 100 / Math.max(Number(colIndex) || 100, 1);
  const oneTimeTotal =
    ((Number(afterTaxSignOn) || 0) + (Number(afterTaxRelocation) || 0) - (Number(shortfall) || 0)) *
    colFactor;
  const oneTimeCounted = oneTimeTotal / ONE_TIME_HORIZON_YEARS;
  // adjustedValue holds sign-on and relocation in full; the shortfall was never part of it.
  const alreadyInside =
    ((Number(afterTaxSignOn) || 0) + (Number(afterTaxRelocation) || 0)) * colFactor;
  return {
    value: adjustedValue - benefitsPortion - alreadyInside + oneTimeCounted,
    oneTimeTotal,
    oneTimeCounted,
    oneTimeRemoved: alreadyInside - oneTimeCounted,
  };
};
