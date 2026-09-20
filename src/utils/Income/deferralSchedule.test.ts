import { describe, expect, it } from 'vitest';
import {
  deferralOverridesFor,
  deferralRateOn,
  emptyDeferralPlan,
  mergeDeferralSchedule,
  normalizeDeferralPlan,
  type DeferralPlan,
} from './deferralSchedule';

const BASE = { pretaxPercent: 6, rothPercent: 0 };
const plan = (over: Partial<DeferralPlan> = {}): DeferralPlan => ({
  ...emptyDeferralPlan(),
  ...over,
});
const step = (effectiveDate: string, pretaxPercent: number, rothPercent = 0) => ({
  id: effectiveDate,
  effectiveDate,
  pretaxPercent,
  rothPercent,
});

describe('deferralRateOn', () => {
  it('uses the standing election before any step', () => {
    const p = plan({ steps: [step('2026-07-01', 10)] });
    expect(deferralRateOn(p, BASE, '2026-06-30', null)).toEqual(BASE);
  });

  it('switches on the effective date and holds after it', () => {
    const p = plan({ steps: [step('2026-07-01', 10)] });
    expect(deferralRateOn(p, BASE, '2026-07-01', null).pretaxPercent).toBe(10);
    expect(deferralRateOn(p, BASE, '2026-12-25', null).pretaxPercent).toBe(10);
  });

  it('takes the last step that has taken effect, not the first', () => {
    const p = plan({ steps: [step('2026-07-01', 10), step('2026-10-01', 15)] });
    expect(deferralRateOn(p, BASE, '2026-09-30', null).pretaxPercent).toBe(10);
    expect(deferralRateOn(p, BASE, '2026-10-01', null).pretaxPercent).toBe(15);
  });

  it('orders steps by date however they were entered', () => {
    const p = plan({ steps: [step('2026-10-01', 15), step('2026-07-01', 10)] });
    expect(deferralRateOn(p, BASE, '2026-08-01', null).pretaxPercent).toBe(10);
  });

  it('carries the Roth rate from the step, not from the election', () => {
    const p = plan({ steps: [step('2026-07-01', 4, 3)] });
    expect(deferralRateOn(p, BASE, '2026-08-01', null)).toEqual({
      pretaxPercent: 4,
      rothPercent: 3,
    });
  });

  it('holds the rate when there is no pay date to place it against', () => {
    expect(deferralRateOn(plan({ steps: [step('2026-07-01', 10)] }), BASE, null, null)).toEqual(
      BASE
    );
  });
});

describe('annual escalation', () => {
  const climbing = (over = {}) =>
    plan({ escalation: { enabled: true, percentPerYear: 1, capPercent: 0, ...over } });

  it('adds points, not a percentage of the rate', () => {
    // 6% stepping by 1 is 7%, never 6.06%.
    expect(deferralRateOn(climbing(), BASE, '2027-01-01', '2026-01-01').pretaxPercent).toBe(7);
  });

  it('does nothing before the first anniversary', () => {
    expect(deferralRateOn(climbing(), BASE, '2026-12-31', '2026-01-01').pretaxPercent).toBe(6);
  });

  it('climbs once per completed year', () => {
    expect(deferralRateOn(climbing(), BASE, '2029-01-01', '2026-01-01').pretaxPercent).toBe(9);
  });

  it('stops at the cap', () => {
    const capped = climbing({ capPercent: 8 });
    expect(deferralRateOn(capped, BASE, '2040-01-01', '2026-01-01').pretaxPercent).toBe(8);
  });

  it('is inert while switched off, and while stepping by zero', () => {
    expect(
      deferralRateOn(climbing({ enabled: false }), BASE, '2030-01-01', '2026-01-01').pretaxPercent
    ).toBe(6);
    expect(
      deferralRateOn(climbing({ percentPerYear: 0 }), BASE, '2030-01-01', '2026-01-01')
        .pretaxPercent
    ).toBe(6);
  });

  it('counts from the step in force, so a hand-set rate is not climbed over retroactively', () => {
    const p = plan({
      steps: [step('2026-07-01', 10)],
      escalation: { enabled: true, percentPerYear: 1, capPercent: 0 },
    });
    expect(deferralRateOn(p, BASE, '2027-06-30', '2020-01-01').pretaxPercent).toBe(10);
    expect(deferralRateOn(p, BASE, '2027-07-01', '2020-01-01').pretaxPercent).toBe(11);
  });

  it('leaves Roth alone, which payroll auto-escalation also does', () => {
    const p = plan({
      steps: [step('2026-01-01', 6, 3)],
      escalation: { enabled: true, percentPerYear: 1, capPercent: 0 },
    });
    expect(deferralRateOn(p, BASE, '2027-01-01', null).rothPercent).toBe(3);
  });
});

describe('deferralOverridesFor', () => {
  const periods = [
    { periodIndex: 1, payDate: '2026-01-02' },
    { periodIndex: 14, payDate: '2026-07-10' },
    { periodIndex: 26, payDate: '2026-12-25' },
  ];

  it('writes nothing when the plan is empty', () => {
    expect(deferralOverridesFor(periods, emptyDeferralPlan(), BASE, null)).toEqual([]);
  });

  it('covers only the paychecks whose rate differs from the election', () => {
    const p = plan({ steps: [step('2026-07-01', 10)] });
    const rows = deferralOverridesFor(periods, p, BASE, null);
    expect(rows.map((r) => r.periodIndex)).toEqual([14, 26]);
    expect(rows[0].pretax401kPercent).toBe(10);
  });

  it('writes nothing when a step restates the election it already matches', () => {
    const p = plan({ steps: [step('2026-07-01', 6)] });
    expect(deferralOverridesFor(periods, p, BASE, null)).toEqual([]);
  });
});

describe('mergeDeferralSchedule', () => {
  it('keeps a rate set by hand on that paycheck', () => {
    const merged = mergeDeferralSchedule(
      [{ periodIndex: 14, pretax401kPercent: 20 }],
      [{ periodIndex: 14, pretax401kPercent: 10, roth401kPercent: 0 }]
    );
    expect(merged).toEqual([{ periodIndex: 14, pretax401kPercent: 20, roth401kPercent: 0 }]);
  });

  it('fills only the fields the manual override left alone', () => {
    const merged = mergeDeferralSchedule(
      [{ periodIndex: 14, medical: 120 }],
      [{ periodIndex: 14, pretax401kPercent: 10, roth401kPercent: 2 }]
    );
    expect(merged).toEqual([
      { periodIndex: 14, medical: 120, pretax401kPercent: 10, roth401kPercent: 2 },
    ]);
  });

  it('adds the scheduled rows that have no manual override', () => {
    const merged = mergeDeferralSchedule(
      [],
      [{ periodIndex: 3, pretax401kPercent: 10, roth401kPercent: 0 }]
    );
    expect(merged).toHaveLength(1);
  });

  it('keeps a manual override the schedule never touches', () => {
    const merged = mergeDeferralSchedule([{ periodIndex: 9, medical: 50 }], []);
    expect(merged).toEqual([{ periodIndex: 9, medical: 50 }]);
  });
});

describe('normalizeDeferralPlan', () => {
  it('defaults a year that never set a plan to one point a year, switched on', () => {
    expect(normalizeDeferralPlan(undefined).escalation).toEqual({
      enabled: true,
      percentPerYear: 1,
      capPercent: 15,
    });
    expect(normalizeDeferralPlan({}).escalation.percentPerYear).toBe(1);
  });

  it('keeps an explicit zero, which is a choice rather than an absence', () => {
    expect(
      normalizeDeferralPlan({ escalation: { percentPerYear: 0 } }).escalation.percentPerYear
    ).toBe(0);
    // Zero is how "no ceiling" is stored, so it must survive the default too.
    expect(normalizeDeferralPlan({ escalation: { capPercent: 0 } }).escalation.capPercent).toBe(0);
  });

  it('keeps the switch off once it has been turned off', () => {
    expect(normalizeDeferralPlan({ escalation: { enabled: false } }).escalation.enabled).toBe(
      false
    );
  });

  it('drops a step with no date rather than carrying a broken row', () => {
    const plan = normalizeDeferralPlan({
      steps: [
        { id: 'a', effectiveDate: '', pretaxPercent: 5 },
        { id: 'b', effectiveDate: '2026-07-01', pretaxPercent: 8 },
      ],
    });
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].pretaxPercent).toBe(8);
  });

  it('matches the empty plan, so new and saved years behave the same', () => {
    expect(normalizeDeferralPlan({})).toEqual(emptyDeferralPlan());
  });
});
