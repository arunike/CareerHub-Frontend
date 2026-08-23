import { describe, expect, it } from 'vitest';
import type { Experience } from '../../types';
import {
  companiesByEmploymentType,
  companyCount,
  durationByEmploymentType,
  fmtDays,
  mergedDays,
  skillFrequency,
  topSkillsByFrequency,
  totalCareerDuration,
} from './experienceSummaries';

const role = (over: Partial<Experience>): Experience =>
  ({
    id: 1,
    company: 'Google',
    title: 'Software Engineer',
    employment_type: 'full_time',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    is_current: false,
    skills: [],
    ...over,
  }) as Experience;

describe('mergedDays', () => {
  it('counts overlapping spans once', () => {
    const day = 86400000;
    // Jan 1–10 and Jan 5–15 is 15 days of career, not 20.
    expect(
      mergedDays([
        [0, 10 * day],
        [5 * day, 15 * day],
      ]) / day
    ).toBe(15);
  });

  it('keeps disjoint spans separate', () => {
    const day = 86400000;
    expect(
      mergedDays([
        [0, 5 * day],
        [10 * day, 12 * day],
      ]) / day
    ).toBe(7);
  });

  it('is zero for no spans', () => {
    expect(mergedDays([])).toBe(0);
  });
});

describe('totalCareerDuration', () => {
  it('reports nothing for an empty history', () => {
    expect(totalCareerDuration([])).toBe('0 yrs');
  });

  it('does not double-count two roles held at once', () => {
    const overlapping = [
      role({ id: 1, start_date: '2024-01-01', end_date: '2024-06-30' }),
      role({ id: 2, company: 'Adobe', start_date: '2024-03-01', end_date: '2024-09-30' }),
    ];
    // Jan–Sep is 9 months, not the 13 the two roles add up to.
    expect(totalCareerDuration(overlapping)).toBe(fmtDays(273, true));
  });
});

describe('companyCount', () => {
  it('counts a company once across several roles', () => {
    expect(companyCount([role({ id: 1 }), role({ id: 2, title: 'Senior' })])).toBe(1);
  });
});

describe('durationByEmploymentType', () => {
  it('keys days by type and ignores undated roles', () => {
    const result = durationByEmploymentType([
      role({ id: 1, start_date: '2024-01-01', end_date: '2024-01-11' }),
      role({
        id: 2,
        employment_type: 'internship',
        start_date: '2023-06-01',
        end_date: '2023-06-11',
      }),
      role({ id: 3, start_date: null as unknown as string, end_date: null }),
    ]);
    expect(result).toEqual({ full_time: 10, internship: 10 });
  });
});

describe('companiesByEmploymentType', () => {
  it('files a company under its most recent role type', () => {
    const result = companiesByEmploymentType([
      role({ id: 1, employment_type: 'internship', start_date: '2022-06-01' }),
      role({ id: 2, employment_type: 'full_time', start_date: '2024-01-01' }),
    ]);
    expect(result).toEqual({ full_time: 1 });
  });
});

describe('skill frequency', () => {
  it('counts and ranks skills, longest list first', () => {
    const counts = skillFrequency([
      role({ id: 1, skills: ['Go', 'React'] }),
      role({ id: 2, skills: ['Go'] }),
    ]);
    expect(counts).toEqual({ Go: 2, React: 1 });
    expect(topSkillsByFrequency(counts)).toEqual(['Go', 'React']);
    expect(topSkillsByFrequency(counts, 1)).toEqual(['Go']);
  });
});
