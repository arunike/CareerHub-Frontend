import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_GHOSTING_THRESHOLD_DAYS, roundTiming } from './overview';
import type { CommandApplication, CommandEvent } from './overview';
import { roundTimingLabel } from './roundTimingLabel';

// The near dates step off TODAY, so the ghosting threshold is what decides each case.
const TODAY = '2026-10-01';
const HEARD = dayjs(TODAY).subtract(3, 'day').format('YYYY-MM-DD');
const BOOKED = dayjs(TODAY).add(4, 'day').format('YYYY-MM-DD');

const application = (over: Partial<CommandApplication> = {}): CommandApplication => ({
  id: 1,
  role_title: 'Software Engineer',
  status: 'ROUND_2',
  updated_at: `${HEARD}T00:00:00Z`,
  current_stage_on: HEARD,
  ...over,
});

const event = (date: string, applicationId: number | null = 1): CommandEvent => ({
  id: Number(date.replace(/-/g, '')),
  name: 'Interview',
  date,
  application: applicationId,
});

describe('roundTiming', () => {
  it('reports the next interview and when the round landed', () => {
    const timing = roundTiming({
      application: application(),
      events: [event(BOOKED)],
      todayIso: TODAY,
    });
    expect(timing).toEqual({ interviewOn: BOOKED, heardOn: HEARD, ghosted: false });
  });

  it('ignores an interview that has already happened', () => {
    const timing = roundTiming({
      application: application(),
      events: [event('2026-07-01')],
      todayIso: TODAY,
    });
    expect(timing.interviewOn).toBeNull();
  });

  it('takes the soonest of several upcoming interviews', () => {
    const timing = roundTiming({
      application: application(),
      events: [event('2026-11-01'), event(BOOKED)],
      todayIso: TODAY,
    });
    expect(timing.interviewOn).toBe(BOOKED);
  });

  it('ignores an event belonging to another application', () => {
    const timing = roundTiming({
      application: application(),
      events: [event(BOOKED, 2)],
      todayIso: TODAY,
    });
    expect(timing.interviewOn).toBeNull();
  });

  it('calls it ghosted once the thread has been quiet past the threshold', () => {
    const timing = roundTiming({
      application: application({ current_stage_on: '2026-07-01' }),
      events: [],
      todayIso: TODAY,
    });
    expect(timing.ghosted).toBe(true);
  });

  it('never calls it ghosted while an interview is still booked', () => {
    const timing = roundTiming({
      application: application({ current_stage_on: '2026-07-01' }),
      events: [event(BOOKED)],
      todayIso: TODAY,
    });
    expect(timing.ghosted).toBe(false);
  });

  it('honours a shorter threshold from the user settings', () => {
    const args = { application: application(), events: [], todayIso: TODAY };
    expect(roundTiming({ ...args, ghostAfterDays: 2 }).ghosted).toBe(true);
    expect(roundTiming({ ...args, ghostAfterDays: DEFAULT_GHOSTING_THRESHOLD_DAYS }).ghosted).toBe(
      false
    );
  });

  it('falls back to the last save when no stage date was recorded', () => {
    const timing = roundTiming({
      application: application({ current_stage_on: null, updated_at: '2026-07-01T00:00:00Z' }),
      events: [],
      todayIso: TODAY,
    });
    expect(timing.heardOn).toBeNull();
    expect(timing.ghosted).toBe(true);
  });
});

describe('roundTimingLabel', () => {
  it('names both dates when both are known', () => {
    expect(roundTimingLabel({ interviewOn: BOOKED, heardOn: HEARD, ghosted: false })).toBe(
      'Interview 5 Oct · Heard 28 Sep'
    );
  });

  it('names only what it has', () => {
    expect(roundTimingLabel({ interviewOn: null, heardOn: HEARD, ghosted: false })).toBe(
      'Heard 28 Sep'
    );
  });

  it('replaces the dates with ghosted rather than listing them alongside', () => {
    expect(roundTimingLabel({ interviewOn: null, heardOn: '2026-07-01', ghosted: true })).toBe(
      'Ghosted · no reply since 1 Jul'
    );
  });

  it('says so plainly when there is nothing to show', () => {
    expect(roundTimingLabel({ interviewOn: null, heardOn: null, ghosted: false })).toBe(
      'No date recorded'
    );
  });
});
