export const FINANCIAL_SCORE_LOG_SCALE = 50000;
export const FINANCIAL_SCORE_REFERENCE_VALUE = 300000;

// Logarithmic score where $300k = 100; above 100 still separates strong offers.
export const computeIndependentFinancialScore = (financialValue: number) => {
  if (!Number.isFinite(financialValue) || financialValue <= 0) return 0;

  const referenceLog = Math.log1p(FINANCIAL_SCORE_REFERENCE_VALUE / FINANCIAL_SCORE_LOG_SCALE);

  return (100 * Math.log1p(financialValue / FINANCIAL_SCORE_LOG_SCALE)) / referenceLog;
};
