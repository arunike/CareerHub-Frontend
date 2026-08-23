import { useMemo, useState } from 'react';
import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { type BenefitItem, type SimulatedOffer, computeBenefitsTotal } from './calculations';
import { useSafeFormState } from './useSafeFormState';

const DEFAULT_SCENARIO_BENEFITS: BenefitItem[] = [
  { id: 'benefit-gym', label: 'Gym Reimbursement', amount: 100, frequency: 'MONTHLY' },
  { id: 'benefit-phone', label: 'Cellphone Reimbursement', amount: 100, frequency: 'MONTHLY' },
];

export const defaultScenarioDraft = (): SimulatedOffer => ({
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

export const useScenarioDraft = ({
  setSimulatedOffers,
  messageApi,
}: {
  setSimulatedOffers: React.Dispatch<React.SetStateAction<SimulatedOffer[]>>;
  messageApi: MessageInstance;
}) => {
  const [isAddScenarioOpen, setIsAddScenarioOpen] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [scenarioModalMode, setScenarioModalMode] = useState<'add' | 'view' | 'edit'>('add');
  const [scenarioBenefitItems, setScenarioBenefitItems] =
    useState<BenefitItem[]>(DEFAULT_SCENARIO_BENEFITS);
  const {
    state: newScenario,
    setState: setNewScenario,
    patch: patchNewScenario,
    setField: setNewScenarioField,
  } = useSafeFormState<SimulatedOffer>(defaultScenarioDraft());

  const customFormTaxPreview = useMemo(
    () => ({
      baseTaxRate: Number(newScenario.tax_base_rate ?? 32),
      bonusTaxRate: Number(newScenario.tax_bonus_rate ?? 40),
      equityTaxRate: Number(newScenario.tax_equity_rate ?? 42),
      note: 'Per-offer manual',
    }),
    [newScenario.tax_base_rate, newScenario.tax_bonus_rate, newScenario.tax_equity_rate]
  );

  const resetScenarioDraft = () => {
    setNewScenario(defaultScenarioDraft());
    setScenarioBenefitItems(DEFAULT_SCENARIO_BENEFITS);
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

  return {
    isAddScenarioOpen,
    setIsAddScenarioOpen,
    editingScenarioId,
    setEditingScenarioId,
    scenarioModalMode,
    setScenarioModalMode,
    scenarioBenefitItems,
    setScenarioBenefitItems,
    newScenario,
    setNewScenario,
    patchNewScenario,
    setNewScenarioField,
    customFormTaxPreview,
    resetScenarioDraft,
    addScenarioBenefitItem,
    updateScenarioBenefitItem,
    removeScenarioBenefitItem,
    addScenarioOffer,
  };
};
