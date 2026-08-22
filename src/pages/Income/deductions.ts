export type DeductionTreatment = 'SECTION_125' | 'PRETAX_INCOME_ONLY' | 'POST_TAX';

export interface CustomDeduction {
  id: string;
  label: string;
  // Per paycheck.
  amount: number;
  treatment: DeductionTreatment;
}

export const TREATMENT_LABELS: Record<DeductionTreatment, string> = {
  SECTION_125: 'Pre-tax, cuts FICA too',
  PRETAX_INCOME_ONLY: 'Pre-tax, not FICA',
  POST_TAX: 'Post-tax',
};

export const TREATMENT_HINTS: Record<DeductionTreatment, string> = {
  SECTION_125:
    'Section 125 benefits such as medical, dental, vision and FSA. Reduce income tax and FICA.',
  PRETAX_INCOME_ONLY:
    'Reduces income tax but not Social Security or Medicare, the way a traditional 401(k) does.',
  POST_TAX: 'Taken after tax, so it lowers take-home without changing any tax.',
};

// Each treatment lands in a different bucket of the ledger, so they are summed separately.
export const splitCustomDeductions = (deductions: CustomDeduction[]) => {
  const totals = { section125: 0, pretaxIncomeOnly: 0, postTax: 0 };
  for (const deduction of deductions) {
    const amount = Number(deduction.amount) || 0;
    if (amount <= 0) continue;
    if (deduction.treatment === 'SECTION_125') totals.section125 += amount;
    else if (deduction.treatment === 'PRETAX_INCOME_ONLY') totals.pretaxIncomeOnly += amount;
    else totals.postTax += amount;
  }
  return totals;
};
