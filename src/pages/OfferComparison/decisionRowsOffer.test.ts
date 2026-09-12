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

describe('the bonus is netted: what you give up, less what the new job pays', () => {
  const currentRole = {
    id: 1,
    application: 1,
    is_current: true,
    base_salary: 165000,
    bonus: 24750,
    equity: 0,
  } as Offer;

  const candidate = {
    id: 2,
    application: 2,
    is_current: false,
    base_salary: 165000,
    bonus: 24750,
    equity: 0,
    sign_on: 50000,
  } as Offer;

  const rows = (visible: Offer[], all: Offer[] = visible) =>
    buildRows(visible, {}, {}, DEFAULT_WEIGHTS, [], [], '2026-09-11', visible, all);

  const bonusLine = (visible: Offer[], id: string, all: Offer[] = visible) =>
    rows(visible, all)
      .find((row) => String(row.offer.id) === id)
      ?.categories.find((category) => category.key === 'financial')
      ?.calculationLines?.find((line) => line.startsWith('Net bonus effect:'));

  const lineStarting = (visible: Offer[], id: string, prefix: string, all: Offer[] = visible) =>
    rows(visible, all)
      .find((row) => String(row.offer.id) === id)
      ?.categories.find((category) => category.key === 'financial')
      ?.calculationLines?.find((line) => line.startsWith(prefix));

  it('gives up a full year at the current role, not just what has accrued', () => {
    const given = lineStarting([currentRole, candidate], '2', 'Bonus given up:');
    expect(given).toContain('a full year at your current role');
  });

  it('pro-rates the forfeit when the current role is younger than the bonus year', () => {
    const recentStart = { ...currentRole, expected_start_date: '2026-06-01' } as Offer;
    const given = lineStarting([recentStart, candidate], '2', 'Bonus given up:');
    expect(given).toMatch(/\d+\/365 days you would have completed/);
  });

  it('breaks the first bonus at the new role out separately, also in days', () => {
    const earned = lineStarting([currentRole, candidate], '2', 'First bonus, new role:');
    expect(earned).toMatch(/\d+\/365 days of its bonus year/);
  });

  it('shows the net as the difference of the two', () => {
    const net = bonusLine([currentRole, candidate], '2');
    expect(net).toContain('given up');
    expect(net).toContain('earned');
  });

  it('states the rate that produced the figure, not just the net side', () => {
    const offers = [currentRole, candidate];
    const taxed = buildRows(
      offers,
      {},
      { 2: { usedBonusTaxRate: 41 } as never },
      DEFAULT_WEIGHTS,
      [],
      [],
      '2026-09-11',
      offers,
      offers
    );
    const given = taxed
      .find((row) => String(row.offer.id) === '2')
      ?.categories.find((category) => category.key === 'financial')
      ?.calculationLines?.find((line) => line.startsWith('Bonus given up:'));
    expect(given).toContain('$24,750 - 41% = $14,603');
  });

  it('does not change when the current role is outside the filtered view', () => {
    // Only the candidate is on screen, but the forfeit is still read from the whole account.
    const filteredOut = bonusLine([candidate], '2', [currentRole, candidate]);
    expect(filteredOut).toBe(bonusLine([currentRole, candidate], '2'));
    expect(filteredOut).toContain('given up');
  });

  it('prices no move at all when there is no current role to leave', () => {
    // Otherwise the new role's first bonus would be credited with nothing set against it.
    expect(bonusLine([candidate], '2')).toBeUndefined();
  });

  it('says nothing for the current role, which forfeits nothing by staying', () => {
    expect(bonusLine([currentRole, candidate], '1')).toBeUndefined();
  });
});

describe('a January start pays a whole bonus year', () => {
  const januaryStart = {
    id: 3,
    application: 3,
    is_current: false,
    base_salary: 165000,
    bonus: 24750,
    equity: 0,
    expected_start_date: '2027-01-01',
  } as Offer;

  it('forfeits nothing and is paid in full, so the net is nil', () => {
    const line = buildRows(
      [januaryStart],
      {},
      {},
      DEFAULT_WEIGHTS,
      [],
      [],
      '2026-09-11',
      [januaryStart],
      [januaryStart]
    )[0]
      .categories.find((category) => category.key === 'financial')
      ?.calculationLines?.find((entry) => entry.startsWith('Net bonus effect:'));
    // Starting on the first day of a bonus year forfeits nothing and earns all of it.
    expect(line).toBeUndefined();
  });
});
