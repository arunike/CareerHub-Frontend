import React, { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  createOfferDecisionSnapshot,
  type OfferDecisionSnapshot,
  type OfferDecisionSnapshotPayload,
} from '../../api';
import { PlusOutlined } from '@ant-design/icons';
import PageActionToolbar from '../../components/PageActionToolbar';
import { getAvailableYears, filterByYear, getCurrentYear } from '../../utils/yearFilter';
import { todayDateOnlyLocal } from '../../utils/dateOnly';
import { Button, message, Select, Spin } from 'antd';
import { useSafeNullableFormState, useSafeFormState } from './useSafeFormState';
import { useScenarioRows } from './useScenarioRows';
import { useOfferReferenceData } from './useOfferReferenceData';
import { useOfferAdjustmentsPersistence } from './useOfferAdjustmentsPersistence';
import { getEffectiveTaxLocation } from '../../utils/applicationLocation';
import { usePersistedState } from '../../hooks/usePersistedState';
import OfferDecisionScorecard from './OfferDecisionScorecard';
import type { DecisionRow } from './OfferDecisionScorecard';
import { loadUsCityOptions } from '../../lib/usCityOptions';
import type { RaiseEntry } from '../../types';
import {
  type ApplicationLike as Application,
  type BenefitItem,
  type OfferLike as Offer,
  type SimulatedOffer,
  annualizeAmount,
  computeBenefitsTotal,
  estimateColIndexFromCity,
} from './calculations';

const OfferComparisonChart = lazy(() => import('./OfferComparisonChart'));
const ScenarioOfferModal = lazy(() => import('./ScenarioOfferModal'));
const AddCurrentJobModal = lazy(() => import('./AddCurrentJobModal'));
const EditOfferModal = lazy(() => import('./EditOfferModal'));
const NegotiationAdvisorModal = lazy(() => import('./NegotiationAdvisorModal'));
const RaiseHistoryModal = lazy(() => import('./RaiseHistoryModal'));
const CompensationSimulator = lazy(() => import('./CompensationSimulator'));
const OfferDecisionSnapshotsModal = lazy(() => import('./OfferDecisionSnapshotsModal'));

const LazySectionFallback = () => (
  <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
    <Spin size="large" />
  </div>
);

const normalizeBenefitItem = (item: Partial<BenefitItem>, fallbackId: string): BenefitItem => ({
  id: item.id || fallbackId,
  label: item.label || '',
  amount: Number(item.amount) || 0,
  frequency: item.frequency === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
});

const normalizeDecisionScore = (value: unknown) => {
  const parsed = Number(value);
  return parsed >= 1 && parsed <= 5 ? parsed : null;
};

const snapshotValue = (snapshot: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(snapshot, key) ? snapshot[key] : undefined;

const OFFER_ADJUSTMENT_SETTINGS_KEY = 'careerhub.offerAdjustments.v1';

const defaultScenarioDraft = (): SimulatedOffer => ({
  id: '',
  application: null,
  custom_company_name: '',
  custom_role_title: '',
  location: 'San Francisco, CA, United States',
  office_location: '',
  base_salary: 100000,
  bonus: 20000,
  equity: 20000,
  equity_total_grant: 80000,
  equity_vesting_percent: 25,
  equity_vesting_schedule: [25, 25, 25, 25],
  sign_on: 10000,
  benefits_value: 12000,
  work_mode: 'HYBRID',
  rto_days_per_week: 3,
  commute_cost_value: 200,
  commute_cost_frequency: 'MONTHLY',
  free_food_perk_value: 0,
  free_food_perk_frequency: 'YEARLY',
  pto_days: 15,
  is_unlimited_pto: false,
  holiday_days: 11,
  tax_base_rate: 32,
  tax_bonus_rate: 40,
  tax_equity_rate: 42,
  monthly_rent: 3500,
});

const OfferComparison = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [newJobName, setNewJobName] = useState('Current Employer');
  const [negotiatingOffer, setNegotiatingOffer] = useState<Offer | null>(null);
  const [raiseHistoryOffer, setRaiseHistoryOffer] = useState<Offer | null>(null);
  const [snapshotOffer, setSnapshotOffer] = useState<Offer | null>(null);
  const [decisionOrderIds, setDecisionOrderIds] = useState<string[]>([]);
  
  const [isAddScenarioOpen, setIsAddScenarioOpen] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [scenarioModalMode, setScenarioModalMode] = useState<'add' | 'view' | 'edit'>('add');
  const [scenarioBenefitItems, setScenarioBenefitItems] = useState<BenefitItem[]>([
    { id: 'benefit-gym', label: 'Gym Reimbursement', amount: 100, frequency: 'MONTHLY' },
    { id: 'benefit-phone', label: 'Cellphone Reimbursement', amount: 100, frequency: 'MONTHLY' },
  ]);

  const {
    state: newScenario,
    setState: setNewScenario,
    patch: patchNewScenario,
    setField: setNewScenarioField,
  } = useSafeFormState<SimulatedOffer>(defaultScenarioDraft());
  const [selectedYear, setSelectedYear] = usePersistedState<number | 'all'>(
    'offersSelectedYear',
    getCurrentYear(),
    {
      serialize: (value) => value.toString(),
      deserialize: (raw) => (raw === 'all' ? 'all' : parseInt(raw)),
    }
  );
  const [visibleOfferIds, setVisibleOfferIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allUsCityOptions, setAllUsCityOptions] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [offersResp, appsResp] = await Promise.all([getOffers(), getApplications()]);
      setOffers(offersResp.data);

      const formattedApps = appsResp.data.map(
        (app: { company_details?: { name: string }; [key: string]: unknown }) => ({
          ...app,
          company_name: app.company_details?.name || '',
        })
      );
      setApplications(formattedApps);
    } catch (error) {
      setLoadError('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    loadUsCityOptions()
      .then(setAllUsCityOptions)
      .catch((error) => {
        console.error('Failed to load US city options', error);
      });
  }, []);

  useEffect(() => {
    if (!loadError) return;
    messageApi.error(loadError);
    setLoadError(null);
  }, [loadError, messageApi]);

  const getApplicationName = (appId: number) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return `App #${appId}`;

    if (app.company_name && app.role_title) {
      return `${app.company_name} - ${app.role_title}`;
    }
    return app.company_name || app.role_title || `App #${appId}`;
  };

  const openOfferModal = (offer: Offer, mode: 'view' | 'edit') => {
    setOfferModalMode(mode);
    const app = applications.find((a) => a.id === offer.application);
    setEditingApp(
      app
        ? {
            ...app,
            rto_days_per_week:
              typeof app.rto_days_per_week === 'number'
                ? app.rto_days_per_week
                : app.rto_policy === 'REMOTE'
                  ? 0
                  : app.rto_policy === 'ONSITE'
                    ? 5
                    : 3,
            commute_cost_value: Number(app.commute_cost_value || 0),
            commute_cost_frequency: (app.commute_cost_frequency || 'MONTHLY') as 'DAILY' | 'MONTHLY' | 'YEARLY',
            free_food_perk_value: Number(app.free_food_perk_value || 0),
            free_food_perk_frequency: (app.free_food_perk_frequency || 'YEARLY') as 'DAILY' | 'MONTHLY' | 'YEARLY',
            tax_base_rate: app.tax_base_rate != null ? Number(app.tax_base_rate) : undefined,
            tax_bonus_rate: app.tax_bonus_rate != null ? Number(app.tax_bonus_rate) : undefined,
            tax_equity_rate: app.tax_equity_rate != null ? Number(app.tax_equity_rate) : undefined,
            monthly_rent_override:
              app.monthly_rent_override != null ? Number(app.monthly_rent_override) : undefined,
            visa_sponsorship: app.visa_sponsorship && app.visa_sponsorship !== 'UNKNOWN' ? app.visa_sponsorship : '',
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
      let updatedApplication: (Partial<Application> & { company_details?: { name?: string } }) | null = null;
      if (editingApp) {
        const applicationResponse = await updateApplication(editingApp.id, {
          company_name: editingApp.company_name,
          role_title: editingApp.role_title,
          location: editingApp.location,
          office_location: editingApp.office_location || '',
          rto_policy: editingApp.rto_policy,
          rto_days_per_week: editingApp.rto_days_per_week ?? 0,
          commute_cost_value: editingApp.commute_cost_value ?? 0,
          commute_cost_frequency: editingApp.commute_cost_frequency ?? 'MONTHLY',
          free_food_perk_value: editingApp.free_food_perk_value ?? 0,
          free_food_perk_frequency: editingApp.free_food_perk_frequency ?? 'YEARLY',
          tax_base_rate: editingApp.tax_base_rate ?? null,
          tax_bonus_rate: editingApp.tax_bonus_rate ?? null,
          tax_equity_rate: editingApp.tax_equity_rate ?? null,
          monthly_rent_override: editingApp.monthly_rent_override ?? null,
          visa_sponsorship: editingApp.visa_sponsorship && editingApp.visa_sponsorship !== 'UNKNOWN' ? editingApp.visa_sponsorship : '',
          day_one_gc: editingApp.day_one_gc && editingApp.day_one_gc !== 'UNKNOWN' ? editingApp.day_one_gc : '',
          growth_score: editingApp.growth_score ?? null,
          work_life_score: editingApp.work_life_score ?? null,
          brand_score: editingApp.brand_score ?? null,
          team_score: editingApp.team_score ?? null,
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

  const toggleCurrent = async (offer: Offer) => {
    if (!offer.id) return;

    const updated = { ...offer, is_current: !offer.is_current };
    try {
      await updateOffer(offer.id, updated);
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? updated : o)));
    } catch (error) {
      messageApi.error('Failed to update status');
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

      if (editingOffer?.id === offer.id) {
        setEditingOffer(null);
        setEditingApp(null);
        setOfferModalMode('edit');
      }
      if (negotiatingOffer?.id === offer.id) {
        setNegotiatingOffer(null);
      }
      if (raiseHistoryOffer?.id === offer.id) {
        setRaiseHistoryOffer(null);
      }
      if (snapshotOffer?.id === offer.id) {
        setSnapshotOffer(null);
      }

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
    if (!raiseHistoryOffer?.id) return;
    await updateOffer(raiseHistoryOffer.id, { ...raiseHistoryOffer, raise_history: entries });
    setOffers((prev) =>
      prev.map((o) => (o.id === raiseHistoryOffer.id ? { ...o, raise_history: entries } : o))
    );
    setRaiseHistoryOffer((prev) => (prev ? { ...prev, raise_history: entries } : prev));
  };

  const handleAddCurrentJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName) return;

    try {
      const appResp = await createApplication({
        company_name: newJobName,
        role_title: 'Current Role',
        status: 'ACCEPTED',
        date_applied: todayDateOnlyLocal(),
        office_location: '',
        visa_sponsorship: '',
        day_one_gc: '',
      });
      const appId = appResp.data.id;

      await createOffer({
        application: appId,
        base_salary: 0,
        is_current: true,
        bonus: 0,
        equity: 0,
        sign_on: 0,
        benefits_value: 0,
        benefit_items: [],
        pto_days: 15,
        is_unlimited_pto: false,
        holiday_days: 11,
      });

      fetchData();
      messageApi.success('Current job added!');
      setIsAddJobOpen(false);
      setNewJobName('Current Employer');
    } catch (error) {
      messageApi.error('Failed to add current job');
      console.error(error);
    }
  };

  const filteredOffers = filterByYear(offers, selectedYear, 'created_at');
  const availableYears = getAvailableYears(offers, 'created_at');
  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };

  const normalizeSimulatedOffers = useCallback(
    (offersToNormalize: SimulatedOffer[]) =>
      offersToNormalize.map((offer) => {
        const benefitItems =
          Array.isArray(offer.benefit_items) && offer.benefit_items.length > 0
            ? offer.benefit_items.map((item, idx) =>
                normalizeBenefitItem(item, `scenario-benefit-${offer.id || 'saved'}-${idx}`)
              )
            : [
                {
                  id: `scenario-benefit-legacy-${offer.id || Date.now()}`,
                  label: 'Benefits',
                  amount: Number(offer.benefits_value || 0),
                  frequency: 'YEARLY' as const,
                },
              ];
        return {
          ...offer,
          benefit_items: benefitItems,
          benefits_value: computeBenefitsTotal(benefitItems),
          is_unlimited_pto: !!offer.is_unlimited_pto,
        };
      }),
    []
  );

  const {
    maritalStatus,
    setMaritalStatus,
    simulatedOffers,
    setSimulatedOffers,
    isSettingsHydrated,
    saveAdjustments,
  } = useOfferAdjustmentsPersistence({
    storageKey: OFFER_ADJUSTMENT_SETTINGS_KEY,
    normalizeSimulatedOffers,
  });

  const applicationsById = useMemo(
    () =>
      applications.reduce<Record<number, Application>>((acc, app) => {
        acc[app.id] = app;
        return acc;
      }, {}),
    [applications]
  );

  const referenceLocation = useMemo(() => {
    const current = filteredOffers.find((offer) => offer.is_current) || filteredOffers[0];
    if (current) {
      const currentApp = applications.find((app) => app.id === current.application);
      const currentLocation = getEffectiveTaxLocation(currentApp);
      if (currentLocation) return currentLocation;
    }
    const anyLocation = applications.map((app) => getEffectiveTaxLocation(app)).find(Boolean);
    return anyLocation || 'San Francisco, CA, United States';
  }, [filteredOffers, applications]);

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
    () => estimateColIndexFromCity(referenceLocation, cityCostOfLiving, stateColBase, stateNameToAbbr),
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
  });

  const buildDecisionSnapshotPayload = useCallback(
    (offer: Offer, row: DecisionRow): Partial<OfferDecisionSnapshotPayload> | null => {
      if (!offer.id) return null;
      const application = applicationsById[offer.application];
      const metrics = adjustedByOfferId[offer.id];
      const totalComp =
        Number(offer.base_salary || 0) +
        Number(offer.bonus || 0) +
        Number(offer.equity || 0) +
        Number(offer.sign_on || 0) +
        Number(offer.benefits_value || 0);
      const titleDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      return {
        offer: offer.id,
        title: `${application?.company_name || offer.application_details?.company || 'Offer'} decision - ${titleDate}`,
        notes: '',
        decision_score: row.score ?? null,
        rank: row.rank ?? null,
        total_comp: totalComp.toFixed(2),
        adjusted_value: metrics?.adjustedValue != null ? metrics.adjustedValue.toFixed(2) : null,
        monthly_rent: metrics?.monthlyRent != null ? metrics.monthlyRent.toFixed(2) : null,
        commute_cost_annual: annualizeAmount(
          Number(application?.commute_cost_value || 0),
          application?.commute_cost_frequency || 'MONTHLY'
        ).toFixed(2),
        tax_snapshot: {
          base: metrics?.usedBaseTaxRate ?? application?.tax_base_rate ?? null,
          bonus: metrics?.usedBonusTaxRate ?? application?.tax_bonus_rate ?? null,
          equity: metrics?.usedEquityTaxRate ?? application?.tax_equity_rate ?? null,
        },
        score_categories: row.categories || [],
        offer_snapshot: {
          company: application?.company_name || offer.application_details?.company || '',
          role: application?.role_title || offer.application_details?.role_title || '',
          base_salary: offer.base_salary,
          bonus: offer.bonus,
          equity: offer.equity,
          equity_total_grant: offer.equity_total_grant,
          equity_vesting_percent: offer.equity_vesting_percent,
          equity_vesting_schedule: offer.equity_vesting_schedule || [],
          sign_on: offer.sign_on,
          benefits_value: offer.benefits_value,
          benefit_items: offer.benefit_items || [],
          pto_days: offer.pto_days,
          is_unlimited_pto: offer.is_unlimited_pto || false,
          holiday_days: offer.holiday_days || 0,
          work_mode: application?.rto_policy || '',
          office_location: application?.office_location || '',
        },
        adjustment_snapshot: {
          marital_status: maritalStatus,
          reference_location: referenceLocation,
          adjusted_diff: metrics?.adjustedDiff ?? null,
          after_tax_base: metrics?.afterTaxBase ?? null,
          after_tax_bonus: metrics?.afterTaxBonus ?? null,
          after_tax_sign_on: metrics?.afterTaxSignOn ?? null,
          after_tax_equity: metrics?.afterTaxEquity ?? null,
          rto_policy: application?.rto_policy || '',
          rto_days_per_week: application?.rto_days_per_week ?? 0,
          commute_cost_value: application?.commute_cost_value ?? 0,
          commute_cost_frequency: application?.commute_cost_frequency || 'MONTHLY',
          free_food_perk_value: application?.free_food_perk_value ?? 0,
          free_food_perk_frequency: application?.free_food_perk_frequency || 'YEARLY',
          tax_base_rate: application?.tax_base_rate ?? null,
          tax_bonus_rate: application?.tax_bonus_rate ?? null,
          tax_equity_rate: application?.tax_equity_rate ?? null,
          monthly_rent_override: application?.monthly_rent_override ?? null,
          growth_score: application?.growth_score ?? null,
          work_life_score: application?.work_life_score ?? null,
          brand_score: application?.brand_score ?? null,
          team_score: application?.team_score ?? null,
          visa_sponsorship: application?.visa_sponsorship || '',
          day_one_gc: application?.day_one_gc || '',
        },
        is_locked: false,
      };
    },
    [adjustedByOfferId, applicationsById, maritalStatus, referenceLocation]
  );

  const handleSaveDecisionSnapshot = useCallback(
    async (offer: Offer, row: DecisionRow) => {
      const payload = buildDecisionSnapshotPayload(offer, row);
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
    [buildDecisionSnapshotPayload, messageApi]
  );

  const handleRestoreDecisionSnapshot = useCallback(
    async (snapshot: OfferDecisionSnapshot) => {
      const offerSnapshot = snapshot.offer_snapshot || {};
      const adjustmentSnapshot = snapshot.adjustment_snapshot || {};
      const targetOffer = offers.find((offer) => offer.id === snapshot.offer);
      if (!targetOffer?.id) {
        throw new Error('Unable to find offer for snapshot restore');
      }
      const restoredBenefitItems =
        Array.isArray(offerSnapshot.benefit_items) && offerSnapshot.benefit_items.length > 0
          ? offerSnapshot.benefit_items.map((item, idx) =>
              normalizeBenefitItem(
                item as Partial<BenefitItem>,
                `snapshot-benefit-${snapshot.id}-${idx}`
              )
            )
          : [
              {
                id: `snapshot-benefit-${snapshot.id}`,
                label: 'Benefits',
                amount: Number(offerSnapshot.benefits_value ?? targetOffer.benefits_value ?? 0),
                frequency: 'YEARLY' as const,
              },
            ];

      const offerPatch = {
        base_salary: Number(offerSnapshot.base_salary ?? targetOffer.base_salary),
        bonus: Number(offerSnapshot.bonus ?? targetOffer.bonus),
        equity: Number(offerSnapshot.equity ?? targetOffer.equity),
        equity_total_grant:
          offerSnapshot.equity_total_grant == null
            ? targetOffer.equity_total_grant
            : Number(offerSnapshot.equity_total_grant),
        equity_vesting_percent:
          offerSnapshot.equity_vesting_percent == null
            ? targetOffer.equity_vesting_percent
            : Number(offerSnapshot.equity_vesting_percent),
        equity_vesting_schedule: Array.isArray(offerSnapshot.equity_vesting_schedule)
          ? offerSnapshot.equity_vesting_schedule.map(Number)
          : targetOffer.equity_vesting_schedule,
        sign_on: Number(offerSnapshot.sign_on ?? targetOffer.sign_on),
        benefits_value: Number(offerSnapshot.benefits_value ?? targetOffer.benefits_value),
        benefit_items: restoredBenefitItems,
        pto_days: Number(offerSnapshot.pto_days ?? targetOffer.pto_days),
        is_unlimited_pto: Boolean(offerSnapshot.is_unlimited_pto ?? targetOffer.is_unlimited_pto),
        holiday_days:
          offerSnapshot.holiday_days == null ? targetOffer.holiday_days : Number(offerSnapshot.holiday_days),
      };

      const applicationPatch: Record<string, unknown> = {
        company_name: typeof offerSnapshot.company === 'string' ? offerSnapshot.company : undefined,
        role_title: typeof offerSnapshot.role === 'string' ? offerSnapshot.role : undefined,
        office_location: typeof offerSnapshot.office_location === 'string' ? offerSnapshot.office_location : undefined,
        rto_policy: (snapshotValue(adjustmentSnapshot, 'rto_policy') ??
          snapshotValue(offerSnapshot, 'work_mode')) as Application['rto_policy'],
        rto_days_per_week: snapshotValue(adjustmentSnapshot, 'rto_days_per_week') as number | undefined,
        commute_cost_value: snapshotValue(adjustmentSnapshot, 'commute_cost_value') as number | undefined,
        commute_cost_frequency: snapshotValue(adjustmentSnapshot, 'commute_cost_frequency') as Application['commute_cost_frequency'],
        free_food_perk_value: snapshotValue(adjustmentSnapshot, 'free_food_perk_value') as number | undefined,
        free_food_perk_frequency: snapshotValue(adjustmentSnapshot, 'free_food_perk_frequency') as Application['free_food_perk_frequency'],
        tax_base_rate: snapshotValue(adjustmentSnapshot, 'tax_base_rate'),
        tax_bonus_rate: snapshotValue(adjustmentSnapshot, 'tax_bonus_rate'),
        tax_equity_rate: snapshotValue(adjustmentSnapshot, 'tax_equity_rate'),
        monthly_rent_override: snapshotValue(adjustmentSnapshot, 'monthly_rent_override'),
        growth_score: snapshotValue(adjustmentSnapshot, 'growth_score') as number | null | undefined,
        work_life_score: snapshotValue(adjustmentSnapshot, 'work_life_score') as number | null | undefined,
        brand_score: snapshotValue(adjustmentSnapshot, 'brand_score') as number | null | undefined,
        team_score: snapshotValue(adjustmentSnapshot, 'team_score') as number | null | undefined,
        visa_sponsorship: snapshotValue(adjustmentSnapshot, 'visa_sponsorship') as Application['visa_sponsorship'],
        day_one_gc: snapshotValue(adjustmentSnapshot, 'day_one_gc') as Application['day_one_gc'],
      };

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
    [offers]
  );

  const customFormTaxPreview = useMemo(() => {
    const tax = {
      baseTaxRate: Number(newScenario.tax_base_rate ?? 32),
      bonusTaxRate: Number(newScenario.tax_bonus_rate ?? 40),
      equityTaxRate: Number(newScenario.tax_equity_rate ?? 42),
    };
    return {
      ...tax,
      note: 'Per-offer manual',
    };
  }, [newScenario.tax_base_rate, newScenario.tax_bonus_rate, newScenario.tax_equity_rate]);

  const resetScenarioDraft = () => {
    setNewScenario(defaultScenarioDraft());
    setScenarioBenefitItems([
      { id: 'benefit-gym', label: 'Gym Reimbursement', amount: 100, frequency: 'MONTHLY' },
      { id: 'benefit-phone', label: 'Cellphone Reimbursement', amount: 100, frequency: 'MONTHLY' },
    ]);
    setEditingScenarioId(null);
    setScenarioModalMode('add');
  };

  const addScenarioBenefitItem = () => {
    setScenarioBenefitItems((prev) => [
      ...prev,
      { id: `scenario-benefit-${Date.now()}`, label: '', amount: 0, frequency: 'MONTHLY' },
    ]);
  };

  const updateScenarioBenefitItem = (id: string, patch: Partial<BenefitItem>) => {
    setScenarioBenefitItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeScenarioBenefitItem = (id: string) => {
    setScenarioBenefitItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addScenarioOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (scenarioModalMode === 'view') return;
    const hasLinkedApp = typeof newScenario.application === 'number';
    const hasCustomName =
      (newScenario.custom_company_name || '').trim().length > 0 &&
      (newScenario.custom_role_title || '').trim().length > 0;

    if (!hasLinkedApp && !hasCustomName) {
      messageApi.error('Select an application or enter custom company and role');
      return;
    }

    const payload: SimulatedOffer = {
      ...newScenario,
      benefit_items: scenarioBenefitItems,
      benefits_value: computeBenefitsTotal(scenarioBenefitItems),
      id: editingScenarioId || `sim-${Date.now()}`,
    };
    setSimulatedOffers((prev) =>
      editingScenarioId
        ? prev.map((offer) => (String(offer.id) === editingScenarioId ? payload : offer))
        : [...prev, payload]
    );

    setIsAddScenarioOpen(false);
    resetScenarioDraft();
    messageApi.success(editingScenarioId ? 'Custom offer updated' : 'Custom offer added');
  };

  const displayOffers = visibleOfferIds.length > 0 
    ? filteredOffers.filter((o) => visibleOfferIds.includes(`real-${o.id}`))
    : filteredOffers;

  const displaySimulatedOffers = visibleOfferIds.length > 0
    ? simulatedOffers.filter((o) => visibleOfferIds.includes(`sim-${o.id}`))
    : simulatedOffers;

  const displayScenarioRows = useMemo(() => {
    if (visibleOfferIds.length === 0) return scenarioRows;
    return scenarioRows.filter((row) => {
      if (row.kind === 'real') return visibleOfferIds.includes(`real-${row.offer.id}`);
      return visibleOfferIds.includes(`sim-${row.offer.id}`);
    });
  }, [scenarioRows, visibleOfferIds]);

  const decisionOrderById = useMemo(
    () =>
      decisionOrderIds.reduce<Record<string, number>>((acc, id, index) => {
        acc[id] = index;
        return acc;
      }, {}),
    [decisionOrderIds]
  );

  const chartData = [
    ...displayOffers.map((offer) => {
      const appName = getApplicationName(offer.application);
      const totalComp =
        Number(offer.base_salary) +
        Number(offer.bonus) +
        Number(offer.equity) +
        Number(offer.sign_on);

      return {
        id: `real-${offer.id}`,
        name: appName,
        Base: Number(offer.base_salary),
        Bonus: Number(offer.bonus),
        Equity: Number(offer.equity),
        SignOn: Number(offer.sign_on),
        Benefits: Number(offer.benefits_value),
        Total: totalComp,
      };
    }),
    ...displaySimulatedOffers.map((offer) => {
      const simName = typeof offer.application === 'number'
        ? `${getApplicationName(offer.application)} (Scenario)`
        : `${offer.custom_company_name} (Custom)`;
      
      const totalComp =
        Number(offer.base_salary) +
        Number(offer.bonus) +
        Number(offer.equity) +
        Number(offer.sign_on);

      return {
        id: `sim-${offer.id}`,
        name: simName,
        Base: Number(offer.base_salary),
        Bonus: Number(offer.bonus),
        Equity: Number(offer.equity),
        SignOn: Number(offer.sign_on),
        Benefits: Number(offer.benefits_value),
        Total: totalComp,
      };
    }),
  ].sort((a, b) => (decisionOrderById[a.id] ?? 9999) - (decisionOrderById[b.id] ?? 9999));

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
    updateEditingBenefits(editingBenefitItems.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeEditingBenefitItem = (id: string) => {
    updateEditingBenefits(editingBenefitItems.filter((item) => item.id !== id));
  };
  if (loading) return <div className="p-8 text-center text-gray-500">Loading offers...</div>;

  const compareOptions = [
    {
      label: 'Real Offers',
      options: filteredOffers.map(o => ({
        value: `real-${o.id}`,
        label: getApplicationName(o.application)
      }))
    },
    ...(simulatedOffers.length > 0
      ? [
          {
            label: 'Custom Scenarios',
            options: simulatedOffers.map(o => ({
              value: `sim-${o.id}`,
              label: typeof o.application === 'number'
                ? `${getApplicationName(o.application)} (Scenario)`
                : `${o.custom_company_name} - ${o.custom_role_title}`
            }))
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {contextHolder}
      <PageActionToolbar
        title="Offer Comparison"
        subtitle="Compare first-year total compensation (TC) across your offers."
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        availableYears={availableYears}
        extraActions={
          <Button
            className="toolbar-btn"
            size="large"
            onClick={() => {
              resetScenarioDraft();
              setScenarioModalMode('add');
              setIsAddScenarioOpen(true);
            }}
          >
            Add Scenario
          </Button>
        }
        onPrimaryAction={() => setIsAddJobOpen(true)}
        primaryActionLabel="Add Current Job"
        primaryActionIcon={<PlusOutlined />}
        singleRowDesktop
      />

      <Suspense fallback={<LazySectionFallback />}>
        <OfferComparisonChart data={chartData} />
      </Suspense>

      <OfferDecisionScorecard
        extraHeaderNode={
          <Select
            mode="multiple"
            placeholder="Compare specific offers..."
            value={visibleOfferIds}
            onChange={setVisibleOfferIds}
            style={{ minWidth: 280, maxWidth: 450 }}
            maxTagCount="responsive"
            allowClear
            options={compareOptions}
          />
        }
        filteredOffers={displayOffers}
        applicationsById={applicationsById}
        adjustedByOfferId={adjustedByOfferId}
        simulatedOffers={displaySimulatedOffers}
        scenarioRows={displayScenarioRows}
        maritalStatus={maritalStatus}
        setMaritalStatus={setMaritalStatus}
        maritalStatusOptions={maritalStatusOptions}
        saveAdjustments={saveAdjustments}
        onEditScenario={(id) => {
          const target = simulatedOffers.find((offer) => String(offer.id) === id);
          if (!target) return;
          setScenarioModalMode('edit');
          setEditingScenarioId(id);
          setNewScenario({ ...target });
          const benefitItems = Array.isArray(target.benefit_items) && target.benefit_items.length > 0
            ? target.benefit_items.map((item, idx) =>
                normalizeBenefitItem(item, `scenario-benefit-${Date.now()}-${idx}`)
              )
            : [
                {
                  id: `scenario-benefit-${Date.now()}`,
                  label: 'Benefits',
                  amount: Number(target.benefits_value || 0),
                  frequency: 'YEARLY' as const,
                },
              ];
          setScenarioBenefitItems(benefitItems);
          setIsAddScenarioOpen(true);
        }}
        onDeleteScenario={(id) => {
          setSimulatedOffers((prev) => prev.filter((offer) => String(offer.id) !== id));
        }}
        onAddScenario={() => {
          resetScenarioDraft();
          setScenarioModalMode('add');
          setIsAddScenarioOpen(true);
        }}
        onDecisionOrderChange={(orderedIds) => {
          setDecisionOrderIds((current) =>
            current.length === orderedIds.length && current.every((id, index) => id === orderedIds[index])
              ? current
              : orderedIds
          );
        }}
        onScoreUpdate={async (appId, patch) => {
          try {
            const response = await updateApplication(appId, patch);
            const updatedApplication = response.data as Partial<Application> & {
              company_details?: { name?: string };
            };
            setApplications((prev) =>
              prev.map((app) => {
                if (app.id !== appId) {
                  return app;
                }

                return {
                  ...app,
                  ...patch,
                  ...updatedApplication,
                  company_name:
                    updatedApplication.company_details?.name ||
                    updatedApplication.company_name ||
                    app.company_name,
                };
              })
            );
            messageApi.success('Score updated');
          } catch (error) {
            messageApi.error('Failed to update score');
            console.error(error);
          }
        }}
        offers={offers}
        onEditClick={handleEditClick}
        onToggleCurrent={toggleCurrent}
        onNegotiateClick={setNegotiatingOffer}
        onRaiseHistoryClick={setRaiseHistoryOffer}
        onSaveSnapshotClick={handleSaveDecisionSnapshot}
        onSnapshotsClick={(offer) => {
          setSnapshotOffer(offer);
        }}
        onDeleteClick={handleDeleteOffer}
      />

      <Suspense fallback={<LazySectionFallback />}>
        <CompensationSimulator scenarioRows={displayScenarioRows} />
      </Suspense>

      {isAddJobOpen ? (
        <Suspense fallback={null}>
          <AddCurrentJobModal
            isOpen={isAddJobOpen}
            newJobName={newJobName}
            onNameChange={setNewJobName}
            onClose={() => setIsAddJobOpen(false)}
            onSubmit={handleAddCurrentJob}
          />
        </Suspense>
      ) : null}

      {editingOffer ? (
        <Suspense fallback={null}>
          <EditOfferModal
            editingOffer={editingOffer}
            editingApp={editingApp}
            offerModalMode={offerModalMode}
            allUsCityOptions={allUsCityOptions}
            adjustedByOfferId={adjustedByOfferId}
            editingBenefitItems={editingBenefitItems}
            patchEditingApp={patchEditingApp}
            setEditingOfferField={setEditingOfferField}
            addEditingBenefitItem={addEditingBenefitItem}
            updateEditingBenefitItem={updateEditingBenefitItem}
            removeEditingBenefitItem={removeEditingBenefitItem}
            onClose={() => {
              setEditingOffer(null);
              setOfferModalMode('edit');
            }}
            onSave={handleSaveEdit}
          />
        </Suspense>
      ) : null}

      {raiseHistoryOffer && (
        <Suspense fallback={null}>
          <RaiseHistoryModal
            open={!!raiseHistoryOffer}
            onClose={() => setRaiseHistoryOffer(null)}
            offer={raiseHistoryOffer}
            companyName={applicationsById[raiseHistoryOffer.application]?.company_name ?? 'Current Job'}
            roleTitle={applicationsById[raiseHistoryOffer.application]?.role_title ?? ''}
            onSave={handleSaveRaiseHistory}
          />
        </Suspense>
      )}

      {snapshotOffer && (
        <Suspense fallback={null}>
          <OfferDecisionSnapshotsModal
            open={!!snapshotOffer}
            offer={snapshotOffer}
            onRestoreSnapshot={handleRestoreDecisionSnapshot}
            onClose={() => {
              setSnapshotOffer(null);
            }}
          />
        </Suspense>
      )}

      {isAddScenarioOpen ? (
        <Suspense fallback={null}>
          <ScenarioOfferModal
            isOpen={isAddScenarioOpen}
            scenarioModalMode={scenarioModalMode}
            editingScenarioId={editingScenarioId}
            newScenario={newScenario}
            applications={applications}
            scenarioBenefitItems={scenarioBenefitItems}
            customFormTaxPreview={customFormTaxPreview}
            maritalStatus={maritalStatus}
            stateTaxRate={stateTaxRate}
            stateNameToAbbr={stateNameToAbbr}
            cityCostOfLiving={cityCostOfLiving}
            stateColBase={stateColBase}
            effectiveMonthlyRent={effectiveMonthlyRent}
            referenceColIndex={referenceColIndex}
            referenceLocation={referenceLocation}
            allUsCityOptions={allUsCityOptions}
            onClose={() => {
              setIsAddScenarioOpen(false);
              resetScenarioDraft();
            }}
            onSubmit={addScenarioOffer}
            setNewScenario={setNewScenario}
            patchNewScenario={patchNewScenario}
            setNewScenarioField={setNewScenarioField}
            addScenarioBenefitItem={addScenarioBenefitItem}
            updateScenarioBenefitItem={updateScenarioBenefitItem}
            removeScenarioBenefitItem={removeScenarioBenefitItem}
          />
        </Suspense>
      ) : null}

      {negotiatingOffer && (
        <Suspense fallback={null}>
          <NegotiationAdvisorModal
            offer={negotiatingOffer}
            application={applicationsById[negotiatingOffer.application]}
            open={!!negotiatingOffer}
            onClose={() => setNegotiatingOffer(null)}
          />
        </Suspense>
      )}

    </div>
  );
};

export default OfferComparison;
