import React from 'react';
import dayjs from 'dayjs';
import type { RaiseEntry, RaiseReason, RaiseType } from '../../types';
import { suggestEffectiveDate } from './raiseCycles';

export const RAISE_TYPES: {
  value: RaiseReason;
  label: string;
  hint: string;
  color: string;
}[] = [
  {
    value: 'promotion',
    label: 'Promotion',
    hint: 'Moved up a level or into a bigger role',
    color: 'green',
  },
  {
    value: 'merit',
    label: 'Merit increase',
    hint: 'Annual review, based on performance',
    color: 'blue',
  },
  {
    value: 'market',
    label: 'Market adjustment',
    hint: 'Realigned to what the role now pays elsewhere',
    color: 'purple',
  },
  {
    value: 'retention',
    label: 'Retention offer',
    hint: 'Raised to keep you from leaving, often against an outside offer',
    color: 'orange',
  },
  {
    value: 'equity_refresh',
    label: 'Equity refresh',
    hint: 'A new grant on top of the original one',
    color: 'geekblue',
  },
  {
    value: 'role_change',
    label: 'Role change',
    hint: 'Lateral move, transfer or a change in scope',
    color: 'magenta',
  },
  {
    value: 'correction',
    label: 'Pay correction',
    hint: 'Fixes a pay gap or a payroll error rather than rewarding anything',
    color: 'gold',
  },
];

// Retired from the picker; entries saved under one are still out there and must still read well.
const RETIRED_LABELS: Record<string, string> = { cola: 'Cost of living' };

// A suggested reason by its label, a retired one by its old label, else the user's own words.
export const reasonLabel = (entry: Pick<RaiseEntry, 'type' | 'custom_type'>): string => {
  const known = RAISE_TYPES.find((type) => type.value === entry.type);
  if (known) return known.label;
  const retired = RETIRED_LABELS[entry.type];
  if (retired) return retired;
  return entry.custom_type?.trim() || entry.type;
};

// Only a suggested reason has a colour; free text gets 'default', the neutral grey tag.
export const reasonColor = (type: RaiseType): string =>
  RAISE_TYPES.find((entry) => entry.value === type)?.color ?? 'default';

// The box holds labels, so a typed label is stored under its key and keeps its colour and cycle.
export const reasonValue = (text: string): RaiseType => {
  const trimmed = text.trim();
  const match = RAISE_TYPES.find(
    (type) => type.label.toLowerCase() === trimmed.toLowerCase()
  )?.value;
  if (match) return match;
  const retired = Object.entries(RETIRED_LABELS).find(
    ([, label]) => label.toLowerCase() === trimmed.toLowerCase()
  );
  return retired ? retired[0] : trimmed;
};

export type BaseEquityMode = '$' | '%change';
export type BonusMode = '$' | '%change' | '%ofbase';

export interface AfterModes {
  base: BaseEquityMode;
  bonus: BonusMode;
  equity: BaseEquityMode;
}

export interface PctInputs {
  base: string;
  bonus: string;
  equity: string;
}

export const defaultModes: AfterModes = { base: '$', bonus: '$', equity: '$' };
export const defaultPcts: PctInputs = { base: '', bonus: '', equity: '' };

export const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
export const fmtPct = (before: number, after: number) => {
  if (!before) return '—';
  const p = ((after - before) / before) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
};
export const delta = (before: number, after: number) => {
  const d = after - before;
  return `${d >= 0 ? '+' : ''}${fmt(Math.abs(d))}`;
};

export function emptyForm(prefill?: Partial<RaiseEntry>): Omit<RaiseEntry, 'id'> {
  const date = dayjs().format('YYYY-MM-DD');
  return {
    date,
    effective_date: suggestEffectiveDate({ type: 'merit', date }),
    type: 'merit',
    label: '',
    base_before: prefill?.base_before ?? 0,
    base_after: prefill?.base_after ?? 0,
    bonus_before: prefill?.bonus_before ?? 0,
    bonus_after: prefill?.bonus_after ?? 0,
    equity_before: prefill?.equity_before ?? 0,
    equity_after: prefill?.equity_after ?? 0,
    notes: '',
  };
}

export function nanoid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const ModeBtn = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-11 rounded-lg px-2.5 text-xs transition-colors sm:min-h-8 ${
      active ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    {children}
  </button>
);
