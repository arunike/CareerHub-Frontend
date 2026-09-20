import { describe, expect, it } from 'vitest';
import { applyRolePayToChain, firstRaiseDrift, withDerivedBefores } from './raiseChain';
import type { RaiseEntry } from '../../types';

const raise = (over: Partial<RaiseEntry>): RaiseEntry =>
  ({
    id: 'r',
    date: '2026-07-01',
    type: 'merit',
    base_before: 0,
    base_after: 0,
    bonus_before: 0,
    bonus_after: 0,
    equity_before: 0,
    equity_after: 0,
    ...over,
  }) as RaiseEntry;

const PACKAGE = { base: 165000, bonus: 24750, equity: 50000 };

describe('withDerivedBefores', () => {
  it('starts the first raise from the role stored pay, not from what was saved on it', () => {
    // The offer was corrected after the raise was logged; the stale before must not survive.
    const [first] = withDerivedBefores(
      [raise({ base_before: 160000, base_after: 181500 })],
      PACKAGE
    );
    expect(first.base_before).toBe(165000);
  });

  it('chains each later raise from the one before it', () => {
    const [, second] = withDerivedBefores(
      [
        raise({ id: 'a', date: '2026-07-01', base_after: 181500, bonus_after: 27225 }),
        raise({ id: 'b', date: '2027-07-01', base_after: 199650, bonus_after: 29948 }),
      ],
      PACKAGE
    );
    expect(second.base_before).toBe(181500);
    expect(second.bonus_before).toBe(27225);
  });

  it('orders by date, so entries saved out of order still chain correctly', () => {
    const chained = withDerivedBefores(
      [
        raise({ id: 'b', date: '2027-07-01', base_after: 199650 }),
        raise({ id: 'a', date: '2026-07-01', base_after: 181500 }),
      ],
      PACKAGE
    );
    expect(chained.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(chained[1].base_before).toBe(181500);
  });

  it('carries a component the raise did not move on to the next entry', () => {
    const [, second] = withDerivedBefores(
      [
        raise({ id: 'a', date: '2026-07-01', base_after: 181500 }),
        raise({ id: 'b', date: '2027-07-01', base_after: 199650 }),
      ],
      PACKAGE
    );
    // Bonus was untouched by the first raise, so it is still the role's own figure.
    expect(second.bonus_before).toBe(24750);
  });

  it('falls back to the entry own record when the role has no stored pay', () => {
    const [first] = withDerivedBefores([raise({ base_before: 160000, base_after: 181500 })], {
      base: 0,
      bonus: 0,
      equity: 0,
    });
    expect(first.base_before).toBe(160000);
  });

  it('returns nothing for an empty history', () => {
    expect(withDerivedBefores([], PACKAGE)).toEqual([]);
  });
});

describe('firstRaiseDrift', () => {
  const entry = raise({ id: 'a', base_before: 160000, base_after: 181500 });

  it('reports nothing when the first raise already starts from the role pay', () => {
    expect(firstRaiseDrift([entry], 160000)).toBeNull();
  });

  it('reports the gap when the role pay was corrected afterwards', () => {
    expect(firstRaiseDrift([entry], 165000)).toEqual({
      entryId: 'a',
      storedBefore: 160000,
      rolePay: 165000,
    });
  });

  it('stays quiet when the role has no pay of its own to compare against', () => {
    expect(firstRaiseDrift([entry], 0)).toBeNull();
    expect(firstRaiseDrift([], 165000)).toBeNull();
  });
});

describe('applyRolePayToChain', () => {
  it('re-chains every entry from the role pay, keeping the afters untouched', () => {
    const fixed = applyRolePayToChain(
      [
        raise({ id: 'a', date: '2026-07-01', base_before: 160000, base_after: 181500 }),
        raise({ id: 'b', date: '2027-07-01', base_before: 181500, base_after: 199650 }),
      ],
      165000
    );
    expect(fixed.map((e) => e.base_before)).toEqual([165000, 181500]);
    expect(fixed.map((e) => e.base_after)).toEqual([181500, 199650]);
  });
});
