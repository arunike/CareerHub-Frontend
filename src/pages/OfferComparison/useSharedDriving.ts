import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { updateApplication } from '../../api';
import { getUserSettings, updateUserSettings } from '../../api/availability';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  DEFAULT_GAS_PRICE,
  DEFAULT_MPG,
  clearFuelOverrides,
  fuelOverridesIn,
  type CommuteOption,
} from './commute';
import type { FuelOverrideTarget } from './DrivingAssumptions';
import type {
  ApplicationLike as Application,
  OfferLike as Offer,
  SimulatedOffer,
} from './calculations';

export const useSharedDriving = ({
  offers,
  applications,
  setApplications,
  simulatedOffers,
  setSimulatedOffers,
  saveAdjustments,
  getApplicationName,
  messageApi,
}: {
  offers: Offer[];
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  simulatedOffers: SimulatedOffer[];
  setSimulatedOffers: React.Dispatch<React.SetStateAction<SimulatedOffer[]>>;
  saveAdjustments: (overrides?: { simulatedOffers?: SimulatedOffer[] }) => Promise<unknown>;
  getApplicationName: (id: number) => string;
  messageApi: MessageInstance;
}) => {
  // Shared across offers, so they load once here.
  const [drivingDefaults, setDrivingDefaults] = useState<{
    mpg: number;
    gasPricePerGallon: number;
  } | null>(null);

  const loadDrivingDefaults = useCallback(async () => {
    try {
      const { data } = await getUserSettings();
      setDrivingDefaults({
        mpg: Number(data?.default_mpg) || DEFAULT_MPG,
        gasPricePerGallon: Number(data?.default_gas_price_per_gallon) || DEFAULT_GAS_PRICE,
      });
    } catch (error) {
      // Fall back to the built-ins rather than blanking every commute cost.
      console.error('Failed to load driving defaults', error);
      setDrivingDefaults({ mpg: DEFAULT_MPG, gasPricePerGallon: DEFAULT_GAS_PRICE });
    }
  }, []);

  const saveDrivingDefaults = useCallback(
    async (next: { mpg: number; gasPricePerGallon: number }) => {
      setDrivingDefaults(next);
      try {
        await updateUserSettings({
          default_mpg: next.mpg,
          default_gas_price_per_gallon: next.gasPricePerGallon,
        });
      } catch (error) {
        console.error('Failed to save driving defaults', error);
        messageApi.error(getApiErrorMessage(error, 'Could not save driving assumptions'));
        void loadDrivingDefaults();
      }
    },
    [loadDrivingDefaults, messageApi]
  );

  useEffect(() => {
    void loadDrivingDefaults();
  }, [loadDrivingDefaults]);

  // Offers that keep their own mpg or pump price.
  const fuelOverrideTargets = useMemo<FuelOverrideTarget[]>(() => {
    const targets: FuelOverrideTarget[] = [];
    // Every offer, not just the filtered year: a shared figure is meant to be universal.
    offers.forEach((offer) => {
      const app = applications.find((candidate) => candidate.id === offer.application);
      if (!app) return;
      const found = fuelOverridesIn(app.commute_options as CommuteOption[] | undefined);
      if (!found) return;
      targets.push({ key: `app:${app.id}`, name: getApplicationName(app.id as number), ...found });
    });
    simulatedOffers.forEach((scenario) => {
      const found = fuelOverridesIn(scenario.commute_options);
      if (!found) return;
      const name =
        typeof scenario.application === 'number'
          ? `${getApplicationName(scenario.application)} (Scenario)`
          : `${scenario.custom_company_name || 'Custom scenario'} (Custom)`;
      targets.push({ key: `scenario:${scenario.id}`, name, ...found });
    });
    return targets;
    // getApplicationName reads applications, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers, applications, simulatedOffers]);

  const applySharedDrivingToOffers = useCallback(
    async (keys: string[]) => {
      const appIds = keys
        .filter((key) => key.startsWith('app:'))
        .map((key) => Number(key.slice(4)))
        .filter((id) => Number.isFinite(id));
      const scenarioIds = keys
        .filter((key) => key.startsWith('scenario:'))
        .map((key) => key.slice('scenario:'.length));

      try {
        for (const id of appIds) {
          const app = applications.find((candidate) => candidate.id === id);
          if (!app) continue;
          const nextOptions = clearFuelOverrides(
            app.commute_options as CommuteOption[] | undefined
          );
          await updateApplication(id, { commute_options: nextOptions });
          setApplications((prev) =>
            prev.map((candidate) =>
              candidate.id === id ? { ...candidate, commute_options: nextOptions } : candidate
            )
          );
        }

        if (scenarioIds.length > 0) {
          // Passed explicitly: the save helper's ref has not caught up with this render.
          const nextScenarios = simulatedOffers.map((scenario) =>
            scenarioIds.includes(String(scenario.id))
              ? { ...scenario, commute_options: clearFuelOverrides(scenario.commute_options) }
              : scenario
          );
          setSimulatedOffers(nextScenarios);
          await saveAdjustments({ simulatedOffers: nextScenarios });
        }

        messageApi.success(`Applied to ${keys.length} offer${keys.length === 1 ? '' : 's'}`);
      } catch (error) {
        console.error('Failed to apply shared driving assumptions', error);
        messageApi.error(getApiErrorMessage(error, 'Could not update those offers'));
      }
    },
    [
      applications,
      simulatedOffers,
      setSimulatedOffers,
      saveAdjustments,
      messageApi,
      setApplications,
    ]
  );

  return { drivingDefaults, saveDrivingDefaults, fuelOverrideTargets, applySharedDrivingToOffers };
};
