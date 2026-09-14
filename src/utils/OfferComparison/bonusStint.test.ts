import { describe, expect, it } from 'vitest';
import {
  DAYS_IN_BONUS_YEAR,
  firstBonusStint,
  stayedBonusStint,
  positionEndDate,
  positionStartDate,
} from './bonusStint';

const DECEMBER = 12;

describe('stayedBonusStint', () => {
  it('is a full year when you have been there all along', () => {
    // Staying to 31 Dec 2026 completes the year, so the whole bonus is what is given up.
    const stint = stayedBonusStint({ leaving: '2026-09-11', payoutMonth: DECEMBER });
    expect(stint.days).toBe(DAYS_IN_BONUS_YEAR);
    expect(stint.share).toBe(1);
  });

  it('ignores a joining date from before this bonus year', () => {
    const stint = stayedBonusStint({
      joined: '2019-04-01',
      leaving: '2026-09-11',
      payoutMonth: DECEMBER,
    });
    expect(stint.share).toBe(1);
  });

  it('pro-rates when you had not been there a full year by the payout', () => {
    // Joined 1 Jun 2026, payout 31 Dec 2026: 214 of the 365 days.
    const stint = stayedBonusStint({
      joined: '2026-06-01',
      leaving: '2026-09-11',
      payoutMonth: DECEMBER,
    });
    expect(stint.days).toBe(214);
  });

  it('still gives up a full year when leaving just after a payout', () => {
    // The banked bonus is not what this measures; the next one is, and you would earn all of it.
    expect(stayedBonusStint({ leaving: '2027-01-05', payoutMonth: DECEMBER }).share).toBe(1);
  });

  it('follows a payout month other than December', () => {
    const stint = stayedBonusStint({ leaving: '2026-05-01', payoutMonth: 3 });
    expect(stint.days).toBe(DAYS_IN_BONUS_YEAR);
  });

  it('returns nothing rather than throwing on an unusable date', () => {
    expect(stayedBonusStint({ leaving: '', payoutMonth: DECEMBER }).days).toBe(0);
  });
});

describe('firstBonusStint', () => {
  it('counts the days from starting to the first payout', () => {
    // 11 Sep 2026 to 31 Dec 2026.
    expect(firstBonusStint({ start: '2026-09-11', payoutMonth: DECEMBER }).days).toBe(112);
  });

  it('is a whole year when you start the day after a payout', () => {
    const stint = firstBonusStint({ start: '2026-01-01', payoutMonth: DECEMBER });
    expect(stint.days).toBe(DAYS_IN_BONUS_YEAR);
    expect(stint.share).toBe(1);
  });

  it('stops at a known end date, so a stint that ends first earns less', () => {
    const stint = firstBonusStint({
      start: '2026-09-11',
      end: '2026-10-11',
      payoutMonth: DECEMBER,
    });
    expect(stint.days).toBe(31);
  });

  it('ignores an end date beyond the payout', () => {
    const stint = firstBonusStint({
      start: '2026-09-11',
      end: '2028-01-01',
      payoutMonth: DECEMBER,
    });
    expect(stint.days).toBe(112);
  });

  it('earns nothing when the stint ends before it starts', () => {
    expect(
      firstBonusStint({ start: '2026-09-11', end: '2026-08-01', payoutMonth: DECEMBER }).days
    ).toBe(0);
  });
});

describe('the dates are read off the position', () => {
  it('prefers the date you recorded on the offer', () => {
    expect(positionStartDate({ expected_start_date: '2027-01-01' })).toBe('2027-01-01');
  });

  it('falls back to the linked experience', () => {
    expect(positionStartDate({ linked_experience: { start_date: '2024-08-05' } })).toBe(
      '2024-08-05'
    );
  });

  it('is null when the offer says nothing, so no tenure cap is applied', () => {
    expect(positionStartDate({})).toBeNull();
    expect(positionEndDate({})).toBeNull();
  });

  it('reads an end date from the linked experience', () => {
    expect(positionEndDate({ linked_experience: { end_date: '2026-09-14' } })).toBe('2026-09-14');
  });
});
