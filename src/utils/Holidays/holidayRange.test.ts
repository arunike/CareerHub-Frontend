import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import {
  buildHolidayRangePayloads,
  holidayRunMembers,
  holidayGroupMembers,
  holidayRangeDates,
  planHolidayGroupEdit,
} from './holidayGrouping';
import type { Holiday } from '../../types';
import { OBSERVED_TAB_VALUE } from './observance';

const day = (iso: string) => dayjs(iso);

// A span steps forward day by day from the first date.
const FIRST = '2026-07-01';
const LATER = '2026-10-01';

describe('a run keeps its own tab', () => {
  const observedRow = {
    id: 1,
    date: FIRST,
    description: 'Company Holiday',
    holiday_type: 'observed' as const,
    is_recurring: false,
  };

  it('gives a day added to the run the run\u2019s type, not the custom default', () => {
    const result = planHolidayGroupEdit(
      [observedRow],
      { date: day(FIRST), end_date: day('2026-07-02'), is_multi_day: true },
      'Company Holiday'
    );
    expect(result?.ok).toBe(true);
    if (!result?.ok) return;
    expect(result.plan.create).toHaveLength(1);
    expect(result.plan.create[0].holiday_type).toBe('observed');
    expect(result.plan.update[0].patch.holiday_type).toBe('observed');
  });

  it('moving the only day keeps the type on the row that replaces it', () => {
    const result = planHolidayGroupEdit([observedRow], { date: day(LATER) }, 'Company Holiday');
    expect(result?.ok).toBe(true);
    if (!result?.ok) return;
    expect(result.plan.deleteIds).toEqual([1]);
    expect(result.plan.create[0].holiday_type).toBe('observed');
  });

  it('leaves a custom day without a type rather than inventing one', () => {
    const result = planHolidayGroupEdit(
      [{ ...observedRow, holiday_type: undefined }],
      { date: day(LATER) },
      'Time off'
    );
    expect(result?.ok).toBe(true);
    if (!result?.ok) return;
    expect(result.plan.create[0]).not.toHaveProperty('holiday_type');
  });
});

describe('holidayRangeDates', () => {
  it('is empty without a start, so a form with no date judges nothing', () => {
    expect(holidayRangeDates({})).toEqual([]);
  });

  it('is the one day when the span is off', () => {
    expect(holidayRangeDates({ date: day(FIRST), end_date: day(LATER) })).toEqual([FIRST]);
  });

  it('walks the span inclusively when multi-day is on', () => {
    expect(
      holidayRangeDates({
        date: day('2026-07-03'),
        end_date: day('2026-07-05'),
        is_multi_day: true,
      })
    ).toEqual(['2026-07-03', '2026-07-04', '2026-07-05']);
  });

  it('is empty when the end precedes the start', () => {
    expect(
      holidayRangeDates({ date: day(LATER), end_date: day(FIRST), is_multi_day: true })
    ).toEqual([]);
  });
});

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

describe('the tab control moves a day between kinds', () => {
  const customRow = {
    id: 7,
    date: FIRST,
    description: 'Company Holiday',
    holiday_type: 'custom' as const,
    tab: 'company',
    is_recurring: false,
  };

  it('promotes a custom day to the observed tab', () => {
    const result = planHolidayGroupEdit(
      [customRow],
      { date: day(FIRST), tab: OBSERVED_TAB_VALUE },
      'Company Holiday'
    );
    expect(result?.ok).toBe(true);
    if (!result?.ok) return;
    expect(result.plan.update[0].patch).toMatchObject({
      tab: null,
      holiday_type: 'observed',
    });
  });

  it('returns an observed day to a custom tab', () => {
    const result = planHolidayGroupEdit(
      [{ ...customRow, holiday_type: 'observed' as const, tab: null }],
      { date: day(FIRST), tab: 'company' },
      'Company Holiday'
    );
    expect(result?.ok).toBe(true);
    if (!result?.ok) return;
    expect(result.plan.update[0].patch).toMatchObject({
      tab: 'company',
      holiday_type: 'custom',
    });
  });

  it('creates an observed day straight from the calendar', () => {
    const payloads = buildHolidayRangePayloads(
      { date: day(FIRST), tab: OBSERVED_TAB_VALUE },
      day(FIRST),
      'Observed Holiday'
    );
    expect(payloads).toHaveLength(1);
    expect(payloads?.[0]).toMatchObject({ tab: null, holiday_type: 'observed' });
  });
});

describe('holidayRunMembers', () => {
  const observedRun = [
    { id: 1, date: FIRST, group_id: 'run-1', holiday_type: 'observed' as const },
    { id: 2, date: '2026-07-02', group_id: 'run-1', holiday_type: 'observed' as const },
  ] as unknown as Holiday[];
  const customRun = [
    { id: 3, date: LATER, group_id: 'run-2', holiday_type: 'custom' as const },
    { id: 4, date: '2026-10-02', group_id: 'run-2', holiday_type: 'custom' as const },
  ] as unknown as Holiday[];

  it('finds an observed run in the observed pool, which the custom list excludes', () => {
    expect(holidayRunMembers([], observedRun, observedRun[0])).toHaveLength(2);
  });

  it('would miss the run if only the custom pool were searched', () => {
    expect(holidayRunMembers(customRun, [], observedRun[0])).toEqual([observedRun[0]]);
  });

  it('still finds a custom run in the custom pool', () => {
    expect(holidayRunMembers(customRun, observedRun, customRun[0])).toHaveLength(2);
  });
});
