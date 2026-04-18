import { addDays, format, startOfWeek } from 'date-fns';
import type { Event, Holiday } from '../../types';

export type CalendarViewMode = 'day' | 'threeDay' | 'week' | 'month' | 'year';

export type DayData = {
  events: Event[];
  customHolidays: Holiday[];
  federalHolidays: Holiday[];
};

export type GetDayData = (day: Date) => DayData;

export const VIEW_OPTIONS: Array<{ value: CalendarViewMode; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'threeDay', label: '3 Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, index) =>
  format(addDays(startOfWeek(new Date()), index), 'EEE')
);

export const MINI_WEEKDAY_LABELS = Array.from({ length: 7 }, (_, index) =>
  format(addDays(startOfWeek(new Date()), index), 'EEEEE')
);
