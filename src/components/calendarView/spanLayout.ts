import type { Event, Holiday } from '../../types';

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
  const byGroup = new Map<string, Holiday[]>();
  for (const holiday of holidays) {
    if (!holiday.group_id) continue;
    const members = byGroup.get(holiday.group_id);
    if (members) {
      if (!members.some((seen) => seen.date === holiday.date)) members.push(holiday);
    } else {
      byGroup.set(holiday.group_id, [holiday]);
    }
  }

  const candidates: SpanCandidate[] = [];
  for (const [groupId, members] of byGroup) {
    const sorted = [...members].sort((a, b) => a.date.localeCompare(b.date));
    // A day taken out of the middle of a trip splits it, so runs are cut where the dates skip.
    let run: Holiday[] = [];
    const flush = () => {
      if (run.length > 1) {
        candidates.push({
          id: `holiday-${groupId}-${run[0].date}`,
          start: run[0].date,
          end: run[run.length - 1].date,
          subject: {
            kind: 'holiday',
            group: {
              id: groupId,
              start: run[0].date,
              end: run[run.length - 1].date,
              days: run.length,
              holiday: run[0],
              dates: run.map((member) => member.date),
            },
          },
        });
      }
      run = [];
    };
    for (const member of sorted) {
      const previous = run[run.length - 1];
      const adjacent =
        previous &&
        new Date(`${member.date}T00:00:00`).getTime() -
          new Date(`${previous.date}T00:00:00`).getTime() ===
          86400000;
      if (previous && !adjacent) flush();
      run.push(member);
    }
    flush();
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
