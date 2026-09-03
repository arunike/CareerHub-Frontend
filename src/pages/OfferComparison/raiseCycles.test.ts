import { describe, expect, it } from 'vitest';
import { REVIEW_CYCLES, cycleFor, defaultEffectiveDate, nextEffectiveDate } from './raiseCycles';
import { RAISE_TYPES } from './raiseHistoryFields';

describe('defaultEffectiveDate', () => {
  it('backdates a merit raise to the mid-year cycle', () => {
    expect(defaultEffectiveDate('merit', '2026-08-31')).toBe('2026-07-01');
  });

  it('offers nothing when payroll paid on the cycle date itself', () => {
    expect(defaultEffectiveDate('merit', '2026-07-01')).toBeNull();
  });

  it('stays inside the year rather than reaching back to the last cycle', () => {
    // 1 Jul 2025 would be eight months of back pay, which is a dispute, not a late review.
    expect(defaultEffectiveDate('merit', '2026-03-15')).toBeNull();
  });

  it('offers nothing for the types that do not run on a cycle', () => {
    for (const type of ['promotion', 'market', 'retention', 'correction', 'other'] as const) {
      expect(defaultEffectiveDate(type, '2026-08-31')).toBeNull();
    }
  });

  it('names the cycle it used', () => {
    expect(cycleFor('merit')?.label).toBe('Mid-year review');
    expect(cycleFor('promotion')).toBeNull();
  });

  it('only knows cycles for reasons the picker still offers', () => {
    const offered = RAISE_TYPES.map((type) => type.value);
    for (const key of Object.keys(REVIEW_CYCLES)) {
      expect(offered).toContain(key);
    }
  });
});

describe('nextEffectiveDate', () => {
  const merit = { type: 'merit' as const, date: '2026-08-31' };
  const promo = { type: 'promotion' as const, date: '2026-08-31' };

  it('leaves an unset effective date unset', () => {
    expect(nextEffectiveDate(null, merit, promo)).toBeNull();
  });

  it('picks up the cycle when the type gains one', () => {
    expect(nextEffectiveDate('2026-08-31', promo, merit)).toBe('2026-07-01');
  });

  it('follows the cycle when the pay date changes', () => {
    expect(nextEffectiveDate('2026-07-01', merit, { type: 'merit', date: '2027-09-15' })).toBe(
      '2027-07-01'
    );
  });

  it('leaves a hand-picked date alone', () => {
    expect(nextEffectiveDate('2026-05-04', merit, promo)).toBe('2026-05-04');
  });

  it('falls back to the pay date when the new type has no cycle', () => {
    expect(nextEffectiveDate('2026-07-01', merit, promo)).toBe('2026-08-31');
  });
});
