import { differenceInCalendarDays, endOfWeek, format, parseISO, startOfWeek } from 'date-fns';
import type { Event } from '../../types';

const WEEK = { weekStartsOn: 1 } as const;

export interface EventLoad {
  // Average per week across the span the data actually covers, not per calendar week of the
  // year — a year filtered to two months of events should not read as ~0 per week.
  perWeek: number;
  spanWeeks: number;
  busiestDay: { date: string; count: number } | null;
  // Days holding more than one event. Back-to-back days are the ones that hurt.
  multiEventDays: number;
  busiestWeekday: { label: string; count: number } | null;
  busiestHour: { label: string; count: number } | null;
}

export interface EventStats {
  totalEvents: number;
  thisWeek: number;
  byCategory: { name: string; value: number }[];
  // Events per day, keyed yyyy-MM-dd, for the shared activity chart.
  dailyCounts: Record<string, number>;
  load: EventLoad;
}

const eventDate = (event: Event) => {
  try {
    return event.date ? parseISO(event.date) : null;
  } catch {
    return null;
  }
};

// A multi-day event is one commitment, counted on the day it starts. Spreading it across
// every day it spans would make a single conference look like a week of interviews.
export const eventYears = (events: Event[]) =>
  Array.from(
    new Set(
      events
        .map((event) => eventDate(event))
        .filter((date): date is Date => date !== null)
        .map((date) => date.getFullYear())
    )
  ).sort((a, b) => b - a);

export const scopeEventsToYear = (events: Event[], year: number | 'all') =>
  year === 'all'
    ? events
    : events.filter((event) => {
        const date = eventDate(event);
        return date !== null && date.getFullYear() === year;
      });

export const buildEventStats = (events: Event[], now: Date): EventStats => {
  const weekStart = startOfWeek(now, WEEK);
  const weekEnd = endOfWeek(now, WEEK);

  const dailyCounts: Record<string, number> = {};
  const byWeekday = new Map<number, number>();
  const byHour = new Map<number, number>();
  const categoryCount: Record<string, number> = {};
  let thisWeek = 0;
  let earliest: Date | null = null;
  let latest: Date | null = null;

  events.forEach((event) => {
    const date = eventDate(event);
    const category = event.category_details?.name || 'Uncategorized';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
    if (!date) return;

    const key = format(date, 'yyyy-MM-dd');
    dailyCounts[key] = (dailyCounts[key] || 0) + 1;
    byWeekday.set(date.getDay(), (byWeekday.get(date.getDay()) || 0) + 1);

    const hour = Number((event.start_time || '').slice(0, 2));
    if (Number.isFinite(hour)) byHour.set(hour, (byHour.get(hour) || 0) + 1);

    if (date >= weekStart && date <= weekEnd) thisWeek += 1;
    if (!earliest || date < earliest) earliest = date;
    if (!latest || date > latest) latest = date;
  });

  const dayEntries = Object.entries(dailyCounts);
  const busiestEntry = dayEntries.reduce<[string, number] | null>(
    (best, entry) => (best === null || entry[1] > best[1] ? entry : best),
    null
  );

  const pickTop = <T>(map: Map<T, number>) => {
    let top: { key: T; count: number } | null = null;
    map.forEach((count, key) => {
      if (!top || count > top.count) top = { key, count };
    });
    return top as { key: T; count: number } | null;
  };

  const topWeekday = pickTop(byWeekday);
  const topHour = pickTop(byHour);

  // At least one week, so a single day of events reads as "1 per week" rather than dividing
  // by zero.
  const spanWeeks =
    earliest && latest
      ? Math.max(1, Math.ceil((differenceInCalendarDays(latest, earliest) + 1) / 7))
      : 0;

  return {
    totalEvents: events.length,
    thisWeek,
    byCategory: Object.entries(categoryCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    dailyCounts,
    load: {
      perWeek: spanWeeks ? Math.round((events.length / spanWeeks) * 10) / 10 : 0,
      spanWeeks,
      busiestDay: busiestEntry ? { date: busiestEntry[0], count: busiestEntry[1] } : null,
      multiEventDays: dayEntries.filter(([, count]) => count > 1).length,
      busiestWeekday: topWeekday
        ? {
            // A fixed reference week, so the label is a weekday name and not a real date.
            label: format(new Date(2024, 0, 7 + topWeekday.key), 'EEEE'),
            count: topWeekday.count,
          }
        : null,
      busiestHour: topHour
        ? {
            label: format(new Date(2024, 0, 1, topHour.key), 'h a'),
            count: topHour.count,
          }
        : null,
    },
  };
};
