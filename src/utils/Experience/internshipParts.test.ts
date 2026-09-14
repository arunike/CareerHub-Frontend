import { describe, expect, it } from 'vitest';
import { buildInternshipParts } from './internshipParts';

// The two summer internships from AGENTS.md: 60 weekdays at 8 hours, plus a little overtime.
const STRIPE = {
  key: 'stripe-2023',
  company: 'Stripe',
  roleTitle: 'Software Engineer Intern',
  regularPay: 42000.0,
  overtimePay: 525.0,
};

const AIRBNB = {
  key: 'airbnb-2022',
  company: 'Airbnb',
  roleTitle: 'Software Engineer Intern',
  regularPay: 23702.4,
  overtimePay: 370.35,
};

describe('buildInternshipParts', () => {
  it('splits regular and overtime, each listing the internships inside', () => {
    const parts = buildInternshipParts([STRIPE, { ...AIRBNB, overtimePay: 0 }]);
    expect(parts.map((part) => part.key)).toEqual(['regular', 'overtime']);
    expect(parts[0].members.map((m) => m.label)).toEqual(['Stripe', 'Airbnb']);
    // Only one summer ran overtime, so the other must not appear under it.
    expect(parts[1].members.map((m) => m.label)).toEqual(['Stripe']);
  });

  it('totals each part exactly from its own members', () => {
    const parts = buildInternshipParts([STRIPE, AIRBNB]);
    for (const part of parts) {
      expect(part.total).toBe(part.members.reduce((sum, m) => sum + m.value, 0));
      expect(Number.isInteger(part.total)).toBe(true);
    }
  });

  it('gives each summer its own shade within a part', () => {
    const parts = buildInternshipParts([STRIPE, AIRBNB]);
    expect(new Set(parts[0].members.map((m) => m.color)).size).toBe(2);
  });

  it('reports an empty part rather than dropping it', () => {
    const parts = buildInternshipParts([{ ...AIRBNB, overtimePay: 0 }]);
    expect(parts[1].total).toBe(0);
    expect(parts[1].members).toEqual([]);
  });

  it('rounds the higher-paid summer to its whole-dollar total', () => {
    const [regular] = buildInternshipParts([STRIPE, AIRBNB]);
    // $87.50 and $49.38 an hour over 480 hours each.
    expect(regular.members.find((m) => m.label === 'Stripe')?.value).toBe(42000);
    expect(regular.members.find((m) => m.label === 'Airbnb')?.value).toBe(23702);
  });
});
