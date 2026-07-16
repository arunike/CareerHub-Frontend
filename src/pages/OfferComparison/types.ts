export type AdjustedOfferMetrics = {
  adjustedValue: number;
  adjustedDiff: number;
  afterTaxBase: number;
  afterTaxBonus: number;
  afterTaxSignOn?: number;
  afterTaxRelocation?: number;
  afterTaxHsa?: number;
  fortyOneKMatchValue?: number;
  afterTaxEquity: number;
  usedBaseTaxRate: number;
  usedBonusTaxRate: number;
  usedEquityTaxRate: number;
  monthlyRent: number;
  commuteAnnualCost?: number;
  freeFoodAnnualValue?: number;
  cashAdjustment?: number;
  costOfLivingIndex?: number;
};
