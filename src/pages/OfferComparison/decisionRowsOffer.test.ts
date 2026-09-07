import { describe, expect, it } from 'vitest';
import { buildRows } from './decisionRows';
import { withCurrentEquity } from './equityPricing';
import { DEFAULT_WEIGHTS } from './decisionScoring';
import type { OfferLike as Offer } from './calculations';

// A grant priced above what it was granted at, so the repriced copy differs from the record.
const stored = {
  id: 1,
  application: 10,
  base_salary: 165000,
  bonus: 24750,
  equity: 50000,
  equity_total_grant: 200000,
  equity_liquidity: 'LIQUID',
  equity_ticker: 'GOOG',
  equity_grant_price: 100,
  equity_current_price: 125,
  sign_on: 0,
  pto_days: 15,
  holiday_days: 11,
} as unknown as Offer;

const rowFor = (raw: Offer[]) =>
  buildRows([withCurrentEquity(stored, {})], {}, {}, DEFAULT_WEIGHTS, [], [], '2026-09-07', raw)[0];

describe('a decision row separates what is shown from what is saved', () => {
  it('reprices for the card, so the two really do differ', () => {
    expect(Number(withCurrentEquity(stored, {}).equity_total_grant)).toBeCloseTo(250000);
    expect(Number(stored.equity_total_grant)).toBe(200000);
  });

  it('shows the repriced figures, which is what the equity card is meant to reflect', () => {
    const row = rowFor([stored]);
    expect(Number(row.offer.equity)).toBeCloseTo(62500);
    expect(Number(row.offer.equity_total_grant)).toBeCloseTo(250000);
  });

  it('hands back the record for saving, so an edit cannot write derived figures back', () => {
    const row = rowFor([stored]);
    expect(row.storedOffer).toBe(stored);
    expect(Number(row.storedOffer.equity)).toBe(50000);
    expect(Number(row.storedOffer.equity_total_grant)).toBe(200000);
  });

  it('falls back to the row it was given when no record matches', () => {
    const row = rowFor([]);
    expect(Number(row.storedOffer.equity_total_grant)).toBeCloseTo(250000);
  });
});
