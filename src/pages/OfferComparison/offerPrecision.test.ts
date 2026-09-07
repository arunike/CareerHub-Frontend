import { describe, expect, it } from 'vitest';
import { roundOfferDecimals } from './offerPrecision';

// 250 x (137.5 / 105), which is the shape of a repriced figure: a long binary fraction.
const REPRICED = 250 * (137.5 / 105);

describe('roundOfferDecimals', () => {
  it('rounds the kind of float that made the API reject a save', () => {
    expect(String(REPRICED).split('.')[1].length).toBeGreaterThan(10);
    expect(roundOfferDecimals({ equity_buyback_value: REPRICED }).equity_buyback_value).toBe(
      327.38
    );
  });

  it('keeps four places for share counts and per-share prices', () => {
    const out = roundOfferDecimals({
      equity_shares: 500.123456,
      equity_grant_price: 100.912345,
      equity_current_price: 137.554321,
    });
    expect(out.equity_shares).toBe(500.1235);
    expect(out.equity_grant_price).toBe(100.9123);
    expect(out.equity_current_price).toBe(137.5543);
  });

  it('leaves whole numbers, strings and arrays exactly as they are', () => {
    const input = {
      id: 1,
      base_salary: 165000,
      health_oop_max: '2000.00',
      equity_vesting_schedule: [25, 25, 25, 25],
      benefit_items: [{ amount: 120.5 }],
    };
    expect(roundOfferDecimals(input)).toEqual(input);
  });

  it('does not choke on null or undefined values', () => {
    const out = roundOfferDecimals({ equity_shares: null, deadline: undefined, bonus: 24750.4567 });
    expect(out.equity_shares).toBeNull();
    expect(out.bonus).toBe(24750.46);
  });

  // The point is fitting the column, not a particular tie-break, so assert the property itself.
  it('never leaves a money value with more than two decimal places', () => {
    const awkward = [REPRICED, 0.1 + 0.2, 1 / 3, 1e-9, 24750.005, 12345.6789];
    for (const value of awkward) {
      const rounded = Number(roundOfferDecimals({ bonus: value }).bonus);
      const places = (String(rounded).split('.')[1] ?? '').length;
      expect(places).toBeLessThanOrEqual(2);
    }
  });

  it('returns a copy rather than editing the record in place', () => {
    const input = { equity_buyback_value: REPRICED };
    roundOfferDecimals(input);
    expect(input.equity_buyback_value).toBe(REPRICED);
  });
});
