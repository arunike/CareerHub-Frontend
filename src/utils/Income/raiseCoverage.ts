import type { RaiseEntry } from '../../types';

export interface RaiseCoverage {
  recorded: number;
  // Periods this year whose rate the schedule actually changed.
  reRated: number;
  firstDate: string | null;
}

export const raiseCoverageOf = (raises: RaiseEntry[], reRatedPeriods: number): RaiseCoverage => {
  const dated = raises
    .filter((raise) => Boolean(raise?.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    recorded: raises.length,
    reRated: reRatedPeriods,
    firstDate: dated[0]?.date ?? null,
  };
};

// Always says something: silence is what made a raise landing on the wrong record invisible.
export const describeRaiseCoverage = ({ recorded, reRated, firstDate }: RaiseCoverage): string => {
  if (recorded === 0) return 'No raises are recorded against this role.';
  const plural = recorded === 1 ? 'raise' : 'raises';
  if (reRated === 0) {
    return `${recorded} ${plural} recorded, re-rating no paycheck this year.`;
  }
  const paychecks = reRated === 1 ? 'paycheck' : 'paychecks';
  return `${recorded} ${plural} recorded, re-rating ${reRated} ${paychecks}${
    firstDate ? ` from ${firstDate}` : ''
  }.`;
};
