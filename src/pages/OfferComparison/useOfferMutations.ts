import { useCallback } from 'react';
import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  deleteApplication,
  deleteOffer,
  exportOffers,
  updateApplication,
  updateOffer,
} from '../../api';
import type { RaiseEntry } from '../../types';
import type { ApplicationLike as Application, OfferLike as Offer } from './calculations';
import type { useOfferDialogs } from './useOfferDialogs';
import type { useOfferEditor } from './useOfferEditor';

export const isOfferRejected = (offer: Partial<Offer>, app?: Application) =>
  offer.final_decision_status === 'REJECTED' ||
  offer.final_decision_status === 'DECLINED' ||
  app?.status === 'OFFER_REJECTED' ||
  app?.status === 'REJECTED';

export const useOfferMutations = ({
  offers,
  applicationsById,
  setOffers,
  setApplications,
  setVisibleOfferIds,
  setDecisionOrderIds,
  dialogs,
  editor,
  refresh,
  messageApi,
}: {
  offers: Offer[];
  applicationsById: Record<number, Application>;
  setOffers: React.Dispatch<React.SetStateAction<Offer[]>>;
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  setVisibleOfferIds: React.Dispatch<React.SetStateAction<string[]>>;
  setDecisionOrderIds: React.Dispatch<React.SetStateAction<string[]>>;
  dialogs: ReturnType<typeof useOfferDialogs>;
  editor: ReturnType<typeof useOfferEditor>;
  refresh: () => Promise<void> | void;
  messageApi: MessageInstance;
}) => {
  const toggleCurrent = async (offer: Offer) => {
    if (!offer.id) return;

    const targetIsCurrent = !offer.is_current;
    try {
      if (targetIsCurrent) {
        const otherCurrentOffers = offers.filter((o) => o.is_current && o.id !== offer.id);
        await Promise.all(
          otherCurrentOffers.map((o) =>
            o.id ? updateOffer(o.id, { ...o, is_current: false }) : null
          )
        );
      }

      const updated = { ...offer, is_current: targetIsCurrent };
      await updateOffer(offer.id, updated);
      setOffers((prev) =>
        prev.map((o) => {
          if (o.id === offer.id) return updated;
          if (targetIsCurrent && o.is_current) return { ...o, is_current: false };
          return o;
        })
      );
    } catch (error) {
      messageApi.error('Failed to update status');
      console.error(error);
    }
  };

  const persistOfferUpdates = useCallback(
    async (offer: Offer, updates: Partial<Offer>) => {
      if (typeof offer.id !== 'number') return;
      const merged: Offer = { ...offer, ...updates };
      await updateOffer(offer.id, merged);
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? merged : o)));
      dialogs.applyUpdatedOffer(merged);
      if (Object.prototype.hasOwnProperty.call(updates, 'final_decision_status')) {
        await refresh();
      }
    },
    // dialogs helpers are recreated each render but only wrap stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh, setOffers]
  );

  const handleToggleRejected = async (offer: Offer) => {
    if (typeof offer.id !== 'number') return;
    try {
      const linkedApp = applicationsById[offer.application];
      const currentlyRejected = isOfferRejected(offer, linkedApp);
      const nextStatus = currentlyRejected ? 'PENDING' : 'REJECTED';
      const updatedOffer: Offer = {
        ...offer,
        final_decision_status: nextStatus,
        is_current: currentlyRejected ? offer.is_current : false,
      };

      await updateOffer(offer.id, updatedOffer);
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? updatedOffer : o)));

      if (linkedApp && typeof linkedApp.id === 'number') {
        const appNextStatus = nextStatus === 'REJECTED' ? 'OFFER_REJECTED' : 'OFFER';
        await updateApplication(linkedApp.id, { status: appNextStatus });
        setApplications((prev) =>
          prev.map((app) => (app.id === linkedApp.id ? { ...app, status: appNextStatus } : app))
        );
      }

      messageApi.success(
        nextStatus === 'REJECTED' ? 'Offer marked as rejected' : 'Offer unmarked as rejected'
      );
    } catch (error) {
      messageApi.error('Failed to update offer status');
      console.error(error);
    }
  };

  const handleDeleteOffer = async (offer: Offer) => {
    try {
      const linkedApplication = applicationsById[offer.application];

      if (linkedApplication?.id) {
        await deleteApplication(linkedApplication.id);
        messageApi.success('Application and linked offer deleted');
      } else if (offer.id) {
        await deleteOffer(offer.id);
        messageApi.success('Offer deleted');
      } else {
        messageApi.error('Unable to find the linked application for this offer');
        return;
      }

      if (editor.editingOffer?.id === offer.id) {
        editor.setEditingOffer(null);
        editor.setEditingApp(null);
        editor.setOfferModalMode('edit');
      }
      dialogs.forgetOffer(offer.id);

      setOffers((prev) => prev.filter((item) => item.id !== offer.id));
      if (linkedApplication?.id) {
        setApplications((prev) => prev.filter((app) => app.id !== linkedApplication.id));
      }
      if (offer.id) {
        const removedOfferId = String(offer.id);
        setVisibleOfferIds((prev) => prev.filter((id) => id !== removedOfferId));
        setDecisionOrderIds((prev) => prev.filter((id) => id !== removedOfferId));
      }
    } catch (error) {
      messageApi.error('Failed to delete linked application');
      console.error(error);
    }
  };

  const handleSaveRaiseHistory = async (entries: RaiseEntry[]) => {
    const target = dialogs.raiseHistoryOffer;
    if (!target?.id) return;
    await updateOffer(target.id, { ...target, raise_history: entries });
    setOffers((prev) =>
      prev.map((o) => (o.id === target.id ? { ...o, raise_history: entries } : o))
    );
    dialogs.setRaiseHistoryOffer((prev) => (prev ? { ...prev, raise_history: entries } : prev));
  };

  const handleExportOffers = async (format: string) => {
    const response = await exportOffers(format);
    return {
      data: response.data,
      headers: response.headers as unknown as Record<string, string>,
    };
  };

  return {
    toggleCurrent,
    persistOfferUpdates,
    handleToggleRejected,
    handleDeleteOffer,
    handleSaveRaiseHistory,
    handleExportOffers,
  };
};
