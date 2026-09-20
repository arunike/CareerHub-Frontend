import { describe, expect, it } from 'vitest';
import { buildIncomeSources } from './incomeSources';

const experience = (over: Record<string, unknown> = {}) => ({
  id: 1,
  company: 'Google',
  title: 'Software Engineer',
  is_current: true,
  start_date: '2025-07-01',
  base_salary: 165000,
  bonus: 24750,
  ...over,
});

const offer = (over: Record<string, unknown> = {}) => ({
  id: 9,
  is_current: true,
  base_salary: 181500,
  bonus: 27225,
  ...over,
});

const salaryOf = (exps: unknown[], offers: unknown[]) =>
  buildIncomeSources(offers as never, exps as never).find((s) => s.kind === 'experience');

describe('the pay an Income role is built from', () => {
  it('takes the linked offer figure, so Offer and Income cannot disagree', () => {
    const source = salaryOf([experience({ offer: 9 })], [offer()]);
    expect(source?.annualSalary).toBe(181500);
    expect(source?.bonus).toBe(27225);
  });

  it('falls back to the role when no offer is linked', () => {
    const source = salaryOf([experience()], []);
    expect(source?.annualSalary).toBe(165000);
    expect(source?.bonus).toBe(24750);
  });

  it('falls back to the role when the offer left the figure blank', () => {
    // A linked offer must not erase the role's own pay by being empty.
    const source = salaryOf([experience({ offer: 9 })], [offer({ base_salary: 0, bonus: 0 })]);
    expect(source?.annualSalary).toBe(165000);
    expect(source?.bonus).toBe(24750);
  });

  it('stays on the pre-raise figure, which the raise schedule then steps', () => {
    const raised = offer({
      raise_history: [
        {
          id: 'r1',
          date: '2026-10-01',
          effective_date: '2026-10-01',
          type: 'merit',
          base_before: 181500,
          base_after: 199650,
        },
      ],
    });
    const source = salaryOf([experience({ offer: 9 })], [raised]);
    expect(source?.annualSalary).toBe(181500);
    expect(source?.raises).toHaveLength(1);
  });
});
