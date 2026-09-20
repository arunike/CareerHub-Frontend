export interface DeferralStep {
  id: string;
  // The rate applies to every paycheck dated on or after this day.
  effectiveDate: string;
  pretaxPercent: number;
  rothPercent: number;
}

export interface DeferralEscalation {
  enabled: boolean;
  // Percentage points added each year, not a multiplier: 6% stepping by 1 gives 7%, not 6.06%.
  percentPerYear: number;
  // Stops the climb; payroll auto-escalation always has one.
  capPercent: number;
}

export interface DeferralPlan {
  steps: DeferralStep[];
  escalation: DeferralEscalation;
}

export interface DeferralRate {
  pretaxPercent: number;
  rothPercent: number;
}

// 15% is the ceiling SECURE 2.0 puts on mandated auto-escalation, and where plan caps cluster.
const DEFAULT_ESCALATION_CAP_PERCENT = 15;

export const emptyDeferralPlan = (): DeferralPlan => ({
  steps: [],
  escalation: { enabled: true, percentPerYear: 1, capPercent: DEFAULT_ESCALATION_CAP_PERCENT },
});

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const yearsBetween = (fromIso: string, toIso: string): number => {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  let years = to.getFullYear() - from.getFullYear();
  const beforeAnniversary =
    to.getMonth() < from.getMonth() ||
    (to.getMonth() === from.getMonth() && to.getDate() < from.getDate());
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
};

// The last step dated on or before the paycheck, else the standing election.
export const deferralRateOn = (
  plan: DeferralPlan,
  base: DeferralRate,
  payDate: string | null,
  anchorDate: string | null
): DeferralRate => {
  if (!payDate) return base;
  const steps = [...(plan.steps ?? [])]
    .filter((step) => Boolean(step?.effectiveDate))
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  const active = steps.filter((step) => step.effectiveDate <= payDate).pop();
  const rate: DeferralRate = active
    ? { pretaxPercent: num(active.pretaxPercent), rothPercent: num(active.rothPercent) }
    : { pretaxPercent: num(base.pretaxPercent), rothPercent: num(base.rothPercent) };

  const escalation = plan.escalation;
  if (!escalation?.enabled || num(escalation.percentPerYear) <= 0) return rate;
  // Escalation counts from the step in force, so a rate you set by hand is not back-dated over.
  const from = active?.effectiveDate ?? anchorDate;
  if (!from) return rate;
  const climbed = rate.pretaxPercent + num(escalation.percentPerYear) * yearsBetween(from, payDate);
  const cap = num(escalation.capPercent);
  return {
    pretaxPercent: cap > 0 ? Math.min(climbed, cap) : climbed,
    rothPercent: rate.rothPercent,
  };
};

// Only the paychecks whose rate differs from the standing election need an override row.
export const deferralOverridesFor = (
  periods: Array<{ periodIndex: number; payDate: string | null }>,
  plan: DeferralPlan,
  base: DeferralRate,
  anchorDate: string | null
): Array<{ periodIndex: number; pretax401kPercent: number; roth401kPercent: number }> => {
  const hasSteps = (plan.steps ?? []).some((step) => Boolean(step?.effectiveDate));
  const climbs = Boolean(plan.escalation?.enabled) && num(plan.escalation?.percentPerYear) > 0;
  if (!hasSteps && !climbs) return [];

  const rows = [];
  for (const period of periods) {
    const rate = deferralRateOn(plan, base, period.payDate, anchorDate);
    if (
      rate.pretaxPercent === num(base.pretaxPercent) &&
      rate.rothPercent === num(base.rothPercent)
    ) {
      continue;
    }
    rows.push({
      periodIndex: period.periodIndex,
      pretax401kPercent: rate.pretaxPercent,
      roth401kPercent: rate.rothPercent,
    });
  }
  return rows;
};

export interface ScheduledDeferral {
  periodIndex: number;
  pretax401kPercent: number;
  roth401kPercent: number;
}

// The schedule is a default, not an override: a rate you set on one paycheck by hand still wins.
export const mergeDeferralSchedule = <T extends { periodIndex: number }>(
  manual: T[],
  scheduled: ScheduledDeferral[]
): Array<T | ScheduledDeferral> => {
  const byIndex = new Map(manual.map((row) => [row.periodIndex, row]));
  const merged: Array<T | ScheduledDeferral> = [];
  for (const row of scheduled) {
    const existing = byIndex.get(row.periodIndex) as
      | (T & { pretax401kPercent?: number; roth401kPercent?: number })
      | undefined;
    if (!existing) {
      merged.push(row);
      continue;
    }
    byIndex.delete(row.periodIndex);
    merged.push({
      ...existing,
      pretax401kPercent: existing.pretax401kPercent ?? row.pretax401kPercent,
      roth401kPercent: existing.roth401kPercent ?? row.roth401kPercent,
    });
  }
  return [...merged, ...byIndex.values()];
};

// Anything stored before the plan existed, or half-written, resolves to a usable default.
export const normalizeDeferralPlan = (raw: unknown): DeferralPlan => {
  const source = (raw ?? {}) as Partial<DeferralPlan>;
  const escalation = (source.escalation ?? {}) as Partial<DeferralEscalation>;
  return {
    steps: (Array.isArray(source.steps) ? source.steps : [])
      .filter((step) => Boolean(step?.effectiveDate))
      .map((step) => ({
        id: String(step.id ?? step.effectiveDate),
        effectiveDate: String(step.effectiveDate),
        pretaxPercent: num(step.pretaxPercent),
        rothPercent: num(step.rothPercent),
      })),
    escalation: {
      enabled: escalation.enabled !== false,
      // Absent means never set, which takes the 1-point default; an explicit 0 is a real choice.
      percentPerYear: escalation.percentPerYear == null ? 1 : num(escalation.percentPerYear),
      capPercent:
        escalation.capPercent == null ? DEFAULT_ESCALATION_CAP_PERCENT : num(escalation.capPercent),
    },
  };
};
