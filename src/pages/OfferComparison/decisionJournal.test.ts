import { describe, expect, it } from 'vitest';
import {
  REVIEW_MILESTONES,
  decisionFromOffer,
  defaultDecidedOn,
  dueReviews,
  journalOutcome,
  nextReview,
  reviewAnchor,
  reviewSchedule,
  verdictLabel,
} from './decisionJournal';
import type { DecisionJournalEntry } from './decisionJournal';

const entry = (over: Partial<DecisionJournalEntry> = {}): DecisionJournalEntry => ({
  offer: 1,
  company_name: 'Google',
  role_title: 'Software Engineer',
  decision: 'ACCEPTED',
  decided_on: '2026-01-10',
  started_on: '2026-02-01',
  reviews: [],
  ...over,
});

describe('reviewAnchor', () => {
  it('counts from the day you started, not the day you decided', () => {
    expect(reviewAnchor(entry())).toBe('2026-02-01');
  });

  it('falls back to the decision when there is no start date, as for a declined offer', () => {
    expect(reviewAnchor(entry({ decision: 'DECLINED', started_on: null }))).toBe('2026-01-10');
  });
});

describe('reviewSchedule', () => {
  it('places a milestone that many days after the anchor', () => {
    const slots = reviewSchedule(entry(), '2026-02-01');
    expect(slots.map((s) => s.milestone)).toEqual([...REVIEW_MILESTONES]);
    expect(slots[0].dueOn).toBe('2026-03-03'); // 1 Feb + 30 days
    expect(slots[1].dueOn).toBe('2026-05-02'); // 1 Feb + 90 days
  });

  it('is upcoming before the date and due on the day itself', () => {
    expect(reviewSchedule(entry(), '2026-03-02')[0].status).toBe('upcoming');
    expect(reviewSchedule(entry(), '2026-03-03')[0].status).toBe('due');
    expect(reviewSchedule(entry(), '2026-04-01')[0].status).toBe('due');
  });

  it('is done once a review for that milestone is recorded', () => {
    const reviewed = entry({
      reviews: [{ milestone: 30, completed_on: '2026-03-04', verdict: 'HELD_UP' }],
    });
    const slots = reviewSchedule(reviewed, '2026-06-01');
    expect(slots[0].status).toBe('done');
    expect(slots[1].status).toBe('due');
  });

  it('does not count a review that was started but never completed', () => {
    const draft = entry({ reviews: [{ milestone: 30, notes: 'typed something' }] });
    expect(reviewSchedule(draft, '2026-03-03')[0].status).toBe('due');
  });

  it('returns nothing rather than throwing on an unusable date', () => {
    expect(reviewSchedule(entry({ started_on: '', decided_on: '' }), '2026-03-03')).toEqual([]);
  });
});

describe('dueReviews', () => {
  it('raises only the earliest outstanding milestone per decision', () => {
    const both = entry({ started_on: '2025-01-01' });
    const due = dueReviews([both], '2026-06-01');
    expect(due).toHaveLength(1);
    expect(due[0].milestone).toBe(30);
  });

  it('sorts the oldest due first, across decisions', () => {
    const older = entry({ offer: 1, started_on: '2026-01-01' });
    const newer = entry({ offer: 2, started_on: '2026-02-01' });
    expect(dueReviews([newer, older], '2026-06-01').map((d) => d.entry.offer)).toEqual([1, 2]);
  });

  it('says nothing when every milestone is still ahead', () => {
    expect(dueReviews([entry()], '2026-02-02')).toEqual([]);
  });

  it('says nothing when every milestone has been reviewed', () => {
    const finished = entry({
      reviews: [
        { milestone: 30, completed_on: '2026-03-04', verdict: 'HELD_UP' },
        { milestone: 90, completed_on: '2026-05-03', verdict: 'MIXED' },
      ],
    });
    expect(dueReviews([finished], '2026-12-01')).toEqual([]);
  });
});

describe('nextReview', () => {
  it('skips a completed milestone and offers the following one', () => {
    const reviewed = entry({
      reviews: [{ milestone: 30, completed_on: '2026-03-04', verdict: 'HELD_UP' }],
    });
    expect(nextReview(reviewed, '2026-03-10')?.milestone).toBe(90);
  });

  it('is null once nothing is left', () => {
    const finished = entry({
      reviews: [
        { milestone: 30, completed_on: '2026-03-04' },
        { milestone: 90, completed_on: '2026-05-03' },
      ],
    });
    expect(nextReview(finished, '2026-12-01')).toBeNull();
  });
});

describe('journalOutcome', () => {
  it('waits before passing judgement', () => {
    expect(journalOutcome(entry(), '2026-02-02').label).toBe('Awaiting review');
  });

  it('reports the most recent verdict, not the first', () => {
    const mixed = entry({
      reviews: [
        { milestone: 30, completed_on: '2026-03-04', verdict: 'HELD_UP' },
        { milestone: 90, completed_on: '2026-05-03', verdict: 'WRONG' },
      ],
    });
    const outcome = journalOutcome(mixed, '2026-06-01');
    expect(outcome.label).toBe('Got it wrong');
    expect(outcome.tone).toBe('bad');
  });
});

describe('verdictLabel', () => {
  it('reads as plain words', () => {
    expect(verdictLabel('HELD_UP')).toBe('Held up');
    expect(verdictLabel(null)).toBe('Not reviewed');
  });
});

describe('decisionFromOffer', () => {
  it('opens on the tab the offer already says it ended on', () => {
    expect(decisionFromOffer('ACCEPTED')).toBe('ACCEPTED');
    expect(decisionFromOffer('REJECTED')).toBe('DECLINED');
    expect(decisionFromOffer('DECLINED')).toBe('DECLINED');
  });

  it('assumes accepted while the offer is still open, since that is the common case', () => {
    expect(decisionFromOffer('PENDING')).toBe('ACCEPTED');
    expect(decisionFromOffer(null)).toBe('ACCEPTED');
    expect(decisionFromOffer(undefined)).toBe('ACCEPTED');
  });
});

describe('defaultDecidedOn', () => {
  const timeline = [
    { stage: 'OFFER', event_date: '2026-07-01' },
    { stage: 'ACCEPTED', event_date: '2026-07-15' },
    { stage: 'OFFER_REJECTED', event_date: '2026-07-20' },
  ];

  it('takes the date the decision itself was recorded on the timeline', () => {
    expect(defaultDecidedOn({ decision: 'ACCEPTED', timeline, todayIso: '2026-09-07' })).toBe(
      '2026-07-15'
    );
    expect(defaultDecidedOn({ decision: 'DECLINED', timeline, todayIso: '2026-09-07' })).toBe(
      '2026-07-20'
    );
  });

  it('falls back to the day the offer arrived when no decision was logged', () => {
    const onlyOffer = [{ stage: 'OFFER', event_date: '2026-07-01' }];
    expect(
      defaultDecidedOn({ decision: 'ACCEPTED', timeline: onlyOffer, todayIso: '2026-09-07' })
    ).toBe('2026-07-01');
  });

  it('ignores a timeline entry carrying no date at all', () => {
    const undated = [
      { stage: 'ACCEPTED', event_date: null },
      { stage: 'OFFER', event_date: '2026-07-01' },
    ];
    expect(
      defaultDecidedOn({ decision: 'ACCEPTED', timeline: undated, todayIso: '2026-09-07' })
    ).toBe('2026-07-01');
  });

  it('uses a deadline that has already passed, since the call was made by then', () => {
    expect(
      defaultDecidedOn({ decision: 'ACCEPTED', deadline: '2026-08-01', todayIso: '2026-09-07' })
    ).toBe('2026-08-01');
  });

  it('will not date a decision to a deadline still in the future', () => {
    expect(
      defaultDecidedOn({ decision: 'ACCEPTED', deadline: '2026-12-01', todayIso: '2026-09-07' })
    ).toBe('2026-09-07');
  });

  it('falls back to today when the application knows nothing', () => {
    expect(defaultDecidedOn({ decision: 'ACCEPTED', todayIso: '2026-09-07' })).toBe('2026-09-07');
  });
});
