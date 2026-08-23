import { useCallback } from 'react';
import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  createOfferDecisionSnapshot,
  updateApplication,
  updateOffer,
  type OfferDecisionSnapshot,
} from '../../api';
import type { DecisionRow } from './decisionScoring';
import type { ApplicationLike as Application, OfferLike as Offer } from './calculations';
import { buildDecisionSnapshotPayload } from './decisionSnapshotPayload';
import { buildSnapshotRestorePatches } from './decisionSnapshotRestore';
import type { AdjustedOfferMetrics } from './types';

export const useDecisionSnapshots = ({
  offers,
  setOffers,
  setApplications,
  setSnapshotOffer,
  applicationsById,
  adjustedByOfferId,
  maritalStatus,
  referenceLocation,
  messageApi,
}: {
  offers: Offer[];
  setOffers: React.Dispatch<React.SetStateAction<Offer[]>>;
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  setSnapshotOffer: React.Dispatch<React.SetStateAction<Offer | null>>;
  applicationsById: Record<number, Application>;
  adjustedByOfferId: Record<string, AdjustedOfferMetrics | undefined>;
  maritalStatus: string;
  referenceLocation: string;
  messageApi: MessageInstance;
}) => {
  const handleSaveDecisionSnapshot = useCallback(
    async (offer: Offer, row: DecisionRow) => {
      const payload = buildDecisionSnapshotPayload(offer, row, {
        applicationsById,
        adjustedByOfferId,
        maritalStatus,
        referenceLocation,
      });
      if (!payload) {
        messageApi.error('Save the offer before creating a snapshot');
        return;
      }

      try {
        await createOfferDecisionSnapshot(payload);
        messageApi.success('Decision snapshot saved');
      } catch (error) {
        messageApi.error('Failed to save decision snapshot');
        console.error(error);
      }
    },
    [adjustedByOfferId, applicationsById, maritalStatus, messageApi, referenceLocation]
  );

  const handleRestoreDecisionSnapshot = useCallback(
    async (snapshot: OfferDecisionSnapshot) => {
      const targetOffer = offers.find((offer) => offer.id === snapshot.offer);
      if (!targetOffer?.id) {
        throw new Error('Unable to find offer for snapshot restore');
      }
      const { offerPatch, applicationPatch, offerSnapshot } = buildSnapshotRestorePatches(
        snapshot,
        targetOffer
      );

      const [offerResponse, applicationResponse] = await Promise.all([
        updateOffer(targetOffer.id, offerPatch),
        updateApplication(targetOffer.application, applicationPatch),
      ]);

      const restoredOffer = offerResponse.data as Partial<Offer>;
      const restoredApplication = applicationResponse.data as Partial<Application> & {
        company_details?: { name?: string };
      };

      setOffers((prev) =>
        prev.map((offer) =>
          offer.id === targetOffer.id
            ? {
                ...offer,
                ...offerPatch,
                ...restoredOffer,
                application_details: restoredOffer.application_details || {
                  company:
                    restoredApplication.company_details?.name ||
                    restoredApplication.company_name ||
                    (typeof offerSnapshot.company === 'string' ? offerSnapshot.company : '') ||
                    offer.application_details?.company ||
                    '',
                  role_title:
                    restoredApplication.role_title ||
                    (typeof offerSnapshot.role === 'string' ? offerSnapshot.role : '') ||
                    offer.application_details?.role_title ||
                    '',
                },
              }
            : offer
        )
      );

      setApplications((prev) =>
        prev.map((app) =>
          app.id === targetOffer.application
            ? ({
                ...app,
                ...applicationPatch,
                ...restoredApplication,
                role_title: restoredApplication.role_title || app.role_title,
                company_name:
                  restoredApplication.company_details?.name ||
                  restoredApplication.company_name ||
                  app.company_name,
              } as Application)
            : app
        )
      );

      setSnapshotOffer((current) => {
        if (!current || current.id !== targetOffer.id) return current;
        return {
          ...current,
          ...offerPatch,
          ...restoredOffer,
          application_details: restoredOffer.application_details || current.application_details,
        };
      });
    },
    [offers, setApplications, setOffers, setSnapshotOffer]
  );

  return { handleSaveDecisionSnapshot, handleRestoreDecisionSnapshot };
};
