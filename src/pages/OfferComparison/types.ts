export type AdjustedOfferMetrics = {
  adjustedValue: number;
  adjustedDiff: number;
  afterTaxBase: number;
  afterTaxBonus: number;
  afterTaxSignOn?: number;
  afterTaxEquity: number;
  usedBaseTaxRate: number;
  usedBonusTaxRate: number;
  usedEquityTaxRate: number;
  monthlyRent: number;
  commuteAnnualCost?: number;
  freeFoodAnnualValue?: number;
  lifestyleAdjustment?: number;
  costOfLivingIndex?: number;
};
