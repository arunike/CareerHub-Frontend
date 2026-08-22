import { describe, expect, it } from 'vitest';
import { activeInYear, buildIncomeSources, yearsForSource, yearsForSources } from './incomeSources';

const offer = (overrides: Record<string, any> = {}) => ({
  id: 1,
  is_current: true,
  base_salary: 160000,
  bonus: 24000,
  equity: 50000,
  equity_vesting_percent: 25,
  paychecks_per_year: 26,
  health_premium_paycheck: 120,
  dental_premium_paycheck: 20,
  vision_premium_paycheck: 6,
  forty_one_k_match_percent: 50,
  forty_one_k_max_match: 6,
  hsa_employer_contribution: 500,
  equity_cliff_months: 12,
  equity_vest_frequency: 'QUARTERLY',
  equity_vesting_years: 4,
  application_details: {
    company: 'Google',
    role_title: 'Software Engineer',
    location: 'Mountain View, CA, United States',
  },
  ...overrides,
});

const experience = (overrides: Record<string, any> = {}) => ({
  id: 10,
  company: 'Google',
  title: 'Software Engineer',
  location: 'Mountain View, CA, United States',
  start_date: '2026-07-01',
  end_date: null,
  is_current: true,
  base_salary: 160000,
  offer: 1,
  ...overrides,
});

describe('buildIncomeSources', () => {
  it('merges an experience with its linked offer', () => {
    const [source] = buildIncomeSources([offer()], [experience()]);
    expect(source.kind).toBe('experience');
    expect(source.startDate).toBe('2026-07-01');
    expect(source.premiumsPerPeriod).toBe(146);
    expect(source.employer.match401kPercent).toBe(50);
    expect(source.totalGrant).toBeCloseTo(200000, 6);
    expect(source.hasBenefitData).toBe(true);
  });

  it('marks a past role without a linked offer as missing benefit data', () => {
    const [source] = buildIncomeSources(
      [],
      [experience({ id: 11, offer: null, is_current: false, base_salary: 90000 })]
    );
    expect(source.hasBenefitData).toBe(false);
    expect(source.premiumsPerPeriod).toBe(0);
    expect(source.employer.match401kPercent).toBe(0);
  });

  it('does not list an offer twice when an experience already links it', () => {
    const sources = buildIncomeSources([offer()], [experience()]);
    expect(sources).toHaveLength(1);
  });

  it('still lists the current offer when it has no experience row yet', () => {
    const sources = buildIncomeSources([offer({ id: 2, is_current: true })], [experience()]);
    expect(sources.map((source) => source.key)).toContain('offer-2');
  });

  it('leaves out an offer you are not on, since it is not income', () => {
    const sources = buildIncomeSources(
      [offer({ id: 2, is_current: false }), offer({ id: 3, is_current: false })],
      [experience()]
    );
    expect(sources.map((source) => source.key)).toEqual(['experience-10']);
  });

  it('leaves out a declined offer even when there are no experiences at all', () => {
    expect(buildIncomeSources([offer({ id: 4, is_current: false })], [])).toEqual([]);
  });

  it('keeps an offer that a past experience links to, through that experience', () => {
    const sources = buildIncomeSources([offer()], [experience({ is_current: false })]);
    expect(sources.map((source) => source.key)).toEqual(['experience-10']);
    expect(sources[0].hasBenefitData).toBe(true);
  });

  it('puts the current role first, then the most recent past role', () => {
    const sources = buildIncomeSources(
      [],
      [
        experience({ id: 1, is_current: false, start_date: '2020-01-01', offer: null }),
        experience({ id: 2, is_current: false, start_date: '2023-01-01', offer: null }),
        experience({ id: 3, is_current: true, start_date: '2026-07-01', offer: null }),
      ]
    );
    expect(sources.map((source) => source.key)).toEqual([
      'experience-3',
      'experience-2',
      'experience-1',
    ]);
  });

  it('annualizes an hourly internship that has no base salary', () => {
    const [source] = buildIncomeSources(
      [],
      [
        experience({
          id: 12,
          offer: null,
          base_salary: null,
          hourly_rate: 50,
          hours_per_day: 8,
          working_days_per_week: 5,
        }),
      ]
    );
    expect(source.annualSalary).toBeCloseTo(50 * 8 * 5 * 52, 6);
  });
});

describe('yearsForSource', () => {
  it('spans the years the role was held, most recent first', () => {
    const [source] = buildIncomeSources(
      [],
      [experience({ offer: null, start_date: '2024-03-01', end_date: '2026-09-11' })]
    );
    expect(yearsForSource(source, 2026)).toEqual([2026, 2025, 2024]);
  });

  it('runs to the latest modelled year for a current role', () => {
    const [source] = buildIncomeSources(
      [],
      [experience({ offer: null, start_date: '2025-01-01', end_date: null })]
    );
    expect(yearsForSource(source, 2026)).toEqual([2026, 2025]);
  });

  it('falls back to the latest year without a start date', () => {
    expect(yearsForSource(null, 2026)).toEqual([2026]);
  });
});

describe('activeInYear', () => {
  const roleFor = (start: string | null, end: string | null) =>
    buildIncomeSources([], [experience({ offer: null, start_date: start, end_date: end })])[0];

  it('excludes a role that started after the year', () => {
    expect(activeInYear(roleFor('2026-01-05', null), 2025)).toBe(false);
  });

  it('includes the year a role started', () => {
    expect(activeInYear(roleFor('2026-01-05', null), 2026)).toBe(true);
  });

  it('excludes a role that ended before the year', () => {
    expect(activeInYear(roleFor('2020-01-01', '2024-06-30'), 2025)).toBe(false);
  });

  it('includes the year a role ended', () => {
    expect(activeInYear(roleFor('2020-01-01', '2025-06-30'), 2025)).toBe(true);
  });

  it('includes a year the role spanned entirely', () => {
    expect(activeInYear(roleFor('2020-01-01', '2027-01-01'), 2025)).toBe(true);
  });

  it('keeps a source with no dates, since there is nothing to exclude it by', () => {
    const [offerOnly] = buildIncomeSources(
      [{ id: 7, is_current: true, base_salary: 100000, application_details: {} }],
      []
    );
    expect(activeInYear(offerOnly, 2019)).toBe(true);
  });
});

describe('yearsForSources', () => {
  it('offers every year any role covers, most recent first', () => {
    const sources = buildIncomeSources(
      [],
      [
        experience({ id: 1, offer: null, start_date: '2022-01-01', end_date: '2023-06-30' }),
        experience({ id: 2, offer: null, start_date: '2026-01-05', end_date: null }),
      ]
    );
    // 2024 and 2025 are absent because no role was held then, so there is nothing to model.
    expect(yearsForSources(sources, 2026)).toEqual([2026, 2023, 2022]);
  });

  it('always includes the latest modelled year', () => {
    expect(yearsForSources([], 2026)).toEqual([2026]);
  });

  it('does not repeat a year covered by two roles', () => {
    const sources = buildIncomeSources(
      [],
      [
        experience({ id: 1, offer: null, start_date: '2025-01-01', end_date: '2025-12-31' }),
        experience({ id: 2, offer: null, start_date: '2025-06-01', end_date: null }),
      ]
    );
    expect(yearsForSources(sources, 2026)).toEqual([2026, 2025]);
  });
});
