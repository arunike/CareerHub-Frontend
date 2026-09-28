import { daysBetween, isClosed } from './overview';
import type { CommandApplication } from './overview';
import { FOLLOW_UP_AFTER_DAYS, hasReplied } from './weeklyReview';

// Three weeks of silence is a decision to make, not a thing to do today.
export const STALE_AFTER_DAYS = 21;

export type Bucket = 'moving' | 'nudge' | 'stale' | 'cold';

export interface BucketedApplication {
  application: CommandApplication;
  bucket: Bucket;
  daysQuiet: number;
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');

// One application, one bucket: three cards measuring the same silence listed it three times.
export const bucketApplications = (
  applications: CommandApplication[],
  todayIso: string,
  nudgeAfter = FOLLOW_UP_AFTER_DAYS,
  staleAfter = STALE_AFTER_DAYS
): BucketedApplication[] =>
  applications
    .filter((application) => !isClosed(text(application.status)))
    .flatMap((application) => {
      // From the last thing that happened, not the last save: a sync hides the silence.
      const daysQuiet = daysBetween(
        text(application.current_stage_on) || application.updated_at,
        todayIso
      );
      if (daysQuiet === null) return [];
      const bucket: Bucket =
        daysQuiet < nudgeAfter
          ? 'moving'
          : !hasReplied(application)
            ? 'cold'
            : daysQuiet >= staleAfter
              ? 'stale'
              : 'nudge';
      return [{ application, bucket, daysQuiet }];
    })
    .sort((a, b) => b.daysQuiet - a.daysQuiet);

export const inBucket = (rows: BucketedApplication[], bucket: Bucket) =>
  rows.filter((row) => row.bucket === bucket);
