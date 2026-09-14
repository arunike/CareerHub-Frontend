import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  startOfWeek,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns';
import type { CalendarViewMode, DayData } from './types';

export const hasDayItems = (dayData: DayData) =>
  dayData.events.length > 0 ||
  dayData.customHolidays.length > 0 ||
  dayData.federalHolidays.length > 0;

export const formatRangeLabel = (start: Date, end: Date) => {
  const sameYear = format(start, 'yyyy') === format(end, 'yyyy');
  const sameMonth = format(start, 'yyyy-MM') === format(end, 'yyyy-MM');

  if (sameMonth) {
    return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
  }

  if (sameYear) {
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }

  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
};

export const getHeaderLabel = (viewMode: CalendarViewMode, anchorDate: Date) => {
  if (viewMode === 'day') {
    return format(anchorDate, 'EEEE, MMMM d, yyyy');
  }

  if (viewMode === 'threeDay') {
    return formatRangeLabel(anchorDate, addDays(anchorDate, 2));
  }

  if (viewMode === 'week') {
    const weekStart = startOfWeek(anchorDate);
    return formatRangeLabel(weekStart, addDays(weekStart, 6));
  }

  if (viewMode === 'month') {
    return format(anchorDate, 'MMMM yyyy');
  }

  return format(anchorDate, 'yyyy');
};

export const getVisibleRangeDates = (viewMode: CalendarViewMode, anchorDate: Date) => {
  if (viewMode === 'day') {
    return [anchorDate];
  }

  if (viewMode === 'threeDay') {
    return Array.from({ length: 3 }, (_, index) => addDays(anchorDate, index));
  }

  if (viewMode === 'week') {
    const weekStart = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }

  return [];
};

export const shiftAnchorDate = (
  viewMode: CalendarViewMode,
  anchorDate: Date,
  direction: 'prev' | 'next'
) => {
  const multiplier = direction === 'next' ? 1 : -1;

  if (viewMode === 'day') {
    return addDays(anchorDate, multiplier);
  }

  if (viewMode === 'threeDay') {
    return addDays(anchorDate, multiplier * 3);
  }

  if (viewMode === 'week') {
    return multiplier > 0 ? addWeeks(anchorDate, 1) : subWeeks(anchorDate, 1);
  }

  if (viewMode === 'month') {
    return multiplier > 0 ? addMonths(anchorDate, 1) : subMonths(anchorDate, 1);
  }

  return multiplier > 0 ? addYears(anchorDate, 1) : subYears(anchorDate, 1);
};

// All-day events are stored spanning 00:00-23:59, so show the label instead of those times.
export const eventTimeLabel = (event: { is_all_day?: boolean; start_time: string }) =>
  event.is_all_day ? 'All day' : event.start_time.substring(0, 5);

export const eventTimeRangeLabel = (event: {
  is_all_day?: boolean;
  start_time: string;
  end_time: string;
  date?: string;
  end_date?: string | null;
}) => {
  if (event.is_all_day) return 'All day';
  const range = `${event.start_time.substring(0, 5)} - ${event.end_time.substring(0, 5)}`;
  // Across several days those two times belong to different days, so say how many.
  const days = event.date ? eventSpanDays({ date: event.date, end_date: event.end_date }) : 1;
  return days > 1 ? `${range} · over ${days} days` : range;
};

const parseDayString = (value: string) => new Date(`${value}T00:00:00`);

const toDayString = (day: Date) =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

export const eventSpanDays = (event: { date: string; end_date?: string | null }) => {
  if (!event.end_date || event.end_date === event.date) return 1;
  const ms = parseDayString(event.end_date).getTime() - parseDayString(event.date).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

// The end shifts with the start, so a dragged span keeps its length.
export const buildEventMovePatch = (
  event: { date: string; end_date?: string | null },
  day: Date
): { date: string; end_date?: string | null } => {
  const date = toDayString(day);
  if (!event.end_date) return { date };
  const spanMs = parseDayString(event.end_date).getTime() - parseDayString(event.date).getTime();
  const end = new Date(day.getTime());
  end.setDate(end.getDate() + Math.round(spanMs / 86400000));
  return { date, end_date: toDayString(end) };
};
