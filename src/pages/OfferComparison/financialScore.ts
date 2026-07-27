export const FINANCIAL_SCORE_LOG_SCALE = 50000;
export const FINANCIAL_SCORE_REFERENCE_VALUE = 300000;

/**
 * Converts adjusted annual value into a stable logarithmic score where $300k = 100.
 * Scores above 100 preserve meaningful differences between exceptional offers.
 */
export const computeIndependentFinancialScore = (financialValue: number) => {
  if (!Number.isFinite(financialValue) || financialValue <= 0) return 0;

  const referenceLog = Math.log1p(FINANCIAL_SCORE_REFERENCE_VALUE / FINANCIAL_SCORE_LOG_SCALE);

  return (100 * Math.log1p(financialValue / FINANCIAL_SCORE_LOG_SCALE)) / referenceLog;
};
