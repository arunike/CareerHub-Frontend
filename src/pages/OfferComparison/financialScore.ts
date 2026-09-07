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

// Share of the bonus year worked since the last payout: nil the day after, nearly all the day before.
export const bonusYearElapsed = (todayIso: string, payoutMonth = BONUS_PAYOUT_MONTH) => {
  const time = Date.parse(`${todayIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(time)) return 0;
  const today = new Date(time);
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();
  const daysInMonth = new Date(Date.UTC(today.getUTCFullYear(), month, 0)).getUTCDate();
  // The payout lands at the end of its month, so accrual restarts with the month after it.
  const monthsSince = ((month - payoutMonth - 1 + 24) % 12) + (day - 1) / daysInMonth;
  return Math.min(1, monthsSince / 12);
};

// The accrued bonus you walk away from by resigning before it is paid.
export const forfeitedBonus = (
  currentBonus: number,
  todayIso: string,
  payoutMonth = BONUS_PAYOUT_MONTH
) => {
  const bonus = Number(currentBonus) || 0;
  if (bonus <= 0) return 0;
  return bonus * bonusYearElapsed(todayIso, payoutMonth);
};

export interface FinancialScoreInput {
  adjustedValue: number;
  // Already cost-of-living scaled, matching how it sits inside adjustedValue.
  benefitsPortion: number;
  afterTaxSignOn: number;
  afterTaxRelocation: number;
  // After tax; nothing when this is your current role, since staying forfeits nothing.
  forfeitedBonus: number;
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
  forfeitedBonus: forfeited,
  colIndex,
}: FinancialScoreInput): FinancialScoreValue => {
  const colFactor = 100 / Math.max(Number(colIndex) || 100, 1);
  const oneTimeTotal =
    ((Number(afterTaxSignOn) || 0) + (Number(afterTaxRelocation) || 0) - (Number(forfeited) || 0)) *
    colFactor;
  const oneTimeCounted = oneTimeTotal / ONE_TIME_HORIZON_YEARS;
  // adjustedValue already holds sign-on and relocation in full; the lost bonus never entered it.
  const alreadyInside =
    ((Number(afterTaxSignOn) || 0) + (Number(afterTaxRelocation) || 0)) * colFactor;
  return {
    value: adjustedValue - benefitsPortion - alreadyInside + oneTimeCounted,
    oneTimeTotal,
    oneTimeCounted,
    oneTimeRemoved: alreadyInside - oneTimeCounted,
  };
};
