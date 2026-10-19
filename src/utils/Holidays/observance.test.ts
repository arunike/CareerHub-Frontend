import { describe, expect, it } from 'vitest';
import {
  OBSERVED_TAB_VALUE,
  holidayTabPatch,
  ignoreListAfter,
  isHolidayViewOnly,
  tabFieldValue,
} from './observance';

describe('ignoreListAfter', () => {
  const DATE = '2026-07-01';

  it('adds the name when a day stops being observed', () => {
    expect(ignoreListAfter([], 'Observed Day A', DATE, false)).toEqual(['Observed Day A']);
  });

  it('keeps the list unchanged when the day is already ignored by name', () => {
    const list = ['Observed Day A'];
    expect(ignoreListAfter(list, 'Observed Day A', DATE, false)).toBe(list);
  });

  it('keeps the list unchanged when the day is already ignored by date', () => {
    const list = [DATE];
    expect(ignoreListAfter(list, 'Observed Day A', DATE, false)).toBe(list);
  });

  it('drops both forms when a day becomes observed again', () => {
    expect(
      ignoreListAfter(['Observed Day A', DATE, 'Observed Day B'], 'Observed Day A', DATE, true)
    ).toEqual(['Observed Day B']);
  });

  it('leaves other years alone, which is why the stored list is read before it is written', () => {
    expect(ignoreListAfter(['Observed Day B'], 'Observed Day A', DATE, true)).toEqual([
      'Observed Day B',
    ]);
  });
});

describe('tabFieldValue', () => {
  it('shows the observed tab for a stored observed day', () => {
    expect(tabFieldValue({ holiday_type: 'observed' })).toBe(OBSERVED_TAB_VALUE);
  });

  it('shows the observed tab for a computed day, which carries no tab of its own', () => {
    expect(tabFieldValue({ holiday_type: 'observed_native' })).toBe(OBSERVED_TAB_VALUE);
  });

  it('shows the stored tab for a custom day', () => {
    expect(tabFieldValue({ holiday_type: 'custom', tab: 'company' })).toBe('company');
  });

  it('shows untabbed for a day with no tab at all', () => {
    expect(tabFieldValue({ holiday_type: 'custom', tab: null })).toBe('');
    expect(tabFieldValue(null)).toBe('');
  });
});

describe('holidayTabPatch', () => {
  it('cannot collide with a tab id, which is only lowercase, digits and underscores', () => {
    expect(OBSERVED_TAB_VALUE).toMatch(/[^a-z0-9_]/);
  });

  it('moves a day into the observed tab', () => {
    expect(holidayTabPatch(OBSERVED_TAB_VALUE)).toEqual({
      tab: null,
      holiday_type: 'observed',
    });
  });

  it('moves a day out of the observed tab when another tab is chosen', () => {
    expect(holidayTabPatch('company', 'observed')).toEqual({
      tab: 'company',
      holiday_type: 'custom',
    });
  });

  it('treats untabbed as a real choice, so an observed day can leave the tab', () => {
    expect(holidayTabPatch('', 'observed')).toEqual({ tab: null, holiday_type: 'custom' });
  });

  it('keeps the kind when the caller has no tab control', () => {
    expect(holidayTabPatch(undefined, 'observed')).toEqual({
      tab: null,
      holiday_type: 'observed',
    });
    expect(holidayTabPatch(undefined)).toEqual({ tab: null });
  });
});

describe('isHolidayViewOnly', () => {
  it('opens an observed day read-only until advanced options are on', () => {
    expect(isHolidayViewOnly({ holiday_type: 'observed' }, false)).toBe(true);
    expect(isHolidayViewOnly({ holiday_type: 'observed' }, true)).toBe(false);
  });

  it('never edits a computed day, whatever the mode', () => {
    expect(isHolidayViewOnly({ holiday_type: 'observed_native' }, true)).toBe(true);
    expect(isHolidayViewOnly({ holiday_type: 'observed_native' }, false)).toBe(true);
  });

  it('leaves your own time off editable either way', () => {
    expect(isHolidayViewOnly({ holiday_type: 'custom' }, false)).toBe(false);
    expect(isHolidayViewOnly(null, false)).toBe(false);
  });
});
