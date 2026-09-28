import type { Event, Holiday } from '../../types';
import { holidayRuns } from '../../utils/Holidays/holidayRuns';

// Time off is stored a row per day, so a trip only becomes one bar once its days are grouped.
interface HolidayGroup {
  id: string;
  start: string;
  end: string;
  days: number;
  // The earliest day of the run, which is what a click opens and where the colour comes from.
  holiday: Holiday;
  // Every date the bar covers, so the cells beneath it can drop their own chips.
  dates: string[];
}

type SpanSubject = { kind: 'event'; event: Event } | { kind: 'holiday'; group: HolidayGroup };

export interface SpanCandidate {
  id: string;
  start: string;
  end: string;
  subject: SpanSubject;
}

export interface WeekSpan {
  id: string;
  subject: SpanSubject;
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

export const eventSpanCandidates = (events: Event[]): SpanCandidate[] =>
  events.filter(isMultiDay).map((event) => ({
    id: `event-${event.id}`,
    start: event.date,
    end: event.end_date as string,
    subject: { kind: 'event', event },
  }));

// A group of one is left as a chip: a bar spanning a single cell only adds a border.
export const holidayGroupCandidates = (holidays: Holiday[]): SpanCandidate[] => {
  const candidates: SpanCandidate[] = [];
  for (const { groupId, members } of holidayRuns(holidays, { splitOnGap: true })) {
    // A group of one is left as a chip: a bar spanning a single cell only adds a border.
    if (members.length < 2) continue;
    const start = members[0].date;
    const end = members[members.length - 1].date;
    candidates.push({
      id: `holiday-${groupId}-${start}`,
      start,
      end,
      subject: {
        kind: 'holiday',
        group: {
          id: groupId,
          start,
          end,
          days: members.length,
          holiday: members[0],
          dates: members.map((member) => member.date),
        },
      },
    });
  }
  return candidates;
};

// Lanes keep overlapping spans stacked rather than colliding, across both kinds at once.
export const buildWeekSpans = (
  week: Date[],
  candidates: SpanCandidate[]
): { spans: WeekSpan[]; lanes: number } => {
  if (week.length === 0) return { spans: [], lanes: 0 };
  const keys = week.map(toKey);
  const first = keys[0];
  const last = keys[keys.length - 1];

  const inWeek = candidates
    .filter((candidate) => candidate.start <= last && candidate.end >= first)
    // Longest first so the dominant bar takes the top lane and short ones fill in beneath.
    .sort((a, b) => {
      if (a.start !== b.start) return a.start < b.start ? -1 : 1;
      return b.end.localeCompare(a.end);
    });

  const laneEnds: number[] = [];
  const spans: WeekSpan[] = inWeek.map((candidate) => {
    const startCol = Math.max(0, keys.indexOf(candidate.start < first ? first : candidate.start));
    const endCol = candidate.end > last ? keys.length - 1 : keys.indexOf(candidate.end);

    let lane = laneEnds.findIndex((occupiedUntil) => occupiedUntil < startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endCol);
    } else {
      laneEnds[lane] = endCol;
    }

    return {
      id: candidate.id,
      subject: candidate.subject,
      startCol,
      endCol,
      lane,
      continuesLeft: candidate.start < first,
      continuesRight: candidate.end > last,
    };
  });

  return { spans, lanes: laneEnds.length };
};
