import { describe, expect, it } from 'vitest';
import { buildSalarySteps, salaryByPeriod, salaryOn } from './raiseSchedule';
import type { RaiseEntry } from '../../types';

const raise = (over: Partial<RaiseEntry>): RaiseEntry =>
  ({ id: 'r', date: '2026-10-01', type: 'merit', ...over }) as RaiseEntry;

// Two raises notified on one day: the first backdated, the second not yet in force.
const first = raise({
  id: 'a',
  effective_date: '2026-07-01',
  base_before: 165000,
  base_after: 181500,
});
const second = raise({
  id: 'b',
  effective_date: '2026-11-01',
  base_before: 181500,
  base_after: 199650,
});

describe('two raises notified on the same day', () => {
  it('lands on the later effective one, whichever order they are stored in', () => {
    for (const order of [
      [first, second],
      [second, first],
    ]) {
      const steps = buildSalarySteps(order, 165000);
      expect(salaryOn(steps, '2026-10-01', 165000)).toBe(181500);
      expect(salaryOn(steps, '2026-11-01', 165000)).toBe(199650);
    }
  });

  it('still pays the old rate the day before', () => {
    expect(salaryOn(buildSalarySteps([first, second], 165000), '2026-09-30', 165000)).toBe(165000);
  });

  it('opens at the pay the earliest raise was raised from', () => {
    expect(buildSalarySteps([second, first], 165000)[0].annualSalary).toBe(165000);
  });

  it('re-rates each paycheck at whichever raise had started by then', () => {
    const periods = [
      { periodIndex: 18, payDate: '2026-09-15' },
      { periodIndex: 19, payDate: '2026-10-15' },
      { periodIndex: 20, payDate: '2026-11-15' },
    ];
    const byPeriod = salaryByPeriod(periods, [first, second], 165000, 26);
    expect(byPeriod[18]).toBeUndefined();
    expect(byPeriod[19]).toBeCloseTo(181500 / 26, 6);
    expect(byPeriod[20]).toBeCloseTo(199650 / 26, 6);
  });
});

describe('a raise announced before it takes effect', () => {
  const early = raise({
    id: 'c',
    date: '2026-10-01',
    effective_date: '2026-11-01',
    base_before: 165000,
    base_after: 199650,
  });

  it('does not pay the new rate before the day it starts', () => {
    const steps = buildSalarySteps([early], 165000);
    expect(salaryOn(steps, '2026-10-01', 165000)).toBe(165000);
    expect(salaryOn(steps, '2026-10-31', 165000)).toBe(165000);
  });

  it('pays it from the effective date onward', () => {
    const steps = buildSalarySteps([early], 165000);
    expect(salaryOn(steps, '2026-11-01', 165000)).toBe(199650);
    expect(salaryOn(steps, '2026-12-25', 165000)).toBe(199650);
  });

  it('still steps on the notified date when the raise was backdated', () => {
    const backdated = raise({
      id: 'd',
      date: '2026-10-01',
      effective_date: '2026-07-01',
      base_before: 165000,
      base_after: 181500,
    });
    const steps = buildSalarySteps([backdated], 165000);
    expect(salaryOn(steps, '2026-09-30', 165000)).toBe(165000);
    expect(salaryOn(steps, '2026-10-01', 165000)).toBe(181500);
  });
});
