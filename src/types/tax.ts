export type FilingStatus =
  | 'SINGLE'
  | 'MARRIED_FILING_JOINTLY'
  | 'MARRIED_FILING_SEPARATELY'
  | 'HEAD_OF_HOUSEHOLD';

export interface FilingStatusOption {
  code: FilingStatus;
  label: string;
}

// Upper bound of the bracket; the top bracket uses Infinity.
export interface TaxBracket {
  cap: number;
  rate: number;
}

// How faithfully a jurisdiction is modelled, so the UI can label estimates as such.
export type CoverageTier = 'full' | 'none' | 'flat' | 'fallback';

export interface PayrollTax {
  label: string;
  rate: number;
  // null means uncapped.
  wageBase: number | null;
  // Set for surtaxes that only apply to wages above a threshold.
  appliesAbove: number | null;
}

export interface JurisdictionTable {
  year: number;
  jurisdiction: string;
  tier: CoverageTier;
  brackets?: Record<FilingStatus, TaxBracket[]>;
  standardDeduction?: Record<FilingStatus, number>;
  // Percent, used for the none/flat/fallback tiers.
  flatRatePercent?: number;
  // Pre-2018 only, phased out above a threshold; zero or absent from 2018 onward.
  personalExemption?: number;
  exemptionPhaseOutStart?: Record<FilingStatus, number>;
  exemptionPhaseOutStep?: Record<FilingStatus, number>;
  exemptionPhaseOutRate?: number;
  supplementalRate: number;
  supplementalHighRate?: number;
  supplementalHighThreshold?: number;
  payrollTaxes: PayrollTax[];
  source?: string;
}

// Federal regardless of residence, so keyed by year rather than by jurisdiction.
export interface AnnualLimits {
  year: number;
  elective401k: number;
  catchUp401k: number;
  hsaSelf: number;
  hsaFamily: number;
  fsa: number;
  source?: string;
}
