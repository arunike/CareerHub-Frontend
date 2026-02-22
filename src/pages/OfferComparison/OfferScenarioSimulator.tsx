import React, { useEffect, useMemo, useState } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import { Select, message } from 'antd';
import { usaCities } from 'typed-usa-states';
import { getCareerReferenceData, getCareerRentEstimate } from '../../api';
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
  work_mode: string;
  rto_days_per_week: number;
  free_food: boolean;
  adjustedValue: number;
  lifestyleAdjustment: number;
  deltaVsCurrent: number;
}

interface OfferScenarioSimulatorProps {
  isOpen: boolean;
  filteredOffers: OfferLike[];
  applications: ApplicationLike[];
  getApplicationName: (appId: number) => string;
  onRealAdjustedChange?: (data: Record<number, { adjustedValue: number; adjustedDiff: number }>) => void;
}

const defaultScenarioDraft = (): SimulatedOffer => ({
  id: '',
  application: null,
  custom_company_name: '',
  custom_role_title: '',
  base_salary: 100000,
  bonus: 20000,
  equity: 20000,
  sign_on: 10000,
  benefits_value: 12000,
  work_mode: 'HYBRID',
  rto_days_per_week: 3,
  free_food: false,
  commute_monthly_cost: 200,
  wellness_stipend: 0,
  wlb_score: 7,
});

const defaultScenarioBenefits = (): BenefitItem[] => [
  { id: 'benefit-gym', label: 'Gym Reimbursement', amount: 100, frequency: 'MONTHLY' },
  { id: 'benefit-phone', label: 'Cellphone Reimbursement', amount: 100, frequency: 'MONTHLY' },
];

const OfferScenarioSimulator = ({
  isOpen,
  filteredOffers,
  applications,
  getApplicationName,
  onRealAdjustedChange,
}: OfferScenarioSimulatorProps) => {
  const [messageApi, contextHolder] = message.useMessage();

  const [isAddScenarioOpen, setIsAddScenarioOpen] = useState(false);
  const [simulatedOffers, setSimulatedOffers] = useState<SimulatedOffer[]>([]);
  const [scenarioBenefitItems, setScenarioBenefitItems] = useState<BenefitItem[]>(
    defaultScenarioBenefits()
  );
  const [newScenario, setNewScenario] = useState<SimulatedOffer>(defaultScenarioDraft());

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

  const [baseTaxRate, setBaseTaxRate] = useState(35);
  const [bonusTaxRate, setBonusTaxRate] = useState(39);
  const [equityTaxRate, setEquityTaxRate] = useState(41);
  const [equityRealization, setEquityRealization] = useState(80);
  const [selectedCity, setSelectedCity] = useState<string>('San Francisco, CA, United States');
  const [citySearch, setCitySearch] = useState('San Francisco, CA, United States');
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>('SINGLE');
  const [autoTax, setAutoTax] = useState(true);
  const [autoColByCity, setAutoColByCity] = useState(true);
  const [manualColIndex, setManualColIndex] = useState<number>(168);
  const [useManualRent, setUseManualRent] = useState(false);
  const [manualMonthlyRent, setManualMonthlyRent] = useState<number>(3500);
  const [rentEstimate, setRentEstimate] = useState<RentEstimateData | null>(null);

  const staticCityOptions = useMemo(
    () =>
      Object.keys(cityCostOfLiving).map((city) =>
        city === 'Remote / National Average' || city.includes('United States')
          ? city
          : `${city}, United States`
      ),
    [cityCostOfLiving]
  );

  const allUsCityOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...staticCityOptions,
          ...usaCities.map((city) => {
            const abbr = stateNameToAbbr[city.state] || city.state;
            return `${city.name}, ${abbr}, United States`;
          }),
          'Remote / National Average',
        ])
      ),
    [staticCityOptions, stateNameToAbbr]
  );

  const computedColIndex = useMemo(
    () =>
      estimateColIndexFromCity(selectedCity, cityCostOfLiving, stateColBase, stateNameToAbbr),
    [selectedCity, cityCostOfLiving, stateColBase, stateNameToAbbr]
  );
  const costOfLivingIndex = autoColByCity ? computedColIndex : manualColIndex;
  const effectiveMonthlyRent = useManualRent
    ? manualMonthlyRent
    : Number(rentEstimate?.monthly_rent_estimate || 0);

  const referenceIncome = useMemo(() => {
    const current = filteredOffers.find((offer) => offer.is_current) || filteredOffers[0];
    if (!current) return 200000;
    return (
      Number(current.base_salary) +
      Number(current.bonus) +
      Number(current.sign_on) +
      Number(current.benefits_value) +
      Number(current.equity)
    );
  }, [filteredOffers]);

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
    const run = async () => {
      try {
        const response = await getCareerRentEstimate(selectedCity);
        const data = response.data as RentEstimateData;
        setRentEstimate(data);
        if (typeof data.monthly_rent_estimate === 'number' && !useManualRent) {
          setManualMonthlyRent(data.monthly_rent_estimate);
        }
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
  }, [selectedCity, useManualRent]);

  useEffect(() => {
    const query = citySearch.trim();
    if (!query) {
      setCityOptions(staticCityOptions);
      return;
    }
    const normalized = query.toLowerCase();
    const filtered = allUsCityOptions
      .filter((city) => city.toLowerCase().includes(normalized))
      .slice(0, 200);
    setCityOptions(filtered.length > 0 ? filtered : staticCityOptions);
  }, [citySearch, allUsCityOptions, staticCityOptions]);

  useEffect(() => {
    if (!autoTax) return;
    const estimated = estimateTaxRatesByIncomeType(
      referenceIncome,
      maritalStatus,
      selectedCity,
      stateTaxRate,
      stateNameToAbbr
    );
    setBaseTaxRate(estimated.baseTaxRate);
    setBonusTaxRate(estimated.bonusTaxRate);
    setEquityTaxRate(estimated.equityTaxRate);
  }, [autoTax, referenceIncome, maritalStatus, selectedCity, stateTaxRate, stateNameToAbbr]);

  const scenarioRows = useMemo<ScenarioRow[]>(() => {
    const annualRentLoad = Math.max(0, Number(effectiveMonthlyRent || 0)) * 12;
    const realRows = filteredOffers.map((offer) => {
      const app = applications.find((a) => a.id === offer.application);
      const workMode =
        app?.rto_policy === 'REMOTE' ? 'REMOTE' : app?.rto_policy === 'ONSITE' ? 'ONSITE' : 'HYBRID';
      const rtoDays =
        typeof app?.rto_days_per_week === 'number' ? app.rto_days_per_week : workMode === 'REMOTE' ? 0 : workMode === 'ONSITE' ? 5 : 3;

      const scenarioCalc = calculateScenarioValue({
        base_salary: Number(offer.base_salary),
        bonus: Number(offer.bonus),
        sign_on: Number(offer.sign_on),
        benefits_value: Number(offer.benefits_value),
        equity: Number(offer.equity),
        work_mode: workMode,
        rto_days_per_week: rtoDays,
        free_food: false,
        commute_monthly_cost: 0,
        wellness_stipend: 0,
        wlb_score: 5,
        baseTaxRate,
        bonusTaxRate,
        equityTaxRate,
        equityRealization,
        costOfLivingIndex,
      });

      return {
        kind: 'real' as const,
        offer,
        appName: getApplicationName(offer.application),
        work_mode: workMode,
        rto_days_per_week: rtoDays,
        free_food: false,
        adjustedValue: scenarioCalc.adjustedValue - annualRentLoad,
        lifestyleAdjustment: scenarioCalc.lifestyleAdjustment,
      };
    });

    const simulatedRows = simulatedOffers.map((offer) => {
      const scenarioCalc = calculateScenarioValue({
        base_salary: Number(offer.base_salary),
        bonus: Number(offer.bonus),
        sign_on: Number(offer.sign_on),
        benefits_value: Number(offer.benefits_value),
        equity: Number(offer.equity),
        work_mode: offer.work_mode,
        rto_days_per_week: offer.rto_days_per_week,
        free_food: offer.free_food,
        commute_monthly_cost: offer.commute_monthly_cost,
        wellness_stipend: offer.wellness_stipend,
        wlb_score: offer.wlb_score,
        baseTaxRate,
        bonusTaxRate,
        equityTaxRate,
        equityRealization,
        costOfLivingIndex,
      });

      const appName =
        offer.application && applications.find((a) => a.id === offer.application)
          ? getApplicationName(offer.application)
          : `${offer.custom_company_name || 'Custom Company'} - ${offer.custom_role_title || 'Custom Role'}`;

      return {
        kind: 'simulated' as const,
        offer: { ...offer, is_current: false },
        appName,
        work_mode: offer.work_mode,
        rto_days_per_week: offer.rto_days_per_week,
        free_food: offer.free_food,
        adjustedValue: scenarioCalc.adjustedValue - annualRentLoad,
        lifestyleAdjustment: scenarioCalc.lifestyleAdjustment,
      };
    });

    const rows = [...realRows, ...simulatedRows];
    const current = rows.find((r) => r.offer.is_current);
    const currentValue = current?.adjustedValue || 0;

    return rows
      .map((row) => ({
        ...row,
        deltaVsCurrent: row.offer.is_current ? 0 : row.adjustedValue - currentValue,
      }))
      .sort((a, b) => b.adjustedValue - a.adjustedValue);
  }, [
    filteredOffers,
    applications,
    simulatedOffers,
    getApplicationName,
    baseTaxRate,
    bonusTaxRate,
    equityTaxRate,
    equityRealization,
    costOfLivingIndex,
    effectiveMonthlyRent,
  ]);

  useEffect(() => {
    if (!onRealAdjustedChange) return;
    const realAdjusted: Record<number, { adjustedValue: number; adjustedDiff: number }> = {};
    scenarioRows.forEach((row) => {
      if (row.kind !== 'real') return;
      const id = Number(row.offer.id);
      if (!Number.isFinite(id)) return;
      realAdjusted[id] = {
        adjustedValue: row.adjustedValue,
        adjustedDiff: row.deltaVsCurrent,
      };
    });
    onRealAdjustedChange(realAdjusted);
  }, [scenarioRows, onRealAdjustedChange]);

  const resetScenarioDraft = () => {
    setNewScenario(defaultScenarioDraft());
    setScenarioBenefitItems(defaultScenarioBenefits());
  };

  const resetScenarioDefaults = () => {
    setBaseTaxRate(35);
    setBonusTaxRate(39);
    setEquityTaxRate(41);
    setEquityRealization(80);
    setSelectedCity('San Francisco, CA, United States');
    setCitySearch('San Francisco, CA, United States');
    setMaritalStatus('SINGLE');
    setAutoTax(true);
    setAutoColByCity(true);
    setManualColIndex(168);
    setUseManualRent(false);
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

  const addScenarioOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const hasLinkedApp = typeof newScenario.application === 'number';
    const hasCustomName =
      (newScenario.custom_company_name || '').trim().length > 0 &&
      (newScenario.custom_role_title || '').trim().length > 0;

    if (!hasLinkedApp && !hasCustomName) {
      messageApi.error('Select an application or enter custom company and role');
      return;
    }

    setSimulatedOffers((prev) => [
      ...prev,
      {
        ...newScenario,
        benefits_value: computeBenefitsTotal(scenarioBenefitItems),
        id: `sim-${Date.now()}`,
      },
    ]);

    setIsAddScenarioOpen(false);
    resetScenarioDraft();
    messageApi.success('Custom offer added');
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
                * (1 - bonusTax)) + (Equity * EquityRealization * (1 - equityTax)) ] * (100 / COL) + LifestyleAdj
                - (MonthlyRent * 12)
              </div>
              <p>`COL` is city-based by default (or manual override).</p>
              <p>`LifestyleAdj` includes work-mode premium/penalty, RTO days, commute, free food, wellness stipend, and WLB score.</p>
              <p>`MonthlyRent` comes from HUD/Fallback estimate unless manually overridden.</p>
            </div>
          </details>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Tax Rates</label>
                <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={autoTax}
                    onChange={(e) => setAutoTax(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Auto-fill
                </label>
              </div>

              {[
                ['Base', baseTaxRate, setBaseTaxRate],
                ['Bonus', bonusTaxRate, setBonusTaxRate],
                ['Equity', equityTaxRate, setEquityTaxRate],
              ].map(([label, value, setter]) => (
                <div key={String(label)}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600">{String(label)}</span>
                    <span className="text-xs font-semibold text-gray-900">{Number(value)}%</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={55}
                    value={Number(value)}
                    disabled={autoTax}
                    onChange={(e) => (setter as (v: number) => void)(Number(e.target.value))}
                    className={clsx('w-full', autoTax && 'opacity-50 cursor-not-allowed')}
                  />
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-gray-200 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Comparison City</label>
                <span className="text-sm font-semibold text-gray-900">COL {costOfLivingIndex}</span>
              </div>
              <Select
                showSearch
                value={selectedCity}
                onSearch={(value) => setCitySearch(value)}
                onChange={(value) => {
                  setSelectedCity(value);
                  setCitySearch(value);
                }}
                placeholder="Search US city (e.g. Austin, TX)"
                className="w-full"
                filterOption={false}
                options={cityOptions.map((city) => ({ label: city, value: city }))}
                virtual
                size="large"
              />
              <p className="text-xs pt-2 text-gray-500">
                US-only city list from local dataset. Type to filter, then choose from dropdown.
              </p>
              <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={autoColByCity}
                  onChange={(e) => setAutoColByCity(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Auto COL from city
              </label>
              {!autoColByCity && (
                <input
                  type="number"
                  min={70}
                  max={220}
                  value={manualColIndex}
                  onChange={(e) => setManualColIndex(Number(e.target.value) || 100)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Manual COL index"
                />
              )}
            </div>

            <div className="rounded-lg border border-gray-200 p-4 space-y-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Marital Status</label>
              </div>
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
                Tax estimate uses current offer income (${Math.round(referenceIncome).toLocaleString()}/yr).
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Equity Realization</label>
                <span className="text-sm font-semibold text-gray-900">{equityRealization}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={100}
                value={equityRealization}
                onChange={(e) => setEquityRealization(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="rounded-lg border border-gray-200 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Monthly Rent (HUD)</label>
                <span className="text-sm font-semibold text-gray-900">
                  ${Math.round(effectiveMonthlyRent || 0).toLocaleString()}
                </span>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={useManualRent}
                  onChange={(e) => setUseManualRent(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Manual override
              </label>
              {useManualRent && (
                <input
                  type="number"
                  min={0}
                  value={manualMonthlyRent}
                  onChange={(e) => setManualMonthlyRent(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Manual monthly rent"
                />
              )}
              <p className="text-xs text-gray-500">
                Source: {rentEstimate?.provider || 'HUD FMR API'}{rentEstimate?.fmr_year ? ` (${rentEstimate.fmr_year})` : ''}
                {rentEstimate?.matched_area ? ` • ${rentEstimate.matched_area}` : ''}
              </p>
              <p className="text-xs text-gray-500">
                Last updated: {rentEstimate?.last_updated ? new Date(rentEstimate.last_updated).toLocaleString() : '-'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={resetScenarioDefaults}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Reset to Defaults
            </button>
            <button
              onClick={() => setIsAddScenarioOpen(true)}
              className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              + Add Custom Offer
            </button>
          </div>

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
        </div>
      )}

      {isAddScenarioOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">Add Custom Offer</h3>
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
            <form onSubmit={addScenarioOffer}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link Existing Application (Optional)
                  </label>
                  <select
                    value={newScenario.application ?? ''}
                    onChange={(e) =>
                      setNewScenario((prev) => {
                        const nextAppId = e.target.value ? Number(e.target.value) : null;
                        const linkedApp = applications.find((a) => a.id === nextAppId);
                        const linkedWorkMode =
                          linkedApp?.rto_policy === 'REMOTE'
                            ? 'REMOTE'
                            : linkedApp?.rto_policy === 'ONSITE'
                              ? 'ONSITE'
                              : prev.work_mode;
                        return {
                          ...prev,
                          application: nextAppId,
                          work_mode: linkedWorkMode,
                          rto_days_per_week:
                            typeof linkedApp?.rto_days_per_week === 'number'
                              ? linkedApp.rto_days_per_week
                              : linkedWorkMode === 'REMOTE'
                                ? 0
                                : linkedWorkMode === 'ONSITE'
                                  ? 5
                                  : prev.rto_days_per_week,
                        };
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">No link (custom)</option>
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.company_name} - {app.role_title}
                      </option>
                    ))}
                  </select>
                </div>

                {!newScenario.application && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <input
                        type="text"
                        value={newScenario.custom_company_name}
                        onChange={(e) =>
                          setNewScenario({ ...newScenario, custom_company_name: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="e.g. Stripe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <input
                        type="text"
                        value={newScenario.custom_role_title}
                        onChange={(e) =>
                          setNewScenario({ ...newScenario, custom_role_title: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="e.g. Senior SWE"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Base Salary', 'base_salary'],
                    ['Bonus', 'bonus'],
                    ['Equity / Yr', 'equity'],
                    ['Sign-On', 'sign_on'],
                  ].map(([label, key]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <input
                        type="number"
                        value={(newScenario as unknown as Record<string, number>)[key]}
                        onChange={(e) =>
                          setNewScenario({
                            ...newScenario,
                            [key]: Number(e.target.value) || 0,
                          } as SimulatedOffer)
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Benefit Items</label>
                    <button type="button" onClick={addScenarioBenefitItem} className="text-xs text-blue-600 hover:text-blue-700">
                      + Add Item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {scenarioBenefitItems.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateScenarioBenefitItem(item.id, { label: e.target.value })}
                          placeholder="e.g. Gym reimbursement"
                          className="col-span-5 rounded-md border border-gray-300 px-2 py-2 text-sm"
                        />
                        <input
                          type="number"
                          min={0}
                          value={item.amount}
                          onChange={(e) =>
                            updateScenarioBenefitItem(item.id, { amount: Number(e.target.value) || 0 })
                          }
                          className="col-span-3 rounded-md border border-gray-300 px-2 py-2 text-sm"
                        />
                        <select
                          value={item.frequency}
                          onChange={(e) =>
                            updateScenarioBenefitItem(item.id, {
                              frequency: e.target.value as BenefitItem['frequency'],
                            })
                          }
                          className="col-span-3 rounded-md border border-gray-300 px-2 py-2 text-sm"
                        >
                          <option value="MONTHLY">/month</option>
                          <option value="YEARLY">/year</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeScenarioBenefitItem(item.id)}
                          className="col-span-1 text-red-500 text-sm"
                          aria-label="Remove benefit item"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Annualized benefits value used in adjusted comparison: ${Math.round(computeBenefitsTotal(scenarioBenefitItems)).toLocaleString()}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode</label>
                    <select
                      value={newScenario.work_mode}
                      onChange={(e) =>
                        setNewScenario({
                          ...newScenario,
                          work_mode: e.target.value as SimulatedOffer['work_mode'],
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="REMOTE">Remote</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="ONSITE">Onsite</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">RTO Days / Week</label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={newScenario.rto_days_per_week}
                      onChange={(e) =>
                        setNewScenario({
                          ...newScenario,
                          rto_days_per_week: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commute Cost / Month ($)</label>
                    <input
                      type="number"
                      min={0}
                      value={newScenario.commute_monthly_cost}
                      onChange={(e) =>
                        setNewScenario({
                          ...newScenario,
                          commute_monthly_cost: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wellness Stipend / Yr ($)</label>
                    <input
                      type="number"
                      min={0}
                      value={newScenario.wellness_stipend}
                      onChange={(e) =>
                        setNewScenario({
                          ...newScenario,
                          wellness_stipend: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WLB Score (1-10)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newScenario.wlb_score}
                      onChange={(e) =>
                        setNewScenario({
                          ...newScenario,
                          wlb_score: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={newScenario.free_food}
                        onChange={(e) => setNewScenario({ ...newScenario, free_food: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      Free food perk
                    </label>
                  </div>
                </div>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add Custom Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default OfferScenarioSimulator;
