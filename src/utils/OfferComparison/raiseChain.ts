import type { RaiseEntry } from '../../types';
import { stepDateOf } from '../Income/raiseSchedule';

export interface StoredPackage {
  base: number;
  bonus: number;
  equity: number;
}

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Before-values are shown, never typed: each raise starts where the one before it landed.
export const withDerivedBefores = (raises: RaiseEntry[], stored: StoredPackage): RaiseEntry[] => {
  const sorted = [...raises].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  if (sorted.length === 0) return [];

  // An offer with no figure of its own leaves the earliest entry's own record as the start.
  let base = stored.base || num(sorted[0].base_before);
  let bonus = stored.bonus || num(sorted[0].bonus_before);
  let equity = stored.equity || num(sorted[0].equity_before);

  return sorted.map((entry) => {
    const derived = {
      ...entry,
      base_before: base,
      bonus_before: bonus,
      equity_before: equity,
    };
    // A component the raise did not move carries its running value on to the next entry.
    base = num(entry.base_after) || base;
    bonus = num(entry.bonus_after) || bonus;
    equity = num(entry.equity_after) || equity;
    return derived;
  });
};

export interface ChainDrift {
  entryId: string;
  storedBefore: number;
  rolePay: number;
  // The year holding the paychecks a re-chain would move.
  affectedYear: number;
}

// The earliest raise should start from the role's own pay; it will not if that was edited after.
export const firstRaiseDrift = (
  raises: RaiseEntry[],
  rolePay: number,
  todayIso: string = new Date().toISOString().slice(0, 10)
): ChainDrift | null => {
  if (rolePay <= 0) return null;
  const sorted = [...raises].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const first = sorted[0];
  if (!first) return null;
  const storedBefore = num(first.base_before);
  if (storedBefore <= 0 || storedBefore === rolePay) return null;
  // Re-chaining only moves paychecks before the first raise, so a past year has nothing left to move.
  const affectedYear = Number(stepDateOf(first).slice(0, 4));
  if (!affectedYear || Number(todayIso.slice(0, 4)) > affectedYear) return null;
  return { entryId: String(first.id), storedBefore, rolePay, affectedYear };
};

// Re-chains from the role's pay, which is what the Apply action writes back.
export const applyRolePayToChain = (raises: RaiseEntry[], rolePay: number): RaiseEntry[] => {
  const sorted = [...raises].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  let base = rolePay;
  return sorted.map((entry) => {
    const next = { ...entry, base_before: base };
    base = num(entry.base_after) || base;
    return next;
  });
};
