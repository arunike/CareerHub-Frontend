import type { Event } from '../../types';

export interface WeekSpan {
  event: Event;
  // 0-6 columns within the week row, inclusive.
  startCol: number;
  endCol: number;
  // Stacking row, so two overlapping spans never sit on top of each other.
  lane: number;
  // The span carries on past this row, so that edge is drawn flat rather than rounded.
  continuesLeft: boolean;
  continuesRight: boolean;
}

export const isMultiDay = (event: Event) =>
  Boolean(event.end_date && event.end_date !== event.date);

const toKey = (day: Date) =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

// Lanes keep overlapping spans stacked rather than colliding.
export const buildWeekSpans = (
  week: Date[],
  events: Event[]
): { spans: WeekSpan[]; lanes: number } => {
  if (week.length === 0) return { spans: [], lanes: 0 };
  const keys = week.map(toKey);
  const first = keys[0];
  const last = keys[keys.length - 1];

  const candidates = events
    .filter(isMultiDay)
    .filter((event) => event.date <= last && (event.end_date as string) >= first)
    // Longest first so the dominant bar takes the top lane and short ones fill in beneath.
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (b.end_date as string).localeCompare(a.end_date as string);
    });

  const laneEnds: number[] = [];
  const spans: WeekSpan[] = candidates.map((event) => {
    const end = event.end_date as string;
    const startCol = Math.max(0, keys.indexOf(event.date < first ? first : event.date));
    const endCol = end > last ? keys.length - 1 : keys.indexOf(end);

    let lane = laneEnds.findIndex((occupiedUntil) => occupiedUntil < startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endCol);
    } else {
      laneEnds[lane] = endCol;
    }

    return {
      event,
      startCol,
      endCol,
      lane,
      continuesLeft: event.date < first,
      continuesRight: end > last,
    };
  });

  return { spans, lanes: laneEnds.length };
};
