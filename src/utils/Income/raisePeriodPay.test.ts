import { describe, expect, it } from 'vitest';
import { buildSalarySteps, salaryByPeriod, salaryOn } from './raiseSchedule';
import type { RaiseEntry } from '../../types';

const OLD_BASE = 165000;
const NEW_BASE = 181500;
const PERIODS_PER_YEAR = 26;

// Agreed from July, first actually paid in October: the gap becomes back pay.
const raise = {
  id: 'r1',
  date: '2026-10-01',
  effective_date: '2026-07-01',
  base_before: OLD_BASE,
  base_after: NEW_BASE,
} as unknown as RaiseEntry;

const period = (periodIndex: number, payDate: string) => ({ periodIndex, payDate });

describe('the paycheck a raise first lands in', () => {
  it('steps from the date the raise was paid, not the date it took effect', () => {
    const steps = buildSalarySteps([raise], OLD_BASE);
    expect(salaryOn(steps, '2026-08-26', OLD_BASE)).toBe(OLD_BASE);
    expect(salaryOn(steps, '2026-09-09', OLD_BASE)).toBe(OLD_BASE);
    expect(salaryOn(steps, '2026-10-07', OLD_BASE)).toBe(NEW_BASE);
  });

  it('records only the periods whose rate differs from the fallback', () => {
    const byPeriod = salaryByPeriod(
      [period(17, '2026-08-26'), period(18, '2026-09-09'), period(19, '2026-10-07')],
      [raise],
      OLD_BASE,
      PERIODS_PER_YEAR
    );
    // Unchanged periods are absent on purpose; the ledger falls back to annual / periods for them.
    expect(byPeriod[17]).toBeUndefined();
    expect(byPeriod[18]).toBeUndefined();
    expect(byPeriod[19]).toBeCloseTo(NEW_BASE / PERIODS_PER_YEAR, 2);
  });

  it('re-rates from the paid date whichever salary is treated as the fallback', () => {
    const fromNew = salaryByPeriod([period(19, '2026-10-07')], [raise], NEW_BASE, PERIODS_PER_YEAR);
    const fromOld = salaryByPeriod([period(19, '2026-10-07')], [raise], OLD_BASE, PERIODS_PER_YEAR);
    // Absent means "use the fallback", which is the new rate in the first case.
    expect(fromNew[19] ?? NEW_BASE / PERIODS_PER_YEAR).toBeCloseTo(NEW_BASE / PERIODS_PER_YEAR, 2);
    expect(fromOld[19]).toBeCloseTo(NEW_BASE / PERIODS_PER_YEAR, 2);
  });

  it('does not leave the first post-raise period on the old rate', () => {
    const byPeriod = salaryByPeriod(
      [period(19, '2026-10-07')],
      [raise],
      OLD_BASE,
      PERIODS_PER_YEAR
    );
    expect(byPeriod[19]).not.toBeCloseTo(OLD_BASE / PERIODS_PER_YEAR, 2);
  });
});
