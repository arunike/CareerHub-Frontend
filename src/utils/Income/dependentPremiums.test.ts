import { describe, expect, it } from 'vitest';
import { buildIncomeSources } from './incomeSources';

const offers = (over: Record<string, unknown> = {}) => [
  {
    id: 9,
    is_current: true,
    base_salary: 165000,
    health_premium_paycheck: 54,
    dental_premium_paycheck: 1,
    vision_premium_paycheck: 5,
    has_dependents: true,
    dependent_health_premium_paycheck: 126,
    dependent_dental_premium_paycheck: 7,
    dependent_vision_premium_paycheck: 3,
    ...over,
  },
];
const experiences = [{ id: 1, company: 'Google', is_current: true, offer: 9 }];
const sourceOf = (over = {}) =>
  buildIncomeSources(offers(over) as never, experiences as never).find(
    (s) => s.kind === 'experience'
  )!;

describe('dependent premiums on an income source', () => {
  it('carries each line separately as well as the total', () => {
    const source = sourceOf();
    expect(source.dependentMedicalPerPeriod).toBe(126);
    expect(source.dependentDentalPerPeriod).toBe(7);
    expect(source.dependentVisionPerPeriod).toBe(3);
    expect(source.dependentPerPeriod).toBe(136);
  });

  it('zeroes every dependent line when the offer covers nobody', () => {
    const source = sourceOf({ has_dependents: false });
    expect(source.hasDependents).toBe(false);
    expect(source.dependentMedicalPerPeriod).toBe(0);
    expect(source.dependentPerPeriod).toBe(0);
  });

  it('names the offer the premiums came from, so an edit can be written back', () => {
    expect(sourceOf().offerId).toBe(9);
  });

  it('totals the employee lines alongside the dependent ones', () => {
    // 54 + 1 + 5 + 136
    expect(sourceOf().premiumsPerPeriod).toBe(196);
  });
});
