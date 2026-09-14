import { describe, expect, it } from 'vitest';
import {
  describeFormula,
  describeTiers,
  emptyFormula,
  matchedPercentOfPay,
  maxMatchedPercentOfPay,
  tiersFromOffer,
  type MatchTier,
} from './matchTiers';
import { buildLedger, NO_ELECTIONS } from './tax/ledger';
import { FEDERAL_2026, LIMITS_2026 } from './tax/data/federal-2026';
import { flatStateTable } from './tax/data/states/flat';
import { EMPTY_W4 } from './tax/withholding';
import { summarizeRetirement } from './retirement';

const tiered: MatchTier[] = [
  { id: 'a', matchPercent: 100, uptoPercent: 3 },
  { id: 'b', matchPercent: 50, uptoPercent: 5 },
];

describe('matchedPercentOfPay', () => {
  it('matches nothing when nothing is deferred', () => {
    expect(matchedPercentOfPay(0, tiered)).toBe(0);
  });

  it('matches dollar for dollar inside the first tier', () => {
    expect(matchedPercentOfPay(2, tiered)).toBeCloseTo(2, 6);
    expect(matchedPercentOfPay(3, tiered)).toBeCloseTo(3, 6);
  });

  it('applies the second tier only to the band above the first', () => {
    // 3% at 100% plus 1% at 50% is 3.5%, not 4% at a blended rate.
    expect(matchedPercentOfPay(4, tiered)).toBeCloseTo(3.5, 6);
  });

  it('caps at the top tier', () => {
    expect(matchedPercentOfPay(5, tiered)).toBeCloseTo(4, 6);
    expect(matchedPercentOfPay(20, tiered)).toBeCloseTo(4, 6);
  });

  it('handles a single-tier formula', () => {
    const single = tiersFromOffer(50, 6);
    expect(matchedPercentOfPay(6, single)).toBeCloseTo(3, 6);
    expect(matchedPercentOfPay(3, single)).toBeCloseTo(1.5, 6);
    expect(matchedPercentOfPay(10, single)).toBeCloseTo(3, 6);
  });

  it('handles a 60% match', () => {
    expect(matchedPercentOfPay(5, tiersFromOffer(60, 5))).toBeCloseTo(3, 6);
  });

  it('handles a 100% match with no second tier', () => {
    expect(matchedPercentOfPay(4, tiersFromOffer(100, 4))).toBeCloseTo(4, 6);
  });

  it('is zero when there are no tiers', () => {
    expect(matchedPercentOfPay(10, [])).toBe(0);
    expect(tiersFromOffer(50, 0)).toEqual([]);
  });

  it('does not care what order the tiers are given in', () => {
    expect(matchedPercentOfPay(4, [...tiered].reverse())).toBeCloseTo(3.5, 6);
  });

  it('ignores a negative deferral', () => {
    expect(matchedPercentOfPay(-5, tiered)).toBe(0);
  });
});

describe('maxMatchedPercentOfPay', () => {
  it('is the match at the top of the last tier', () => {
    expect(maxMatchedPercentOfPay(tiered)).toBeCloseTo(4, 6);
    expect(maxMatchedPercentOfPay(tiersFromOffer(50, 6))).toBeCloseTo(3, 6);
  });

  it('is zero without tiers', () => {
    expect(maxMatchedPercentOfPay([])).toBe(0);
  });
});

describe('describeTiers', () => {
  it('describes a single tier', () => {
    expect(describeTiers(tiersFromOffer(50, 6))).toBe('50% of first 6%');
  });

  it('describes a tiered formula by band', () => {
    expect(describeTiers(tiered)).toBe('100% of first 3%, then 50% of next 2%');
  });

  it('says so when there is no match', () => {
    expect(describeTiers([])).toBe('No employer match');
  });

  it('trims trailing zeroes', () => {
    expect(describeTiers([{ id: 'a', matchPercent: 62.5, uptoPercent: 4.5 }])).toBe(
      '62.5% of first 4.5%'
    );
  });
});

describe('tiered match through the ledger', () => {
  const base = {
    filingStatus: 'SINGLE' as const,
    periodsPerYear: 24,
    annualSalary: 120000,
    incomeEvents: [],
    w4: EMPTY_W4,
    federal: FEDERAL_2026,
    state: flatStateTable('WA', 0, 2026),
    limits: LIMITS_2026,
  };
  const employer = {
    match401kPercent: 0,
    match401kLimitPercent: 0,
    hsaAnnual: 0,
    matchTiers: tiered,
  };

  const at = (deferral: number) =>
    buildLedger({
      ...base,
      employer,
      elections: { ...NO_ELECTIONS, pretax401kPercent: deferral },
    });

  it('pays the banded amount, not a blended rate', () => {
    const { rows } = at(4);
    // 3.5% of pay, versus 4% if the tiers were blended.
    expect(rows[0].employerMatch401k).toBeCloseTo(rows[0].gross * 0.035, 6);
  });

  it('caps at the top band', () => {
    expect(at(20).rows[0].employerMatch401k).toBeCloseTo(at(5).rows[0].employerMatch401k, 6);
  });

  it('pays nothing when nothing is deferred', () => {
    expect(at(0).rows[0].employerMatch401k).toBe(0);
  });

  it('reports unclaimed match against the top band', () => {
    const { rows } = at(3);
    const summary = summarizeRetirement(rows, employer, null, null);
    // 3% earns 3% of pay; the full formula pays 4%.
    expect(summary.unclaimedMatch).toBeCloseTo(120000 * 0.01, 4);
  });

  it('reports no unclaimed match at the top band', () => {
    const summary = summarizeRetirement(at(5).rows, employer, null, null);
    expect(summary.unclaimedMatch).toBeCloseTo(0, 6);
  });

  it('still honours a flat formula when no tiers are set', () => {
    const { rows } = buildLedger({
      ...base,
      employer: { match401kPercent: 60, match401kLimitPercent: 5, hsaAnnual: 0 },
      elections: { ...NO_ELECTIONS, pretax401kPercent: 5 },
    });
    expect(rows[0].employerMatch401k).toBeCloseTo(rows[0].gross * 0.03, 6);
  });
});

describe('non-elective contributions and dollar caps', () => {
  const base = {
    filingStatus: 'SINGLE' as const,
    periodsPerYear: 24,
    annualSalary: 120000,
    incomeEvents: [],
    w4: EMPTY_W4,
    federal: FEDERAL_2026,
    state: flatStateTable('WA', 0, 2026),
    limits: LIMITS_2026,
  };

  it('pays a safe-harbor contribution even at zero deferral', () => {
    const { rows } = buildLedger({
      ...base,
      employer: {
        match401kPercent: 0,
        match401kLimitPercent: 0,
        hsaAnnual: 0,
        matchTiers: tiered,
        nonElectivePercent: 3,
      },
      elections: NO_ELECTIONS,
    });
    expect(rows[0].employerMatch401k).toBeCloseTo(rows[0].gross * 0.03, 6);
  });

  it('adds the safe-harbor amount on top of the matched bands', () => {
    const { rows } = buildLedger({
      ...base,
      employer: {
        match401kPercent: 0,
        match401kLimitPercent: 0,
        hsaAnnual: 0,
        matchTiers: tiered,
        nonElectivePercent: 3,
      },
      elections: { ...NO_ELECTIONS, pretax401kPercent: 5 },
    });
    // 4% matched plus 3% guaranteed.
    expect(rows[0].employerMatch401k).toBeCloseTo(rows[0].gross * 0.07, 6);
  });

  it('stops at an annual dollar cap and says so', () => {
    const { rows, totals } = buildLedger({
      ...base,
      employer: {
        match401kPercent: 0,
        match401kLimitPercent: 0,
        hsaAnnual: 0,
        matchTiers: tiered,
        matchAnnualCap: 2000,
      },
      elections: { ...NO_ELECTIONS, pretax401kPercent: 5 },
    });
    expect(totals.employerMatch401k).toBeCloseTo(2000, 6);
    expect(rows.some((row) => row.notes.includes('Employer match cap reached'))).toBe(true);
    expect(rows.at(-1)!.employerMatch401k).toBe(0);
  });

  it('leaves the match uncapped when the cap is zero', () => {
    const { totals } = buildLedger({
      ...base,
      employer: {
        match401kPercent: 0,
        match401kLimitPercent: 0,
        hsaAnnual: 0,
        matchTiers: tiered,
        matchAnnualCap: 0,
      },
      elections: { ...NO_ELECTIONS, pretax401kPercent: 5 },
    });
    expect(totals.employerMatch401k).toBeCloseTo(120000 * 0.04, 4);
  });

  it('describes the whole formula in words', () => {
    expect(describeFormula({ tiers: tiered, nonElectivePercent: 3, annualCap: 2000 })).toBe(
      '100% of first 3%, then 50% of next 2%, plus 3% of pay regardless of what you defer, capped at $2,000 a year'
    );
  });

  it('describes a plain formula without extras', () => {
    expect(describeFormula(emptyFormula(tiersFromOffer(50, 6)))).toBe('50% of first 6%');
  });

  it('says so when there is nothing at all', () => {
    expect(describeFormula(emptyFormula())).toBe('No employer contribution');
  });
});

describe('explaining the match on a paycheck', () => {
  const base = {
    filingStatus: 'SINGLE' as const,
    periodsPerYear: 24,
    annualSalary: 120000,
    incomeEvents: [],
    w4: EMPTY_W4,
    federal: FEDERAL_2026,
    state: flatStateTable('WA', 0, 2026),
    limits: LIMITS_2026,
  };

  it('reports the deferral and how much of it was matched', () => {
    const { rows } = buildLedger({
      ...base,
      employer: { match401kPercent: 0, match401kLimitPercent: 0, hsaAnnual: 0, matchTiers: tiered },
      elections: { ...NO_ELECTIONS, pretax401kPercent: 5 },
    });
    expect(rows[0].deferralPercent).toBe(5);
    expect(rows[0].matchedDeferralPercent).toBe(5);
  });

  it('caps the matched deferral at the top band', () => {
    const { rows } = buildLedger({
      ...base,
      employer: { match401kPercent: 0, match401kLimitPercent: 0, hsaAnnual: 0, matchTiers: tiered },
      elections: { ...NO_ELECTIONS, pretax401kPercent: 12 },
    });
    expect(rows[0].deferralPercent).toBe(12);
    // The formula only reaches 5%, so that is what was matched.
    expect(rows[0].matchedDeferralPercent).toBe(5);
  });

  it('gives a match that is a clean share of the contribution for a flat formula', () => {
    const { rows } = buildLedger({
      ...base,
      employer: { match401kPercent: 50, match401kLimitPercent: 6, hsaAnnual: 0 },
      elections: { ...NO_ELECTIONS, pretax401kPercent: 5 },
    });
    const contributed = rows[0].pretax401k + rows[0].roth401k;
    // A 50% match on a fully matched 5% deferral is half of what you put in.
    expect(rows[0].employerMatch401k / contributed).toBeCloseTo(0.5, 6);
    expect(rows[0].matchedDeferralPercent).toBe(5);
  });

  it('reports the matched deferral for a flat formula capped below the deferral', () => {
    const { rows } = buildLedger({
      ...base,
      employer: { match401kPercent: 50, match401kLimitPercent: 3, hsaAnnual: 0 },
      elections: { ...NO_ELECTIONS, pretax401kPercent: 8 },
    });
    expect(rows[0].matchedDeferralPercent).toBe(3);
    const contributed = rows[0].pretax401k + rows[0].roth401k;
    // Only 3 of the 8 points were matched, so the share of the contribution is lower.
    expect(rows[0].employerMatch401k / contributed).toBeCloseTo(0.1875, 6);
  });

  it('reports zero matched deferral when nothing is deferred', () => {
    const { rows } = buildLedger({
      ...base,
      employer: { match401kPercent: 50, match401kLimitPercent: 6, hsaAnnual: 0 },
      elections: NO_ELECTIONS,
    });
    expect(rows[0].deferralPercent).toBe(0);
    expect(rows[0].matchedDeferralPercent).toBe(0);
  });

  it('counts Roth toward the matched deferral', () => {
    const { rows } = buildLedger({
      ...base,
      employer: { match401kPercent: 0, match401kLimitPercent: 0, hsaAnnual: 0, matchTiers: tiered },
      elections: { ...NO_ELECTIONS, pretax401kPercent: 2, roth401kPercent: 3 },
    });
    expect(rows[0].deferralPercent).toBe(5);
    expect(rows[0].matchedDeferralPercent).toBe(5);
  });
});
