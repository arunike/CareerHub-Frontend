import React, { useEffect, useMemo, useState } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { usaCities } from 'typed-usa-states';
import { createPortal } from 'react-dom';
import { getCareerReferenceData, getCareerRentEstimate } from '../../api';
import RowActions from '../../components/RowActions';
import OfferFormFields from './OfferFormFields';
import { useSafeFormState } from './useSafeFormState';
import {
  type ApplicationLike,
  type BenefitItem,
  type MaritalStatus,
  type MaritalStatusOption,
  type OfferLike,
  type SimulatedOffer,
  DEFAULT_CITY_COST_OF_LIVING,
  DEFAULT_MARITAL_STATUS_OPTIONS,
  DEFAULT_STATE_COL_BASE,
  DEFAULT_STATE_NAME_TO_ABBR,
  DEFAULT_STATE_TAX_RATE,
  calculateScenarioValue,
  computeBenefitsTotal,
  annualizeAmount,
  estimateColIndexFromCity,
  estimateTaxRatesByIncomeType,
} from './calculations';

interface CareerReferenceData {
  marital_status_options?: MaritalStatusOption[];
  city_cost_of_living?: Record<string, number>;
  state_col_base?: Record<string, number>;
  state_tax_rate?: Record<string, number>;
  state_name_to_abbr?: Record<string, string>;
}

interface RentEstimateData {
  provider?: string;
  matched_area?: string;
  monthly_rent_estimate?: number | null;
  fmr_year?: number | string | null;
  last_updated?: string;
  error?: string;
}

interface ScenarioRow {
  kind: 'real' | 'simulated';
  offer: { id?: number | string; is_current?: boolean };
  appName: string;
  locationLabel: string;
  colIndex: number;
  monthlyRent: number;
  work_mode: string;
  rto_days_per_week: number;
  pto_days: number;
  holiday_days: number;
  pto_holiday_days: number;
  total_comp: number;
  adjustedValue: number;
  lifestyleAdjustment: number;
  deltaVsCurrent: number;
  deltaTotalComp: number;
  deltaBaseAfterTax: number;
  deltaBonusAfterTax: number;
  deltaEquityAfterTax: number;
  deltaPtoHolidayDays: number;
  afterTaxBase: number;
  afterTaxBonus: number;
  afterTaxEquity: number;
  usedBaseTaxRate: number;
  usedBonusTaxRate: number;
  usedEquityTaxRate: number;
}

interface SavedOfferAdjustmentSettings {
  maritalStatus: MaritalStatus;
  simulatedOffers: SimulatedOffer[];
  savedAt: string;
}

interface OfferAdjustmentsPanelProps {
  isOpen: boolean;
  filteredOffers: OfferLike[];
  applications: ApplicationLike[];
  getApplicationName: (appId: number) => string;
  onViewRealOffer?: (offerId: number) => void;
  onEditRealOffer?: (offerId: number) => void;
  onRealAdjustedChange?: (
    data: Record<
      number,
      {
        adjustedValue: number;
        adjustedDiff: number;
        afterTaxBase: number;
        afterTaxBonus: number;
        afterTaxEquity: number;
        usedBaseTaxRate: number;
        usedBonusTaxRate: number;
        usedEquityTaxRate: number;
        monthlyRent: number;
      }
    >
  ) => void;
}

const OFFER_ADJUSTMENT_SETTINGS_KEY = 'careerhub.offerAdjustments.v1';

const defaultScenarioDraft = (): SimulatedOffer => ({
  id: '',
  application: null,
  custom_company_name: '',
  custom_role_title: '',
  location: 'San Francisco, CA, United States',
  base_salary: 100000,
  bonus: 20000,
  equity: 20000,
  equity_total_grant: 80000,
  equity_vesting_percent: 25,
  sign_on: 10000,
  benefits_value: 12000,
  work_mode: 'HYBRID',
  rto_days_per_week: 3,
  commute_cost_value: 200,
  commute_cost_frequency: 'MONTHLY',
  free_food_perk_value: 0,
  free_food_perk_frequency: 'YEARLY',
  pto_days: 15,
  holiday_days: 11,
  tax_base_rate: 32,
  tax_bonus_rate: 40,
  tax_equity_rate: 42,
  monthly_rent: 3500,
});

const defaultScenarioBenefits = (): BenefitItem[] => [
  { id: 'benefit-gym', label: 'Gym Reimbursement', amount: 100, frequency: 'MONTHLY' },
  { id: 'benefit-phone', label: 'Cellphone Reimbursement', amount: 100, frequency: 'MONTHLY' },
];

const normalizeBenefitItem = (item: Partial<BenefitItem>, fallbackId: string): BenefitItem => ({
  id: item.id || fallbackId,
  label: item.label || '',
  amount: Number(item.amount) || 0,
  frequency: item.frequency === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
});

const OfferAdjustmentsPanel = ({
  isOpen,
  filteredOffers,
  applications,
  getApplicationName,
  onViewRealOffer,
  onEditRealOffer,
  onRealAdjustedChange,
}: OfferAdjustmentsPanelProps) => {
  const [messageApi, contextHolder] = message.useMessage();

  const [isAddScenarioOpen, setIsAddScenarioOpen] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [scenarioModalMode, setScenarioModalMode] = useState<'add' | 'view' | 'edit'>('add');
  const [simulatedOffers, setSimulatedOffers] = useState<SimulatedOffer[]>([]);
  const [scenarioBenefitItems, setScenarioBenefitItems] = useState<BenefitItem[]>(
    defaultScenarioBenefits()
  );
  const {
    state: newScenario,
    setState: setNewScenario,
    patch: patchNewScenario,
    setField: setNewScenarioField,
  } = useSafeFormState<SimulatedOffer>(defaultScenarioDraft());

  const [cityCostOfLiving, setCityCostOfLiving] = useState<Record<string, number>>(
    DEFAULT_CITY_COST_OF_LIVING
  );
  const [stateColBase, setStateColBase] = useState<Record<string, number>>(DEFAULT_STATE_COL_BASE);
  const [stateTaxRate, setStateTaxRate] = useState<Record<string, number>>(DEFAULT_STATE_TAX_RATE);
  const [stateNameToAbbr, setStateNameToAbbr] = useState<Record<string, string>>(
    DEFAULT_STATE_NAME_TO_ABBR
  );
  const [maritalStatusOptions, setMaritalStatusOptions] = useState<MaritalStatusOption[]>(
    DEFAULT_MARITAL_STATUS_OPTIONS
  );

  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>('SINGLE');
  const [rentEstimate, setRentEstimate] = useState<RentEstimateData | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSettingsHydrated, setIsSettingsHydrated] = useState(false);
  const effectiveMonthlyRent = Number(rentEstimate?.monthly_rent_estimate || 0);

  const referenceLocation = useMemo(() => {
    const current = filteredOffers.find((offer) => offer.is_current) || filteredOffers[0];
    if (current) {
      const currentApp = applications.find((app) => app.id === current.application);
      if (currentApp?.location?.trim()) return currentApp.location;
    }
    const anyLocation = applications.find((app) => app.location?.trim())?.location;
    return anyLocation || 'San Francisco, CA, United States';
  }, [filteredOffers, applications]);

  const referenceColIndex = useMemo(
    () => estimateColIndexFromCity(referenceLocation, cityCostOfLiving, stateColBase, stateNameToAbbr),
    [referenceLocation, cityCostOfLiving, stateColBase, stateNameToAbbr]
  );
  const allUsCityOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...Object.keys(cityCostOfLiving).map((city) =>
            city === 'Remote / National Average' || city.includes('United States')
              ? city
              : `${city}, United States`
          ),
          ...usaCities.map((city) => {
            const abbr = stateNameToAbbr[city.state] || city.state;
            return `${city.name}, ${abbr}, United States`;
          }),
        ])
      ),
    [cityCostOfLiving, stateNameToAbbr]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OFFER_ADJUSTMENT_SETTINGS_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw) as Partial<SavedOfferAdjustmentSettings>;
      if (typeof saved.maritalStatus === 'string') setMaritalStatus(saved.maritalStatus as MaritalStatus);
      if (Array.isArray(saved.simulatedOffers)) {
        const normalized = (saved.simulatedOffers as SimulatedOffer[]).map((offer) => {
          const benefitItems = Array.isArray(offer.benefit_items) && offer.benefit_items.length > 0
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
          };
        });
        setSimulatedOffers(normalized);
      }
      if (typeof saved.savedAt === 'string') setLastSavedAt(saved.savedAt);
    } catch (error) {
      console.error('Failed to load saved offer adjustments', error);
    } finally {
      setIsSettingsHydrated(true);
    }
  }, []);

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const response = await getCareerReferenceData();
        const ref = (response.data || {}) as CareerReferenceData;
        if (ref.city_cost_of_living) setCityCostOfLiving(ref.city_cost_of_living);
        if (ref.state_col_base) setStateColBase(ref.state_col_base);
        if (ref.state_tax_rate) setStateTaxRate(ref.state_tax_rate);
        if (ref.state_name_to_abbr) setStateNameToAbbr(ref.state_name_to_abbr);
        if (ref.marital_status_options?.length) setMaritalStatusOptions(ref.marital_status_options);
      } catch (error) {
        console.error('Failed to load career reference data', error);
      }
    };

    fetchReferenceData();
  }, []);

  useEffect(() => {
    if (!isSettingsHydrated) return;
    const run = async () => {
      try {
        const response = await getCareerRentEstimate(referenceLocation);
        const data = response.data as RentEstimateData;
        setRentEstimate(data);
      } catch (error) {
        console.error('Failed to load rent estimate', error);
        setRentEstimate({
          provider: 'HUD FMR API',
          error: 'Rent estimate unavailable',
          last_updated: new Date().toISOString(),
        });
      }
    };
    run();
  }, [referenceLocation, isSettingsHydrated]);

  const scenarioRows = useMemo<ScenarioRow[]>(() => {
    const baselineColIndex = Math.max(1, referenceColIndex);
    const baselineRent = Math.max(0, Number(effectiveMonthlyRent || 0));
    const realRows = filteredOffers.map((offer) => {
      const app = applications.find((a) => a.id === offer.application);
      const rowCity = app?.location?.trim() ? app.location : referenceLocation;
      const rowColIndex = estimateColIndexFromCity(rowCity, cityCostOfLiving, stateColBase, stateNameToAbbr);
      const rowMonthlyRent = Math.max(
        0,
        Number(
          app?.monthly_rent_override ?? Math.round(baselineRent * (Math.max(1, rowColIndex) / baselineColIndex))
        )
      );
      const workMode =
        app?.rto_policy === 'REMOTE' ? 'REMOTE' : app?.rto_policy === 'ONSITE' ? 'ONSITE' : 'HYBRID';
      const rtoDays =
        typeof app?.rto_days_per_week === 'number' ? app.rto_days_per_week : workMode === 'REMOTE' ? 0 : workMode === 'ONSITE' ? 5 : 3;
      const rowIncome =
        Number(offer.base_salary) +
        Number(offer.bonus) +
        Number(offer.sign_on) +
        Number(offer.benefits_value) +
        Number(offer.equity);
      const estimatedTax = estimateTaxRatesByIncomeType(
        rowIncome,
        maritalStatus,
        rowCity,
        stateTaxRate,
        stateNameToAbbr
      );
      const rowTax = {
        baseTaxRate: Number(app?.tax_base_rate ?? estimatedTax.baseTaxRate),
        bonusTaxRate: Number(app?.tax_bonus_rate ?? estimatedTax.bonusTaxRate),
        equityTaxRate: Number(app?.tax_equity_rate ?? estimatedTax.equityTaxRate),
      };

      const scenarioCalc = calculateScenarioValue({
        base_salary: Number(offer.base_salary),
        bonus: Number(offer.bonus),
        sign_on: Number(offer.sign_on),
        benefits_value: Number(offer.benefits_value),
        equity: Number(offer.equity),
        work_mode: workMode,
        rto_days_per_week: rtoDays,
        freeFoodPerkAnnual: annualizeAmount(
          Number(app?.free_food_perk_value || 0),
          (app?.free_food_perk_frequency as 'DAILY' | 'MONTHLY' | 'YEARLY') || 'YEARLY'
        ),
        commuteAnnualCost: annualizeAmount(
          Number(app?.commute_cost_value || 0),
          (app?.commute_cost_frequency as 'DAILY' | 'MONTHLY' | 'YEARLY') || 'MONTHLY'
        ),
        baseTaxRate: rowTax.baseTaxRate,
        bonusTaxRate: rowTax.bonusTaxRate,
        equityTaxRate: rowTax.equityTaxRate,
        costOfLivingIndex: rowColIndex,
      });

      return {
        kind: 'real' as const,
        offer,
        appName: getApplicationName(offer.application),
        locationLabel: rowCity || '-',
        colIndex: rowColIndex,
        monthlyRent: rowMonthlyRent,
        work_mode: workMode,
        rto_days_per_week: rtoDays,
        pto_days: Number(offer.pto_days || 0),
        holiday_days: Number(offer.holiday_days ?? 11),
        pto_holiday_days: Number(offer.pto_days || 0) + Number(offer.holiday_days ?? 11),
        total_comp:
          Number(offer.base_salary) +
          Number(offer.bonus) +
          Number(offer.equity) +
          Number(offer.sign_on),
        adjustedValue: scenarioCalc.adjustedValue - rowMonthlyRent * 12,
        lifestyleAdjustment: scenarioCalc.lifestyleAdjustment,
        deltaTotalComp: 0,
        deltaBaseAfterTax: 0,
        deltaBonusAfterTax: 0,
        deltaEquityAfterTax: 0,
        deltaPtoHolidayDays: 0,
        afterTaxBase: scenarioCalc.breakdown.taxedBase,
        afterTaxBonus: scenarioCalc.breakdown.taxedBonus,
        afterTaxEquity: scenarioCalc.breakdown.taxedEquity,
        usedBaseTaxRate: rowTax.baseTaxRate,
        usedBonusTaxRate: rowTax.bonusTaxRate,
        usedEquityTaxRate: rowTax.equityTaxRate,
      };
    });

    const simulatedRows = simulatedOffers.map((offer) => {
      const rowCity = offer.location?.trim() ? offer.location : referenceLocation;
      const rowColIndex = estimateColIndexFromCity(rowCity, cityCostOfLiving, stateColBase, stateNameToAbbr);
      const estimatedMonthlyRent = Math.round(baselineRent * (Math.max(1, rowColIndex) / baselineColIndex));
      const rowMonthlyRent = Math.max(0, Number(offer.monthly_rent ?? estimatedMonthlyRent));
      const rowIncome =
        Number(offer.base_salary) +
        Number(offer.bonus) +
        Number(offer.sign_on) +
        Number(offer.benefits_value) +
        Number(offer.equity);
      const estimatedTax = estimateTaxRatesByIncomeType(
        rowIncome,
        maritalStatus,
        rowCity,
        stateTaxRate,
        stateNameToAbbr
      );
      const rowTax = {
        baseTaxRate: Number(offer.tax_base_rate ?? estimatedTax.baseTaxRate),
        bonusTaxRate: Number(offer.tax_bonus_rate ?? estimatedTax.bonusTaxRate),
        equityTaxRate: Number(offer.tax_equity_rate ?? estimatedTax.equityTaxRate),
      };
      const scenarioCalc = calculateScenarioValue({
        base_salary: Number(offer.base_salary),
        bonus: Number(offer.bonus),
        sign_on: Number(offer.sign_on),
        benefits_value: Number(offer.benefits_value),
        equity: Number(offer.equity),
        work_mode: offer.work_mode,
        rto_days_per_week: offer.rto_days_per_week,
        freeFoodPerkAnnual: annualizeAmount(
          Number(offer.free_food_perk_value || 0),
          offer.free_food_perk_frequency || 'YEARLY'
        ),
        commuteAnnualCost: annualizeAmount(
          Number(offer.commute_cost_value || 0),
          offer.commute_cost_frequency || 'MONTHLY'
        ),
        baseTaxRate: rowTax.baseTaxRate,
        bonusTaxRate: rowTax.bonusTaxRate,
        equityTaxRate: rowTax.equityTaxRate,
        costOfLivingIndex: rowColIndex,
      });

      const appName =
        offer.application && applications.find((a) => a.id === offer.application)
          ? getApplicationName(offer.application)
          : `${offer.custom_company_name || 'Custom Company'} - ${offer.custom_role_title || 'Custom Role'}`;

      return {
        kind: 'simulated' as const,
        offer: { ...offer, is_current: false },
        appName,
        locationLabel: rowCity || '-',
        colIndex: rowColIndex,
        monthlyRent: rowMonthlyRent,
        work_mode: offer.work_mode,
        rto_days_per_week: offer.rto_days_per_week,
        pto_days: Number(offer.pto_days || 0),
        holiday_days: Number(offer.holiday_days ?? 11),
        pto_holiday_days: Number(offer.pto_days || 0) + Number(offer.holiday_days ?? 11),
        total_comp:
          Number(offer.base_salary) +
          Number(offer.bonus) +
          Number(offer.equity) +
          Number(offer.sign_on),
        adjustedValue: scenarioCalc.adjustedValue - rowMonthlyRent * 12,
        lifestyleAdjustment: scenarioCalc.lifestyleAdjustment,
        deltaTotalComp: 0,
        deltaBaseAfterTax: 0,
        deltaBonusAfterTax: 0,
        deltaEquityAfterTax: 0,
        deltaPtoHolidayDays: 0,
        afterTaxBase: scenarioCalc.breakdown.taxedBase,
        afterTaxBonus: scenarioCalc.breakdown.taxedBonus,
        afterTaxEquity: scenarioCalc.breakdown.taxedEquity,
        usedBaseTaxRate: rowTax.baseTaxRate,
        usedBonusTaxRate: rowTax.bonusTaxRate,
        usedEquityTaxRate: rowTax.equityTaxRate,
      };
    });

    const rows = [...realRows, ...simulatedRows];
    const current = rows.find((r) => r.offer.is_current);
    const currentValue = current?.adjustedValue || 0;
    const currentBaseAfterTax = current?.afterTaxBase || 0;
    const currentBonusAfterTax = current?.afterTaxBonus || 0;
    const currentEquityAfterTax = current?.afterTaxEquity || 0;
    const currentPtoHolidayDays = current?.pto_holiday_days || 0;
    const currentTotalComp = current?.total_comp || 0;

    return rows
      .map((row) => ({
        ...row,
        deltaVsCurrent: row.offer.is_current ? 0 : row.adjustedValue - currentValue,
        deltaTotalComp: row.offer.is_current ? 0 : row.total_comp - currentTotalComp,
        deltaBaseAfterTax: row.offer.is_current ? 0 : row.afterTaxBase - currentBaseAfterTax,
        deltaBonusAfterTax: row.offer.is_current ? 0 : row.afterTaxBonus - currentBonusAfterTax,
        deltaEquityAfterTax: row.offer.is_current ? 0 : row.afterTaxEquity - currentEquityAfterTax,
        deltaPtoHolidayDays: row.offer.is_current ? 0 : row.pto_holiday_days - currentPtoHolidayDays,
      }))
      .sort((a, b) => b.adjustedValue - a.adjustedValue);
  }, [
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
  ]);

  useEffect(() => {
    if (!onRealAdjustedChange) return;
    const realAdjusted: Record<
      number,
      {
        adjustedValue: number;
        adjustedDiff: number;
        afterTaxBase: number;
        afterTaxBonus: number;
        afterTaxEquity: number;
        usedBaseTaxRate: number;
        usedBonusTaxRate: number;
        usedEquityTaxRate: number;
        monthlyRent: number;
      }
    > = {};
    scenarioRows.forEach((row) => {
      if (row.kind !== 'real') return;
      const id = Number(row.offer.id);
      if (!Number.isFinite(id)) return;
      realAdjusted[id] = {
        adjustedValue: row.adjustedValue,
        adjustedDiff: row.deltaVsCurrent,
        afterTaxBase: row.afterTaxBase,
        afterTaxBonus: row.afterTaxBonus,
        afterTaxEquity: row.afterTaxEquity,
        usedBaseTaxRate: row.usedBaseTaxRate,
        usedBonusTaxRate: row.usedBonusTaxRate,
        usedEquityTaxRate: row.usedEquityTaxRate,
        monthlyRent: row.monthlyRent,
      };
    });
    onRealAdjustedChange(realAdjusted);
  }, [scenarioRows, onRealAdjustedChange]);

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
  }, [
    newScenario.tax_base_rate,
    newScenario.tax_bonus_rate,
    newScenario.tax_equity_rate,
  ]);

  const resetScenarioDraft = () => {
    setNewScenario(defaultScenarioDraft());
    setScenarioBenefitItems(defaultScenarioBenefits());
    setEditingScenarioId(null);
    setScenarioModalMode('add');
  };

  const resetScenarioDefaults = () => {
    setMaritalStatus('SINGLE');
  };

  const handleSaveAdjustments = () => {
    try {
      const nowIso = new Date().toISOString();
      const payload: SavedOfferAdjustmentSettings = {
        maritalStatus,
        simulatedOffers,
        savedAt: nowIso,
      };
      localStorage.setItem(OFFER_ADJUSTMENT_SETTINGS_KEY, JSON.stringify(payload));
      setLastSavedAt(nowIso);
      messageApi.success('Offer adjustments saved');
    } catch (error) {
      console.error('Failed to save offer adjustments', error);
      messageApi.error('Failed to save offer adjustments');
    }
  };

  const updateScenarioBenefitItem = (id: string, patch: Partial<BenefitItem>) => {
    setScenarioBenefitItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addScenarioBenefitItem = () => {
    setScenarioBenefitItems((prev) => [
      ...prev,
      { id: `scenario-benefit-${Date.now()}`, label: '', amount: 0, frequency: 'MONTHLY' },
    ]);
  };

  const removeScenarioBenefitItem = (id: string) => {
    setScenarioBenefitItems((prev) => prev.filter((item) => item.id !== id));
  };

  const openScenarioEditor = (scenarioId: string, mode: 'view' | 'edit') => {
    const target = simulatedOffers.find((offer) => String(offer.id) === scenarioId);
    if (!target) return;
    setScenarioModalMode(mode);
    setEditingScenarioId(scenarioId);
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

  const removeScenarioOffer = (id: string) => {
    setSimulatedOffers((prev) => prev.filter((offer) => offer.id !== id));
  };

  if (!isOpen && !isAddScenarioOpen) return null;

  return (
    <>
      {contextHolder}
      {isOpen && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Offer Adjustments</h3>
            <p className="text-sm text-gray-500">
              Tune offer comparison using tax, city, rent, and work-style assumptions.
            </p>
          </div>

          <details className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-800">
              Show Adjusted Value Formula
            </summary>
            <div className="mt-3 space-y-2 text-xs text-gray-700">
              <div className="rounded-md bg-white border border-gray-200 p-3 font-mono leading-6 overflow-x-auto">
                Adjusted Value = [ (Base * (1 - baseTax)) + (Benefits * (1 - baseTax)) + ((Bonus + SignOn)
                * (1 - bonusTax)) + (Equity * (1 - equityTax)) ] * (100 / COL) + WorkSetupAdj
                - (MonthlyRent * 12)
              </div>
              <p>`WorkSetupAdj` = RemoteBonus + FreeFoodBonus - RTOPenalty - CommutePenalty.</p>
              <p>`RTOPenalty` = RTO Days / Week * $1,200 annually.</p>
              <p>`COL` and `MonthlyRent` are computed using each offer's own location.</p>
              <p>`MonthlyRent` base comes from HUD/Fallback estimate unless manually overridden.</p>
            </div>
          </details>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Location Model</label>
                <span className="text-sm font-semibold text-gray-900">Per-offer</span>
              </div>
              <p className="text-xs text-gray-500">
                Tax/COL/Rent are configured on each offer form. No centralized city/rate/rent control.
              </p>
              <p className="text-xs text-gray-500">
                Baseline rent source for non-custom offers: {rentEstimate?.provider || 'HUD FMR API'}
                {rentEstimate?.fmr_year ? ` (${rentEstimate.fmr_year})` : ''}
                {rentEstimate?.matched_area ? ` • ${rentEstimate.matched_area}` : ''}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 space-y-2">
              <label className="text-sm font-medium text-gray-700">Marital Status</label>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {maritalStatusOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Used for auto tax estimation on real offers and default suggestions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSaveAdjustments}
              className="px-3 py-2 text-sm rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Save Adjustments
            </button>
            <button
              onClick={resetScenarioDefaults}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Reset to Defaults
            </button>
            <button
              onClick={() => {
                resetScenarioDraft();
                setScenarioModalMode('add');
                setIsAddScenarioOpen(true);
              }}
              className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              + Add Custom Offer
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Last saved: {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : 'Not saved yet'}
          </p>

          {simulatedOffers.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
                Custom Offers
              </div>
              <div className="space-y-2">
                {simulatedOffers.map((offer) => {
                  const name =
                    offer.application && applications.find((a) => a.id === offer.application)
                      ? getApplicationName(offer.application)
                      : `${offer.custom_company_name || 'Custom Company'} - ${offer.custom_role_title || 'Custom Role'}`;
                  return (
                    <div key={offer.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2">
                      <span className="text-sm text-gray-800">{name}</span>
                      <button
                        onClick={() => removeScenarioOffer(String(offer.id))}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-800">Adjusted Comparison</h4>
              <p className="text-xs text-gray-500 mt-1">
                Real and custom offers ranked by adjusted value under current assumptions.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Offer</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">COL</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rent / Mo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tax (B/Bn/Eq)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Base / Bonus / Equity (After Tax)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category Deltas</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PTO + Holidays (Days)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Adjusted Value</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Adj Diff vs Current</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {scenarioRows.map((row) => {
                    const isCurrent = !!row.offer.is_current;
                    return (
                      <tr key={`${row.kind}-${String(row.offer.id ?? row.appName)}`} className={isCurrent ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-2 text-sm">
                          <div className="font-medium text-gray-900">{row.appName}</div>
                          <div className="text-xs text-gray-500">{row.kind === 'real' ? 'Real Offer' : 'Custom Offer'}</div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{row.locationLabel}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{Math.round(row.colIndex)}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">${Math.round(row.monthlyRent).toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {Math.round(row.usedBaseTaxRate)}% / {Math.round(row.usedBonusTaxRate)}% / {Math.round(row.usedEquityTaxRate)}%
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          ${Math.round(row.afterTaxBase).toLocaleString()} / ${Math.round(row.afterTaxBonus).toLocaleString()} / $
                          {Math.round(row.afterTaxEquity).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700">
                          {isCurrent ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            <>
                              <div>
                                TC:{' '}
                                <span className={row.deltaTotalComp >= 0 ? 'text-green-600' : 'text-red-500'}>
                                  {row.deltaTotalComp >= 0 ? '+' : ''}${Math.round(row.deltaTotalComp).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                Base:{' '}
                                <span className={row.deltaBaseAfterTax >= 0 ? 'text-green-600' : 'text-red-500'}>
                                  {row.deltaBaseAfterTax >= 0 ? '+' : ''}${Math.round(row.deltaBaseAfterTax).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                Bonus:{' '}
                                <span className={row.deltaBonusAfterTax >= 0 ? 'text-green-600' : 'text-red-500'}>
                                  {row.deltaBonusAfterTax >= 0 ? '+' : ''}${Math.round(row.deltaBonusAfterTax).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                Equity:{' '}
                                <span className={row.deltaEquityAfterTax >= 0 ? 'text-green-600' : 'text-red-500'}>
                                  {row.deltaEquityAfterTax >= 0 ? '+' : ''}${Math.round(row.deltaEquityAfterTax).toLocaleString()}
                                </span>
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700">
                          <div>{Math.round(row.pto_holiday_days)} days</div>
                          {!isCurrent && (
                            <div className={row.deltaPtoHolidayDays >= 0 ? 'text-green-600' : 'text-red-500'}>
                              {row.deltaPtoHolidayDays >= 0 ? '+' : ''}
                              {Math.round(row.deltaPtoHolidayDays)} days vs current
                            </div>
                          )}
                          <div className="text-gray-400">
                            {row.pto_days} PTO days + {row.holiday_days} holidays
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                          ${Math.round(row.adjustedValue).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold">
                          {isCurrent ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            <span className={row.deltaVsCurrent >= 0 ? 'text-green-600' : 'text-red-500'}>
                              {row.deltaVsCurrent >= 0 ? '+' : ''}${Math.round(row.deltaVsCurrent).toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {row.kind === 'simulated' ? (
                            <RowActions
                              size="small"
                              onView={() => openScenarioEditor(String(row.offer.id), 'view')}
                              onEdit={() => openScenarioEditor(String(row.offer.id), 'edit')}
                              onDelete={() => removeScenarioOffer(String(row.offer.id))}
                              deleteTitle="Remove custom offer?"
                              deleteDescription="This will remove this custom offer from adjusted comparison."
                            />
                          ) : Number.isFinite(Number(row.offer.id)) ? (
                            <RowActions
                              size="small"
                              onView={
                                onViewRealOffer
                                  ? () => onViewRealOffer(Number(row.offer.id))
                                  : undefined
                              }
                              onEdit={
                                onEditRealOffer
                                  ? () => onEditRealOffer(Number(row.offer.id))
                                  : undefined
                              }
                              onDelete={() => {}}
                              disableDelete
                              deleteButtonTooltip={
                                isCurrent
                                  ? 'Current offer cannot be deleted here. Unmark current first, then delete in Job Applications.'
                                  : 'Delete real offers from Job Applications page.'
                              }
                            />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isAddScenarioOpen &&
        typeof document !== 'undefined' &&
        createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                {scenarioModalMode === 'view'
                  ? 'View Custom Offer'
                  : editingScenarioId
                    ? 'Edit Custom Offer'
                    : 'Add Custom Offer'}
              </h3>
              <button
                onClick={() => {
                  setIsAddScenarioOpen(false);
                  resetScenarioDraft();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <CloseOutlined className="text-lg" />
              </button>
            </div>
            <form onSubmit={addScenarioOffer} className="flex flex-col min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <fieldset disabled={scenarioModalMode === 'view'} className="m-0 min-w-0 border-0 p-0">
                <OfferFormFields
                showLinkApplication
                linkedApplicationId={newScenario.application ?? null}
                onLinkedApplicationChange={(nextAppId) =>
                  setNewScenario((prev) => {
                    const linkedApp = applications.find((a) => a.id === nextAppId);
                    const linkedWorkMode =
                      linkedApp?.rto_policy === 'REMOTE'
                        ? 'REMOTE'
                        : linkedApp?.rto_policy === 'ONSITE'
                          ? 'ONSITE'
                          : prev.work_mode;
                    const nextLocation = linkedApp?.location || prev.location || referenceLocation;
                    const nextIncome =
                      Number(prev.base_salary) +
                      Number(prev.bonus) +
                      Number(prev.sign_on) +
                      Number(computeBenefitsTotal(scenarioBenefitItems)) +
                      Number(prev.equity);
                    const estimatedTax = estimateTaxRatesByIncomeType(
                      nextIncome,
                      maritalStatus,
                      nextLocation,
                      stateTaxRate,
                      stateNameToAbbr
                    );
                    const col = estimateColIndexFromCity(nextLocation, cityCostOfLiving, stateColBase, stateNameToAbbr);
                    const estimatedRent = Math.round(
                      Math.max(0, Number(effectiveMonthlyRent || 0)) * (Math.max(1, col) / Math.max(1, referenceColIndex))
                    );
                    return {
                      ...prev,
                      application: nextAppId,
                      location: nextLocation,
                      work_mode: linkedWorkMode,
                      rto_days_per_week:
                        typeof linkedApp?.rto_days_per_week === 'number'
                          ? linkedApp.rto_days_per_week
                          : linkedWorkMode === 'REMOTE'
                            ? 0
                            : linkedWorkMode === 'ONSITE'
                              ? 5
                              : prev.rto_days_per_week,
                      tax_base_rate: estimatedTax.baseTaxRate,
                      tax_bonus_rate: estimatedTax.bonusTaxRate,
                      tax_equity_rate: estimatedTax.equityTaxRate,
                      monthly_rent: estimatedRent,
                      commute_cost_value: Number(linkedApp?.commute_cost_value || prev.commute_cost_value || 0),
                      commute_cost_frequency:
                        (linkedApp?.commute_cost_frequency as 'DAILY' | 'MONTHLY' | 'YEARLY') ||
                        prev.commute_cost_frequency ||
                        'MONTHLY',
                      free_food_perk_value: Number(linkedApp?.free_food_perk_value || prev.free_food_perk_value || 0),
                      free_food_perk_frequency:
                        (linkedApp?.free_food_perk_frequency as 'DAILY' | 'MONTHLY' | 'YEARLY') ||
                        prev.free_food_perk_frequency ||
                        'YEARLY',
                    };
                  })
                }
                applicationOptions={applications.map((app) => ({
                  id: app.id,
                  label: `${app.company_name} - ${app.role_title}`,
                }))}
                hideCompanyRoleWhenLinked
                companyName={newScenario.custom_company_name || ''}
                onCompanyNameChange={(value) => setNewScenarioField('custom_company_name', value)}
                roleTitle={newScenario.custom_role_title || ''}
                onRoleTitleChange={(value) => setNewScenarioField('custom_role_title', value)}
                location={newScenario.location || ''}
                onLocationChange={(value) => setNewScenarioField('location', value)}
                locationOptions={allUsCityOptions}
                taxRatePreview={customFormTaxPreview}
                editableTaxRates={{
                  baseTaxRate: Number(newScenario.tax_base_rate ?? 32),
                  bonusTaxRate: Number(newScenario.tax_bonus_rate ?? 40),
                  equityTaxRate: Number(newScenario.tax_equity_rate ?? 42),
                }}
                onEditableTaxRatesChange={(next) =>
                  patchNewScenario({
                    tax_base_rate: next.baseTaxRate,
                    tax_bonus_rate: next.bonusTaxRate,
                    tax_equity_rate: next.equityTaxRate,
                  })
                }
                editableMonthlyRent={Number(newScenario.monthly_rent ?? Math.round(effectiveMonthlyRent || 0))}
                onEditableMonthlyRentChange={(value) =>
                  setNewScenarioField('monthly_rent', value)
                }
                baseSalary={Number(newScenario.base_salary) || 0}
                onBaseSalaryChange={(value) => setNewScenarioField('base_salary', value)}
                bonus={Number(newScenario.bonus) || 0}
                onBonusChange={(value) => setNewScenarioField('bonus', value)}
                equity={Number(newScenario.equity) || 0}
                onEquityChange={(value) => setNewScenarioField('equity', value)}
                equityTotalGrant={Number(newScenario.equity_total_grant ?? 0)}
                onEquityTotalGrantChange={(value) =>
                  setNewScenarioField('equity_total_grant', value)
                }
                equityVestingPercent={Number(newScenario.equity_vesting_percent ?? 25)}
                onEquityVestingPercentChange={(value) =>
                  setNewScenarioField('equity_vesting_percent', value)
                }
                defaultEquityMode={Number(newScenario.equity_total_grant ?? 0) > 0 ? 'total' : 'annual'}
                signOn={Number(newScenario.sign_on) || 0}
                onSignOnChange={(value) => setNewScenarioField('sign_on', value)}
                benefitsValue={computeBenefitsTotal(scenarioBenefitItems)}
                benefitItems={scenarioBenefitItems}
                onAddBenefitItem={addScenarioBenefitItem}
                onUpdateBenefitItem={updateScenarioBenefitItem}
                onRemoveBenefitItem={removeScenarioBenefitItem}
                computeBenefitsTotal={computeBenefitsTotal}
                workMode={newScenario.work_mode}
                onWorkModeChange={(value) => setNewScenarioField('work_mode', value)}
                rtoDaysPerWeek={Number(newScenario.rto_days_per_week) || 0}
                onRtoDaysPerWeekChange={(value) =>
                  setNewScenarioField('rto_days_per_week', value)
                }
                commuteCostValue={Number(newScenario.commute_cost_value) || 0}
                commuteCostFrequency={newScenario.commute_cost_frequency || 'MONTHLY'}
                onCommuteCostValueChange={(value) =>
                  setNewScenarioField('commute_cost_value', value)
                }
                onCommuteCostFrequencyChange={(value) =>
                  setNewScenarioField('commute_cost_frequency', value)
                }
                freeFoodPerkValue={Number(newScenario.free_food_perk_value) || 0}
                freeFoodPerkFrequency={newScenario.free_food_perk_frequency || 'YEARLY'}
                onFreeFoodPerkValueChange={(value) =>
                  setNewScenarioField('free_food_perk_value', value)
                }
                onFreeFoodPerkFrequencyChange={(value) =>
                  setNewScenarioField('free_food_perk_frequency', value)
                }
                enableCompModeToggles
                ptoDays={Number(newScenario.pto_days) || 0}
                onPtoDaysChange={(value) => setNewScenarioField('pto_days', value)}
                holidayDays={Number(newScenario.holiday_days ?? 11)}
                onHolidayDaysChange={(value) => setNewScenarioField('holiday_days', value)}
              />
                </fieldset>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddScenarioOpen(false);
                    resetScenarioDraft();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {scenarioModalMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {scenarioModalMode !== 'view' && (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {editingScenarioId ? 'Save Changes' : 'Add Custom Offer'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default OfferAdjustmentsPanel;
