import React from 'react';
import dayjs from 'dayjs';
import type { RaiseEntry } from '../../types';

export const RAISE_TYPES: {
  value: RaiseEntry['type'];
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
    value: 'cola',
    label: 'Cost of living',
    hint: 'Keeps up with inflation, not performance',
    color: 'cyan',
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
  { value: 'other', label: 'Other', hint: 'Anything the list does not cover', color: 'default' },
];

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
  return {
    date: dayjs().format('YYYY-MM-DD'),
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
