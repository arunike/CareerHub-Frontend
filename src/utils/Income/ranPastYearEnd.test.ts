import { describe, expect, it } from 'vitest';
import { defaultSourceKey, ranPastYearEnd } from './incomeSources';
import type { IncomeSource } from './incomeSources';

const role = (endDate: string | null, isCurrent = false): IncomeSource =>
  ({ key: 'experience-1', endDate, isCurrent }) as IncomeSource;

describe('ranPastYearEnd', () => {
  it('counts a role with no end date as still running', () => {
    expect(ranPastYearEnd(role(null), 2025)).toBe(true);
  });

  it('counts a role you left the following year as running through the year viewed', () => {
    // The case the isCurrent flag got wrong: still there in 2025, gone in 2026.
    expect(ranPastYearEnd(role('2026-04-30'), 2025)).toBe(true);
  });

  it('counts a role that ended inside the year as ended', () => {
    expect(ranPastYearEnd(role('2025-06-30'), 2025)).toBe(false);
  });

  it('counts a role that ended before the year as ended', () => {
    expect(ranPastYearEnd(role('2024-12-31'), 2025)).toBe(false);
  });

  it('reads the same for the current year, where it means still held', () => {
    expect(ranPastYearEnd(role(null, true), 2026)).toBe(true);
    expect(ranPastYearEnd(role('2026-03-01'), 2026)).toBe(false);
  });
});

describe('defaultSourceKey with a year', () => {
  const held = {
    key: 'experience-1',
    endDate: '2026-04-30',
    startDate: '2024-01-01',
    isCurrent: false,
  } as IncomeSource;
  const ended = {
    key: 'experience-2',
    endDate: '2025-06-30',
    startDate: '2025-01-01',
    isCurrent: false,
  } as IncomeSource;
  const currentToday = {
    key: 'experience-3',
    endDate: null,
    startDate: '2026-02-01',
    isCurrent: true,
  } as IncomeSource;

  it('opens a past year on the role held at its close, not the one held today', () => {
    expect(defaultSourceKey([ended, held], 2025)).toBe('experience-1');
  });

  it('does not let a role that started after the year win it', () => {
    // currentToday began in 2026, so it cannot be the answer for 2025.
    expect(defaultSourceKey([ended, held], 2025)).not.toBe('experience-3');
  });

  it('falls back to the current-today ranking when no year is given', () => {
    expect(defaultSourceKey([ended, currentToday])).toBe('experience-3');
  });

  it('does not change with input order', () => {
    expect(defaultSourceKey([held, ended], 2025)).toBe(defaultSourceKey([ended, held], 2025));
  });
});
