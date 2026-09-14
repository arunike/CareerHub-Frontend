import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { roleDateLabel } from './roleTimeline';

const at = (start: string | null, isCurrent = false) =>
  roleDateLabel({
    startDate: start ? dayjs(start) : null,
    endDate: null,
    isCurrent,
    now: dayjs('2026-09-04'),
  });

describe('roleDateLabel notStarted', () => {
  it('flags a role dated in the future, which has earned nothing yet', () => {
    const label = at('2026-11-01');
    expect(label.notStarted).toBe(true);
    expect(label.detail).toContain('starts in');
  });

  it('does not flag a role already under way', () => {
    expect(at('2025-07-01', true).notStarted).toBe(false);
  });

  it('does not flag a role with no start date, which has no period to total at all', () => {
    expect(at(null).notStarted).toBe(false);
  });

  it('does not flag a role starting today', () => {
    expect(at('2026-09-04', true).notStarted).toBe(false);
  });
});
