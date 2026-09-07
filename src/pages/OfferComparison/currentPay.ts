import { currentPackage } from '../Income/raiseSchedule';
import type { RaiseEntry } from '../../types';

interface PayFields {
  base_salary: number;
  bonus: number;
  equity: number;
  raise_history?: RaiseEntry[] | null;
}

// A raise writes only to raise_history, so base_salary is still the signed figure, not today's.
export const withCurrentPay = <T extends PayFields>(offer: T): T => {
  const raises = offer.raise_history ?? [];
  if (raises.length === 0) return offer;
  const { base, bonus, equity } = currentPackage(raises, {
    base: Number(offer.base_salary) || 0,
    bonus: Number(offer.bonus) || 0,
    equity: Number(offer.equity) || 0,
  });
  return { ...offer, base_salary: base, bonus, equity };
};

interface CompFields {
  base_salary: number;
  bonus: number;
  equity: number;
  sign_on: number;
  equity_total_grant?: number | null;
  equity_buyback_value?: number | null;
}

// An OFFER status auto-creates a blank offer server-side, which scores as a -100% offer if ranked.
export const isUnfilledOffer = (offer: CompFields) =>
  [
    offer.base_salary,
    offer.bonus,
    offer.equity,
    offer.sign_on,
    offer.equity_total_grant,
    offer.equity_buyback_value,
  ].every((value) => (Number(value) || 0) === 0);
