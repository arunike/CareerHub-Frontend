import { describe, expect, it } from 'vitest';
import { normalizeInternshipCompInputs } from './internshipCompInputs';

const role = { start_date: '2024-06-03', end_date: '2024-08-23', is_current: false };
const inputs = {
  hourly_rate: 50,
  hours_per_day: 8,
  working_days_per_week: 5,
  total_hours_worked: null,
  overtime_hours: null,
  overtime_rate: null,
  overtime_multiplier: null,
  total_earnings_override: null,
};

describe('normalizeInternshipCompInputs', () => {
  it('keeps the schedule and stores no redundant overrides', () => {
    const patch = normalizeInternshipCompInputs(inputs, role);
    expect(patch.hourly_rate).toBe(50);
    expect(patch.hours_per_day).toBe(8);
    expect(patch.working_days_per_week).toBe(5);
    expect(patch.total_hours_worked).toBeNull();
    expect(patch.total_earnings_override).toBeNull();
  });

  it('drops a total-hours figure the schedule already implies', () => {
    const auto = normalizeInternshipCompInputs({ ...inputs, total_hours_worked: 480 }, role);
    // 12 weeks × 5 days × 8 hours = 480, which the schedule computes on its own.
    expect(auto.total_hours_worked).toBeNull();
  });

  it('keeps a total-hours figure that differs from the schedule', () => {
    const patch = normalizeInternshipCompInputs({ ...inputs, total_hours_worked: 500 }, role);
    expect(patch.total_hours_worked).toBe(500);
  });

  it('treats 1.5× overtime as the default rather than an answer', () => {
    expect(
      normalizeInternshipCompInputs({ ...inputs, overtime_multiplier: 1.5 }, role)
        .overtime_multiplier
    ).toBeNull();
    expect(
      normalizeInternshipCompInputs({ ...inputs, overtime_multiplier: 2 }, role).overtime_multiplier
    ).toBe(2);
  });

  it('ignores zero and negative overtime', () => {
    const patch = normalizeInternshipCompInputs(
      { ...inputs, overtime_hours: -5, overtime_rate: 0 },
      role
    );
    expect(patch.overtime_hours).toBeNull();
    expect(patch.overtime_rate).toBeNull();
  });

  it('keeps a total that the inputs cannot produce', () => {
    const patch = normalizeInternshipCompInputs(
      { ...inputs, total_earnings_override: 31000 },
      role
    );
    expect(patch.total_earnings_override).toBe(31000);
  });
});
