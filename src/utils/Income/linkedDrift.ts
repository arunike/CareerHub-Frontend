import type { IncomeSettings } from './incomeSettings';
import type { IncomeSource } from './incomeSources';

export type DriftField = 'salaryOverride' | 'bonusOverride' | 'totalGrantOverride';

export interface LinkedDrift {
  field: DriftField;
  label: string;
  // What this year is pinned to, and what the linked offer or role now says.
  pinned: number;
  linked: number;
}

const FIELDS: Array<{
  field: DriftField;
  label: string;
  linkedOf: (source: IncomeSource) => number;
}> = [
  { field: 'salaryOverride', label: 'Base salary', linkedOf: (source) => source.annualSalary },
  { field: 'bonusOverride', label: 'Target bonus', linkedOf: (source) => source.bonus },
  { field: 'totalGrantOverride', label: 'Equity grant', linkedOf: (source) => source.totalGrant },
];

// A pinned figure that the linked record has since moved past, e.g. after a raise was recorded.
export const linkedDrift = (
  settings: Pick<IncomeSettings, DriftField>,
  source: IncomeSource | null
): LinkedDrift[] => {
  if (!source) return [];
  const drift: LinkedDrift[] = [];
  for (const entry of FIELDS) {
    const pinned = settings[entry.field];
    if (pinned == null) continue;
    const linked = entry.linkedOf(source);
    if (Math.round(pinned) === Math.round(linked)) continue;
    drift.push({ field: entry.field, label: entry.label, pinned, linked });
  }
  return drift;
};

// Keyed by the value that was rejected, so the prompt returns if the record moves again.
export const driftSignature = (drift: LinkedDrift[]): string =>
  drift.map((entry) => `${entry.field}:${Math.round(entry.linked)}`).join('|');
