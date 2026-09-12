export const SIGNAL_TIERS = ['Weak', 'Below avg', 'Solid', 'Strong', 'Excellent'] as const;

// Blank means "no evidence" and the scorecard skips it, so it needs its own word, not a zero.
export const signalTierLabel = (value?: number | null) => {
  if (value == null || value < 1 || value > 5) return 'Not scored';
  return `${value} - ${SIGNAL_TIERS[Math.round(value) - 1]}`;
};

// antd Rate clears to 0; the field stores null so the category stays skipped rather than scoring 0.
export const scoreFromStars = (stars: number): number | null =>
  stars >= 1 && stars <= 5 ? Math.round(stars) : null;

export const starsFromScore = (value?: number | null) =>
  value != null && value >= 1 && value <= 5 ? value : 0;
