import { describe, expect, it } from 'vitest';

import { bucketApplications, inBucket, STALE_AFTER_DAYS } from './todayBuckets';
import type { CommandApplication } from './overview';

const TODAY = '2026-09-27';

const application = (
  id: number,
  status: string,
  quietSince: string,
  extra: Partial<CommandApplication> = {}
): CommandApplication => ({
  id,
  role_title: 'Software Engineer III',
  status,
  updated_at: `${TODAY}T00:00:00Z`,
  current_stage_on: quietSince,
  company_details: { name: 'Google' },
  ...extra,
});

describe('bucketApplications', () => {
  it('reads three weeks of silence as stale, not as something to chase', () => {
    const rows = bucketApplications([application(1, 'ROUND_1', '2026-09-01')], TODAY);
    expect(rows[0].daysQuiet).toBe(26);
    expect(rows[0].bucket).toBe('stale');
  });

  it('keeps a reply that has only just gone quiet in the nudge list', () => {
    const rows = bucketApplications([application(1, 'ROUND_2', '2026-09-15')], TODAY);
    expect(rows[0].daysQuiet).toBe(12);
    expect(rows[0].bucket).toBe('nudge');
  });

  it('treats a round that moved this week as in play', () => {
    const rows = bucketApplications([application(1, 'ROUND_1', '2026-09-24')], TODAY);
    expect(rows[0].bucket).toBe('moving');
  });

  it('separates never answered from worth chasing', () => {
    const rows = bucketApplications([application(1, 'APPLIED', '2026-08-01')], TODAY);
    expect(rows[0].bucket).toBe('cold');
  });

  it('counts an applied role that reached an interview as answered', () => {
    const rows = bucketApplications(
      [application(1, 'APPLIED', '2026-08-01', { has_reached_interview: true })],
      TODAY
    );
    expect(rows[0].bucket).toBe('stale');
  });

  it('puts the boundary day itself in stale', () => {
    const on = `2026-09-${String(27 - STALE_AFTER_DAYS).padStart(2, '0')}`;
    expect(bucketApplications([application(1, 'ROUND_1', on)], TODAY)[0].bucket).toBe('stale');
  });

  it('drops closed applications and rows with no usable date', () => {
    const rows = bucketApplications(
      [
        application(1, 'REJECTED', '2026-01-01'),
        application(2, 'ROUND_1', '', { updated_at: 'not-a-date' }),
      ],
      TODAY
    );
    expect(rows).toEqual([]);
  });

  it('places every open application in exactly one bucket', () => {
    const open = [
      application(1, 'ROUND_1', '2026-09-26'),
      application(2, 'ROUND_2', '2026-09-14'),
      application(3, 'FINAL_ROUND', '2026-05-08'),
      application(4, 'APPLIED', '2026-06-01'),
    ];
    const rows = bucketApplications(open, TODAY);
    const buckets = (['moving', 'nudge', 'stale', 'cold'] as const).flatMap((bucket) =>
      inBucket(rows, bucket).map((row) => row.application.id)
    );
    expect(buckets.slice().sort()).toEqual([1, 2, 3, 4]);
    expect(new Set(buckets).size).toBe(buckets.length);
  });

  it('orders the longest silence first', () => {
    const rows = bucketApplications(
      [application(1, 'ROUND_1', '2026-09-20'), application(2, 'ROUND_1', '2026-06-01')],
      TODAY
    );
    expect(rows.map((row) => row.application.id)).toEqual([2, 1]);
  });
});
