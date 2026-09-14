import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import {
  buildHolidayRangePayloads,
  holidayGroupMembers,
  planHolidayGroupEdit,
} from './holidayGrouping';
import type { Holiday } from '../../types';

const day = (iso: string) => dayjs(iso);

// Dates are built from the AGENTS.md substitutes; a span steps forward from the first of them.
const FIRST = '2026-07-01';
const LATER = '2026-10-01';

describe('buildHolidayRangePayloads', () => {
  it('makes one row for a single day and gives it no group', () => {
    const rows = buildHolidayRangePayloads(
      { date: day(FIRST), end_date: day(FIRST), is_multi_day: true, description: 'Time off' },
      day(FIRST),
      'My Time Off'
    );
    expect(rows).toHaveLength(1);
    expect(rows?.[0].date).toBe(FIRST);
    expect(rows?.[0]).not.toHaveProperty('group_id');
  });

  it('makes one row per day across a range, all sharing one group', () => {
    const rows = buildHolidayRangePayloads(
      { date: day(FIRST), end_date: day('2026-07-05'), is_multi_day: true },
      day(FIRST),
      'My Time Off'
    );
    expect(rows?.map((row) => row.date)).toEqual([
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
    ]);
    const groups = new Set(rows?.map((row) => row.group_id));
    expect(groups.size).toBe(1);
    expect([...groups][0]).toBeTruthy();
  });

  it('falls back to the clicked day when no dates are given', () => {
    // The calendar opens the modal on one day, so a range is not required to save.
    const rows = buildHolidayRangePayloads({}, day(FIRST), 'My Time Off');
    expect(rows).toHaveLength(1);
    expect(rows?.[0].date).toBe(FIRST);
  });

  it('treats an empty end as the single day the range starts on', () => {
    const rows = buildHolidayRangePayloads({ date: day(LATER) }, day(FIRST), 'My Time Off');
    expect(rows).toHaveLength(1);
    expect(rows?.[0].date).toBe(LATER);
  });

  it('refuses a backwards range rather than saving nothing', () => {
    expect(
      buildHolidayRangePayloads(
        { date: day(LATER), end_date: day(FIRST), is_multi_day: true },
        day(LATER),
        'My Time Off'
      )
    ).toBeNull();
  });

  it('uses the target label when no name was typed', () => {
    const rows = buildHolidayRangePayloads({ description: '   ' }, day(FIRST), 'My Time Off');
    expect(rows?.[0].description).toBe('My Time Off');
  });

  it('carries the recurring flag and tab onto every day', () => {
    const rows = buildHolidayRangePayloads(
      {
        date: day(FIRST),
        end_date: day('2026-07-03'),
        is_multi_day: true,
        is_recurring: true,
        tab: 'tab-1',
      },
      day(FIRST),
      'My Time Off'
    );
    expect(rows?.every((row) => row.is_recurring && row.tab === 'tab-1')).toBe(true);
  });
});

const row = (date: string, over: Partial<Holiday> = {}) =>
  ({
    id: Number(date.replace(/-/g, '')),
    date,
    description: 'Time off',
    group_id: 'trip',
    ...over,
  }) as Holiday;

const okPlan = (result: ReturnType<typeof planHolidayGroupEdit>) => {
  if (!result?.ok) throw new Error(`expected a plan, got ${result?.reason ?? 'null'}`);
  return result.plan;
};

describe('planHolidayGroupEdit', () => {
  const trip = [row(FIRST), row('2026-07-02'), row('2026-07-03')];

  it('keeps the days a shortened range still covers and drops the rest', () => {
    const plan = okPlan(
      planHolidayGroupEdit(
        trip,
        { date: day(FIRST), end_date: day('2026-07-02'), is_multi_day: true },
        'My Time Off'
      )
    );
    expect(plan.update.map((entry) => entry.id)).toEqual([trip[0].id, trip[1].id]);
    expect(plan.deleteIds).toEqual([trip[2].id]);
    expect(plan.create).toEqual([]);
  });

  it('adds only the days an extended range gained', () => {
    const plan = okPlan(
      planHolidayGroupEdit(
        trip,
        { date: day(FIRST), end_date: day('2026-07-05'), is_multi_day: true },
        'My Time Off'
      )
    );
    expect(plan.create.map((payload) => payload.date)).toEqual(['2026-07-04', '2026-07-05']);
    expect(plan.deleteIds).toEqual([]);
  });

  it('moves a range wholesale, creating the new days and deleting the old', () => {
    const plan = okPlan(
      planHolidayGroupEdit(
        trip,
        { date: day('2026-07-08'), end_date: day('2026-07-09'), is_multi_day: true },
        'My Time Off'
      )
    );
    expect(plan.create.map((payload) => payload.date)).toEqual(['2026-07-08', '2026-07-09']);
    expect(plan.deleteIds).toEqual(trip.map((entry) => entry.id));
    expect(plan.update).toEqual([]);
  });

  it('keeps every day in the same group, so a widened trip stays one bar', () => {
    const plan = okPlan(
      planHolidayGroupEdit(
        trip,
        { date: day(FIRST), end_date: day('2026-07-04'), is_multi_day: true },
        'My Time Off'
      )
    );
    const groups = new Set([
      ...plan.create.map((payload) => payload.group_id),
      ...plan.update.map((entry) => entry.patch.group_id),
    ]);
    expect(groups).toEqual(new Set(['trip']));
  });

  it('gives a single day a group only once it grows past one day', () => {
    const lone = [row(FIRST, { group_id: undefined })];
    const stillOne = okPlan(planHolidayGroupEdit(lone, {}, 'My Time Off'));
    expect(stillOne.update[0].patch.group_id).toBeUndefined();

    const grown = okPlan(
      planHolidayGroupEdit(
        lone,
        { date: day(FIRST), end_date: day('2026-07-03'), is_multi_day: true },
        'My Time Off'
      )
    );
    expect(grown.create.every((payload) => payload.group_id)).toBe(true);
  });

  it('moves a single day rather than treating the new date as a second one', () => {
    const lone = [row(FIRST, { group_id: undefined })];
    const plan = okPlan(planHolidayGroupEdit(lone, { date: day(LATER) }, 'My Time Off'));
    expect(plan.create.map((payload) => payload.date)).toEqual([LATER]);
    expect(plan.deleteIds).toEqual([lone[0].id]);
  });

  it('refuses to drop a pinned day, rather than applying half the change', () => {
    const pinned = [row(FIRST), row('2026-07-02'), row('2026-07-03', { is_locked: true })];
    const result = planHolidayGroupEdit(
      pinned,
      { date: day(FIRST), end_date: day('2026-07-02'), is_multi_day: true },
      'My Time Off'
    );
    expect(result).toEqual({ ok: false, reason: 'locked' });
  });

  it('leaves a pinned day alone when the range still covers it', () => {
    const pinned = [row(FIRST), row('2026-07-02', { is_locked: true })];
    expect(
      planHolidayGroupEdit(
        pinned,
        { date: day(FIRST), end_date: day('2026-07-02'), is_multi_day: true },
        'My Time Off'
      )?.ok
    ).toBe(true);
  });

  it('reports a backwards range instead of saving one', () => {
    expect(
      planHolidayGroupEdit(
        trip,
        { date: day(LATER), end_date: day(FIRST), is_multi_day: true },
        'My Time Off'
      )
    ).toEqual({ ok: false, reason: 'backwards' });
  });

  it('carries an edited name and tab onto every day of the trip', () => {
    const plan = okPlan(
      planHolidayGroupEdit(
        trip,
        {
          date: day(FIRST),
          end_date: day('2026-07-04'),
          is_multi_day: true,
          description: 'Renamed',
          tab: 'tab-1',
        },
        'My Time Off'
      )
    );
    const named = [...plan.update.map((entry) => entry.patch), ...plan.create];
    expect(named.every((patch) => patch.description === 'Renamed' && patch.tab === 'tab-1')).toBe(
      true
    );
  });

  it('has nothing to plan without an existing day to work from', () => {
    expect(planHolidayGroupEdit([], {}, 'My Time Off')).toBeNull();
  });
});

describe('holidayGroupMembers', () => {
  const all = [row('2026-07-03'), row(FIRST), row('2026-07-02'), row(LATER, { group_id: 'other' })];

  it('returns the whole trip in date order, whichever day was clicked', () => {
    expect(holidayGroupMembers(all, all[0]).map((entry) => entry.date)).toEqual([
      FIRST,
      '2026-07-02',
      '2026-07-03',
    ]);
  });

  it('returns just the day itself when it belongs to no group', () => {
    const lone = row(FIRST, { group_id: undefined });
    expect(holidayGroupMembers(all, lone)).toEqual([lone]);
  });

  it('falls back to the day itself when the group is not in the list', () => {
    const orphan = row('2026-11-01', { group_id: 'missing' });
    expect(holidayGroupMembers(all, orphan)).toEqual([orphan]);
  });

  it('has no members without a holiday', () => {
    expect(holidayGroupMembers(all, null)).toEqual([]);
  });
});

describe('planHolidayGroupEdit, editing one day out of a trip', () => {
  const trip = [row(FIRST), row('2026-07-02'), row('2026-07-03')];
  const middle = trip[1];

  it('takes that day out of the group and leaves the others alone', () => {
    const plan = okPlan(
      planHolidayGroupEdit(trip, { scope: '2026-07-02', date: day('2026-07-02') }, 'My Time Off')
    );
    expect(plan.update).toHaveLength(1);
    expect(plan.update[0].id).toBe(middle.id);
    expect(plan.update[0].patch.group_id).toBeNull();
    expect(plan.create).toEqual([]);
    expect(plan.deleteIds).toEqual([]);
  });

  it('moves only that day when its date changes', () => {
    const plan = okPlan(
      planHolidayGroupEdit(trip, { scope: '2026-07-02', date: day(LATER) }, 'My Time Off')
    );
    expect(plan.update[0].patch.date).toBe(LATER);
    expect(plan.deleteIds).toEqual([]);
  });

  it('ignores an end date, since one day of a trip is one day', () => {
    const plan = okPlan(
      planHolidayGroupEdit(
        trip,
        { scope: '2026-07-02', date: day('2026-07-02'), end_date: day('2026-07-09') },
        'My Time Off'
      )
    );
    expect(plan.update).toHaveLength(1);
    expect(plan.create).toEqual([]);
  });

  it('refuses to move a day onto one the trip already holds', () => {
    expect(
      planHolidayGroupEdit(trip, { scope: '2026-07-02', date: day(FIRST) }, 'My Time Off')
    ).toEqual({ ok: false, reason: 'occupied' });
  });

  it('refuses to change a pinned day', () => {
    const pinned = [row(FIRST), row('2026-07-02', { is_locked: true })];
    expect(
      planHolidayGroupEdit(pinned, { scope: '2026-07-02', date: day(LATER) }, 'My Time Off')
    ).toEqual({ ok: false, reason: 'locked' });
  });

  it('treats a lone day as the whole thing, so its group is not needlessly cleared', () => {
    const lone = [row(FIRST, { group_id: undefined })];
    const plan = okPlan(
      planHolidayGroupEdit(lone, { scope: '2026-07-02', date: day(LATER) }, 'My Time Off')
    );
    expect(plan.create.map((payload) => payload.date)).toEqual([LATER]);
    expect(plan.deleteIds).toEqual([lone[0].id]);
  });
});

describe('planHolidayGroupEdit picks the day by its own date', () => {
  const trip = [row(FIRST), row('2026-07-02'), row('2026-07-03')];

  it('edits the last day even though the first was the one clicked', () => {
    const plan = okPlan(
      planHolidayGroupEdit(
        trip,
        { scope: '2026-07-03', date: day('2026-07-03'), description: 'Renamed' },
        'My Time Off'
      )
    );
    expect(plan.update).toHaveLength(1);
    expect(plan.update[0].id).toBe(trip[2].id);
    expect(plan.update[0].patch.description).toBe('Renamed');
  });

  it('falls back to editing the whole run when the date names no day of it', () => {
    const plan = okPlan(
      planHolidayGroupEdit(
        trip,
        { scope: LATER, date: day(FIRST), end_date: day('2026-07-03'), is_multi_day: true },
        'My Time Off'
      )
    );
    expect(plan.update).toHaveLength(3);
  });

  it('treats an explicit all as the whole run', () => {
    const plan = okPlan(
      planHolidayGroupEdit(
        trip,
        { scope: 'all', date: day(FIRST), end_date: day('2026-07-03'), is_multi_day: true },
        'My Time Off'
      )
    );
    expect(plan.update).toHaveLength(3);
    expect(plan.deleteIds).toEqual([]);
  });
});
