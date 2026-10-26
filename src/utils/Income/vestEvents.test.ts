import { describe, expect, it } from 'vitest';
import {
  buildVestEvents,
  parseVestOverrides,
  periodForDate,
  scheduleVests,
  vestOccasions,
  type VestTerms,
} from './vestEvents';
import { localDay } from '../localDay';

const terms = (overrides: Partial<VestTerms> = {}): VestTerms => ({
  totalGrant: 400000,
  vestingYears: 4,
  cliffMonths: 12,
  vestsPerYear: 4,
  grantDate: '2026-01-15',
  taxYear: 2026,
  paychecksPerYear: 24,
  ...overrides,
});

describe('vestOccasions', () => {
  it('releases the pre-cliff accrual on the cliff date', () => {
    const occasions = vestOccasions(terms());
    expect(occasions).toHaveLength(13);
    expect(occasions[0].monthsFromGrant).toBe(12);
    expect(occasions[0].fraction).toBeCloseTo(0.25, 10);
  });

  it('keeps the whole grant accounted for', () => {
    const total = vestOccasions(terms()).reduce((sum, occasion) => sum + occasion.fraction, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('handles a cliff that is not a multiple of the vest interval', () => {
    const occasions = vestOccasions(terms({ cliffMonths: 18 }));
    expect(occasions[0].monthsFromGrant).toBe(18);
    expect(occasions[0].fraction).toBeCloseTo(6 / 16, 10);
  });

  it('vests twice a year when that is what the company does', () => {
    const occasions = vestOccasions(terms({ vestsPerYear: 2, cliffMonths: 0 }));
    expect(occasions).toHaveLength(8);
    expect(occasions.map((occasion) => occasion.monthsFromGrant)).toEqual([
      6, 12, 18, 24, 30, 36, 42, 48,
    ]);
    expect(occasions[0].fraction).toBeCloseTo(1 / 8, 10);
  });

  it('vests three times a year without assuming a standard cadence', () => {
    const occasions = vestOccasions(terms({ vestsPerYear: 3, cliffMonths: 0, vestingYears: 2 }));
    expect(occasions).toHaveLength(6);
    expect(occasions.map((occasion) => occasion.monthsFromGrant)).toEqual([4, 8, 12, 16, 20, 24]);
  });

  it('releases everything at once when the cliff outlasts the schedule', () => {
    const occasions = vestOccasions(terms({ cliffMonths: 60 }));
    expect(occasions).toHaveLength(1);
    expect(occasions[0].fraction).toBeCloseTo(1, 10);
  });

  it('vests annually when that is the cadence', () => {
    const occasions = vestOccasions(terms({ vestsPerYear: 1 }));
    expect(occasions).toHaveLength(4);
    expect(occasions.every((occasion) => occasion.fraction === 0.25)).toBe(true);
  });

  it('produces a single occasion when there is no cliff and one year of vesting', () => {
    const occasions = vestOccasions(terms({ vestingYears: 1, cliffMonths: 0, vestsPerYear: 1 }));
    expect(occasions).toEqual([{ monthsFromGrant: 12, fraction: 1 }]);
  });
});

describe('buildVestEvents', () => {
  it('emits nothing during the cliff year', () => {
    expect(buildVestEvents(terms({ taxYear: 2026, grantDate: '2026-06-01' }))).toEqual([]);
  });

  it('emits the cliff vest and the rest of that year', () => {
    const events = buildVestEvents(terms({ taxYear: 2027 }));
    expect(events).toHaveLength(4);
    expect(events[0].amount).toBeCloseTo(100000, 6);
    expect(events[0].kind).toBe('vest');
  });

  it('places each vest in a pay period within range', () => {
    const events = buildVestEvents(terms({ taxYear: 2027 }));
    for (const event of events) {
      expect(event.periodIndex).toBeGreaterThanOrEqual(1);
      expect(event.periodIndex).toBeLessThanOrEqual(24);
    }
  });

  it('returns nothing without a grant', () => {
    expect(buildVestEvents(terms({ totalGrant: 0 }))).toEqual([]);
  });

  it('ignores an unparseable grant date rather than throwing', () => {
    expect(buildVestEvents(terms({ grantDate: 'not a date' }))).toEqual([]);
  });
});

describe('periodForDate', () => {
  it('maps January to the first period and December to the last', () => {
    expect(periodForDate(new Date(2026, 0, 1), 24)).toBe(1);
    expect(periodForDate(new Date(2026, 11, 31), 24)).toBe(24);
  });
});

describe('scheduleVests', () => {
  const occasions = () => vestOccasions(terms());
  const grant = () => localDay('2026-01-15');

  it('follows the cadence when no date has been moved', () => {
    const scheduled = scheduleVests(grant(), occasions());
    expect(scheduled[0].date).toBe('2027-01-15');
    expect(scheduled[0].scheduledDate).toBe('2027-01-15');
    expect(scheduled.every((vest) => !vest.moved)).toBe(true);
  });

  it('re-anchors the later vests on the moved one, a quarter at a time', () => {
    const scheduled = scheduleVests(grant(), occasions(), [{ months: 12, date: '2027-02-01' }]);
    expect(scheduled[0]).toMatchObject({
      date: '2027-02-01',
      scheduledDate: '2027-01-15',
      moved: true,
    });
    expect(scheduled[1]).toMatchObject({
      date: '2027-05-01',
      scheduledDate: '2027-04-15',
      moved: false,
    });
    expect(scheduled.at(-1)?.date).toBe('2030-02-01');
  });

  it('re-anchors again at the next date that was moved itself', () => {
    const scheduled = scheduleVests(grant(), occasions(), [
      { months: 12, date: '2027-02-01' },
      { months: 18, date: '2027-07-15' },
    ]);
    expect(scheduled[1].date).toBe('2027-05-01');
    expect(scheduled[2]).toMatchObject({ date: '2027-07-15', moved: true });
    expect(scheduled[3].date).toBe('2027-10-15');
  });

  it('ignores a move for an occasion this cadence does not have', () => {
    const scheduled = scheduleVests(grant(), occasions(), [{ months: 13, date: '2027-02-01' }]);
    expect(scheduled.every((vest) => !vest.moved)).toBe(true);
    expect(scheduled[0].date).toBe('2027-01-15');
  });

  it('keeps every quarter on the day the moved vest landed on', () => {
    const scheduled = scheduleVests(grant(), occasions(), [{ months: 12, date: '2027-02-01' }]);
    expect(scheduled.slice(0, 5).map((vest) => vest.date)).toEqual([
      '2027-02-01',
      '2027-05-01',
      '2027-08-01',
      '2027-11-01',
      '2028-02-01',
    ]);
  });

  it('keeps the whole grant on the schedule whatever moved', () => {
    const scheduled = scheduleVests(grant(), occasions(), [{ months: 12, date: '2027-02-01' }]);
    expect(scheduled).toHaveLength(13);
    expect(scheduled.reduce((sum, vest) => sum + vest.fraction, 0)).toBeCloseTo(1, 10);
  });

  it('pays the moved date, not the generated one, into the ledger', () => {
    const events = buildVestEvents(
      terms({ taxYear: 2027, vestOverrides: [{ months: 12, date: '2027-02-01' }] })
    );
    expect(events[0].label).toBe('Vest Feb 1');
  });

  it('drops a vest the move pushed out of the tax year', () => {
    const events = buildVestEvents(
      terms({ taxYear: 2027, vestOverrides: [{ months: 48, date: '2030-02-01' }] })
    );
    expect(events).toHaveLength(4);
  });
});

describe('parseVestOverrides', () => {
  it('keeps a well formed entry and drops the rest', () => {
    expect(
      parseVestOverrides([
        { months: 12, date: '2027-02-01' },
        { months: 12 },
        { months: -1, date: '2027-02-01' },
        { months: 24, date: 'Feb 2027' },
        'nonsense',
      ])
    ).toEqual([{ months: 12, date: '2027-02-01' }]);
  });

  it('reads nothing out of a value that is not a list', () => {
    expect(parseVestOverrides(null)).toEqual([]);
    expect(parseVestOverrides({ months: 12, date: '2027-02-01' })).toEqual([]);
  });
});
