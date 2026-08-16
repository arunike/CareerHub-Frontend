import { useCallback, useEffect, useRef, useState } from 'react';
import { getUserSettings, updateUserSettings } from '../../api/availability';
import type { MaritalStatus, SimulatedOffer } from './calculations';
import type { SavedOfferAdjustmentSettings } from './offerAdjustmentsTypes';

type Params = {
  normalizeSimulatedOffers: (offers: SimulatedOffer[]) => SimulatedOffer[];
};

export const useOfferAdjustmentsPersistence = ({ normalizeSimulatedOffers }: Params) => {
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>('SINGLE');
  const [simulatedOffers, setSimulatedOffers] = useState<SimulatedOffer[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSettingsHydrated, setIsSettingsHydrated] = useState(false);

  // Latest values, so saving never depends on a stale closure.
  const latest = useRef({ maritalStatus, simulatedOffers });
  latest.current = { maritalStatus, simulatedOffers };

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const response = await getUserSettings();
        if (cancelled) return;

        const saved = (response.data?.offer_adjustment_settings ??
          null) as Partial<SavedOfferAdjustmentSettings> | null;
        if (!saved) return;

        if (typeof saved.maritalStatus === 'string') {
          setMaritalStatus(saved.maritalStatus as MaritalStatus);
        }
        if (Array.isArray(saved.simulatedOffers)) {
          setSimulatedOffers(normalizeSimulatedOffers(saved.simulatedOffers as SimulatedOffer[]));
        }
        if (typeof saved.savedAt === 'string') {
          setLastSavedAt(saved.savedAt);
        }
      } catch (error) {
        console.error('Failed to load saved offer adjustments', error);
      } finally {
        if (!cancelled) setIsSettingsHydrated(true);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [normalizeSimulatedOffers]);

  // `overrides` exists for callers that have just computed a new scenario list and cannot wait a
  // render for the ref to catch up — a setState followed immediately by a save would otherwise
  // persist the previous list.
  const saveAdjustments = useCallback(
    async (overrides?: { simulatedOffers?: SimulatedOffer[]; maritalStatus?: MaritalStatus }) => {
      const nowIso = new Date().toISOString();
      const payload: SavedOfferAdjustmentSettings = {
        maritalStatus: overrides?.maritalStatus ?? latest.current.maritalStatus,
        simulatedOffers: overrides?.simulatedOffers ?? latest.current.simulatedOffers,
        savedAt: nowIso,
      };

      await updateUserSettings({ offer_adjustment_settings: payload } as Record<string, unknown>);
      setLastSavedAt(nowIso);
      return nowIso;
    },
    []
  );

  return {
    maritalStatus,
    setMaritalStatus,
    simulatedOffers,
    setSimulatedOffers,
    lastSavedAt,
    setLastSavedAt,
    isSettingsHydrated,
    saveAdjustments,
  };
};
