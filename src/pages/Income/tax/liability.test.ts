import { describe, expect, it } from 'vitest';
import type { JurisdictionTable } from '../../../types/tax';
import { annualLiability, marginalRate } from './liability';
import { regularWithholding, supplementalWithholding } from './withholding';
import { FEDERAL_2026 } from './data/federal-2026';
import { flatStateTable } from './data/states/flat';

// Synthetic tables keep the engine's correctness independent of real-world figures.
const SYNTHETIC: JurisdictionTable = {
  year: 2026,
  jurisdiction: 'test',
  tier: 'full',
  standardDeduction: {
    SINGLE: 0,
    MARRIED_FILING_JOINTLY: 0,
    MARRIED_FILING_SEPARATELY: 0,
    HEAD_OF_HOUSEHOLD: 0,
  },
  brackets: {
    SINGLE: [
      { cap: 100, rate: 0.1 },
      { cap: Infinity, rate: 0.2 },
    ],
    MARRIED_FILING_JOINTLY: [{ cap: Infinity, rate: 0.1 }],
    MARRIED_FILING_SEPARATELY: [{ cap: Infinity, rate: 0.1 }],
    HEAD_OF_HOUSEHOLD: [{ cap: Infinity, rate: 0.1 }],
  },
  supplementalRate: 0.22,
  payrollTaxes: [],
};

describe('annualLiability', () => {
  it('applies each bracket only to the income inside it', () => {
    expect(annualLiability(200, SYNTHETIC, 'SINGLE')).toBe(10 + 20);
  });

  it('subtracts the standard deduction before applying brackets', () => {
    const withDeduction = {
      ...SYNTHETIC,
      standardDeduction: { ...SYNTHETIC.standardDeduction!, SINGLE: 50 },
    };
    expect(annualLiability(150, withDeduction, 'SINGLE')).toBe(10 + 0);
  });

  it('never returns tax on negative income', () => {
    expect(annualLiability(-5000, SYNTHETIC, 'SINGLE')).toBe(0);
    expect(annualLiability(0, FEDERAL_2026, 'SINGLE')).toBe(0);
  });

  it('returns zero for a state with no income tax', () => {
    expect(annualLiability(250000, flatStateTable('WA', 0, 2026), 'SINGLE')).toBe(0);
  });

  it('applies a flat percent for flat-rate states', () => {
    expect(annualLiability(100000, flatStateTable('IL', 4.95, 2026), 'SINGLE')).toBeCloseTo(
      4950,
      6
    );
  });

  // $120,000 single, 2026: 120,000 - 16,100 standard deduction = 103,900 taxable.
  it('matches a hand-computed 2026 single-filer year', () => {
    expect(annualLiability(120000, FEDERAL_2026, 'SINGLE')).toBeCloseTo(1240 + 4560 + 11770, 6);
  });

  it('taxes a married-filing-jointly year less than the same income filed single', () => {
    const single = annualLiability(200000, FEDERAL_2026, 'SINGLE');
    const joint = annualLiability(200000, FEDERAL_2026, 'MARRIED_FILING_JOINTLY');
    expect(joint).toBeLessThan(single);
  });
});

describe('marginalRate', () => {
  it('reports the bracket the last dollar falls in', () => {
    expect(marginalRate(120000, FEDERAL_2026, 'SINGLE')).toBe(0.22);
    expect(marginalRate(400000, FEDERAL_2026, 'SINGLE')).toBe(0.35);
  });
});

describe('regularWithholding', () => {
  it('annualizes the period, taxes it, then divides back down', () => {
    const annual = annualLiability(120000, FEDERAL_2026, 'SINGLE');
    expect(regularWithholding(5000, 24, FEDERAL_2026, 'SINGLE')).toBeCloseTo(annual / 24, 6);
  });

  it('reduces withholding by the W-4 dependents credit', () => {
    const base = regularWithholding(5000, 24, FEDERAL_2026, 'SINGLE');
    const withCredit = regularWithholding(5000, 24, FEDERAL_2026, 'SINGLE', {
      dependentsCredit: 2400,
      dependents: 0,
      otherIncome: 0,
      deductions: 0,
      extraPerPeriod: 0,
    });
    expect(withCredit).toBeCloseTo(base - 100, 6);
  });

  it('adds W-4 extra withholding on top', () => {
    const base = regularWithholding(5000, 24, FEDERAL_2026, 'SINGLE');
    const withExtra = regularWithholding(5000, 24, FEDERAL_2026, 'SINGLE', {
      dependentsCredit: 0,
      dependents: 0,
      otherIncome: 0,
      deductions: 0,
      extraPerPeriod: 50,
    });
    expect(withExtra).toBeCloseTo(base + 50, 6);
  });

  it('never withholds a negative amount', () => {
    expect(
      regularWithholding(100, 26, FEDERAL_2026, 'SINGLE', {
        dependentsCredit: 100000,
        dependents: 0,
        otherIncome: 0,
        deductions: 0,
        extraPerPeriod: 0,
      })
    ).toBe(0);
  });
});

describe('supplementalWithholding', () => {
  it('uses the flat rate below the high-rate threshold', () => {
    expect(supplementalWithholding(200000, FEDERAL_2026)).toBeCloseTo(44000, 6);
  });

  it('applies the higher rate only to supplemental wages above the threshold', () => {
    expect(supplementalWithholding(400000, FEDERAL_2026, 800000)).toBeCloseTo(
      200000 * 0.22 + 200000 * 0.37,
      6
    );
  });

  it('withholds nothing for a state with no income tax', () => {
    expect(supplementalWithholding(50000, flatStateTable('TX', 0, 2026))).toBe(0);
  });
});
