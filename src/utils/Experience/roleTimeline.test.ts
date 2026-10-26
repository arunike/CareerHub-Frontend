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
  const mark = (iso: string) => timelineMarkFor(dayjs(iso));

  it('names the month the role started, not just its year', () => {
    expect(mark('2025-07-01')?.label).toBe('Jul 2025');
    expect(mark('2026-01-02')?.label).toBe('Jan 2026');
  });

  it('places the start in its own year, so the ring reads as a date', () => {
    expect(mark('2026-01-01')?.yearFraction).toBe(0);
    expect(mark('2026-07-01')?.yearFraction).toBeCloseTo(0.5, 6);
    // 19 days into a 31-day December, so the ring is all but shut.
    expect(mark('2026-12-20')?.yearFraction).toBeCloseTo((11 + 19 / 31) / 12, 6);
  });

  it('has no mark to draw without a start date', () => {
    expect(timelineMarkFor(null)).toBeNull();
  });
});
