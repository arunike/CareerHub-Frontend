import type { AnnualLimits, JurisdictionTable } from '../../../../types/tax';

const IRS_2026 = 'IRS Rev. Proc. 2025-32 (tax year 2026)';

// Married filing separately is not published separately; the statute sets it at half of
// the married-filing-jointly thresholds.
export const FEDERAL_2026: JurisdictionTable = {
  year: 2026,
  jurisdiction: 'federal',
  tier: 'full',
  source: IRS_2026,
  standardDeduction: {
    SINGLE: 16100,
    MARRIED_FILING_JOINTLY: 32200,
    MARRIED_FILING_SEPARATELY: 16100,
    HEAD_OF_HOUSEHOLD: 24150,
  },
  brackets: {
    SINGLE: [
      { cap: 12400, rate: 0.1 },
      { cap: 50400, rate: 0.12 },
      { cap: 105700, rate: 0.22 },
      { cap: 201775, rate: 0.24 },
      { cap: 256225, rate: 0.32 },
      { cap: 640600, rate: 0.35 },
      { cap: Infinity, rate: 0.37 },
    ],
    MARRIED_FILING_JOINTLY: [
      { cap: 24800, rate: 0.1 },
      { cap: 100800, rate: 0.12 },
      { cap: 211400, rate: 0.22 },
      { cap: 403550, rate: 0.24 },
      { cap: 512450, rate: 0.32 },
      { cap: 768700, rate: 0.35 },
      { cap: Infinity, rate: 0.37 },
    ],
    MARRIED_FILING_SEPARATELY: [
      { cap: 12400, rate: 0.1 },
      { cap: 50400, rate: 0.12 },
      { cap: 105700, rate: 0.22 },
      { cap: 201775, rate: 0.24 },
      { cap: 256225, rate: 0.32 },
      { cap: 384350, rate: 0.35 },
      { cap: Infinity, rate: 0.37 },
    ],
    HEAD_OF_HOUSEHOLD: [
      { cap: 17700, rate: 0.1 },
      { cap: 67450, rate: 0.12 },
      { cap: 105700, rate: 0.22 },
      { cap: 201775, rate: 0.24 },
      { cap: 256200, rate: 0.32 },
      { cap: 640600, rate: 0.35 },
      { cap: Infinity, rate: 0.37 },
    ],
  },
  supplementalRate: 0.22,
  supplementalHighRate: 0.37,
  supplementalHighThreshold: 1000000,
  payrollTaxes: [
    { label: 'Social Security', rate: 0.062, wageBase: 184500, appliesAbove: null },
    { label: 'Medicare', rate: 0.0145, wageBase: null, appliesAbove: null },
    // Employers withhold the surtax once wages pass $200,000 regardless of filing status;
    // the filing-status thresholds apply to the Form 8959 liability, not to withholding.
    { label: 'Additional Medicare', rate: 0.009, wageBase: null, appliesAbove: 200000 },
  ],
};

export const LIMITS_2026: AnnualLimits = {
  year: 2026,
  elective401k: 24500,
  catchUp401k: 8000,
  hsaSelf: 4400,
  hsaFamily: 8750,
  fsa: 3400,
  source: 'IRS Notice 2025-67, Rev. Proc. 2025-19, Rev. Proc. 2025-32',
};
