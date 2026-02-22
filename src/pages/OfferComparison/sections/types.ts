export type ApplicationOption = {
  id: number;
  label: string;
};

export type TaxRatePreview = {
  baseTaxRate: number;
  bonusTaxRate: number;
  equityTaxRate: number;
  note?: string;
};

export type EditableTaxRates = {
  baseTaxRate: number;
  bonusTaxRate: number;
  equityTaxRate: number;
};
