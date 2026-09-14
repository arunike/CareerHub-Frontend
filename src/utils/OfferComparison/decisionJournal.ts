import type { DecisionCriterion } from '../../types/career';

export type JournalDecision = 'ACCEPTED' | 'DECLINED';

export interface JournalReview {
  milestone: number;
  completed_on?: string | null;
  verdict?: 'HELD_UP' | 'MIXED' | 'WRONG' | null;
  notes?: string;
  criteria_verdicts?: Partial<Record<DecisionCriterion, CriterionVerdict | null>>;
}

// The scorecard's own categories, so "what mattered" lines up with the weights already set.
export const DECISION_CRITERIA: readonly DecisionCriterion[] = [
  'financial',
  'benefits',
  'workLife',
  'trajectory',
  'location',
  'brand',
  'visa',
];

export type { DecisionCriterion } from '../../types/career';

export const CRITERION_LABELS: Record<DecisionCriterion, string> = {
  financial: 'Financial',
  benefits: 'Benefits',
  workLife: 'Work-life balance',
  trajectory: 'Trajectory',
  location: 'Location',
  brand: 'Brand',
  visa: 'Immigration',
};

export type CriterionVerdict = 'BETTER' | 'AS_EXPECTED' | 'WORSE';

export const CRITERION_VERDICT_LABELS: Record<CriterionVerdict, string> = {
  BETTER: 'Better',
  AS_EXPECTED: 'As expected',
  WORSE: 'Worse',
};

export type ConcernOutcome = 'REAL' | 'AVOIDED' | 'UNCLEAR';

export const CONCERN_OUTCOME_LABELS: Record<ConcernOutcome, string> = {
  REAL: 'Became real',
  AVOIDED: 'Never happened',
  UNCLEAR: 'Still unclear',
};

export interface JournalConcern {
  id: string;
  text: string;
  outcome?: ConcernOutcome | null;
}

export interface DecisionJournalEntry {
  id?: number;
  offer: number;
  company_name?: string;
  role_title?: string;
  decision: JournalDecision;
  decided_on: string;
  started_on?: string | null;
  reasons?: string;
  concerns?: JournalConcern[];
  criteria?: DecisionCriterion[];
  reviews?: JournalReview[];
}

// Thirty days is long enough for the honeymoon to wear off; ninety for the job to show its shape.
export const REVIEW_MILESTONES = [30, 90] as const;

const DAY = 86400000;

const dayOf = (value: unknown): number | null => {
  if (typeof value !== 'string' || value.length < 10) return null;
  const time = Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(time) ? null : Math.floor(time / DAY);
};

const isoOf = (days: number) => new Date(days * DAY).toISOString().slice(0, 10);

// A declined offer has no start date, so its clock runs from the decision instead.
export const reviewAnchor = (entry: DecisionJournalEntry) => entry.started_on || entry.decided_on;

export type ReviewStatus = 'done' | 'due' | 'upcoming';

export interface ScheduledReview {
  milestone: number;
  dueOn: string;
  status: ReviewStatus;
  daysAway: number;
  review: JournalReview | null;
}

export const reviewSchedule = (
  entry: DecisionJournalEntry,
  todayIso: string
): ScheduledReview[] => {
  const anchor = dayOf(reviewAnchor(entry));
  const today = dayOf(todayIso);
  if (anchor === null || today === null) return [];

  return REVIEW_MILESTONES.map((milestone) => {
    const dueDay = anchor + milestone;
    const done = (entry.reviews ?? []).find(
      (review) => review.milestone === milestone && review.completed_on
    );
    return {
      milestone,
      dueOn: isoOf(dueDay),
      status: done ? 'done' : today >= dueDay ? 'due' : 'upcoming',
      daysAway: dueDay - today,
      review: done ?? null,
    } satisfies ScheduledReview;
  });
};

export interface DueReview extends ScheduledReview {
  entry: DecisionJournalEntry;
}

// Only the earliest outstanding milestone per decision: being told twice about one job is noise.
export const dueReviews = (entries: DecisionJournalEntry[], todayIso: string): DueReview[] =>
  entries
    .flatMap((entry) => {
      const next = reviewSchedule(entry, todayIso).find((slot) => slot.status === 'due');
      return next ? [{ ...next, entry }] : [];
    })
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));

const VERDICT_LABELS: Record<string, string> = {
  HELD_UP: 'Held up',
  MIXED: 'Mixed',
  WRONG: 'Got it wrong',
};

export const verdictLabel = (verdict?: string | null) =>
  (verdict && VERDICT_LABELS[verdict]) || 'Not reviewed';

// How the call looks once the reviews are in, which is the whole point of keeping the journal.
export const journalOutcome = (entry: DecisionJournalEntry, todayIso: string) => {
  const schedule = reviewSchedule(entry, todayIso);
  const completed = schedule.filter((slot) => slot.review);
  if (completed.length === 0) return { label: 'Awaiting review', tone: 'neutral' as const };
  const latest = completed[completed.length - 1].review!;
  const tone =
    latest.verdict === 'HELD_UP' ? 'good' : latest.verdict === 'WRONG' ? 'bad' : 'neutral';
  return { label: verdictLabel(latest.verdict), tone };
};

// The offer already records how it ended, so asking again invites a mismatch with it.
export const decisionFromOffer = (finalDecisionStatus?: string | null): JournalDecision =>
  finalDecisionStatus === 'REJECTED' || finalDecisionStatus === 'DECLINED'
    ? 'DECLINED'
    : 'ACCEPTED';

// The stage whose date is the decision, per decision, then the stage where the offer arrived.
const DECISION_STAGES: Record<JournalDecision, string[]> = {
  ACCEPTED: ['ACCEPTED', 'OFFER'],
  DECLINED: ['OFFER_REJECTED', 'REJECTED', 'OFFER'],
};

export interface TimelineDate {
  stage?: string | null;
  event_date?: string | null;
}

// Prefilled from the application, or a journal ends up dated the day you opened the form.
export const defaultDecidedOn = ({
  decision,
  timeline = [],
  deadline,
  todayIso,
}: {
  decision: JournalDecision;
  timeline?: TimelineDate[];
  deadline?: string | null;
  todayIso: string;
}): string => {
  for (const stage of DECISION_STAGES[decision]) {
    const entry = timeline.find(
      (candidate) => candidate.stage === stage && dayOf(candidate.event_date) !== null
    );
    if (entry?.event_date) return entry.event_date.slice(0, 10);
  }
  // A deadline still in the future has not been decided by, so it says nothing about when.
  const deadlineDay = dayOf(deadline);
  const today = dayOf(todayIso);
  if (deadlineDay !== null && today !== null && deadlineDay <= today) {
    return (deadline as string).slice(0, 10);
  }
  return todayIso;
};

// Ids only have to be unique inside one journal, and a look-back marks a concern by its id.
export const newConcernId = (existing: JournalConcern[]) => {
  const used = new Set(existing.map((concern) => concern.id));
  let index = existing.length + 1;
  while (used.has(`c${index}`)) index += 1;
  return `c${index}`;
};
