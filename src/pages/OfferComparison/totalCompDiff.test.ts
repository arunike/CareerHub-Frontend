import { describe, expect, it } from 'vitest';
import { totalCompDiff, totalCompFor } from './totalCompDiff';
import type { OfferLike as Offer } from './calculations';

const offer = (over: Partial<Offer> = {}) =>
  ({
    base_salary: 165000,
    bonus: 24750,
    equity: 50000,
    sign_on: 0,
    equity_liquidity: 'LIQUID',
    ...over,
  }) as Offer;

describe('totalCompFor', () => {
  it('adds base, bonus, realizable equity and sign-on', () => {
    expect(totalCompFor(offer())).toBe(239750);
  });

  it('counts nothing for equity that cannot be sold', () => {
    expect(totalCompFor(offer({ equity_liquidity: 'ILLIQUID' }))).toBe(189750);
  });
});

describe('totalCompDiff', () => {
  it('never prints stray cents from a float', () => {
    // The card printed three decimals, straight out of toLocaleString().
    const messy = totalCompDiff(offer({ base_salary: 165000.4 }), 100000);
    expect(messy.amount).toBe('+$139,750');
    expect(messy.amount).not.toContain('.');
  });

  it('signs a gain and reads it as one', () => {
    const gain = totalCompDiff(offer(), 200000);
    expect(gain.amount).toBe('+$39,750');
    expect(gain.percent).toBe('+19.9%');
    expect(gain.isGain).toBe(true);
  });

  it('does not sign a loss twice', () => {
    const loss = totalCompDiff(offer(), 300000);
    expect(loss.amount).toBe('-$60,250');
    expect(loss.percent).toBe('-20.1%');
    expect(loss.isGain).toBe(false);
  });

  it('reads an exact match as a gain rather than a loss, since nothing was given up', () => {
    const level = totalCompDiff(offer(), 239750);
    expect(level.amount).toBe('$0');
    expect(level.isGain).toBe(true);
  });

  it('does not divide by a current total of zero', () => {
    expect(totalCompDiff(offer(), 0).percent).toBe('0%');
  });
});
