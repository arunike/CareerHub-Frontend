import { describe, expect, it } from 'vitest';
import {
  grantValueOf,
  impliedShares,
  latestPricePoint,
  pairedGrantPrice,
  pairedShareCount,
  parsePricePoints,
  priceRatio,
  pricesBySymbol,
  withCurrentEquity,
} from './equityPricing';

const offer = (over: Partial<Parameters<typeof priceRatio>[0]> = {}) => ({
  equity: 50000,
  equity_total_grant: 200000,
  equity_ticker: 'GOOG',
  equity_shares: null,
  equity_grant_price: null,
  ...over,
});

const prices = { GOOG: 137.5 };

describe('priceRatio', () => {
  it('scales by current over grant price when the grant price is known', () => {
    expect(priceRatio(offer({ equity_grant_price: 110 }), prices)).toBeCloseTo(1.25);
  });

  it('derives the grant price from shares when it was not recorded', () => {
    // 2000 shares of a $200,000 grant implies $100 a share.
    expect(priceRatio(offer({ equity_shares: 2000 }), prices)).toBeCloseTo(1.375);
  });

  it('prefers the recorded grant price over the one implied by shares', () => {
    const both = offer({ equity_grant_price: 110, equity_shares: 2000 });
    expect(priceRatio(both, prices)).toBeCloseTo(1.25);
  });

  it('leaves the offer alone when nothing lets it reprice', () => {
    expect(priceRatio(offer(), prices)).toBe(1);
    expect(priceRatio(offer({ equity_grant_price: 110 }), {})).toBe(1);
    expect(priceRatio(offer({ equity_ticker: '', equity_grant_price: 110 }), prices)).toBe(1);
  });

  it('ignores a zero or negative price rather than wiping the grant out', () => {
    expect(priceRatio(offer({ equity_grant_price: 110 }), { GOOG: 0 })).toBe(1);
    expect(priceRatio(offer({ equity_grant_price: 110 }), { GOOG: -5 })).toBe(1);
  });

  it('matches the ticker case-insensitively', () => {
    expect(
      priceRatio(offer({ equity_ticker: 'goog', equity_grant_price: 110 }), prices)
    ).toBeCloseTo(1.25);
  });
});

describe('withCurrentEquity', () => {
  it('scales the annual value and the total grant together', () => {
    const result = withCurrentEquity(offer({ equity_grant_price: 110 }), prices);
    expect(result.equity).toBeCloseTo(62500);
    expect(result.equity_total_grant).toBeCloseTo(250000);
  });

  it('returns the same object when there is nothing to reprice', () => {
    const original = offer();
    expect(withCurrentEquity(original, prices)).toBe(original);
  });

  it('does not invent a total grant that was never recorded', () => {
    const result = withCurrentEquity(
      offer({ equity_grant_price: 110, equity_total_grant: null }),
      prices
    );
    expect(result.equity_total_grant).toBeNull();
  });

  it('handles a price below the grant price, which is a real outcome', () => {
    const result = withCurrentEquity(offer({ equity_grant_price: 275 }), prices);
    expect(result.equity).toBeCloseTo(25000);
  });
});

describe('pricesBySymbol', () => {
  it('keys on the uppercase ticker and coerces the decimal string', () => {
    expect(pricesBySymbol([{ symbol: 'goog', price: '137.50' }])).toEqual({ GOOG: 137.5 });
  });

  it('skips a row with no ticker', () => {
    expect(pricesBySymbol([{ symbol: '  ', price: '10' }])).toEqual({});
  });
});

describe('buyback equity', () => {
  const buyback = {
    equity: 0,
    equity_total_grant: null,
    equity_buyback_value: 40000,
    equity_ticker: 'ACME',
    equity_shares: null,
    equity_grant_price: 20,
  };

  it('leaves the stored buyback figure alone, since nothing reads a repriced copy', () => {
    const result = withCurrentEquity({ ...buyback, equity: 10000 }, { ACME: 25 });
    expect(result.equity_buyback_value).toBe(buyback.equity_buyback_value);
  });

  it('derives the grant price from a buyback value when only shares are given', () => {
    // 2000 shares against a $40,000 buyback implies $20 a share.
    const ratio = priceRatio(
      { ...buyback, equity_grant_price: null, equity_shares: 2000 },
      { ACME: 25 }
    );
    expect(ratio).toBeCloseTo(1.25);
  });

  it('reprices the annual figure, which is what a buyback now realises', () => {
    const result = withCurrentEquity({ ...buyback, equity: 10000 }, { ACME: 25 });
    expect(result.equity).toBeCloseTo(12500);
  });

  it('leaves a buyback alone when no price is known for its symbol', () => {
    expect(withCurrentEquity(buyback, {})).toBe(buyback);
  });
});

describe('impliedShares', () => {
  const base = {
    equity: 50000,
    equity_total_grant: 200000,
    equity_ticker: 'GOOG',
    equity_shares: null,
    equity_grant_price: null,
  };

  it('divides the grant value by the grant price', () => {
    expect(impliedShares({ ...base, equity_grant_price: 100 })).toBe(2000);
  });

  it('prefers a share count that was actually entered', () => {
    expect(impliedShares({ ...base, equity_shares: 1500, equity_grant_price: 100 })).toBe(1500);
  });

  it('falls back to the buyback value when that is the only figure', () => {
    expect(
      impliedShares({
        ...base,
        equity: 0,
        equity_total_grant: null,
        equity_buyback_value: 40000,
        equity_grant_price: 20,
      })
    ).toBe(2000);
  });

  it('is null when there is nothing to divide', () => {
    expect(impliedShares(base)).toBeNull();
  });
});

describe('private pricing without a ticker', () => {
  const priv = {
    equity: 40000,
    equity_total_grant: 160000,
    equity_ticker: '',
    equity_shares: null,
    equity_grant_price: 20,
    equity_current_price: 25,
  };

  it('uses the price stored on the offer when there is no symbol', () => {
    expect(priceRatio(priv, {})).toBeCloseTo(1.25);
    expect(withCurrentEquity(priv, {}).equity).toBeCloseTo(50000);
  });

  it('prefers the offer price over a shared quote for the same symbol', () => {
    const both = { ...priv, equity_ticker: 'GOOG' };
    expect(priceRatio(both, { GOOG: 100 })).toBeCloseTo(1.25);
  });

  it('falls back to the shared quote when the offer has no price of its own', () => {
    const listed = { ...priv, equity_ticker: 'GOOG', equity_current_price: null };
    expect(priceRatio(listed, { GOOG: 30 })).toBeCloseTo(1.5);
  });
});

describe('prices typed against a grant with no ticker', () => {
  const priv = {
    equity: 50000,
    equity_total_grant: 200000,
    equity_ticker: '',
    equity_shares: null,
    equity_grant_price: 125,
    equity_current_price: 137.5,
  };

  it('reads the newest one however the list was stored', () => {
    const points = [
      { date: '2026-10-01', price: 137.5 },
      { date: '2026-07-01', price: '125.00' },
    ];
    expect(parsePricePoints(points).map((point) => point.date)).toEqual([
      '2026-07-01',
      '2026-10-01',
    ]);
    expect(latestPricePoint(points)).toEqual({ date: '2026-10-01', price: 137.5 });
  });

  it('drops an entry it could not price or date', () => {
    const mixed = [
      { date: '2026-07-01', price: 125 },
      { date: 'July 2026', price: 137.5 },
      { date: '2026-10-01', price: 0 },
      { date: '2026-10-01' },
      null,
      '2026-10-01',
    ];
    expect(parsePricePoints(mixed)).toEqual([{ date: '2026-07-01', price: 125 }]);
    expect(parsePricePoints(undefined)).toEqual([]);
    expect(latestPricePoint([])).toBeNull();
  });

  it('outranks the undated price on the offer', () => {
    const dated = { ...priv, equity_price_points: [{ date: '2026-07-01', price: 131.25 }] };
    // The dated 131.25 wins, so the ratio is 1.05 and not the 1.1 the undated 137.50 would give.
    expect(priceRatio(dated, {})).toBeCloseTo(1.05);
  });

  it('leaves the undated price in force until one is dated', () => {
    expect(priceRatio({ ...priv, equity_price_points: [] }, {})).toBeCloseTo(1.1);
  });
});

describe('grantValueOf', () => {
  it('prefers the recorded total grant', () => {
    expect(grantValueOf(offer())).toBe(200000);
  });

  it('rebuilds the total from the yearly figure and the vesting percent', () => {
    expect(grantValueOf(offer({ equity_total_grant: null }))).toBe(200000);
    expect(grantValueOf(offer({ equity_total_grant: null, equity_vesting_percent: 20 }))).toBe(
      250000
    );
  });

  it('falls back to the buyback figure when there is no grant to size', () => {
    const buyback = offer({ equity: 0, equity_total_grant: null, equity_buyback_value: 120000 });
    expect(grantValueOf(buyback)).toBe(120000);
  });
});

describe('the linked share pricing pair', () => {
  it('prices the whole grant, not the slice vesting this year', () => {
    const grant = grantValueOf(offer({ equity_total_grant: null }));
    expect(pairedShareCount(grant, 125)).toBe(1600);
    expect(pairedGrantPrice(grant, 1600)).toBe(125);
  });

  it('rounds shares whole and the price to the cent', () => {
    expect(pairedShareCount(200000, 137.5)).toBe(1455);
    expect(pairedGrantPrice(200000, 1455)).toBe(137.46);
  });

  it('fills nothing without both a basis and an entry', () => {
    expect(pairedShareCount(0, 110)).toBeNull();
    expect(pairedShareCount(200000, 0)).toBeNull();
    expect(pairedGrantPrice(0, 2000)).toBeNull();
    expect(pairedGrantPrice(200000, 0)).toBeNull();
  });
});
