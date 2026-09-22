import { describe, expect, it } from 'vitest';
import { prepFromDebriefs } from './interviewPrep';

const debrief = (over: Partial<Parameters<typeof prepFromDebriefs>[0][number]> = {}) => ({
  id: 1,
  stage: '1st Round',
  interview_date: '2026-07-01',
  weak_areas: 'System design depth',
  next_steps: 'Revise sharding',
  ...over,
});

describe('prepFromDebriefs', () => {
  it('says nothing when no round has been recorded', () => {
    expect(prepFromDebriefs([], '2026-10-01')).toBeNull();
  });

  it('carries the notes from the round already sat', () => {
    expect(prepFromDebriefs([debrief()], '2026-10-01')).toEqual({
      stage: '1st Round',
      interviewDate: '2026-07-01',
      nextSteps: 'Revise sharding',
      weakAreas: 'System design depth',
    });
  });

  it('prefers the most recent round when several were recorded', () => {
    const older = debrief({ id: 1, interview_date: '2026-07-01', next_steps: 'Older' });
    const newer = debrief({ id: 2, interview_date: '2026-10-01', next_steps: 'Newer' });
    expect(prepFromDebriefs([newer, older], '2026-11-01')?.nextSteps).toBe('Newer');
  });

  it('ignores a debrief dated after today, which is a round not yet sat', () => {
    expect(prepFromDebriefs([debrief({ interview_date: '2026-11-01' })], '2026-10-01')).toBeNull();
  });

  it('keeps an undated debrief, since the date is optional on the form', () => {
    expect(prepFromDebriefs([debrief({ interview_date: null })], '2026-10-01')?.nextSteps).toBe(
      'Revise sharding'
    );
  });

  it('says nothing when the recorded round left neither a weakness nor a next step', () => {
    expect(
      prepFromDebriefs([debrief({ weak_areas: '  ', next_steps: '' })], '2026-10-01')
    ).toBeNull();
  });
});
