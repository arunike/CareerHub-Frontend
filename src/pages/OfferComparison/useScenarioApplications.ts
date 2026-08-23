import { useEffect } from 'react';
import type React from 'react';
import { getApplications } from '../../api';
import type { ApplicationLike as Application, SimulatedOffer } from './calculations';

// A saved scenario can point at an application no offer loaded, so fetch those too.
export const useScenarioApplications = ({
  isSettingsHydrated,
  simulatedOffers,
  applications,
  setApplications,
}: {
  isSettingsHydrated: boolean;
  simulatedOffers: SimulatedOffer[];
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
}) => {
  useEffect(() => {
    if (!isSettingsHydrated) return;

    const missingIds = Array.from(
      new Set(
        simulatedOffers
          .map((offer) => offer.application)
          .filter((id): id is number => typeof id === 'number')
      )
    ).filter((id) => !applications.some((app) => app.id === id));

    if (missingIds.length === 0) return;

    let cancelled = false;
    void getApplications({ ids: missingIds.join(',') })
      .then((response) => {
        if (cancelled) return;
        const fetched = (response.data || []).map(
          (app: { company_details?: { name: string }; [key: string]: unknown }) => ({
            ...app,
            company_name: app.company_details?.name || '',
          })
        );
        setApplications((prev) => {
          const known = new Set(prev.map((app) => app.id));
          const additions = fetched.filter((app: Application) => !known.has(app.id));
          return additions.length > 0 ? [...prev, ...additions] : prev;
        });
      })
      .catch((error) => console.error('Failed to load scenario applications', error));

    return () => {
      cancelled = true;
    };
  }, [isSettingsHydrated, simulatedOffers, applications, setApplications]);
};
