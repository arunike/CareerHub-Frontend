import { type BenefitItem, type SimulatedOffer, computeBenefitsTotal } from './calculations';
import { normalizeEquityLiquidity } from './equityLiquidity';

const normalizeBenefitItem = (item: Partial<BenefitItem>, fallbackId: string): BenefitItem => ({
  id: item.id || fallbackId,
  label: item.label || '',
  amount: Number(item.amount) || 0,
  frequency: item.frequency === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
  is_taxable: Boolean(item.is_taxable),
});

// Saved scenarios predate benefit items, so a legacy total becomes one line.
export const normalizeSimulatedOffers = (offers: SimulatedOffer[]) =>
  offers.map((offer) => {
    const benefitItems =
      Array.isArray(offer.benefit_items) && offer.benefit_items.length > 0
        ? offer.benefit_items.map((item, idx) =>
            normalizeBenefitItem(item, `scenario-benefit-${offer.id || 'saved'}-${idx}`)
          )
        : [
            {
              id: `scenario-benefit-legacy-${offer.id || Date.now()}`,
              label: 'Benefits',
              amount: Number(offer.benefits_value || 0),
              frequency: 'YEARLY' as const,
            },
          ];
    return {
      ...offer,
      equity_liquidity: normalizeEquityLiquidity(offer.equity_liquidity),
      equity_buyback_value: Math.max(0, Number(offer.equity_buyback_value) || 0),
      benefit_items: benefitItems,
      benefits_value: computeBenefitsTotal(benefitItems),
      is_unlimited_pto: !!offer.is_unlimited_pto,
      sick_leave_days: Math.max(0, Number(offer.sick_leave_days) || 0),
      sick_leave_included_in_unlimited_pto: offer.sick_leave_included_in_unlimited_pto !== false,
    };
  });
