import { useCallback, useEffect, useState } from 'react';
import type { MaritalStatus, SimulatedOffer } from './calculations';
import type { SavedOfferAdjustmentSettings } from './offerAdjustmentsTypes';

type Params = {
  storageKey: string;
  normalizeSimulatedOffers: (offers: SimulatedOffer[]) => SimulatedOffer[];
};

export const useOfferAdjustmentsPersistence = ({ storageKey, normalizeSimulatedOffers }: Params) => {
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>('SINGLE');
  const [simulatedOffers, setSimulatedOffers] = useState<SimulatedOffer[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSettingsHydrated, setIsSettingsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const saved = JSON.parse(raw) as Partial<SavedOfferAdjustmentSettings>;
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
      setIsSettingsHydrated(true);
    }
  }, [storageKey, normalizeSimulatedOffers]);

  const saveAdjustments = useCallback(() => {
    const nowIso = new Date().toISOString();
    const payload: SavedOfferAdjustmentSettings = {
      maritalStatus,
      simulatedOffers,
      savedAt: nowIso,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
    setLastSavedAt(nowIso);
    return nowIso;
  }, [maritalStatus, simulatedOffers, storageKey]);

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
