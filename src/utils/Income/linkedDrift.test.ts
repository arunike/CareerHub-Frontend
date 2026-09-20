import { describe, expect, it } from 'vitest';
import { linkedDrift } from './linkedDrift';
import type { IncomeSource } from './incomeSources';

const source = (over: Partial<IncomeSource> = {}): IncomeSource =>
  ({ annualSalary: 181500, bonus: 27225, totalGrant: 200000, ...over }) as IncomeSource;
const pinned = (over = {}) => ({
  salaryOverride: null,
  bonusOverride: null,
  totalGrantOverride: null,
  ...over,
});

describe('linkedDrift', () => {
  it('says nothing when no figure is pinned', () => {
    expect(linkedDrift(pinned(), source())).toEqual([]);
  });

  it('says nothing when the pin still matches the linked record', () => {
    expect(linkedDrift(pinned({ salaryOverride: 181500 }), source())).toEqual([]);
  });

  it('reports a pin the linked record has moved past, as a raise would', () => {
    const drift = linkedDrift(pinned({ salaryOverride: 165000 }), source());
    expect(drift).toEqual([
      { field: 'salaryOverride', label: 'Base salary', pinned: 165000, linked: 181500 },
    ]);
  });

  it('reports every pinned figure that has drifted, not just the first', () => {
    const drift = linkedDrift(pinned({ salaryOverride: 165000, bonusOverride: 24750 }), source());
    expect(drift.map((entry) => entry.field)).toEqual(['salaryOverride', 'bonusOverride']);
  });

  it('ignores a difference of pennies, which is rounding rather than a change', () => {
    expect(linkedDrift(pinned({ salaryOverride: 181500.4 }), source())).toEqual([]);
  });

  it('says nothing without a linked record to compare against', () => {
    expect(linkedDrift(pinned({ salaryOverride: 165000 }), null)).toEqual([]);
  });
});
