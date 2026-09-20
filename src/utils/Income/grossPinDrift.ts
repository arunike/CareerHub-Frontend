import type { PeriodDeductionOverride } from './periodDeductions';

export interface GrossPinDrift {
  periodIndex: number;
  pinned: number;
  scheduled: number;
  payDate: string | null;
}

// Cents of drift are rounding in the pin itself; a raise moves a paycheck by far more.
const TOLERANCE = 1;

// A paycheck pinned to a gross the raise schedule has moved past, so no raise can reach it.
export const grossPinDrift = (
  overrides: PeriodDeductionOverride[],
  periods: Array<{ periodIndex: number; payDate: string | null }>,
  scheduledByPeriod: Record<number, number>,
  fallbackPerPeriod: number
): GrossPinDrift[] => {
  const payDates = new Map(periods.map((period) => [period.periodIndex, period.payDate]));
  const drift: GrossPinDrift[] = [];
  for (const override of overrides) {
    const pinned = override.regularGross;
    if (pinned == null) continue;
    const scheduled = scheduledByPeriod[override.periodIndex] ?? fallbackPerPeriod;
    if (Math.abs(pinned - scheduled) < TOLERANCE) continue;
    drift.push({
      periodIndex: override.periodIndex,
      pinned,
      scheduled,
      payDate: payDates.get(override.periodIndex) ?? null,
    });
  }
  return drift;
};

// Keyed by the rate that was rejected, so the prompt returns if a later raise moves it again.
export const grossPinSignature = (drift: GrossPinDrift[]): string =>
  drift.map((entry) => `${entry.periodIndex}:${Math.round(entry.scheduled)}`).join('|');
