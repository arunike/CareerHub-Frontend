import { describe, expect, it } from 'vitest';
import { stageDurations, stalledRounds } from './stageVelocity';
import type { CommandApplication } from './overview';

const TODAY = '2026-09-21';

// Three applications that each moved 1st Round -> 2nd Round, taking 4, 6 and 8 days.
const history = [1, 2, 3].flatMap((application, index) => [
  { application, stage: 'ROUND_1', stage_order: 1, event_date: '2026-07-01' },
  {
    application,
    stage: 'ROUND_2',
    stage_order: 2,
    event_date: ['2026-07-05', '2026-07-07', '2026-07-09'][index],
  },
]);

const application = (over: Partial<CommandApplication> = {}): CommandApplication =>
  ({
    id: 9,
    role_title: 'Software Engineer',
    status: 'ROUND_1',
    updated_at: TODAY,
    current_stage_on: '2026-09-01',
    ...over,
  }) as CommandApplication;

describe('stageDurations', () => {
  it('takes the median of what a stage has cost before', () => {
    expect(stageDurations(history).get('ROUND_1')).toBe(6);
  });

  it('refuses a verdict from too few rounds, which would be an anecdote', () => {
    expect(stageDurations(history.slice(0, 4)).get('ROUND_1')).toBeUndefined();
  });

  it('ignores an entry with no date, since it cannot bound anything', () => {
    const undated = history.map((entry) => ({ ...entry, event_date: null }));
    expect(stageDurations(undated).size).toBe(0);
  });

  it('never measures the stage a row is still sitting in', () => {
    expect(stageDurations(history).get('ROUND_2')).toBeUndefined();
  });
});

describe('stalledRounds', () => {
  it('flags a live round that has outlasted its own median', () => {
    const rows = stalledRounds([application({ current_stage_on: '2026-09-01' })], history, TODAY);
    expect(rows).toEqual([
      { application: rows[0].application, stage: 'ROUND_1', days: 20, typical: 6 },
    ]);
  });

  it('stays quiet while a round is still inside its usual span', () => {
    expect(
      stalledRounds([application({ current_stage_on: '2026-09-18' })], history, TODAY)
    ).toEqual([]);
  });

  it('says nothing about a stage it has no history for', () => {
    expect(stalledRounds([application({ status: 'FINAL_ROUND' })], history, TODAY)).toEqual([]);
  });

  it('leaves closed applications alone', () => {
    expect(stalledRounds([application({ status: 'REJECTED' })], history, TODAY)).toEqual([]);
  });

  it('puts the furthest overdue first', () => {
    const rows = stalledRounds(
      [
        application({ id: 1, current_stage_on: '2026-09-10' }),
        application({ id: 2, current_stage_on: '2026-08-01' }),
      ],
      history,
      TODAY
    );
    expect(rows.map((row) => row.application.id)).toEqual([2, 1]);
  });
});
