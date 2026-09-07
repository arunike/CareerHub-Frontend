import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  expiringOffers,
  latestPayChange,
  nextEvent,
  openOffers,
  pipeline,
  raisesFrom,
  upcomingEvents,
  isClosed,
  isInterviewing,
  openTasks,
  tasksDue,
} from './commandCenter';
import type { CommandApplication, CommandEvent, CommandTask } from './commandCenter';

const TODAY = '2026-07-01';

const event = (over: Partial<CommandEvent> = {}): CommandEvent => ({
  id: 1,
  name: 'Sync',
  date: '2026-07-05',
  start_time: '10:00',
  ...over,
});

const task = (over: Partial<CommandTask> = {}): CommandTask => ({
  id: 1,
  title: 'Send thank-you note',
  status: 'TODO',
  priority: 'MEDIUM',
  due_date: TODAY,
  ...over,
});

const application = (over: Partial<CommandApplication> = {}): CommandApplication => ({
  id: 1,
  role_title: 'Software Engineer',
  status: 'APPLIED',
  updated_at: '2026-06-01',
  company_details: { name: 'Google' },
  ...over,
});

describe('daysBetween', () => {
  it('counts whole days forward and backward', () => {
    expect(daysBetween('2026-07-01', '2026-07-08')).toBe(7);
    expect(daysBetween('2026-07-08', '2026-07-01')).toBe(-7);
    expect(daysBetween('2026-07-01', '2026-07-01')).toBe(0);
  });

  it('ignores the time part, so an evening event is still today', () => {
    expect(daysBetween('2026-07-01T23:30:00Z', '2026-07-01T00:10:00Z')).toBe(0);
  });
});

describe('nextEvent', () => {
  it('picks the soonest one still ahead', () => {
    const found = nextEvent(
      [
        event({ id: 1, date: '2026-07-20', application: 5 }),
        event({ id: 2, date: '2026-07-03', application: 6 }),
      ],
      TODAY
    );
    expect(found?.event.id).toBe(2);
    expect(found?.daysAway).toBe(2);
    expect(found?.applicationId).toBe(6);
  });

  it('counts one happening today, which is the one that matters most', () => {
    expect(nextEvent([event({ date: TODAY, application: 3 })], TODAY)?.daysAway).toBe(0);
  });

  it('ignores interviews that have passed', () => {
    expect(nextEvent([event({ date: '2026-06-30', application: 3 })], TODAY)).toBeNull();
  });

  it('counts any upcoming event, not only interviews', () => {
    expect(nextEvent([event({ name: 'Offer decision due' })], TODAY)?.event.name).toBe(
      'Offer decision due'
    );
    expect(nextEvent([event({ name: 'Dentist' })], TODAY)).not.toBeNull();
  });

  it('lists the whole run ahead, soonest first', () => {
    const all = upcomingEvents(
      [event({ id: 1, date: '2026-07-20' }), event({ id: 2, date: '2026-07-03' })],
      TODAY
    );
    expect(all.map((entry) => entry.event.id)).toEqual([2, 1]);
  });

  it('breaks a same-day tie on start time', () => {
    const found = nextEvent(
      [
        event({ id: 1, date: TODAY, start_time: '16:00', application: 1 }),
        event({ id: 2, date: TODAY, start_time: '09:00', application: 2 }),
      ],
      TODAY
    );
    expect(found?.event.id).toBe(2);
  });
});

describe('openTasks', () => {
  it('lists what is still ahead, soonest first', () => {
    const next = openTasks([
      task({ id: 1, due_date: '2026-07-20' }),
      task({ id: 2, due_date: '2026-07-04' }),
    ]);
    expect(next.map((t) => t.id)).toEqual([2, 1]);
  });

  it('puts undated work last, ordered by priority', () => {
    const next = openTasks([
      task({ id: 1, due_date: null, priority: 'LOW' }),
      task({ id: 2, due_date: null, priority: 'HIGH' }),
      task({ id: 3, due_date: '2026-07-04' }),
    ]);
    expect(next.map((t) => t.id)).toEqual([3, 2, 1]);
  });

  it('keeps an overdue task at the front rather than dropping it', () => {
    const next = openTasks([
      task({ id: 1, due_date: '2026-07-20' }),
      task({ id: 2, due_date: '2026-06-01' }),
    ]);
    expect(next.map((t) => t.id)).toEqual([2, 1]);
  });

  it('leaves finished work out', () => {
    expect(openTasks([task({ status: 'DONE' })])).toEqual([]);
  });
});

describe('status classification', () => {
  it('treats the round-numbered stages as interviewing, not just the word INTERVIEW', () => {
    for (const stage of ['ROUND_1', 'ROUND_2', 'ROUND_3', 'ROUND_4', 'FINAL_ROUND', 'ONSITE']) {
      expect(isInterviewing(stage)).toBe(true);
    }
    expect(isInterviewing('APPLIED')).toBe(false);
    expect(isInterviewing('OFFER')).toBe(false);
  });

  it('counts a removed or ghosted row as closed, so it leaves the live pipeline', () => {
    expect(isClosed('REMOVED_FROM_SHEET')).toBe(true);
    expect(isClosed('GHOSTED')).toBe(true);
    expect(isClosed('OFFER_REJECTED')).toBe(true);
    expect(isClosed('ROUND_1')).toBe(false);
  });
});

describe('tasksDue', () => {
  it('counts today and anything already past it, not future work', () => {
    const due = tasksDue(
      [
        task({ id: 1, due_date: TODAY }),
        task({ id: 2, due_date: '2026-06-01' }),
        task({ id: 3, due_date: '2026-07-20' }),
        task({ id: 4, due_date: null }),
      ],
      TODAY
    );
    expect(due.map((t) => t.id)).toEqual([2, 1]);
  });
});

describe('expiringOffers', () => {
  it('surfaces only live deadlines inside the horizon, closest first', () => {
    const found = expiringOffers(
      [
        { id: 1, deadline: '2026-07-04' },
        { id: 2, deadline: '2026-07-02' },
        { id: 3, deadline: '2026-08-30' },
      ],
      TODAY
    );
    expect(found.map((f) => f.offer.id)).toEqual([2, 1]);
    expect(found[0].daysLeft).toBe(1);
  });

  it('drops a decision already made and a deadline already gone', () => {
    expect(
      expiringOffers(
        [
          { id: 1, deadline: '2026-07-02', final_decision_status: 'ACCEPTED' },
          { id: 2, deadline: '2026-06-30' },
          { id: 3, deadline: null },
        ],
        TODAY
      )
    ).toEqual([]);
  });
});

describe('latestPayChange', () => {
  const raise = (date: string, before: number, after: number) => ({
    date,
    type: 'merit',
    base_before: before,
    base_after: after,
    company: 'Google',
    roleTitle: 'Software Engineer',
  });

  it('reports the most recent rise', () => {
    expect(
      latestPayChange(
        [raise('2025-07-01', 150000, 165000), raise('2026-01-01', 165000, 181500)],
        TODAY
      )?.date
    ).toBe('2026-01-01');
  });

  it('ignores a rise that has not taken effect yet', () => {
    expect(latestPayChange([raise('2026-10-01', 165000, 181500)], TODAY)).toBeNull();
  });

  it('ignores a cut, which is not the story this card tells', () => {
    expect(latestPayChange([raise('2026-01-01', 181500, 165000)], TODAY)).toBeNull();
  });
});

// The API returns nulls, and a failed call can hand back an object where a list was expected.
describe('rows the API can actually return', () => {
  it('treats a missing or unparseable date as no date', () => {
    expect(daysBetween(null, TODAY)).toBeNull();
    expect(daysBetween(TODAY, undefined)).toBeNull();
    expect(daysBetween(TODAY, 'not-a-date')).toBeNull();
    expect(daysBetween(TODAY, 42)).toBeNull();
  });

  it('skips an interview with no date rather than crashing', () => {
    expect(
      nextEvent([event({ date: null as unknown as string, application: 1 })], TODAY)
    ).toBeNull();
  });

  it('survives an event with no name', () => {
    expect(nextEvent([event({ name: null as unknown as string })], TODAY)).not.toBeNull();
  });

  it('treats a dateless task as upcoming', () => {
    expect(openTasks([task({ due_date: null })])).toHaveLength(1);
  });

  it('ignores an unknown priority instead of sorting by undefined', () => {
    const sorted = openTasks([
      task({ id: 1, due_date: null, priority: 'URGENT' as never }),
      task({ id: 2, due_date: null, priority: 'HIGH' }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual([2, 1]);
  });

  it('skips an offer with no deadline in the closing list', () => {
    expect(expiringOffers([{ id: 1, deadline: null }], TODAY)).toEqual([]);
  });

  it('skips a raise with no date', () => {
    expect(
      latestPayChange(
        [
          {
            date: null as unknown as string,
            type: 'merit',
            base_before: 100,
            base_after: 200,
            company: 'Google',
            roleTitle: 'Software Engineer',
          },
        ],
        TODAY
      )
    ).toBeNull();
  });
});

describe('raisesFrom', () => {
  it('reads the history off the offer, which is where it is stored', () => {
    const raises = raisesFrom([
      {
        raise_history: [
          { date: '2026-01-01', type: 'merit', base_before: 165000, base_after: 181500 },
        ],
        application_details: { company: 'Google', role_title: 'Software Engineer' },
      },
    ]);
    expect(raises).toEqual([
      {
        date: '2026-01-01',
        type: 'merit',
        base_before: 165000,
        base_after: 181500,
        company: 'Google',
        roleTitle: 'Software Engineer',
      },
    ]);
  });

  it('ignores an offer with no history, or a history that is not a list', () => {
    expect(raisesFrom([{}, { raise_history: null }, { raise_history: 'nope' }])).toEqual([]);
  });

  it('drops an entry with no date instead of inventing one', () => {
    expect(raisesFrom([{ raise_history: [{ base_after: 10 }] }])).toEqual([]);
  });

  it('falls back to a readable name when the offer has no application', () => {
    const [raise] = raisesFrom([
      { raise_history: [{ date: '2026-01-01', base_before: 1, base_after: 2 }] },
    ]);
    expect(raise.company).toBe('Your role');
  });
});

describe('pipeline', () => {
  it('counts only what is still open, biggest stage first', () => {
    const stages = pipeline([
      application({ id: 1, status: 'APPLIED' }),
      application({ id: 2, status: 'APPLIED' }),
      application({ id: 3, status: 'INTERVIEW' }),
      application({ id: 4, status: 'REJECTED' }),
    ]);
    expect(stages).toEqual([
      { status: 'APPLIED', count: 2 },
      { status: 'INTERVIEW', count: 1 },
    ]);
  });

  it('buckets a missing status rather than dropping the row', () => {
    expect(pipeline([application({ status: null as unknown as string })])).toEqual([
      { status: 'UNKNOWN', count: 1 },
    ]);
  });
});

describe('openOffers', () => {
  it('includes an offer with no deadline, after the dated ones', () => {
    const open = openOffers(
      [
        { id: 1, deadline: null },
        { id: 2, deadline: '2026-07-10' },
      ],
      TODAY
    );
    expect(open.map((entry) => entry.offer.id)).toEqual([2, 1]);
    expect(open[1].daysLeft).toBeNull();
  });

  it('leaves out settled and expired offers', () => {
    expect(
      openOffers(
        [
          { id: 1, deadline: '2026-07-10', final_decision_status: 'ACCEPTED' },
          { id: 2, deadline: '2026-06-01' },
        ],
        TODAY
      )
    ).toEqual([]);
  });
});
