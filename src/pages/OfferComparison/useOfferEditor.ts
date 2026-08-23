import { useState } from 'react';
import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { updateApplication, updateOffer } from '../../api';
import {
  type ApplicationLike as Application,
  type BenefitItem,
  type OfferLike as Offer,
  computeBenefitsTotal,
} from './calculations';
import { useSafeNullableFormState } from './useSafeFormState';

const normalizeDecisionScore = (value: unknown) => {
  const parsed = Number(value);
  return parsed >= 1 && parsed <= 5 ? parsed : null;
};

const normalizeBenefitItem = (item: Partial<BenefitItem>, fallbackId: string): BenefitItem => ({
  id: item.id || fallbackId,
  label: item.label || '',
  amount: Number(item.amount) || 0,
  frequency: item.frequency === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
  is_taxable: Boolean(item.is_taxable),
});

export const useOfferEditor = ({
  applications,
  setOffers,
  setApplications,
  messageApi,
}: {
  applications: Application[];
  setOffers: React.Dispatch<React.SetStateAction<Offer[]>>;
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  messageApi: MessageInstance;
}) => {
  const {
    state: editingOffer,
    setState: setEditingOffer,
    patch: patchEditingOffer,
    setField: setEditingOfferField,
  } = useSafeNullableFormState<Offer>(null);
  const {
    state: editingApp,
    setState: setEditingApp,
    patch: patchEditingApp,
  } = useSafeNullableFormState<Application>(null);
  const [editingBenefitItems, setEditingBenefitItems] = useState<BenefitItem[]>([]);
  const [offerModalMode, setOfferModalMode] = useState<'view' | 'edit'>('edit');

  const openOfferModal = (offer: Offer, mode: 'view' | 'edit') => {
    setOfferModalMode(mode);
    const app = applications.find((a) => a.id === offer.application);
    setEditingApp(
      app
        ? {
            ...app,
            rto_policy: app.rto_policy && app.rto_policy !== 'UNKNOWN' ? app.rto_policy : 'HYBRID',
            rto_days_per_week:
              typeof app.rto_days_per_week === 'number'
                ? app.rto_days_per_week
                : app.rto_policy === 'REMOTE'
                  ? 0
                  : app.rto_policy === 'ONSITE'
                    ? 5
                    : 3,
            commute_cost_value: Number(app.commute_cost_value || 0),
            commute_cost_frequency: (app.commute_cost_frequency || 'MONTHLY') as
              | 'DAILY'
              | 'MONTHLY'
              | 'YEARLY',
            free_food_perk_value: Number(app.free_food_perk_value || 0),
            free_food_perk_frequency: (app.free_food_perk_frequency || 'YEARLY') as
              | 'DAILY'
              | 'MONTHLY'
              | 'YEARLY',
            tax_base_rate: app.tax_base_rate != null ? Number(app.tax_base_rate) : undefined,
            tax_bonus_rate: app.tax_bonus_rate != null ? Number(app.tax_bonus_rate) : undefined,
            tax_equity_rate: app.tax_equity_rate != null ? Number(app.tax_equity_rate) : undefined,
            monthly_rent_override:
              app.monthly_rent_override != null ? Number(app.monthly_rent_override) : undefined,
            visa_sponsorship:
              app.visa_sponsorship && app.visa_sponsorship !== 'UNKNOWN'
                ? app.visa_sponsorship
                : '',
            day_one_gc: app.day_one_gc && app.day_one_gc !== 'UNKNOWN' ? app.day_one_gc : '',
            growth_score: normalizeDecisionScore(app.growth_score),
            work_life_score: normalizeDecisionScore(app.work_life_score),
            brand_score: normalizeDecisionScore(app.brand_score),
            team_score: normalizeDecisionScore(app.team_score),
          }
        : null
    );
    setEditingOffer({ ...offer, is_unlimited_pto: !!offer.is_unlimited_pto });
    const benefitItems =
      Array.isArray(offer.benefit_items) && offer.benefit_items.length > 0
        ? offer.benefit_items.map((item, idx) =>
            normalizeBenefitItem(item, `edit-benefit-${offer.id || Date.now()}-${idx}`)
          )
        : [
            {
              id: `edit-benefit-${Date.now()}`,
              label: 'Benefits',
              amount: Number(offer.benefits_value) || 0,
              frequency: 'YEARLY' as const,
            },
          ];
    setEditingBenefitItems(benefitItems);
  };

  const handleEditClick = (offer: Offer) => {
    openOfferModal(offer, 'edit');
  };

  const handleSaveEdit = async () => {
    if (!editingOffer) return;

    try {
      let updatedApplication:
        | (Partial<Application> & { company_details?: { name?: string } })
        | null = null;
      if (editingApp) {
        const applicationResponse = await updateApplication(editingApp.id, {
          company_name: editingApp.company_name,
          role_title: editingApp.role_title,
          location: editingApp.location,
          office_location: editingApp.office_location || '',
          rto_policy:
            editingApp.rto_policy && editingApp.rto_policy !== 'UNKNOWN'
              ? editingApp.rto_policy
              : 'HYBRID',
          rto_days_per_week: editingApp.rto_days_per_week ?? 0,
          commute_cost_value: editingApp.commute_cost_value ?? 0,
          commute_cost_frequency: editingApp.commute_cost_frequency ?? 'MONTHLY',
          commute_options: editingApp.commute_options ?? [],
          free_food_perk_value: editingApp.free_food_perk_value ?? 0,
          free_food_perk_frequency: editingApp.free_food_perk_frequency ?? 'YEARLY',
          // Explicit whitelist: a new field is silently dropped unless listed here.
          free_food_meals: editingApp.free_food_meals ?? [],
          free_food_value_per_meal: editingApp.free_food_value_per_meal ?? null,
          tax_base_rate: editingApp.tax_base_rate ?? null,
          tax_bonus_rate: editingApp.tax_bonus_rate ?? null,
          tax_equity_rate: editingApp.tax_equity_rate ?? null,
          monthly_rent_override: editingApp.monthly_rent_override ?? null,
          visa_sponsorship:
            editingApp.visa_sponsorship && editingApp.visa_sponsorship !== 'UNKNOWN'
              ? editingApp.visa_sponsorship
              : '',
          day_one_gc:
            editingApp.day_one_gc && editingApp.day_one_gc !== 'UNKNOWN'
              ? editingApp.day_one_gc
              : '',
          growth_score: editingApp.growth_score ?? null,
          work_life_score: editingApp.work_life_score ?? null,
          brand_score: editingApp.brand_score ?? null,
          team_score: editingApp.team_score ?? null,
          flexible_hours_policy: editingApp.flexible_hours_policy || 'UNKNOWN',
          travel_frequency: editingApp.travel_frequency || 'UNKNOWN',
          level: editingApp.level ?? '',
        });
        updatedApplication = applicationResponse.data as Partial<Application> & {
          company_details?: { name?: string };
        };
      }

      const offerResponse = await updateOffer(editingOffer.id!, {
        ...editingOffer,
        benefit_items: editingBenefitItems,
        benefits_value: computeBenefitsTotal(editingBenefitItems),
      });
      const updatedOffer = offerResponse.data as Partial<Offer>;

      if (updatedApplication && editingApp) {
        setApplications((prev) =>
          prev.map((app) =>
            app.id === editingApp.id
              ? ({
                  ...app,
                  ...editingApp,
                  ...updatedApplication,
                  company_name:
                    updatedApplication.company_details?.name ||
                    updatedApplication.company_name ||
                    editingApp.company_name ||
                    app.company_name,
                } as Application)
              : app
          )
        );
      }

      setOffers((prev) =>
        prev.map((offer) =>
          offer.id === editingOffer.id
            ? {
                ...offer,
                ...editingOffer,
                ...updatedOffer,
                benefit_items: editingBenefitItems,
                benefits_value: computeBenefitsTotal(editingBenefitItems),
                application_details: updatedOffer.application_details || {
                  company:
                    updatedApplication?.company_details?.name ||
                    updatedApplication?.company_name ||
                    editingApp?.company_name ||
                    offer.application_details?.company ||
                    '',
                  role_title:
                    updatedApplication?.role_title ||
                    editingApp?.role_title ||
                    offer.application_details?.role_title ||
                    '',
                },
              }
            : offer
        )
      );

      messageApi.success('Offer updated successfully');
      setEditingOffer(null);
      setEditingApp(null);
      setOfferModalMode('edit');
    } catch (error) {
      messageApi.error('Failed to save changes');
      console.error(error);
    }
  };

  const updateEditingBenefits = (items: BenefitItem[]) => {
    setEditingBenefitItems(items);
    const total = computeBenefitsTotal(items);
    patchEditingOffer({
      benefits_value: total,
      benefit_items: items,
    });
  };

  const addEditingBenefitItem = () => {
    updateEditingBenefits([
      ...editingBenefitItems,
      { id: `edit-benefit-${Date.now()}`, label: '', amount: 0, frequency: 'MONTHLY' },
    ]);
  };

  const updateEditingBenefitItem = (id: string, patch: Partial<BenefitItem>) => {
    updateEditingBenefits(
      editingBenefitItems.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const removeEditingBenefitItem = (id: string) => {
    updateEditingBenefits(editingBenefitItems.filter((item) => item.id !== id));
  };

  return {
    editingOffer,
    setEditingOffer,
    patchEditingOffer,
    setEditingOfferField,
    editingApp,
    setEditingApp,
    patchEditingApp,
    editingBenefitItems,
    offerModalMode,
    setOfferModalMode,
    openOfferModal,
    handleEditClick,
    handleSaveEdit,
    updateEditingBenefits,
    addEditingBenefitItem,
    updateEditingBenefitItem,
    removeEditingBenefitItem,
  };
};
