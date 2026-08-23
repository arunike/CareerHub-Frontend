import React from 'react';
import dayjs from 'dayjs';
import type { RaiseEntry } from '../../types';

export const RAISE_TYPES: { value: RaiseEntry['type']; label: string; color: string }[] = [
  { value: 'merit', label: 'Merit', color: 'blue' },
  { value: 'cola', label: 'COLA', color: 'cyan' },
  { value: 'market', label: 'Market Adjustment', color: 'purple' },
  { value: 'retention', label: 'Retention', color: 'orange' },
  { value: 'other', label: 'Other', color: 'default' },
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
