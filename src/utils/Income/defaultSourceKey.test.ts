import { describe, expect, it } from 'vitest';
import { defaultSourceKey, type IncomeSource } from './incomeSources';

const role = (key: string, over: Partial<IncomeSource> = {}): IncomeSource =>
  ({
    key,
    kind: 'experience',
    isCurrent: false,
    company: 'Google',
    roleTitle: 'Software Engineer',
    location: 'Mountain View, CA, United States',
    startDate: '2026-07-01',
    endDate: null,
    annualSalary: 165000,
    bonus: 24750,
    totalGrant: 200000,
    paychecksPerYear: 26,
    premiumsPerPeriod: 0,
    medicalPerPeriod: 0,
    ...over,
  }) as IncomeSource;

describe('defaultSourceKey', () => {
  it('opens on the role you still hold, not on whatever is first in the list', () => {
    const sources = [
      role('past', { endDate: '2026-10-01' }),
      role('current', { isCurrent: true, startDate: '2025-07-01' }),
    ];
    expect(defaultSourceKey(sources)).toBe('current');
  });

  it('prefers the role you still hold even when a past one started later', () => {
    const sources = [
      role('contract', { startDate: '2026-10-01', endDate: '2026-11-01' }),
      role('job', { isCurrent: true, startDate: '2025-07-01' }),
    ];
    expect(defaultSourceKey(sources)).toBe('job');
  });

  it('takes the latest start when several are current', () => {
    const sources = [
      role('older', { isCurrent: true, startDate: '2025-07-01' }),
      role('newer', { isCurrent: true, startDate: '2026-07-01' }),
    ];
    expect(defaultSourceKey(sources)).toBe('newer');
  });

  it('takes the latest start among past roles when none is current', () => {
    const sources = [
      role('first', { startDate: '2025-07-01', endDate: '2026-07-01' }),
      role('second', { startDate: '2026-07-01', endDate: '2026-10-01' }),
    ];
    expect(defaultSourceKey(sources)).toBe('second');
  });

  it('breaks a tie on start date with the one that ended later', () => {
    const sources = [
      role('ended-first', { startDate: '2026-07-01', endDate: '2026-10-01' }),
      role('ended-later', { startDate: '2026-07-01', endDate: '2026-11-01' }),
    ];
    expect(defaultSourceKey(sources)).toBe('ended-later');
  });

  it('sorts a role with no start date last rather than first', () => {
    const sources = [
      role('undated', { startDate: null }),
      role('dated', { startDate: '2025-07-01' }),
    ];
    expect(defaultSourceKey(sources)).toBe('dated');
  });

  it('does not depend on the order it was handed', () => {
    const a = role('past', { endDate: '2026-10-01' });
    const b = role('current', { isCurrent: true, startDate: '2025-07-01' });
    expect(defaultSourceKey([a, b])).toBe(defaultSourceKey([b, a]));
  });

  it('has nothing to open on for an empty year', () => {
    expect(defaultSourceKey([])).toBe('');
  });

  it('leaves the list it was given alone', () => {
    const sources = [role('past'), role('current', { isCurrent: true })];
    defaultSourceKey(sources);
    expect(sources.map((source) => source.key)).toEqual(['past', 'current']);
  });
});
