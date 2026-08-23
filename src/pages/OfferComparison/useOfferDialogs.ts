import { useState } from 'react';
import type { OfferLike as Offer } from './calculations';

// The four modals that target a single offer, plus a way to drop a deleted one.
export const useOfferDialogs = () => {
  const [negotiatingOffer, setNegotiatingOffer] = useState<Offer | null>(null);
  const [negotiationLogOffer, setNegotiationLogOffer] = useState<Offer | null>(null);
  const [raiseHistoryOffer, setRaiseHistoryOffer] = useState<Offer | null>(null);
  const [snapshotOffer, setSnapshotOffer] = useState<Offer | null>(null);

  const forgetOffer = (offerId?: number | string) => {
    const matches = (offer: Offer | null) => offer?.id === offerId;
    setNegotiatingOffer((prev) => (matches(prev) ? null : prev));
    setNegotiationLogOffer((prev) => (matches(prev) ? null : prev));
    setRaiseHistoryOffer((prev) => (matches(prev) ? null : prev));
    setSnapshotOffer((prev) => (matches(prev) ? null : prev));
  };

  const applyUpdatedOffer = (updated: Offer) => {
    const swap = (prev: Offer | null) => (prev && prev.id === updated.id ? updated : prev);
    setNegotiationLogOffer(swap);
    setNegotiatingOffer(swap);
  };

  return {
    negotiatingOffer,
    setNegotiatingOffer,
    negotiationLogOffer,
    setNegotiationLogOffer,
    raiseHistoryOffer,
    setRaiseHistoryOffer,
    snapshotOffer,
    setSnapshotOffer,
    forgetOffer,
    applyUpdatedOffer,
  };
};
