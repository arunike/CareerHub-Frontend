import React, { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  createOfferDecisionSnapshot,
  getTransitionAdvice,
  type OfferDecisionSnapshot,
  type OfferDecisionSnapshotPayload,
} from '../../api';
import {
  BarChartOutlined,
  PlusOutlined,
  RobotOutlined,
  CompassOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import PageActionToolbar from '../../components/PageActionToolbar';
import { getAvailableYears, filterByYear, getCurrentYear } from '../../utils/yearFilter';
import { todayDateOnlyLocal } from '../../utils/dateOnly';
import { message, Select, Spin } from 'antd';
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
import { parseInlineMarkdown } from '../../utils/simpleMarkdown';
import {
  type ApplicationLike as Application,
  type BenefitItem,
  type OfferLike as Offer,
  type SimulatedOffer,
  annualizeAmount,
  computeBenefitsTotal,
  estimateColIndexFromCity,
} from './calculations';
import { getRealizableEquity, normalizeEquityLiquidity } from './equityLiquidity';
import { useLocation, useNavigate } from 'react-router-dom';

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
  equity_liquidity: 'LIQUID',
  equity_buyback_value: 0,
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
  sick_leave_days: 0,
  sick_leave_included_in_unlimited_pto: true,
  holiday_days: 11,
  tax_base_rate: 32,
  tax_bonus_rate: 40,
  tax_equity_rate: 42,
  monthly_rent: 3500,
});

const OfferComparison = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [linkedJobAppId, setLinkedJobAppId] = useState<number | null>(null);
  const [negotiatingOffer, setNegotiatingOffer] = useState<Offer | null>(null);
  const [raiseHistoryOffer, setRaiseHistoryOffer] = useState<Offer | null>(null);
  const [snapshotOffer, setSnapshotOffer] = useState<Offer | null>(null);
  const [decisionOrderIds, setDecisionOrderIds] = useState<string[]>([]);

  const [isAddScenarioOpen, setIsAddScenarioOpen] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [scenarioModalMode, setScenarioModalMode] = useState<'add' | 'view' | 'edit'>('add');
  const [isChartExpanded, setIsChartExpanded] = useState(true);
  const [isAdvisorExpanded, setIsAdvisorExpanded] = useState(false);
  const [selectedPainPoints, setSelectedPainPoints] = useState<string[]>([]);
  const [customPainPoints, setCustomPainPoints] = useState('');
  const [promotionTimeline, setPromotionTimeline] = useState<string>('unknown');
  const [includeJobHunting, setIncludeJobHunting] = useState(true);
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [advisorResult, setAdvisorResult] = useState<any | null>(null);
  const [advisorError, setAdvisorError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    if (action === 'current-job') {
      setIsAddJobOpen(true);
    } else if (action === 'scenario') {
      setScenarioModalMode('add');
      setEditingScenarioId(null);
      setIsAddScenarioOpen(true);
    } else {
      return;
    }
    navigate('/offers', { replace: true });
  }, [location.search, navigate]);

  const handleGetTransitionAdvice = async () => {
    try {
      setIsAdvisorLoading(true);
      setAdvisorError(null);

      const payload = {
        current_pain_points: selectedPainPoints,
        custom_pain_points: customPainPoints,
        promotion_timeline: promotionTimeline,
        include_job_hunting: includeJobHunting,
        simulated_offers: simulatedOffers,
      };

      const res = await getTransitionAdvice(payload);
      setAdvisorResult(res.data);
    } catch (err: any) {
      console.error(err);
      setAdvisorError(
        err.response?.data?.error ||
          err.message ||
          'Failed to get career advice. Make sure your AI provider is configured in Settings.'
      );
    } finally {
      setIsAdvisorLoading(false);
    }
  };

  const getVerdictStyles = (verdict: string) => {
    switch (verdict) {
      case 'hop':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          text: 'text-emerald-800',
          badge: 'bg-emerald-600 text-white',
          iconColor: 'text-emerald-500',
          label: 'RECOMMENDED TO HOP',
        };
      case 'stay':
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          badge: 'bg-blue-600 text-white',
          iconColor: 'text-blue-500',
          label: 'RECOMMENDED TO STAY',
        };
      case 'hunt':
        return {
          bg: 'bg-amber-50 border-amber-200',
          text: 'text-amber-800',
          badge: 'bg-amber-600 text-white',
          iconColor: 'text-amber-500',
          label: 'RECOMMENDED TO JOB HUNT',
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-200',
          text: 'text-slate-800',
          badge: 'bg-slate-600 text-white',
          iconColor: 'text-slate-500',
          label: 'EVALUATION COMPLETE',
        };
    }
  };
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
  const [statusFilter, setStatusFilter] = usePersistedState<'active' | 'all' | 'rejected'>(
    'offerComparisonStatusFilter',
    'active'
  );
  const [visibleOfferIds, setVisibleOfferIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allUsCityOptions, setAllUsCityOptions] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const offersResp = await getOffers();
      const offersData = offersResp.data || [];
      setOffers(offersData);

      let simulatedOffersLocal: any[] = [];
      try {
        const raw = localStorage.getItem(OFFER_ADJUSTMENT_SETTINGS_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (Array.isArray(saved.simulatedOffers)) {
            simulatedOffersLocal = saved.simulatedOffers;
          }
        }
      } catch (err) {
        console.error('Failed to read simulated offers from local storage', err);
      }

      const linkedAppIds = Array.from(
        new Set(
          [
            ...offersData.map((o: any) => o.application),
            ...simulatedOffersLocal.map((o: any) => o.application),
          ].filter(Boolean)
        )
      ) as number[];

      const appsResp =
        linkedAppIds.length > 0
          ? await getApplications({ ids: linkedAppIds.join(',') })
          : { data: [] };

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

  const currentJobName = useMemo(() => {
    const current = offers.find((o) => o.is_current);
    if (!current) return null;
    const app = applications.find((candidate) => candidate.id === current.application);
    if (!app) return `App #${current.application}`;
    if (app.company_name && app.role_title) {
      return `${app.company_name} - ${app.role_title}`;
    }
    return app.company_name || app.role_title || `App #${current.application}`;
  }, [applications, offers]);

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
          free_food_perk_value: editingApp.free_food_perk_value ?? 0,
          free_food_perk_frequency: editingApp.free_food_perk_frequency ?? 'YEARLY',
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

    const targetIsCurrent = !offer.is_current;
    try {
      if (targetIsCurrent) {
        const otherCurrentOffers = offers.filter((o) => o.is_current && o.id !== offer.id);
        await Promise.all(
          otherCurrentOffers.map((o) => {
            if (o.id) {
              return updateOffer(o.id, { ...o, is_current: false });
            }
            return Promise.resolve();
          })
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
  const isOfferRejected = useCallback((offer: Partial<Offer>, app?: Application) => {
    return (
      offer.final_decision_status === 'REJECTED' ||
      offer.final_decision_status === 'DECLINED' ||
      app?.status === 'OFFER_REJECTED' ||
      app?.status === 'REJECTED'
    );
  }, []);

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
    if (!newJobName && !linkedJobAppId) return;

    try {
      let appId = linkedJobAppId;
      let finalAppName = newJobName;
      let appData: any = null;

      if (appId) {
        const response = await getApplication(appId);
        appData = response.data;
        finalAppName = appData.company_details?.name || appData.company_name || newJobName;
      } else {
        const appResp = await createApplication({
          company_name: newJobName,
          role_title: 'Current Role',
          status: 'ACCEPTED',
          date_applied: todayDateOnlyLocal(),
          office_location: '',
          visa_sponsorship: '',
          day_one_gc: '',
        });
        appId = appResp.data.id;
        appData = appResp.data;
      }

      let newOffer: any = null;
      if (appData && appData.offer) {
        const offerResp = await updateOffer(appData.offer.id, {
          ...appData.offer,
          is_current: true,
        });
        newOffer = offerResp.data;
      } else {
        const offerResp = await createOffer({
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
          sick_leave_days: 0,
          sick_leave_included_in_unlimited_pto: true,
          holiday_days: 11,
        });
        newOffer = offerResp.data;
      }

      const newApp = {
        ...appData,
        company_name: appData.company_details?.name || appData.company_name || finalAppName,
        rto_days_per_week:
          typeof appData.rto_days_per_week === 'number' ? appData.rto_days_per_week : 3,
        commute_cost_value: Number(appData.commute_cost_value || 0),
        commute_cost_frequency: appData.commute_cost_frequency || 'MONTHLY',
        free_food_perk_value: Number(appData.free_food_perk_value || 0),
        free_food_perk_frequency: appData.free_food_perk_frequency || 'YEARLY',
      };

      setIsAddJobOpen(false);
      setNewJobName('Current Employer');
      setLinkedJobAppId(null);
      messageApi.success('Current job added! Please fill in your compensation details.');

      await fetchData();

      setEditingOffer({ ...newOffer, is_unlimited_pto: !!newOffer.is_unlimited_pto });
      setEditingApp(newApp);
      setOfferModalMode('edit');

      const benefitItems =
        Array.isArray(newOffer.benefit_items) && newOffer.benefit_items.length > 0
          ? newOffer.benefit_items.map((item: any, idx: number) =>
              normalizeBenefitItem(item, `edit-benefit-${newOffer.id || Date.now()}-${idx}`)
            )
          : [
              {
                id: `edit-benefit-${Date.now()}`,
                label: 'Benefits',
                amount: Number(newOffer.benefits_value) || 0,
                frequency: 'YEARLY' as const,
              },
            ];
      setEditingBenefitItems(benefitItems);
    } catch (error) {
      messageApi.error('Failed to add current job');
      console.error(error);
    }
  };

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
          equity_liquidity: normalizeEquityLiquidity(offer.equity_liquidity),
          equity_buyback_value: Math.max(0, Number(offer.equity_buyback_value) || 0),
          benefit_items: benefitItems,
          benefits_value: computeBenefitsTotal(benefitItems),
          is_unlimited_pto: !!offer.is_unlimited_pto,
          sick_leave_days: Math.max(0, Number(offer.sick_leave_days) || 0),
          sick_leave_included_in_unlimited_pto:
            offer.sick_leave_included_in_unlimited_pto !== false,
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

  const handleAddLoadedApplication = useCallback((app: Application) => {
    setApplications((prev) => {
      if (prev.some((a) => a.id === app.id)) return prev;
      return [...prev, app];
    });
  }, []);

  const applicationsById = useMemo(
    () =>
      applications.reduce<Record<number, Application>>((acc, app) => {
        acc[app.id] = app;
        return acc;
      }, {}),
    [applications]
  );

  const filteredByYear = filterByYear(offers, selectedYear, 'created_at');
  const rejectedOffersCount = useMemo(
    () => offers.filter((o) => isOfferRejected(o, applicationsById[o.application])).length,
    [offers, applicationsById, isOfferRejected]
  );
  const filteredOffers = useMemo(() => {
    return filteredByYear.filter((offer) => {
      const app = applicationsById[offer.application];
      const rejected = isOfferRejected(offer, app);
      if (statusFilter === 'active') return !rejected;
      if (statusFilter === 'rejected') return rejected;
      return true;
    });
  }, [filteredByYear, applicationsById, statusFilter, isOfferRejected]);

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
    () =>
      estimateColIndexFromCity(referenceLocation, cityCostOfLiving, stateColBase, stateNameToAbbr),
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
      const base = Number(offer.base_salary || 0);
      const matchPercent = Number(offer.forty_one_k_match_percent || 0);
      const maxMatch = Number(offer.forty_one_k_max_match || 0);
      const fortyOneKMatchValue = base * (maxMatch / 100) * (matchPercent / 100);
      const healthPremiumAnnual = Number(offer.health_premium_monthly || 0) * 12;

      const totalComp =
        base +
        Number(offer.bonus || 0) +
        getRealizableEquity(offer) +
        Number(offer.sign_on || 0) +
        Number(offer.benefits_value || 0) +
        Number(offer.relocation_bonus || 0) +
        Number(offer.hsa_employer_contribution || 0) +
        fortyOneKMatchValue -
        healthPremiumAnnual;
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
          equity_liquidity: normalizeEquityLiquidity(offer.equity_liquidity),
          equity_buyback_value: Number(offer.equity_buyback_value) || 0,
          sign_on: offer.sign_on,
          benefits_value: offer.benefits_value,
          benefit_items: offer.benefit_items || [],
          pto_days: offer.pto_days,
          is_unlimited_pto: offer.is_unlimited_pto || false,
          sick_leave_days: Number(offer.sick_leave_days) || 0,
          sick_leave_included_in_unlimited_pto:
            offer.sick_leave_included_in_unlimited_pto !== false,
          holiday_days: offer.holiday_days || 0,
          work_mode: application?.rto_policy || '',
          office_location: application?.office_location || '',
          health_premium_monthly: offer.health_premium_monthly,
          hsa_employer_contribution: offer.hsa_employer_contribution,
          health_plan_type: offer.health_plan_type,
          health_oop_max: offer.health_oop_max,
          forty_one_k_match_percent: offer.forty_one_k_match_percent,
          forty_one_k_max_match: offer.forty_one_k_max_match,
          relocation_bonus: offer.relocation_bonus,
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
          flexible_hours_policy: application?.flexible_hours_policy || '',
          travel_frequency: application?.travel_frequency || '',
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
        equity_liquidity: normalizeEquityLiquidity(
          offerSnapshot.equity_liquidity ?? targetOffer.equity_liquidity
        ),
        equity_buyback_value: Number(
          offerSnapshot.equity_buyback_value ?? targetOffer.equity_buyback_value ?? 0
        ),
        sign_on: Number(offerSnapshot.sign_on ?? targetOffer.sign_on),
        benefits_value: Number(offerSnapshot.benefits_value ?? targetOffer.benefits_value),
        benefit_items: restoredBenefitItems,
        pto_days: Number(offerSnapshot.pto_days ?? targetOffer.pto_days),
        is_unlimited_pto: Boolean(offerSnapshot.is_unlimited_pto ?? targetOffer.is_unlimited_pto),
        sick_leave_days: Number(offerSnapshot.sick_leave_days ?? targetOffer.sick_leave_days ?? 0),
        sick_leave_included_in_unlimited_pto:
          (offerSnapshot.sick_leave_included_in_unlimited_pto ??
            targetOffer.sick_leave_included_in_unlimited_pto ??
            true) !== false,
        holiday_days:
          offerSnapshot.holiday_days == null
            ? targetOffer.holiday_days
            : Number(offerSnapshot.holiday_days),
        health_premium_monthly: Number(
          offerSnapshot.health_premium_monthly ?? targetOffer.health_premium_monthly ?? 0
        ),
        hsa_employer_contribution: Number(
          offerSnapshot.hsa_employer_contribution ?? targetOffer.hsa_employer_contribution ?? 0
        ),
        health_plan_type: String(
          offerSnapshot.health_plan_type ?? targetOffer.health_plan_type ?? ''
        ),
        health_oop_max: Number(offerSnapshot.health_oop_max ?? targetOffer.health_oop_max ?? 0),
        forty_one_k_match_percent: Number(
          offerSnapshot.forty_one_k_match_percent ?? targetOffer.forty_one_k_match_percent ?? 0
        ),
        forty_one_k_max_match: Number(
          offerSnapshot.forty_one_k_max_match ?? targetOffer.forty_one_k_max_match ?? 0
        ),
        relocation_bonus: Number(
          offerSnapshot.relocation_bonus ?? targetOffer.relocation_bonus ?? 0
        ),
      };

      const applicationPatch: Record<string, unknown> = {
        company_name: typeof offerSnapshot.company === 'string' ? offerSnapshot.company : undefined,
        role_title: typeof offerSnapshot.role === 'string' ? offerSnapshot.role : undefined,
        office_location:
          typeof offerSnapshot.office_location === 'string'
            ? offerSnapshot.office_location
            : undefined,
        rto_policy: (snapshotValue(adjustmentSnapshot, 'rto_policy') ??
          snapshotValue(offerSnapshot, 'work_mode')) as Application['rto_policy'],
        flexible_hours_policy: (snapshotValue(adjustmentSnapshot, 'flexible_hours_policy') ??
          snapshotValue(offerSnapshot, 'flexible_hours_policy') ??
          'UNKNOWN') as string,
        travel_frequency: (snapshotValue(adjustmentSnapshot, 'travel_frequency') ??
          snapshotValue(offerSnapshot, 'travel_frequency') ??
          'UNKNOWN') as string,
        rto_days_per_week: snapshotValue(adjustmentSnapshot, 'rto_days_per_week') as
          | number
          | undefined,
        commute_cost_value: snapshotValue(adjustmentSnapshot, 'commute_cost_value') as
          | number
          | undefined,
        commute_cost_frequency: snapshotValue(
          adjustmentSnapshot,
          'commute_cost_frequency'
        ) as Application['commute_cost_frequency'],
        free_food_perk_value: snapshotValue(adjustmentSnapshot, 'free_food_perk_value') as
          | number
          | undefined,
        free_food_perk_frequency: snapshotValue(
          adjustmentSnapshot,
          'free_food_perk_frequency'
        ) as Application['free_food_perk_frequency'],
        tax_base_rate: snapshotValue(adjustmentSnapshot, 'tax_base_rate'),
        tax_bonus_rate: snapshotValue(adjustmentSnapshot, 'tax_bonus_rate'),
        tax_equity_rate: snapshotValue(adjustmentSnapshot, 'tax_equity_rate'),
        monthly_rent_override: snapshotValue(adjustmentSnapshot, 'monthly_rent_override'),
        growth_score: snapshotValue(adjustmentSnapshot, 'growth_score') as
          | number
          | null
          | undefined,
        work_life_score: snapshotValue(adjustmentSnapshot, 'work_life_score') as
          | number
          | null
          | undefined,
        brand_score: snapshotValue(adjustmentSnapshot, 'brand_score') as number | null | undefined,
        team_score: snapshotValue(adjustmentSnapshot, 'team_score') as number | null | undefined,
        visa_sponsorship: snapshotValue(
          adjustmentSnapshot,
          'visa_sponsorship'
        ) as Application['visa_sponsorship'],
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
    setScenarioBenefitItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
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

  const displayOffers =
    visibleOfferIds.length > 0
      ? filteredOffers.filter((o) => visibleOfferIds.includes(`real-${o.id}`))
      : filteredOffers;

  const displaySimulatedOffers =
    visibleOfferIds.length > 0
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
        getRealizableEquity(offer) +
        Number(offer.sign_on);

      return {
        id: `real-${offer.id}`,
        name: appName,
        Base: Number(offer.base_salary),
        Bonus: Number(offer.bonus),
        Equity: getRealizableEquity(offer),
        SignOn: Number(offer.sign_on),
        Benefits: Number(offer.benefits_value),
        Total: totalComp,
      };
    }),
    ...displaySimulatedOffers.map((offer) => {
      const simName =
        typeof offer.application === 'number'
          ? `${getApplicationName(offer.application)} (Scenario)`
          : `${offer.custom_company_name} (Custom)`;

      const totalComp =
        Number(offer.base_salary) +
        Number(offer.bonus) +
        getRealizableEquity(offer) +
        Number(offer.sign_on);

      return {
        id: `sim-${offer.id}`,
        name: simName,
        Base: Number(offer.base_salary),
        Bonus: Number(offer.bonus),
        Equity: getRealizableEquity(offer),
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
    updateEditingBenefits(
      editingBenefitItems.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const removeEditingBenefitItem = (id: string) => {
    updateEditingBenefits(editingBenefitItems.filter((item) => item.id !== id));
  };
  if (loading) return <div className="p-8 text-center text-gray-500">Loading offers...</div>;

  const compareOptions = [
    {
      label: 'Real Offers',
      options: filteredOffers.map((o) => ({
        value: `real-${o.id}`,
        label: getApplicationName(o.application),
      })),
    },
    ...(simulatedOffers.length > 0
      ? [
          {
            label: 'Custom Scenarios',
            options: simulatedOffers.map((o) => ({
              value: `sim-${o.id}`,
              label:
                typeof o.application === 'number'
                  ? `${getApplicationName(o.application)} (Scenario)`
                  : `${o.custom_company_name} - ${o.custom_role_title}`,
            })),
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
        onPrimaryAction={() => setIsAddJobOpen(true)}
        primaryActionLabel="Add Current Job"
        primaryActionIcon={<PlusOutlined />}
        singleRowDesktop
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_-42px_rgba(15,23,42,0.5)]">
        <button
          type="button"
          onClick={() => setIsChartExpanded((current) => !current)}
          aria-expanded={isChartExpanded}
          className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-6"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
              <BarChartOutlined />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-950">
                First-year compensation breakdown
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                Compare salary, benefits, bonus, realizable equity, and sign-on by offer.
              </span>
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-blue-700">
            {isChartExpanded ? 'Hide chart' : 'View chart'}
          </span>
        </button>

        {isChartExpanded && (
          <div className="border-t border-slate-200 p-3 sm:p-5">
            <Suspense fallback={<LazySectionFallback />}>
              <OfferComparisonChart data={chartData} />
            </Suspense>
          </div>
        )}
      </section>

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
          const benefitItems =
            Array.isArray(target.benefit_items) && target.benefit_items.length > 0
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
            current.length === orderedIds.length &&
            current.every((id, index) => id === orderedIds[index])
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
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        rejectedOffersCount={rejectedOffersCount}
        onEditClick={handleEditClick}
        onToggleCurrent={toggleCurrent}
        onToggleRejected={handleToggleRejected}
        onNegotiateClick={setNegotiatingOffer}
        onRaiseHistoryClick={setRaiseHistoryOffer}
        onSaveSnapshotClick={handleSaveDecisionSnapshot}
        onSnapshotsClick={(offer) => {
          setSnapshotOffer(offer);
        }}
        onDeleteClick={handleDeleteOffer}
      />

      {/* Career Transition Advisor */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_-42px_rgba(15,23,42,0.5)]">
        <button
          type="button"
          onClick={() => setIsAdvisorExpanded(!isAdvisorExpanded)}
          aria-expanded={isAdvisorExpanded}
          className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-6"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
              <CompassOutlined />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-950">Career Transition Advisor</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                AI evaluation comparing your current role{' '}
                {currentJobName ? (
                  <span className="font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 inline-block">
                    {currentJobName}
                  </span>
                ) : (
                  <span className="font-semibold text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 inline-block">
                    (None Selected)
                  </span>
                )}{' '}
                vs. active offers and job market opportunities.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold text-blue-700">
            {isAdvisorExpanded ? 'Collapse' : 'Expand'}
          </span>
        </button>

        {isAdvisorExpanded && (
          <div className="px-6 pb-6 border-t border-slate-100 pt-6 space-y-6">
            {!currentJobName && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3.5 text-xs flex items-start gap-2.5 shadow-sm">
                <span className="text-base leading-none">⚠️</span>
                <div>
                  <strong className="block text-amber-900 mb-0.5 font-bold">
                    No Current Job Selected
                  </strong>
                  Please mark one of your offers/jobs as "Current" in the comparison scorecard/table
                  above. The AI needs a current job to analyze your pain points and determine if you
                  should stay or hop.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Current Job Pain Points & Satisfaction{' '}
                    {currentJobName ? `(${currentJobName})` : ''}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'stress', label: '🔥 High Stress / Burnout' },
                      { key: 'wlb', label: '⚖️ Bad Work-Life Balance' },
                      { key: 'growth', label: '📈 Lack of Career Growth' },
                      { key: 'tech', label: '💻 Outdated Tech Stack' },
                      { key: 'pay', label: '💵 Underpaid / Below Market' },
                      { key: 'culture', label: '👥 Toxic Culture / Bad Leadership' },
                      { key: 'commute', label: '🚗 Commute Exhaustion' },
                      { key: 'appreciation', label: '🎗️ Lack of Recognition' },
                    ].map((item) => {
                      const isSelected = selectedPainPoints.includes(item.key);
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setSelectedPainPoints((prev) =>
                              isSelected ? prev.filter((p) => p !== item.key) : [...prev, item.key]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      Or describe your own pain points / situation:
                    </label>
                    <textarea
                      value={customPainPoints}
                      onChange={(e) => setCustomPainPoints(e.target.value)}
                      rows={3}
                      placeholder="E.g., Micromanaging boss, commute is actually 1.5 hours each way on bad days, lack of remote work flexibility..."
                      className="w-full text-xs rounded-lg border border-slate-200 p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Promotion Outlook
                    </label>
                    <Select
                      value={promotionTimeline}
                      onChange={setPromotionTimeline}
                      className="w-full"
                      options={[
                        { value: 'unknown', label: 'Unknown / Unsure' },
                        { value: 'within_6m', label: 'Within 6 months (Likely)' },
                        { value: 'within_1y', label: '6 - 12 months (Medium probability)' },
                        { value: 'slow', label: '1 - 2 years (Slow progression)' },
                        { value: 'unlikely', label: 'Unlikely / Dead-end role' },
                      ]}
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer py-2 text-xs font-medium text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={includeJobHunting}
                        onChange={(e) => setIncludeJobHunting(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>Evaluate active job hunting as an option</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGetTransitionAdvice}
                    disabled={isAdvisorLoading || !currentJobName}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-500 sm:w-auto"
                  >
                    {isAdvisorLoading ? (
                      <>
                        <LoadingOutlined className="animate-spin" />
                        Analyzing Career Data...
                      </>
                    ) : (
                      <>
                        <RobotOutlined />
                        Evaluate Career Transition
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-center text-center space-y-3 min-h-[220px]">
                {advisorError && (
                  <div className="text-left bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-xs">
                    <strong>Error:</strong> {advisorError}
                  </div>
                )}

                {!advisorResult && !isAdvisorLoading && !advisorError && (
                  <div className="space-y-2">
                    <CompassOutlined className="text-slate-300 text-3xl" />
                    <p className="text-sm font-bold text-slate-800">Ready for AI Evaluation</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Select your current job sentiments and click evaluate. The AI will look at
                      your current compensation baseline and prospective offers to compute the
                      optimal career decision.
                    </p>
                  </div>
                )}

                {isAdvisorLoading && (
                  <div className="space-y-3 py-6">
                    <Spin size="large" />
                    <p className="text-sm font-bold text-slate-700">
                      Synthesizing Offer Analytics...
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Comparing total compensation, tax implications, RTO requirements, WLB metrics,
                      and skill growth.
                    </p>
                  </div>
                )}

                {advisorResult && !isAdvisorLoading && (
                  <div className="text-left space-y-4 w-full">
                    {/* Verdict Banner */}
                    {(() => {
                      const styles = getVerdictStyles(advisorResult.verdict);
                      return (
                        <div
                          className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${styles.bg}`}
                        >
                          <div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${styles.badge}`}
                            >
                              {styles.label}
                            </span>
                            <h4 className="mt-1.5 text-lg font-extrabold text-slate-900">
                              {advisorResult.verdict_label}
                            </h4>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              AI Confidence
                            </span>
                            <span className="text-base font-extrabold text-slate-900">
                              {advisorResult.confidence}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Comparative Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-2.5">
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                          💰 Financial Evaluation
                        </h5>
                        <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {parseInlineMarkdown(advisorResult.financial_analysis)}
                        </div>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-2.5">
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                          ⚖️ WLB & Career Growth
                        </h5>
                        <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {parseInlineMarkdown(advisorResult.qualitative_analysis)}
                        </div>
                      </div>
                    </div>

                    {/* Reasoning Bullets */}
                    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b pb-1.5">
                        Key Recommendations & Strategy
                      </h5>
                      <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600">
                        {Array.isArray(advisorResult.reasoning_summary) &&
                          advisorResult.reasoning_summary.map((point: string, idx: number) => (
                            <li key={idx}>{parseInlineMarkdown(point)}</li>
                          ))}
                      </ul>
                    </div>

                    {/* Pros and Cons Column */}
                    {advisorResult.pros_cons && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {advisorResult.pros_cons.current_job && (
                          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5">
                              {currentJobName || 'Current Job'} Pro/Con
                            </h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="font-bold text-emerald-700 block mb-1">Pros</span>
                                <ul className="list-disc pl-3.5 space-y-1 text-[11px] text-slate-600">
                                  {advisorResult.pros_cons.current_job.pros.map(
                                    (p: string, i: number) => (
                                      <li key={i}>{parseInlineMarkdown(p)}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                              <div>
                                <span className="font-bold text-rose-700 block mb-1">Cons</span>
                                <ul className="list-disc pl-3.5 space-y-1 text-[11px] text-slate-600">
                                  {advisorResult.pros_cons.current_job.cons.map(
                                    (p: string, i: number) => (
                                      <li key={i}>{parseInlineMarkdown(p)}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        {advisorResult.pros_cons.recommendation && (
                          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5">
                              {advisorResult.pros_cons.recommendation.name} Pro/Con
                            </h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="font-bold text-emerald-700 block mb-1">Pros</span>
                                <ul className="list-disc pl-3.5 space-y-1 text-[11px] text-slate-600">
                                  {advisorResult.pros_cons.recommendation.pros.map(
                                    (p: string, i: number) => (
                                      <li key={i}>{parseInlineMarkdown(p)}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                              <div>
                                <span className="font-bold text-rose-700 block mb-1">Cons</span>
                                <ul className="list-disc pl-3.5 space-y-1 text-[11px] text-slate-600">
                                  {advisorResult.pros_cons.recommendation.cons.map(
                                    (p: string, i: number) => (
                                      <li key={i}>{parseInlineMarkdown(p)}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {advisorResult.next_steps_criteria && (
                      <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-indigo-100 rounded-xl p-4 shadow-sm">
                        <h5 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2 border-b border-indigo-100/60 pb-1.5 flex items-center gap-1.5">
                          🎯{' '}
                          {advisorResult.next_steps_criteria.title ||
                            'Recommended Job Search Criteria'}
                        </h5>
                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700 font-medium">
                          {Array.isArray(advisorResult.next_steps_criteria.items) &&
                            advisorResult.next_steps_criteria.items.map(
                              (point: string, idx: number) => (
                                <li key={idx} className="hover:text-indigo-900 transition-colors">
                                  {parseInlineMarkdown(point)}
                                </li>
                              )
                            )}
                        </ul>
                      </div>
                    )}

                    {advisorResult.path_comparison && (
                      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                          🛤️ Strategic Path Comparison
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-2">
                            <h6 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              {advisorResult.path_comparison.scenario_a_label ||
                                'Current Path / Current Offer'}
                            </h6>
                            <div className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {parseInlineMarkdown(
                                advisorResult.path_comparison.scenario_a_outcome
                              )}
                            </div>
                          </div>

                          <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-xl p-4 space-y-2">
                            <h6 className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                              {advisorResult.path_comparison.scenario_b_label || 'Alternative Path'}
                            </h6>
                            <div className="text-[11px] text-indigo-950/80 leading-relaxed font-medium whitespace-pre-wrap">
                              {parseInlineMarkdown(
                                advisorResult.path_comparison.scenario_b_outcome
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <Suspense fallback={<LazySectionFallback />}>
        <CompensationSimulator scenarioRows={displayScenarioRows} />
      </Suspense>

      {isAddJobOpen ? (
        <Suspense fallback={null}>
          <AddCurrentJobModal
            isOpen={isAddJobOpen}
            newJobName={newJobName}
            onNameChange={setNewJobName}
            linkedApplicationId={linkedJobAppId}
            onLinkedApplicationChange={setLinkedJobAppId}
            onClose={() => {
              setIsAddJobOpen(false);
              setLinkedJobAppId(null);
              setNewJobName('Current Employer');
            }}
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
            companyName={
              applicationsById[raiseHistoryOffer.application]?.company_name ?? 'Current Job'
            }
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
            onAddLoadedApplication={handleAddLoadedApplication}
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
