import React, { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { usaCities } from 'typed-usa-states';
import { useSafeFormState } from './useSafeFormState';
import AdjustedComparisonTable from './AdjustedComparisonTable';
import ScenarioOfferModal from './ScenarioOfferModal';
import { useScenarioRows } from './useScenarioRows';
import { useOfferReferenceData } from './useOfferReferenceData';
import { useOfferAdjustmentsPersistence } from './useOfferAdjustmentsPersistence';
import {
  type BenefitItem,
  type MaritalStatus,
  type SimulatedOffer,
  computeBenefitsTotal,
  estimateColIndexFromCity,
} from './calculations';
import {
  type OfferAdjustmentsPanelProps,
} from './offerAdjustmentsTypes';

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
  const [scenarioBenefitItems, setScenarioBenefitItems] = useState<BenefitItem[]>(
    defaultScenarioBenefits()
  );
  const {
    state: newScenario,
    setState: setNewScenario,
    patch: patchNewScenario,
    setField: setNewScenarioField,
  } = useSafeFormState<SimulatedOffer>(defaultScenarioDraft());

  const referenceLocation = useMemo(() => {
    const current = filteredOffers.find((offer) => offer.is_current) || filteredOffers[0];
    if (current) {
      const currentApp = applications.find((app) => app.id === current.application);
      if (currentApp?.location?.trim()) return currentApp.location;
    }
    const anyLocation = applications.find((app) => app.location?.trim())?.location;
    return anyLocation || 'San Francisco, CA, United States';
  }, [filteredOffers, applications]);

  const normalizeSimulatedOffers = useMemo(
    () => (offersToNormalize: SimulatedOffer[]) =>
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
        };
      }),
    []
  );

  const {
    maritalStatus,
    setMaritalStatus,
    simulatedOffers,
    setSimulatedOffers,
    lastSavedAt,
    isSettingsHydrated,
    saveAdjustments,
  } = useOfferAdjustmentsPersistence({
    storageKey: OFFER_ADJUSTMENT_SETTINGS_KEY,
    normalizeSimulatedOffers,
  });

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

  const { scenarioRows, realAdjustedByOfferId } = useScenarioRows({
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

  useEffect(() => {
    if (!onRealAdjustedChange) return;
    onRealAdjustedChange(realAdjustedByOfferId);
  }, [realAdjustedByOfferId, onRealAdjustedChange]);

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
      saveAdjustments();
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

          <AdjustedComparisonTable
            scenarioRows={scenarioRows}
            onOpenScenarioEditor={openScenarioEditor}
            onRemoveScenarioOffer={removeScenarioOffer}
            onViewRealOffer={onViewRealOffer}
            onEditRealOffer={onEditRealOffer}
          />
        </div>
      )}

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
    </>
  );
};

export default OfferAdjustmentsPanel;
