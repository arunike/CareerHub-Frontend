import { describe, expect, it } from 'vitest';
import { driftSignature, linkedDrift, unseenDrift } from './linkedDrift';
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

describe('unseenDrift', () => {
  const drift = linkedDrift(pinned({ salaryOverride: 165000 }), source());

  it('shows while nothing has been dismissed', () => {
    expect(unseenDrift(drift, null)).toBe(true);
  });

  it('stays hidden once this exact value has been dismissed', () => {
    expect(unseenDrift(drift, driftSignature(drift))).toBe(false);
  });

  it('returns when the linked record moves again after a dismissal', () => {
    const later = linkedDrift(pinned({ salaryOverride: 165000 }), source({ annualSalary: 199650 }));
    expect(unseenDrift(later, driftSignature(drift))).toBe(true);
  });

  it('never shows when there is no drift at all', () => {
    expect(unseenDrift([], null)).toBe(false);
  });
});
