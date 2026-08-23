import { useMemo } from 'react';
import { getEffectiveTaxLocation } from '../../utils/applicationLocation';
import {
  type ApplicationLike as Application,
  type OfferLike as Offer,
  type SimulatedOffer,
  estimateColIndexFromCity,
} from './calculations';
import { useOfferReferenceData } from './useOfferReferenceData';
import { useScenarioRows } from './useScenarioRows';
import type { MaritalStatus } from './offerTypes';

// Reference location, cost-of-living lookups and the scenario rows the whole page compares.
export const useOfferComparisonRows = ({
  offers,
  applications,
  filteredOffers,
  simulatedOffers,
  visibleOfferIds,
  decisionOrderIds,
  getApplicationName,
  maritalStatus,
  isSettingsHydrated,
  drivingDefaults,
}: {
  offers: Offer[];
  applications: Application[];
  filteredOffers: Offer[];
  simulatedOffers: SimulatedOffer[];
  visibleOfferIds: string[];
  decisionOrderIds: string[];
  getApplicationName: (id: number) => string;
  maritalStatus: MaritalStatus;
  isSettingsHydrated: boolean;
  drivingDefaults: { mpg: number; gasPricePerGallon: number } | null;
}) => {
  const referenceLocation = useMemo(() => {
    // Resolved from every offer, not the filtered list, or a tab could re-baseline the page.
    const current = offers.find((offer) => offer.is_current) || filteredOffers[0];
    if (current) {
      const currentApp = applications.find((app) => app.id === current.application);
      const currentLocation = getEffectiveTaxLocation(currentApp);
      if (currentLocation) return currentLocation;
    }
    const anyLocation = applications.map((app) => getEffectiveTaxLocation(app)).find(Boolean);
    return anyLocation || 'San Francisco, CA, United States';
  }, [offers, filteredOffers, applications]);

  const {
    cityCostOfLiving,
    stateColBase,
    stateTaxRate,
    stateNameToAbbr,
    maritalStatusOptions,
    rentEstimate,
  } = useOfferReferenceData({ referenceLocation, isSettingsHydrated });
  const effectiveMonthlyRent = Number(rentEstimate?.monthly_rent_estimate || 0);

  const referenceColIndex = useMemo(
    () =>
      estimateColIndexFromCity(referenceLocation, cityCostOfLiving, stateColBase, stateNameToAbbr),
    [referenceLocation, cityCostOfLiving, stateColBase, stateNameToAbbr]
  );

  const { scenarioRows, realAdjustedByOfferId: adjustedByOfferId } = useScenarioRows({
    filteredOffers,
    applications,
    simulatedOffers,
    getApplicationName,
    referenceColIndex,
    effectiveMonthlyRent,
    referenceLocation,
    cityCostOfLiving,
    stateColBase,
    stateNameToAbbr,
    maritalStatus,
    stateTaxRate,
    drivingDefaults,
  });

  const displayOffers =
    visibleOfferIds.length > 0
      ? filteredOffers.filter((offer) => visibleOfferIds.includes(`real-${offer.id}`))
      : filteredOffers;

  const displaySimulatedOffers =
    visibleOfferIds.length > 0
      ? simulatedOffers.filter((offer) => visibleOfferIds.includes(`sim-${offer.id}`))
      : simulatedOffers;

  const displayScenarioRows = useMemo(() => {
    if (visibleOfferIds.length === 0) return scenarioRows;
    return scenarioRows.filter((row) =>
      visibleOfferIds.includes(`${row.kind === 'real' ? 'real' : 'sim'}-${row.offer.id}`)
    );
  }, [scenarioRows, visibleOfferIds]);

  const decisionOrderById = useMemo(
    () =>
      decisionOrderIds.reduce<Record<string, number>>((acc, id, index) => {
        acc[id] = index;
        return acc;
      }, {}),
    [decisionOrderIds]
  );

  return {
    cityCostOfLiving,
    stateColBase,
    stateTaxRate,
    stateNameToAbbr,
    referenceLocation,
    maritalStatusOptions,
    effectiveMonthlyRent,
    referenceColIndex,
    scenarioRows,
    adjustedByOfferId,
    displayOffers,
    displaySimulatedOffers,
    displayScenarioRows,
    decisionOrderById,
  };
};
