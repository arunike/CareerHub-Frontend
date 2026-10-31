import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { roleDateLabel, timelineMarkFor } from './roleTimeline';

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

describe('timelineMarkFor', () => {
  const NOW = dayjs('2026-10-01');
  const span = (startIso: string | null, endIso: string | null = null, isCurrent = false) =>
    timelineMarkFor(
      { start: startIso ? dayjs(startIso) : null, end: endIso ? dayjs(endIso) : null, isCurrent },
      NOW
    );

  it('names the month the role started, not just its year', () => {
    expect(span('2025-07-01', null, true)?.label).toBe('Jul 2025');
    expect(span('2026-01-02', null, true)?.label).toBe('Jan 2026');
  });

  it('counts a ring for every year served and an arc for the part year after them', () => {
    const current = span('2025-07-01', null, true);
    expect(current?.years).toBe(1);
    // Jul 1 to Oct 1 is 92 days of a 365-day year.
    expect(current?.fraction).toBeCloseTo(92 / 365, 4);
    expect(current?.tenure).toBe('1 yr 3 mos');
  });

  it('measures a finished role to its leaving date, not to today', () => {
    const past = span('2025-07-01', '2026-07-01');
    expect(past?.years).toBe(1);
    expect(past?.fraction).toBe(0);
    expect(past?.title).toContain('from July 1, 2025');
  });

  it('draws no ring for a role that has not started', () => {
    const future = span('2026-12-20', null, true);
    expect(future?.years).toBe(0);
    expect(future?.fraction).toBe(0);
    expect(future?.tenure).toBe('starts later');
  });

  it('has no mark to draw without a start date', () => {
    expect(span(null)).toBeNull();
  });
});
