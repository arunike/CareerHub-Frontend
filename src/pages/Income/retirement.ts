import type { EmployerContributions, PeriodRow } from './tax/ledger';
import { maxEmployerPercentOfPay } from './matchTiers';

export interface RetirementSummary {
  employeePretax: number;
  employeeRoth: number;
  employeeTotal: number;
  employerMatch: number;
  totalContributed: number;
  // Only the paychecks that have actually been paid. A balance recorded today cannot contain
  // December's contribution, so measuring it against the whole year invents a loss.
  contributedToDate: number;
  paidPeriodsToDate: number;
  employeePretaxToDate: number;
  employeeRothToDate: number;
  employerMatchToDate: number;
  // The last payday that has actually happened, so the figures can say what they cover.
  paidThroughDate: string | null;
  // True while the year still has paychecks to come, which is when the distinction matters.
  hasUnpaidPeriods: boolean;
  periodCount: number;
  // Match you were eligible for but did not earn by deferring too little.
  unclaimedMatch: number;
  startingBalance: number | null;
  currentValue: number | null;
  gains: number | null;
  gainPercent: number | null;
  // The 402(g) elective deferral limit covers what you contribute, traditional and Roth
  // together. The employer match does not count against it.
  electiveLimit: number;
  remainingToLimit: number;
  percentOfLimit: number;
  // The paycheck where cumulative contributions reach the limit, if they do.
  limitReachedOnPeriod: number | null;
  limitReachedOnDate: string | null;
}

const sum = (rows: PeriodRow[], pick: (row: PeriodRow) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

// The most the employer would contribute if the full matched percent were deferred.
export const maxMatchFor = (row: PeriodRow, employer: EmployerContributions) => {
  const percent = employer.matchTiers?.length
    ? maxEmployerPercentOfPay({
        tiers: employer.matchTiers,
        nonElectivePercent: employer.nonElectivePercent ?? 0,
        annualCap: 0,
      })
    : (employer.match401kLimitPercent * employer.match401kPercent) / 100 +
      (employer.nonElectivePercent ?? 0);
  return row.gross * (percent / 100);
};

// Where the running employee total first reaches the limit.
const limitCrossing = (rows: PeriodRow[], limit: number) => {
  if (limit <= 0) return { periodIndex: null, payDate: null };
  let running = 0;
  for (const row of rows) {
    running += row.pretax401k + row.roth401k;
    if (running >= limit - 0.005) {
      return { periodIndex: row.periodIndex, payDate: row.payDate };
    }
  }
  return { periodIndex: null, payDate: null };
};

export const summarizeRetirement = (
  rows: PeriodRow[],
  employer: EmployerContributions,
  startingBalance: number | null,
  currentValue: number | null,
  electiveLimit = 0,
  // Paychecks on or before this date have landed; later ones are still projections.
  todayIso = '9999-12-31'
): RetirementSummary => {
  const employeePretax = sum(rows, (row) => row.pretax401k);
  const employeeRoth = sum(rows, (row) => row.roth401k);
  const employerMatch = sum(rows, (row) => row.employerMatch401k);
  const unclaimedMatch = sum(rows, (row) =>
    Math.max(0, maxMatchFor(row, employer) - row.employerMatch401k)
  );
  const employeeTotal = employeePretax + employeeRoth;
  const totalContributed = employeeTotal + employerMatch;

  // An undated row counts as landed: treating an unknown date as future would zero out real
  // contributions, which is the same wrong comparison in the other direction.
  const paidRows = rows.filter((row) => row.payDate === null || row.payDate <= todayIso);
  const employeePretaxToDate = sum(paidRows, (row) => row.pretax401k);
  const employeeRothToDate = sum(paidRows, (row) => row.roth401k);
  const employerMatchToDate = sum(paidRows, (row) => row.employerMatch401k);
  const contributedToDate = employeePretaxToDate + employeeRothToDate + employerMatchToDate;
  const toDate = {
    contributedToDate,
    employeePretaxToDate,
    employeeRothToDate,
    employerMatchToDate,
    paidPeriodsToDate: paidRows.length,
    paidThroughDate: paidRows.at(-1)?.payDate ?? null,
    hasUnpaidPeriods: paidRows.length < rows.length,
    periodCount: rows.length,
  };

  const remainingToLimit = Math.max(0, electiveLimit - employeeTotal);
  const percentOfLimit = electiveLimit > 0 ? employeeTotal / electiveLimit : 0;
  const crossing = limitCrossing(rows, electiveLimit);

  // Gains need a starting point: without it the contributions alone say nothing about
  // investment performance.
  if (currentValue === null || startingBalance === null) {
    return {
      employeePretax,
      employeeRoth,
      employeeTotal,
      employerMatch,
      totalContributed,
      ...toDate,
      unclaimedMatch,
      startingBalance,
      currentValue,
      gains: null,
      gainPercent: null,
      electiveLimit,
      remainingToLimit,
      percentOfLimit,
      limitReachedOnPeriod: crossing.periodIndex,
      limitReachedOnDate: crossing.payDate,
    };
  }

  // Measured against what has been paid in so far, not the year's projection.
  const gains = currentValue - startingBalance - contributedToDate;
  const invested = startingBalance + contributedToDate;
  return {
    employeePretax,
    employeeRoth,
    employeeTotal,
    employerMatch,
    totalContributed,
    ...toDate,
    unclaimedMatch,
    startingBalance,
    currentValue,
    gains,
    gainPercent: invested > 0 ? gains / invested : null,
    electiveLimit,
    remainingToLimit,
    percentOfLimit,
    limitReachedOnPeriod: crossing.periodIndex,
    limitReachedOnDate: crossing.payDate,
  };
};
