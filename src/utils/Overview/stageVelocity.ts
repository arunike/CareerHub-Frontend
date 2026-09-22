import { daysBetween, isInterviewing } from './overview';
import type { CommandApplication } from './overview';

export interface TimelineEntryLike {
  application: number;
  stage: string;
  stage_order?: number;
  event_date?: string | null;
}

export interface StalledRound {
  application: CommandApplication;
  stage: string;
  days: number;
  typical: number;
}

// One sample is an anecdote; a median needs enough rounds behind it to mean anything.
export const MIN_SAMPLES = 3;

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

// How long each stage has taken you before, measured between the dates you actually recorded.
export const stageDurations = (entries: TimelineEntryLike[]): Map<string, number> => {
  const byApplication = new Map<number, TimelineEntryLike[]>();
  for (const entry of entries) {
    if (text(entry.event_date) === '') continue;
    const bucket = byApplication.get(entry.application) ?? [];
    bucket.push(entry);
    byApplication.set(entry.application, bucket);
  }

  const samples = new Map<string, number[]>();
  for (const bucket of byApplication.values()) {
    const ordered = [...bucket].sort(
      (a, b) =>
        (a.stage_order ?? 999) - (b.stage_order ?? 999) ||
        text(a.event_date).localeCompare(text(b.event_date))
    );
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const held = daysBetween(ordered[index].event_date, ordered[index + 1].event_date);
      // A backwards or same-day pair says nothing about how long the stage takes.
      if (held === null || held <= 0) continue;
      const stage = text(ordered[index].stage).toUpperCase();
      samples.set(stage, [...(samples.get(stage) ?? []), held]);
    }
  }

  const typical = new Map<string, number>();
  for (const [stage, values] of samples) {
    if (values.length >= MIN_SAMPLES) typical.set(stage, median(values));
  }
  return typical;
};

// A live round that has already outlasted what that stage usually takes you.
export const stalledRounds = (
  applications: CommandApplication[],
  entries: TimelineEntryLike[],
  todayIso: string
): StalledRound[] => {
  const typicalByStage = stageDurations(entries);
  return applications
    .filter((application) => isInterviewing(text(application.status)))
    .flatMap((application) => {
      const stage = text(application.status).toUpperCase();
      const typical = typicalByStage.get(stage);
      const days = daysBetween(application.current_stage_on, todayIso);
      if (typical === undefined || days === null || days <= typical) return [];
      return [{ application, stage, days, typical }];
    })
    .sort((a, b) => b.days - b.typical - (a.days - a.typical));
};
