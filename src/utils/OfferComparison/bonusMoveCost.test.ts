import { describe, expect, it } from 'vitest';
import { bonusMoveCost } from './bonusMoveCost';

// Google's package: 24750 bonus, 41% on supplemental pay.
const AFTER_TAX_BONUS = 24750 * 0.59;

describe('bonusMoveCost', () => {
  it('charges nothing when there is no move to price', () => {
    expect(bonusMoveCost({ forfeited: AFTER_TAX_BONUS, isMove: false })).toEqual({
      forfeited: 0,
      net: 0,
    });
  });

  it('charges the bonus the move gives up', () => {
    expect(bonusMoveCost({ forfeited: AFTER_TAX_BONUS, isMove: true }).net).toBeCloseTo(
      AFTER_TAX_BONUS,
      6
    );
  });

  it('never credits the new role a bonus, which the recurring total already pays in full', () => {
    // A move can only cost through bonus timing; the part-year first bonus is not income on top.
    expect(bonusMoveCost({ forfeited: 0, isMove: true }).net).toBe(0);
  });

  it('is a cost, so it can never raise the score', () => {
    for (const forfeited of [0, 1, AFTER_TAX_BONUS]) {
      expect(bonusMoveCost({ forfeited, isMove: true }).net).toBeGreaterThanOrEqual(0);
    }
  });
});
