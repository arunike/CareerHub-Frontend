import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { eventPayload } from './eventFormTypes';
import type { EventFormValues } from './eventFormTypes';

const values = (over: Partial<EventFormValues> = {}): EventFormValues => ({
  date: dayjs('2026-07-01'),
  start_time: dayjs('2026-07-01T09:00:00'),
  end_time: dayjs('2026-07-01T17:00:00'),
  ...over,
});

describe('eventPayload', () => {
  it('formats the dates and times the API stores', () => {
    expect(eventPayload(values(), null)).toMatchObject({
      date: '2026-07-01',
      start_time: '09:00:00',
      end_time: '17:00:00',
      end_date: null,
      is_all_day: false,
      is_recurring: false,
    });
  });

  it('stores a whole day for an all-day event, so it still spans one', () => {
    expect(eventPayload(values({ is_all_day: true }), null)).toMatchObject({
      start_time: '00:00:00',
      end_time: '23:59:00',
      is_all_day: true,
    });
  });

  it('keeps the end date only while Multi-day is on', () => {
    const end = dayjs('2026-07-03');
    expect(eventPayload(values({ is_multi_day: true, end_date: end }), null).end_date).toBe(
      '2026-07-03'
    );
    // Unticking Multi-day has to really shorten the event, not leave the old end behind.
    expect(eventPayload(values({ is_multi_day: false, end_date: end }), null).end_date).toBeNull();
  });

  it('marks the event recurring from the rule it was given', () => {
    const rule = { frequency: 'weekly' as const, interval: 1 };
    expect(eventPayload(values(), rule)).toMatchObject({
      is_recurring: true,
      recurrence_rule: rule,
    });
  });
});
