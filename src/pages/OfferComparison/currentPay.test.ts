import { describe, expect, it } from 'vitest';
import { isUnfilledOffer, withCurrentPay } from './currentPay';
import type { RaiseEntry } from '../../types';

const offer = (raises: RaiseEntry[] = []) => ({
  id: 1,
  base_salary: 165000,
  bonus: 24750,
  equity: 50000,
  raise_history: raises,
});

const raise = (over: Partial<RaiseEntry>): RaiseEntry =>
  ({
    id: 'r1',
    date: '2026-07-01',
    type: 'merit',
    base_before: 165000,
    base_after: 181500,
    bonus_before: 24750,
    bonus_after: 27225,
    equity_before: 50000,
    equity_after: 50000,
    ...over,
  }) as RaiseEntry;

describe('withCurrentPay', () => {
  it('restates the offer at the pay after the latest raise', () => {
    const result = withCurrentPay(offer([raise({})]));
    expect(result.base_salary).toBe(181500);
    expect(result.bonus).toBe(27225);
  });

  it('uses the most recent raise, not the first one logged', () => {
    const result = withCurrentPay(
      offer([
        raise({ id: 'r2', date: '2026-10-01', base_after: 190000 }),
        raise({ id: 'r1', date: '2026-07-01', base_after: 181500 }),
      ])
    );
    expect(result.base_salary).toBe(190000);
  });

  it('leaves an offer with no raises exactly as it was', () => {
    const original = offer();
    expect(withCurrentPay(original)).toBe(original);
  });

  it('does not mutate the record the edit form is bound to', () => {
    const original = offer([raise({})]);
    withCurrentPay(original);
    expect(original.base_salary).toBe(165000);
  });

  it('keeps the stored base when a raise records no figure for it', () => {
    const result = withCurrentPay(offer([raise({ base_after: 0 })]));
    expect(result.base_salary).toBe(165000);
  });
});

describe('isUnfilledOffer', () => {
  const stub = { base_salary: 0, bonus: 0, equity: 0, sign_on: 0, equity_total_grant: 0 };

  it('spots the blank offer the server creates when an application turns into an offer', () => {
    expect(isUnfilledOffer(stub)).toBe(true);
  });

  it('treats any figure at all as filled in', () => {
    expect(isUnfilledOffer({ ...stub, base_salary: 1 })).toBe(false);
    expect(isUnfilledOffer({ ...stub, sign_on: 5000 })).toBe(false);
    expect(isUnfilledOffer({ ...stub, equity_total_grant: 200000 })).toBe(false);
  });

  it('does not trip over a null total grant', () => {
    expect(isUnfilledOffer({ ...stub, equity_total_grant: null })).toBe(true);
  });
});
