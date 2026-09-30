import type { BenefitItem } from './calculations';

// A benefit line arrives from a saved scenario, a snapshot and the editor, all needing one shape.
export const normalizeBenefitItem = (
  item: Partial<BenefitItem>,
  fallbackId: string
): BenefitItem => ({
  id: item.id || fallbackId,
  label: item.label || '',
  amount: Number(item.amount) || 0,
  frequency: item.frequency === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
  is_taxable: Boolean(item.is_taxable),
});
