import { describe, expect, it } from 'vitest';
import { quickAddLayout } from './utils';

describe('quickAddLayout', () => {
  it('leads with the holiday actions on a holidays page', () => {
    expect(quickAddLayout('holidays')).toEqual({
      highlightEvent: false,
      highlightHoliday: true,
      holidayFirst: true,
    });
  });

  it('leads with Add Event on an events page', () => {
    expect(quickAddLayout('events')).toEqual({
      highlightEvent: true,
      highlightHoliday: false,
      holidayFirst: false,
    });
  });

  it('highlights both and keeps Add Event first when the page owns neither', () => {
    expect(quickAddLayout('all')).toEqual({
      highlightEvent: true,
      highlightHoliday: true,
      holidayFirst: false,
    });
  });
});
