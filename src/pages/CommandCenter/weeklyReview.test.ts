import { describe, expect, it } from 'vitest';
import {
  appliedThisWeek,
  movedThisWeek,
  goneCold,
  needsFollowUp,
  nextWeekFocus,
  responseRate,
  weekHeadline,
  weekWindow,
} from './weeklyReview';
import type { CommandApplication, CommandEvent, CommandOffer } from './commandCenter';

const TODAY = '2026-09-06';

const application = (over: Partial<CommandApplication>): CommandApplication => ({
  id: 1,
  role_title: 'Engineer',
  status: 'APPLIED',
  updated_at: TODAY,
  ...over,
});

describe('appliedThisWeek', () => {
  it('counts the last seven days and stops there', () => {
    const rows = [
      application({ id: 1, date_applied: '2026-09-06' }),
      application({ id: 2, date_applied: '2026-09-01' }),
      application({ id: 3, date_applied: '2026-08-30' }),
    ];
    expect(appliedThisWeek(rows, TODAY).map((row) => row.id)).toEqual([1, 2]);
  });

  it('falls back to the update stamp when no applied date was captured', () => {
    expect(appliedThisWeek([application({ updated_at: '2026-09-02' })], TODAY)).toHaveLength(1);
  });

  it('ignores a date in the future rather than counting it as this week', () => {
    expect(appliedThisWeek([application({ date_applied: '2026-09-20' })], TODAY)).toHaveLength(0);
  });
});

describe('movedThisWeek', () => {
  it('only counts a recent touch that left the Applied stage', () => {
    const rows = [
      application({ id: 1, status: 'INTERVIEW', updated_at: '2026-09-04' }),
      application({ id: 2, status: 'APPLIED', updated_at: '2026-09-04' }),
      application({ id: 3, status: 'OFFER', updated_at: '2026-07-01' }),
    ];
    expect(movedThisWeek(rows, TODAY).map((row) => row.id)).toEqual([1]);
  });
});

describe('responseRate', () => {
  it('treats anything past Applied as an answer', () => {
    const rows = [
      application({ id: 1, status: 'APPLIED' }),
      application({ id: 2, status: 'INTERVIEW' }),
      application({ id: 3, status: 'REJECTED' }),
      application({ id: 4, status: 'APPLIED' }),
    ];
    expect(responseRate(rows)).toEqual({ answered: 2, sent: 4, rate: 0.5 });
  });

  it('counts an application that reached interview even if it fell back', () => {
    const rows = [application({ status: 'APPLIED', has_reached_interview: true })];
    expect(responseRate(rows).answered).toBe(1);
  });

  it('does not divide by zero on an empty pipeline', () => {
    expect(responseRate([])).toEqual({ answered: 0, sent: 0, rate: 0 });
  });

  it('counts a round-numbered stage as a reply', () => {
    expect(responseRate([application({ status: 'ROUND_1' })]).answered).toBe(1);
    expect(responseRate([application({ status: 'FINAL_ROUND' })]).answered).toBe(1);
  });

  it('does not count a ghosting or a removed row as a reply', () => {
    expect(responseRate([application({ status: 'GHOSTED' })]).answered).toBe(0);
    expect(responseRate([application({ status: 'REMOVED_FROM_SHEET' })]).answered).toBe(0);
  });
});

describe('needsFollowUp', () => {
  it('surfaces engaged applications gone quiet, longest first', () => {
    const rows = [
      application({ id: 1, status: 'ROUND_1', updated_at: '2026-08-01' }),
      application({ id: 2, status: 'OFFER', updated_at: '2026-08-20' }),
      application({ id: 3, status: 'ROUND_2', updated_at: '2026-09-05' }),
    ];
    expect(needsFollowUp(rows, TODAY).map((row) => row.application.id)).toEqual([1, 2]);
  });

  it('leaves out a backlog nobody ever replied to, which would swamp the list', () => {
    const rows = Array.from({ length: 50 }, (_, index) =>
      application({ id: index, status: 'APPLIED', updated_at: '2026-07-01' })
    );
    expect(needsFollowUp(rows, TODAY)).toEqual([]);
    expect(goneCold(rows, TODAY)).toHaveLength(50);
  });

  it('counts an application that reached interview even if the stage reads Applied', () => {
    const rows = [
      application({ status: 'APPLIED', has_reached_interview: true, updated_at: '2026-08-01' }),
    ];
    expect(needsFollowUp(rows, TODAY)).toHaveLength(1);
    expect(goneCold(rows, TODAY)).toEqual([]);
  });

  it('leaves settled and removed rows alone: they are not quiet, they are done', () => {
    for (const status of ['REJECTED', 'GHOSTED', 'REMOVED_FROM_SHEET', 'OFFER_REJECTED']) {
      expect(needsFollowUp([application({ status, updated_at: '2026-01-01' })], TODAY)).toEqual([]);
    }
  });

  it('still chases an application sitting in an interview round', () => {
    const rows = [application({ status: 'ROUND_2', updated_at: '2026-01-01' })];
    expect(needsFollowUp(rows, TODAY)).toHaveLength(1);
  });

  it('does not report a ghosted or removed row as cold: it is already settled', () => {
    const rows = [
      application({ status: 'GHOSTED', updated_at: '2026-01-01' }),
      application({ status: 'REMOVED_FROM_SHEET', updated_at: '2026-01-01' }),
    ];
    expect(goneCold(rows, TODAY)).toEqual([]);
  });

  it('reports how long it has been quiet', () => {
    const rows = [application({ status: 'ROUND_1', updated_at: '2026-08-27' })];
    expect(needsFollowUp(rows, TODAY)[0].daysQuiet).toBe(10);
  });

  it('survives a row with no usable timestamp', () => {
    expect(needsFollowUp([application({ updated_at: '' })], TODAY)).toEqual([]);
  });
});

describe('nextWeekFocus', () => {
  const events = [
    { id: 1, name: 'Onsite', date: '2026-09-09' },
    { id: 2, name: 'Too far out', date: '2026-10-01' },
  ] as CommandEvent[];
  const offers = [
    { id: 5, deadline: '2026-09-07', application_details: { company: 'Google', role: 'SWE' } },
    { id: 6, deadline: '2026-09-08', final_decision_status: 'ACCEPTED' },
  ] as CommandOffer[];

  it('merges events and offer deadlines in date order', () => {
    expect(nextWeekFocus(events, offers, TODAY).map((item) => item.id)).toEqual([
      'offer-5',
      'event-1',
    ]);
  });

  it('drops a decided offer and anything past the horizon', () => {
    const ids = nextWeekFocus(events, offers, TODAY).map((item) => item.id);
    expect(ids).not.toContain('offer-6');
    expect(ids).not.toContain('event-2');
  });
});

describe('weekWindow', () => {
  it('runs Monday to Sunday', () => {
    expect(weekWindow('2026-10-14')).toEqual({ start: '2026-10-12', end: '2026-10-18' });
    expect(weekWindow('2026-10-12')).toEqual({ start: '2026-10-12', end: '2026-10-18' });
    expect(weekWindow('2026-10-18')).toEqual({ start: '2026-10-12', end: '2026-10-18' });
  });

  it('does not throw on a broken date', () => {
    expect(weekWindow('nope')).toEqual({ start: 'nope', end: 'nope' });
  });
});

describe('weekHeadline', () => {
  const rate = { answered: 0, sent: 0, rate: 0 };

  it('reads as a sentence, not a stat dump', () => {
    expect(weekHeadline({ applied: 3, moved: 1, rate, followUps: 2 })).toBe(
      'You sent 3 applications, 1 moved forward, 2 are worth chasing.'
    );
  });

  it('uses the singular where it should', () => {
    expect(weekHeadline({ applied: 1, moved: 0, rate, followUps: 1 })).toBe(
      'You sent 1 application, 1 is worth chasing.'
    );
  });

  it('says something useful when the week is empty', () => {
    expect(weekHeadline({ applied: 0, moved: 0, rate, followUps: 0 })).toContain('Nothing logged');
    expect(
      weekHeadline({
        applied: 0,
        moved: 0,
        rate: { answered: 1, sent: 4, rate: 0.25 },
        followUps: 0,
      })
    ).toContain('quiet week');
  });
});

// The heading prints Monday to Sunday; a rolling seven days disagreed with it six days out of seven.
describe('the counted week is the week that is displayed', () => {
  // 2026-07-01 is a Wednesday, so the displayed window is Mon 29 Jun to Sun 5 Jul.
  const WEDNESDAY = '2026-07-01';

  const applied = (date_applied: string, id: number) =>
    ({ id, status: 'APPLIED', date_applied, updated_at: date_applied }) as CommandApplication;

  it('counts from the Monday, not from seven days ago', () => {
    const window = weekWindow(WEDNESDAY);
    expect([window.start, window.end]).toEqual(['2026-06-29', '2026-07-05']);
    const lastThursday = applied('2026-06-25', 1);
    const thisMonday = applied('2026-06-29', 2);
    const ids = appliedThisWeek([lastThursday, thisMonday], WEDNESDAY).map((row) => row.id);
    expect(ids).toEqual([2]);
  });

  it('takes in the whole displayed week, including days still ahead', () => {
    const friday = applied('2026-07-03', 1);
    expect(appliedThisWeek([friday], WEDNESDAY).map((row) => row.id)).toEqual([1]);
  });

  it('excludes the Sunday before and the Monday after', () => {
    const before = applied('2026-06-28', 1);
    const after = applied('2026-07-06', 2);
    expect(appliedThisWeek([before, after], WEDNESDAY)).toEqual([]);
  });

  it('applies the same window to what moved', () => {
    const moved = {
      id: 1,
      status: 'ONSITE',
      date_applied: '2026-05-01',
      updated_at: '2026-06-30',
    } as CommandApplication;
    const older = { ...moved, id: 2, updated_at: '2026-06-25' };
    expect(movedThisWeek([moved, older], WEDNESDAY).map((row) => row.id)).toEqual([1]);
  });

  it('reads a timestamp, not just a plain date', () => {
    const withTime = {
      id: 1,
      status: 'ONSITE',
      updated_at: '2026-06-30T14:32:00Z',
    } as CommandApplication;
    expect(movedThisWeek([withTime], WEDNESDAY).map((row) => row.id)).toEqual([1]);
  });
});

describe('next week focus links to the record, not its list', () => {
  it('names the event and the offer in the destination', () => {
    const event = { id: 7, name: 'Onsite', date: '2026-07-03' } as CommandEvent;
    const offer = { id: 9, deadline: '2026-07-04' } as CommandOffer;
    const items = nextWeekFocus([event], [offer], '2026-07-01');
    expect(items.map((item) => item.to)).toEqual(['/events?event=7', '/offers?offer=9']);
  });
});
