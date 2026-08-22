export interface MatchTier {
  id: string;
  // Cents matched per dollar deferred, as a percent. 100 means dollar for dollar.
  matchPercent: number;
  // Cumulative deferral percent this tier covers, e.g. 3 then 5.
  uptoPercent: number;
}

// A single-tier formula, which is what an offer records.
export const tiersFromOffer = (matchPercent: number, limitPercent: number): MatchTier[] =>
  limitPercent > 0 ? [{ id: 'tier-1', matchPercent, uptoPercent: limitPercent }] : [];

const sorted = (tiers: MatchTier[]) => [...tiers].sort((a, b) => a.uptoPercent - b.uptoPercent);

// Employer contribution as a percent of pay. Each tier matches only the band of deferral
// between the previous tier's cap and its own, so "100% of first 3%, then 50% up to 5%"
// pays 3% + 1% = 4% of pay once you defer 5%.
export const matchedPercentOfPay = (deferralPercent: number, tiers: MatchTier[]) => {
  const deferral = Math.max(0, deferralPercent);
  let matched = 0;
  let covered = 0;

  for (const tier of sorted(tiers)) {
    const cap = Math.max(0, tier.uptoPercent);
    if (cap <= covered) continue;
    const band = Math.max(0, Math.min(deferral, cap) - covered);
    matched += band * (Math.max(0, tier.matchPercent) / 100);
    covered = cap;
    if (deferral <= covered) break;
  }
  return matched;
};

// The most the employer would pay, which is what an unclaimed-match figure compares against.
export const maxMatchedPercentOfPay = (tiers: MatchTier[]) => {
  const cap = sorted(tiers).at(-1)?.uptoPercent ?? 0;
  return matchedPercentOfPay(cap, tiers);
};

// How much of the deferral the formula actually matched, which is where it stops paying.
export const matchedDeferralPercent = (deferralPercent: number, tiers: MatchTier[]) => {
  const cap = sorted(tiers).at(-1)?.uptoPercent ?? 0;
  return Math.min(Math.max(0, deferralPercent), Math.max(0, cap));
};

export const describeTiers = (tiers: MatchTier[]) => {
  const ordered = sorted(tiers).filter((tier) => tier.uptoPercent > 0);
  if (ordered.length === 0) return 'No employer match';

  return ordered
    .map((tier, index) => {
      const previous = index === 0 ? 0 : ordered[index - 1].uptoPercent;
      const band = tier.uptoPercent - previous;
      const scope = index === 0 ? `first ${trim(tier.uptoPercent)}%` : `next ${trim(band)}%`;
      return `${trim(tier.matchPercent)}% of ${scope}`;
    })
    .join(', then ');
};

const trim = (value: number) => Number(value.toFixed(2)).toString();

export const defaultTier = (id: string, uptoPercent: number): MatchTier => ({
  id,
  matchPercent: 50,
  uptoPercent,
});

export interface MatchFormula {
  tiers: MatchTier[];
  // A flat contribution paid whether or not you defer, as safe-harbor plans do.
  nonElectivePercent: number;
  // A dollar ceiling on the employer's contribution for the year. Zero means none.
  annualCap: number;
}

export const emptyFormula = (tiers: MatchTier[] = []): MatchFormula => ({
  tiers,
  nonElectivePercent: 0,
  annualCap: 0,
});

// Employer contribution as a percent of pay, before any dollar cap.
export const employerPercentOfPay = (deferralPercent: number, formula: MatchFormula) =>
  matchedPercentOfPay(deferralPercent, formula.tiers) + Math.max(0, formula.nonElectivePercent);

export const maxEmployerPercentOfPay = (formula: MatchFormula) =>
  maxMatchedPercentOfPay(formula.tiers) + Math.max(0, formula.nonElectivePercent);

// Reads the whole formula back in words, so it can be checked at a glance.
export const describeFormula = (formula: MatchFormula) => {
  const parts: string[] = [];
  if (formula.tiers.some((tier) => tier.uptoPercent > 0)) parts.push(describeTiers(formula.tiers));
  if (formula.nonElectivePercent > 0) {
    parts.push(`${trim(formula.nonElectivePercent)}% of pay regardless of what you defer`);
  }
  if (parts.length === 0) return 'No employer contribution';

  const described = parts.join(', plus ');
  return formula.annualCap > 0
    ? `${described}, capped at $${formula.annualCap.toLocaleString()} a year`
    : described;
};
