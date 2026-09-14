import type { OfferLike as Offer, SimulatedOffer } from './calculations';
import { getRealizableEquity } from './equityLiquidity';

const componentBreakdown = (offer: Offer | SimulatedOffer, id: string, name: string) => ({
  id,
  name,
  Base: Number(offer.base_salary),
  Bonus: Number(offer.bonus),
  Equity: getRealizableEquity(offer),
  SignOn: Number(offer.sign_on),
  Benefits: Number(offer.benefits_value),
  Total:
    Number(offer.base_salary) +
    Number(offer.bonus) +
    getRealizableEquity(offer) +
    Number(offer.sign_on),
});

const scenarioLabel = (offer: SimulatedOffer, getApplicationName: (id: number) => string) =>
  typeof offer.application === 'number'
    ? `${getApplicationName(offer.application)} (Scenario)`
    : `${offer.custom_company_name} (Custom)`;

export const buildChartData = ({
  displayOffers,
  displaySimulatedOffers,
  decisionOrderById,
  getApplicationName,
}: {
  displayOffers: Offer[];
  displaySimulatedOffers: SimulatedOffer[];
  decisionOrderById: Record<string, number>;
  getApplicationName: (id: number) => string;
}) =>
  [
    ...displayOffers.map((offer) =>
      componentBreakdown(offer, `real-${offer.id}`, getApplicationName(offer.application))
    ),
    ...displaySimulatedOffers.map((offer) =>
      componentBreakdown(offer, `sim-${offer.id}`, scenarioLabel(offer, getApplicationName))
    ),
  ].sort((a, b) => (decisionOrderById[a.id] ?? 9999) - (decisionOrderById[b.id] ?? 9999));

export const buildCompareOptions = ({
  filteredOffers,
  simulatedOffers,
  getApplicationName,
}: {
  filteredOffers: Offer[];
  simulatedOffers: SimulatedOffer[];
  getApplicationName: (id: number) => string;
}) => [
  {
    label: 'Real Offers',
    options: filteredOffers.map((offer) => ({
      value: `real-${offer.id}`,
      label: getApplicationName(offer.application),
    })),
  },
  ...(simulatedOffers.length > 0
    ? [
        {
          label: 'Custom Scenarios',
          options: simulatedOffers.map((offer) => ({
            value: `sim-${offer.id}`,
            label:
              typeof offer.application === 'number'
                ? `${getApplicationName(offer.application)} (Scenario)`
                : `${offer.custom_company_name} - ${offer.custom_role_title}`,
          })),
        },
      ]
    : []),
];
