import { SALARY_HOURS_PER_YEAR } from '../Experience/payGrowth';

export const annualFromHourly = (hourly: number): number =>
  Math.round(Math.max(0, hourly) * SALARY_HOURS_PER_YEAR);

export const hourlyFromAnnual = (annual: number): number =>
  annual > 0 ? annual / SALARY_HOURS_PER_YEAR : 0;

export interface ValueChange {
  amount: number;
  // Null when there is no before value to measure against, which is not the same as 0%.
  percent: number | null;
}

export const changeBetween = (before: number, after: number): ValueChange => ({
  amount: after - before,
  percent: before > 0 ? ((after - before) / before) * 100 : null,
});

export const formatPercentChange = (percent: number): string =>
  `${percent > 0 ? '+' : percent < 0 ? '−' : ''}${Math.abs(percent).toFixed(1)}%`;
