import type { JurisdictionTable } from '../../../../../types/tax';

// Rate comes from STATE_TAX_RATE in the backend reference data; zero-rate becomes 'none'.
export const flatStateTable = (
  jurisdiction: string,
  ratePercent: number,
  year: number,
  tier: 'none' | 'flat' | 'fallback' = 'flat'
): JurisdictionTable => ({
  year,
  jurisdiction,
  tier: ratePercent > 0 ? tier : 'none',
  flatRatePercent: ratePercent,
  supplementalRate: ratePercent / 100,
  payrollTaxes: [],
  source: 'CareerHub reference data STATE_TAX_RATE',
});

export const NO_STATE_TAX = (year: number): JurisdictionTable =>
  flatStateTable('none', 0, year, 'none');
