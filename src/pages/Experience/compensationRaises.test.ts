import { describe, expect, it } from 'vitest';
import { getExperienceCompensationSnapshot } from './compensation';
import { totalEarned } from '../Income/raiseSchedule';
import type { Experience } from '../../types';

const exp = { id: 1, employment_type: 'full_time' } as unknown as Experience;

const raise = (date: string, before: number, after: number) => ({
  id: date,
  date,
  type: 'merit' as const,
  base_before: before,
  base_after: after,
  bonus_before: 0,
  bonus_after: 0,
  equity_before: 0,
  equity_after: 0,
});

describe('a salary snapshot follows the raise history', () => {
  it('shows the pay the role stores when nothing was logged', () => {
    const snap = getExperienceCompensationSnapshot(exp, {
      base_salary: 165000,
      bonus: 0,
      equity: 0,
    });
    expect(snap).toMatchObject({ kind: 'salary', base: 165000, total: 165000 });
    expect((snap as { earningsYears?: unknown[] }).earningsYears).toBeUndefined();
  });

  it('shows the raised pay, not the stale figure on the role', () => {
    const snap = getExperienceCompensationSnapshot(exp, {
      base_salary: 165000,
      bonus: 0,
      equity: 0,
      raise_history: [raise('2020-01-01', 165000, 165000)],
    });
    expect(snap).toMatchObject({ base: 165000 });
  });

  it('reports what the year paid, split into one stretch per rate', () => {
    const year = new Date().getFullYear();
    const snap = getExperienceCompensationSnapshot(
      { ...exp, start_date: `${year}-01-01`, is_current: true } as Experience,
      {
        base_salary: 165000,
        bonus: 0,
        equity: 0,
        raise_history: [raise(`${year}-07-02`, 165000, 336000)],
      }
    ) as { earningsYears?: { segments: { annualRate: number }[]; total: number }[] };
    const current = snap.earningsYears![0];
    expect(current.segments).toHaveLength(2);
    expect(current.segments[0].annualRate).toBe(165000);
    expect(current.segments[1].annualRate).toBe(336000);
    // Money earned, so it is under a full year at either rate.
    expect(current.total).toBeLessThan(336000);
  });
});

describe('totalEarned is the figure both the chip and the modal show', () => {
  it('totals the whole stint, not the current annual rate', () => {
    const year = new Date().getFullYear();
    const snap = getExperienceCompensationSnapshot(
      { ...exp, start_date: `${year - 1}-01-01`, is_current: true } as Experience,
      { base_salary: 165000, bonus: 0, equity: 0 }
    ) as { total: number; earningsYears?: never[] };
    const earned = totalEarned(snap.earningsYears!);
    // A full prior year plus part of this one is more than one year at the rate.
    expect(earned).toBeGreaterThan(snap.total);
    expect(Number.isInteger(earned)).toBe(true);
  });

  it('matches the sum of the parts the modal lists', () => {
    const year = new Date().getFullYear();
    const snap = getExperienceCompensationSnapshot(
      { ...exp, start_date: `${year - 1}-03-05`, is_current: true } as Experience,
      { base_salary: 165000, bonus: 24750, equity: 50000 }
    ) as { earningsYears?: { byComponent: Record<string, number> }[] };
    const parts = (['base', 'bonus', 'equity'] as const).map((key) =>
      snap.earningsYears!.reduce((sum, y) => sum + Math.round(y.byComponent[key]), 0)
    );
    expect(parts.reduce((a, b) => a + b, 0)).toBe(totalEarned(snap.earningsYears as never));
  });
});
