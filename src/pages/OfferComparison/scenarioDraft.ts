import type {
  ApplicationLike,
  BenefitItem,
  MaritalStatus,
  SimulatedOffer,
} from './calculations';
import {
  computeBenefitsTotal,
  estimateColIndexFromCity,
  estimateTaxRatesByIncomeType,
} from './calculations';
import { getEffectiveTaxLocation, getOfficeLocation } from '../../utils/applicationLocation';

type BuildLinkedScenarioParams = {
  prev: SimulatedOffer;
  nextAppId: number | null;
  applications: ApplicationLike[];
  scenarioBenefitItems: BenefitItem[];
  maritalStatus: MaritalStatus;
  stateTaxRate: Record<string, number>;
  stateNameToAbbr: Record<string, string>;
  cityCostOfLiving: Record<string, number>;
  stateColBase: Record<string, number>;
  effectiveMonthlyRent: number;
  referenceColIndex: number;
  referenceLocation: string;
};

export const buildScenarioFromLinkedApplication = ({
  prev,
  nextAppId,
  applications,
  scenarioBenefitItems,
  maritalStatus,
  stateTaxRate,
  stateNameToAbbr,
  cityCostOfLiving,
  stateColBase,
  effectiveMonthlyRent,
  referenceColIndex,
  referenceLocation,
}: BuildLinkedScenarioParams): SimulatedOffer => {
  const linkedApp = applications.find((a) => a.id === nextAppId);
  const linkedWorkMode =
    linkedApp?.rto_policy === 'REMOTE'
      ? 'REMOTE'
      : linkedApp?.rto_policy === 'ONSITE'
        ? 'ONSITE'
        : prev.work_mode;
  const nextHomeLocation = getEffectiveTaxLocation(linkedApp) || prev.location || prev.office_location || referenceLocation;
  const nextOfficeLocation = getOfficeLocation(linkedApp) || prev.office_location || '';
  const nextIncome =
    Number(prev.base_salary) +
    Number(prev.bonus) +
    Number(prev.sign_on) +
    Number(computeBenefitsTotal(scenarioBenefitItems)) +
    Number(prev.equity);

  const estimatedTax = estimateTaxRatesByIncomeType(
    nextIncome,
    maritalStatus,
    nextHomeLocation,
    stateTaxRate,
    stateNameToAbbr,
  );
  const col = estimateColIndexFromCity(nextHomeLocation, cityCostOfLiving, stateColBase, stateNameToAbbr);
  const estimatedRent = Math.round(
    Math.max(0, Number(effectiveMonthlyRent || 0)) * (Math.max(1, col) / Math.max(1, referenceColIndex)),
  );

  return {
    ...prev,
    application: nextAppId,
    location: nextHomeLocation,
    office_location: nextOfficeLocation,
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
};
