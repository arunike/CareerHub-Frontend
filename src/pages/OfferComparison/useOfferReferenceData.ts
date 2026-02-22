import { useEffect, useState } from 'react';
import { getCareerReferenceData, getCareerRentEstimate } from '../../api';
import {
  DEFAULT_CITY_COST_OF_LIVING,
  DEFAULT_MARITAL_STATUS_OPTIONS,
  DEFAULT_STATE_COL_BASE,
  DEFAULT_STATE_NAME_TO_ABBR,
  DEFAULT_STATE_TAX_RATE,
  type MaritalStatusOption,
} from './calculations';
import type { CareerReferenceData, RentEstimateData } from './offerAdjustmentsTypes';

type Params = {
  referenceLocation: string;
  isSettingsHydrated: boolean;
};

export const useOfferReferenceData = ({ referenceLocation, isSettingsHydrated }: Params) => {
  const [cityCostOfLiving, setCityCostOfLiving] = useState<Record<string, number>>(
    DEFAULT_CITY_COST_OF_LIVING,
  );
  const [stateColBase, setStateColBase] = useState<Record<string, number>>(DEFAULT_STATE_COL_BASE);
  const [stateTaxRate, setStateTaxRate] = useState<Record<string, number>>(DEFAULT_STATE_TAX_RATE);
  const [stateNameToAbbr, setStateNameToAbbr] = useState<Record<string, string>>(
    DEFAULT_STATE_NAME_TO_ABBR,
  );
  const [maritalStatusOptions, setMaritalStatusOptions] = useState<MaritalStatusOption[]>(
    DEFAULT_MARITAL_STATUS_OPTIONS,
  );
  const [rentEstimate, setRentEstimate] = useState<RentEstimateData | null>(null);

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const response = await getCareerReferenceData();
        const ref = (response.data || {}) as CareerReferenceData;
        if (ref.city_cost_of_living) setCityCostOfLiving(ref.city_cost_of_living);
        if (ref.state_col_base) setStateColBase(ref.state_col_base);
        if (ref.state_tax_rate) setStateTaxRate(ref.state_tax_rate);
        if (ref.state_name_to_abbr) setStateNameToAbbr(ref.state_name_to_abbr);
        if (ref.marital_status_options?.length) setMaritalStatusOptions(ref.marital_status_options);
      } catch (error) {
        console.error('Failed to load career reference data', error);
      }
    };
    fetchReferenceData();
  }, []);

  useEffect(() => {
    if (!isSettingsHydrated) return;
    const run = async () => {
      try {
        const response = await getCareerRentEstimate(referenceLocation);
        setRentEstimate(response.data as RentEstimateData);
      } catch (error) {
        console.error('Failed to load rent estimate', error);
        setRentEstimate({
          provider: 'HUD FMR API',
          error: 'Rent estimate unavailable',
          last_updated: new Date().toISOString(),
        });
      }
    };
    run();
  }, [referenceLocation, isSettingsHydrated]);

  return {
    cityCostOfLiving,
    stateColBase,
    stateTaxRate,
    stateNameToAbbr,
    maritalStatusOptions,
    rentEstimate,
  };
};
