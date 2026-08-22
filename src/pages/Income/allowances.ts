import type { PayPeriod } from './paySchedule';

export type AllowanceTreatment = 'TAXABLE' | 'TAX_FREE';

// How often the allowance is paid. A stipend is not always once per paycheck.
export type AllowanceUnit = 'PAYCHECK' | 'MONTH' | 'YEAR';

export interface Allowance {
  id: string;
  label: string;
  amount: number;
  treatment: AllowanceTreatment;
  // Times paid per unit, e.g. 1 per MONTH, or 10 per MONTH.
  timesPer: number;
  unit: AllowanceUnit;
  // Which paycheck of the month or year carries it. A monthly allowance lands on one
  // paycheck rather than being spread across them.
  payOn: 'FIRST' | 'LAST';
}

export const ALLOWANCE_LABELS: Record<AllowanceTreatment, string> = {
  TAXABLE: 'Taxable',
  TAX_FREE: 'Tax-free',
};

export const ALLOWANCE_HINTS: Record<AllowanceTreatment, string> = {
  TAXABLE:
    'Added to your wages and taxed like salary, including Social Security and Medicare. Most stipends work this way.',
  TAX_FREE:
    'Paid on top without tax, the way a qualified expense reimbursement is. Raises take-home without raising taxable pay.',
};

export const UNIT_LABELS: Record<AllowanceUnit, string> = {
  PAYCHECK: 'per paycheck',
  MONTH: 'per month',
  YEAR: 'per year',
};

export const PAY_ON_LABELS = {
  FIRST: 'first paycheck',
  LAST: 'last paycheck',
} as const;

export const defaultAllowance = (id: string): Allowance => ({
  id,
  label: '',
  amount: 0,
  treatment: 'TAXABLE',
  timesPer: 1,
  unit: 'PAYCHECK',
  payOn: 'FIRST',
});

// What the allowance is worth across a whole year, whichever way it is expressed.
export const annualAmount = (allowance: Allowance, paychecksPerYear: number) => {
  const amount = Math.max(0, Number(allowance.amount) || 0);
  const times = Math.max(0, Number(allowance.timesPer) || 0);
  if (amount === 0 || times === 0) return 0;

  if (allowance.unit === 'PAYCHECK') return amount * times * Math.max(0, paychecksPerYear);
  if (allowance.unit === 'MONTH') return amount * times * 12;
  return amount * times;
};

// What a single payment is worth. A monthly allowance pays this once a month rather than
// a fraction of it every paycheck.
export const paymentAmount = (allowance: Allowance) => {
  const amount = Math.max(0, Number(allowance.amount) || 0);
  const times = Math.max(0, Number(allowance.timesPer) || 0);
  return amount * times;
};

// Average across the year, used only for the summary figure.
export const perPeriodAverage = (allowance: Allowance, paychecksPerYear: number) => {
  if (paychecksPerYear <= 0) return 0;
  return annualAmount(allowance, paychecksPerYear) / paychecksPerYear;
};

// The two treatments enter the ledger at different points, so they are summed separately.
export const splitAllowances = (allowances: Allowance[], paychecksPerYear: number) => {
  const totals = { taxable: 0, taxFree: 0 };
  for (const allowance of allowances) {
    const perPeriod = perPeriodAverage(allowance, paychecksPerYear);
    if (perPeriod <= 0) continue;
    if (allowance.treatment === 'TAX_FREE') totals.taxFree += perPeriod;
    else totals.taxable += perPeriod;
  }
  return totals;
};

// Per-paycheck overrides are stored as the amount for that paycheck, so they bypass the
// frequency entirely: the figure is what that cheque paid.
export const resolveAllowances = (
  allowances: Allowance[],
  scheduledForPeriod: Record<string, number>,
  overrides?: Record<string, number>
) =>
  allowances.map((allowance) => {
    const override = overrides?.[allowance.id];
    return {
      ...allowance,
      perPeriod:
        override === undefined ? (scheduledForPeriod[allowance.id] ?? 0) : Math.max(0, override),
    };
  });

export const splitResolved = (resolved: Array<Allowance & { perPeriod: number }>) => {
  const totals = { taxable: 0, taxFree: 0 };
  for (const allowance of resolved) {
    if (allowance.perPeriod <= 0) continue;
    if (allowance.treatment === 'TAX_FREE') totals.taxFree += allowance.perPeriod;
    else totals.taxable += allowance.perPeriod;
  }
  return totals;
};

export interface AllowancePeriodTotals {
  taxable: number;
  taxFree: number;
  // Per allowance id, so an editor can show what the schedule put on this paycheck.
  byAllowance: Record<string, number>;
}

// Which paycheck of a group carries the payment.
const chosenPeriod = (candidates: PayPeriod[], payOn: Allowance['payOn']) =>
  payOn === 'LAST' ? candidates.at(-1) : candidates[0];

// Builds the per-paycheck allowance schedule. A monthly allowance lands on one paycheck of
// each month; an annual one on a single paycheck of the year.
export const allowanceSchedule = (
  allowances: Allowance[],
  periods: PayPeriod[]
): Record<number, AllowancePeriodTotals> => {
  const schedule: Record<number, AllowancePeriodTotals> = {};
  const ensure = (periodIndex: number) => {
    schedule[periodIndex] ??= { taxable: 0, taxFree: 0, byAllowance: {} };
    return schedule[periodIndex];
  };

  // Off-cycle payments carry no recurring items, so they never receive an allowance.
  const payable = periods.filter((period) => !period.isOffCycle);
  for (const period of payable) ensure(period.periodIndex);

  const byMonth = new Map<string, PayPeriod[]>();
  for (const period of payable) {
    const month = period.payDate.slice(0, 7);
    byMonth.set(month, [...(byMonth.get(month) ?? []), period]);
  }

  const add = (periodIndex: number, allowance: Allowance, amount: number) => {
    if (amount <= 0) return;
    const entry = ensure(periodIndex);
    entry.byAllowance[allowance.id] = (entry.byAllowance[allowance.id] ?? 0) + amount;
    if (allowance.treatment === 'TAX_FREE') entry.taxFree += amount;
    else entry.taxable += amount;
  };

  for (const allowance of allowances) {
    const amount = paymentAmount(allowance);
    if (amount <= 0) continue;

    if (allowance.unit === 'PAYCHECK') {
      for (const period of payable) add(period.periodIndex, allowance, amount);
      continue;
    }

    if (allowance.unit === 'MONTH') {
      for (const candidates of byMonth.values()) {
        const period = chosenPeriod(candidates, allowance.payOn);
        if (period) add(period.periodIndex, allowance, amount);
      }
      continue;
    }

    const period = chosenPeriod(payable, allowance.payOn);
    if (period) add(period.periodIndex, allowance, amount);
  }

  return schedule;
};
