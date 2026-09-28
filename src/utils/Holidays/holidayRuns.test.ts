import { describe, expect, it } from 'vitest';
import { holidayRuns } from './holidayRuns';

const day = (date: string, group_id: string | null = 'trip', id = 1) => ({ id, date, group_id });

describe('holidayRuns', () => {
  it('buckets a trip into one run, in date order', () => {
    const runs = holidayRuns([day('2026-07-03'), day('2026-07-01'), day('2026-07-02')]);
    expect(runs).toHaveLength(1);
    expect(runs[0].members.map((m) => m.date)).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
  });

  it('counts a shared date once, since one day away from work is one day', () => {
    const runs = holidayRuns([day('2026-07-01', 'trip', 1), day('2026-07-01', 'trip', 2)]);
    expect(runs[0].members).toHaveLength(1);
  });

  it('keeps a gap together unless asked to split', () => {
    const runs = holidayRuns([day('2026-07-01'), day('2026-07-06')]);
    expect(runs).toHaveLength(1);
  });

  it('cuts a run where the dates skip, which is a day taken out of the middle', () => {
    const runs = holidayRuns([day('2026-07-01'), day('2026-07-02'), day('2026-07-06')], {
      splitOnGap: true,
    });
    expect(runs.map((run) => run.members.map((m) => m.date))).toEqual([
      ['2026-07-01', '2026-07-02'],
      ['2026-07-06'],
    ]);
  });

  it('gives an ungrouped row its own run, keyed on its id', () => {
    const runs = holidayRuns([day('2026-07-01', null, 9)]);
    expect(runs).toEqual([{ groupId: 'single-9', members: [day('2026-07-01', null, 9)] }]);
  });

  it('drops a row with neither a group nor an id, which nothing can key on', () => {
    expect(holidayRuns([{ date: '2026-07-01' }])).toEqual([]);
  });
});

describe('a run across a daylight-saving change', () => {
  it('stays one run, though that day is 25 hours long', () => {
    // 1 Nov 2026 is the US fall-back, so an exact 86400000ms test splits the trip in two.
    const runs = holidayRuns([day('2026-10-31'), day('2026-11-01'), day('2026-11-02')], {
      splitOnGap: true,
    });
    expect(runs).toHaveLength(1);
    expect(runs[0].members).toHaveLength(3);
  });

  it('stays one run across the spring-forward, a 23 hour day', () => {
    const runs = holidayRuns([day('2026-03-07'), day('2026-03-08'), day('2026-03-09')], {
      splitOnGap: true,
    });
    expect(runs).toHaveLength(1);
  });
});
