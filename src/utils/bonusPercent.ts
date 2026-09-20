export type BonusEntryMode = '$' | '%';

// Percent is the useful default, but only once there is a base to take a percentage of.
export const defaultBonusMode = (
  base: number | null | undefined,
  bonus: number | null | undefined
): BonusEntryMode => ((base ?? 0) > 0 && (bonus ?? 0) > 0 ? '%' : '$');

export const bonusPercentOf = (
  base: number | null | undefined,
  bonus: number | null | undefined
) => ((base ?? 0) > 0 ? ((bonus ?? 0) / (base as number)) * 100 : 0);

// The one definition of a bonus quoted as a share of base, whole dollars like every other figure.
export const bonusFromPercent = (percent: number, base: number | null | undefined) =>
  Math.round((percent / 100) * (base ?? 0));

// An unknown percent must hold the stored bonus; only a known one may rescale it.
export const rescaleBonus = (
  percentText: string,
  nextBase: number | null,
  currentBonus: number | null | undefined
): number | null => {
  if (percentText === '' || nextBase == null) return currentBonus ?? null;
  const percent = Number(percentText);
  if (!Number.isFinite(percent)) return currentBonus ?? null;
  return bonusFromPercent(percent, nextBase);
};

// A target bonus keeps its share of base when base moves, which is the same sum from the far end.
export const bonusAtSameRate = (
  baseBefore: number,
  bonusBefore: number,
  baseAfter: number
): number => {
  if (baseBefore <= 0 || bonusBefore <= 0) return bonusBefore;
  return bonusFromPercent(bonusPercentOf(baseBefore, bonusBefore), baseAfter);
};
