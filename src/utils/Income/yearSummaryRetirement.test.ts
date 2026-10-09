import { describe, expect, it } from 'vitest';
import { retirementPerformance } from './yearSummary';
import { roleEarnings } from './yearSummary.fixtures';

describe('retirementPerformance', () => {
  it('says nothing until a role has both balances', () => {
    expect(retirementPerformance([])).toBeNull();
    expect(retirementPerformance([roleEarnings({ startingBalance: 50000 })])).toBeNull();
    expect(retirementPerformance([roleEarnings({ currentValue: 70000 })])).toBeNull();
  });

  it('takes the gain as the balance change less every dollar paid in', () => {
    const performance = retirementPerformance([
      roleEarnings({
        startingBalance: 50000,
        currentValue: 70000,
        employee401k: 12000,
        employerMatch: 4000,
        contributedToDate: 16000,
      }),
    ])!;
    expect(performance.contributed).toBe(16000);
    expect(performance.gain).toBe(4000);
    // Over the money actually at work, not over the closing balance.
    expect(performance.gainPercent).toBeCloseTo(4000 / 66000, 10);
  });

  it('reports a loss rather than clamping at zero', () => {
    const performance = retirementPerformance([
      roleEarnings({
        startingBalance: 50000,
        currentValue: 52000,
        employee401k: 9000,
        contributedToDate: 9000,
      }),
    ])!;
    expect(performance.gain).toBe(-7000);
  });

  it('adds balances across roles, since each plan is its own account', () => {
    const performance = retirementPerformance([
      roleEarnings({
        startingBalance: 50000,
        currentValue: 70000,
        employee401k: 12000,
        contributedToDate: 12000,
      }),
      roleEarnings({
        sourceKey: 'experience-2',
        company: 'Netflix',
        startingBalance: 10000,
        currentValue: 14000,
        employee401k: 3000,
        contributedToDate: 3000,
      }),
    ])!;
    expect(performance.startingBalance).toBe(60000);
    expect(performance.currentValue).toBe(84000);
    expect(performance.contributed).toBe(15000);
    expect(performance.gain).toBe(9000);
    expect(performance.countedRoles).toBe(2);
  });

  it('leaves out a role with no balances, and its contributions with it', () => {
    const performance = retirementPerformance([
      roleEarnings({
        startingBalance: 50000,
        currentValue: 70000,
        employee401k: 12000,
        contributedToDate: 12000,
      }),
      roleEarnings({
        sourceKey: 'experience-2',
        company: 'Netflix',
        employee401k: 9000,
        contributedToDate: 9000,
      }),
    ])!;
    // Counting the second role's 9,000 against the first role's balances would invent a loss.
    expect(performance.contributed).toBe(12000);
    expect(performance.gain).toBe(8000);
    expect(performance.countedRoles).toBe(1);
    expect(performance.uncountedRoles).toBe(1);
  });

  it('does not count a balance-less role that never contributed as missing', () => {
    const performance = retirementPerformance([
      roleEarnings({ startingBalance: 50000, currentValue: 70000 }),
      roleEarnings({ sourceKey: 'experience-2', company: 'Netflix' }),
    ])!;
    expect(performance.uncountedRoles).toBe(0);
  });

  it('keeps the percentage signless, since the amount beside it already carries the sign', () => {
    const performance = retirementPerformance([
      roleEarnings({ startingBalance: 100000, currentValue: 90000 }),
    ])!;
    expect(performance.gain).toBe(-10000);
    // The card renders Math.abs of this next to a signed amount.
    expect(performance.gainPercent).toBeCloseTo(-0.1, 10);
  });

  it('counts only what has actually been paid in, not the year ahead', () => {
    // Half a year in: 9,000 has landed, the other 9,000 is still a projection.
    const performance = retirementPerformance([
      roleEarnings({
        startingBalance: 50000,
        currentValue: 60000,
        employee401k: 18000,
        contributedToDate: 9000,
      }),
    ])!;
    expect(performance.contributed).toBe(9000);
    // Against the full year this would read as a 8,000 loss, which never happened.
    expect(performance.gain).toBe(1000);
  });

  it('attributes the gain to each role that has balances', () => {
    const performance = retirementPerformance([
      roleEarnings({ startingBalance: 50000, currentValue: 70000, contributedToDate: 12000 }),
      roleEarnings({
        sourceKey: 'experience-2',
        company: 'Netflix',
        startingBalance: 10000,
        currentValue: 11000,
        contributedToDate: 3000,
      }),
    ])!;
    expect(performance.roles.map((role) => [role.company, role.gain])).toEqual([
      ['Google', 8000],
      ['Netflix', -2000],
    ]);
    // The parts add back to the aggregate, as every other year figure does.
    expect(performance.roles.reduce((total, role) => total + role.gain, 0)).toBe(performance.gain);
  });

  it('has no percentage when nothing was at work', () => {
    const performance = retirementPerformance([
      roleEarnings({ startingBalance: 0, currentValue: 0 }),
    ])!;
    expect(performance.gainPercent).toBeNull();
  });
});
