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
