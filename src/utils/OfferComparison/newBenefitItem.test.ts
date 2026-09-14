import { describe, expect, it } from 'vitest';
import { NEW_BENEFIT_IS_TAXABLE, newBenefitItem } from './offerTypes';
import { computeNonTaxableBenefitsTotal, computeTaxableBenefitsTotal } from './calculations';
import type { BenefitItem } from './offerTypes';

describe('a benefit added by hand starts taxable', () => {
  it('sets the flag rather than leaving it absent', () => {
    // Absent used to mean tax-free, so every new perk arrived untaxed by default.
    expect(newBenefitItem('edit-benefit', 1)).toEqual({
      id: 'edit-benefit-1',
      label: '',
      amount: 0,
      frequency: 'MONTHLY',
      is_taxable: true,
    });
    expect(NEW_BENEFIT_IS_TAXABLE).toBe(true);
  });

  it('keys the id off the prefix and the moment it was added', () => {
    expect(newBenefitItem('scenario-benefit', 42).id).toBe('scenario-benefit-42');
  });
});

describe('rows saved before the flag existed are untouched', () => {
  const items: BenefitItem[] = [
    { id: 'a', label: 'Wellbeing', amount: 600, frequency: 'YEARLY' },
    { id: 'b', label: 'Commuter', amount: 200, frequency: 'MONTHLY' },
  ];

  it('still reads an absent flag as tax-free, so nothing is retaxed retroactively', () => {
    expect(computeTaxableBenefitsTotal(items)).toBe(0);
    expect(computeNonTaxableBenefitsTotal(items)).toBe(600 + 200 * 12);
  });

  it('taxes a row that says so', () => {
    const taxed = [{ ...items[0], is_taxable: true }];
    expect(computeTaxableBenefitsTotal(taxed)).toBe(600);
    expect(computeNonTaxableBenefitsTotal(taxed)).toBe(0);
  });

  it('taxes a freshly added row, which is the change', () => {
    const added = {
      ...newBenefitItem('edit-benefit', 1),
      amount: 250,
      frequency: 'YEARLY' as const,
    };
    expect(computeTaxableBenefitsTotal([added])).toBe(250);
    expect(computeNonTaxableBenefitsTotal([added])).toBe(0);
  });
});
