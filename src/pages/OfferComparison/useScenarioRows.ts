import { useMemo } from 'react';
import {
  annualizeAmount,
  calculateScenarioValue,
  estimateColIndexFromCity,
  estimateTaxRatesByIncomeType,
  type ApplicationLike,
  type MaritalStatus,
  type OfferLike,
  type SimulatedOffer,
} from './calculations';
import type { ScenarioRow } from './offerAdjustmentsTypes';
import type { AdjustedOfferMetrics } from './types';

type Params = {
  filteredOffers: OfferLike[];
  applications: ApplicationLike[];
  simulatedOffers: SimulatedOffer[];
  getApplicationName: (appId: number) => string;
  referenceColIndex: number;
  effectiveMonthlyRent: number;
  referenceLocation: string;
  cityCostOfLiving: Record<string, number>;
  stateColBase: Record<string, number>;
  stateNameToAbbr: Record<string, string>;
  maritalStatus: MaritalStatus;
  stateTaxRate: Record<string, number>;
};

export const useScenarioRows = ({
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
}: Params) => {
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
          app?.monthly_rent_override ?? Math.round(baselineRent * (Math.max(1, rowColIndex) / baselineColIndex)),
        ),
      );
      const workMode =
        app?.rto_policy === 'REMOTE' ? 'REMOTE' : app?.rto_policy === 'ONSITE' ? 'ONSITE' : 'HYBRID';
      const rtoDays =
        typeof app?.rto_days_per_week === 'number'
          ? app.rto_days_per_week
          : workMode === 'REMOTE'
            ? 0
            : workMode === 'ONSITE'
              ? 5
              : 3;
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
        stateNameToAbbr,
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
          (app?.free_food_perk_frequency as 'DAILY' | 'MONTHLY' | 'YEARLY') || 'YEARLY',
        ),
        commuteAnnualCost: annualizeAmount(
          Number(app?.commute_cost_value || 0),
          (app?.commute_cost_frequency as 'DAILY' | 'MONTHLY' | 'YEARLY') || 'MONTHLY',
        ),
        baseTaxRate: rowTax.baseTaxRate,
        bonusTaxRate: rowTax.bonusTaxRate,
        equityTaxRate: rowTax.equityTaxRate,
        costOfLivingIndex: rowColIndex,
      });
      const isUnlimitedPto = !!offer.is_unlimited_pto;

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
        is_unlimited_pto: isUnlimitedPto,
        holiday_days: Number(offer.holiday_days ?? 11),
        pto_holiday_days: isUnlimitedPto
          ? null
          : Number(offer.pto_days || 0) + Number(offer.holiday_days ?? 11),
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
        stateNameToAbbr,
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
          offer.free_food_perk_frequency || 'YEARLY',
        ),
        commuteAnnualCost: annualizeAmount(
          Number(offer.commute_cost_value || 0),
          offer.commute_cost_frequency || 'MONTHLY',
        ),
        baseTaxRate: rowTax.baseTaxRate,
        bonusTaxRate: rowTax.bonusTaxRate,
        equityTaxRate: rowTax.equityTaxRate,
        costOfLivingIndex: rowColIndex,
      });
      const isUnlimitedPto = !!offer.is_unlimited_pto;

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
        is_unlimited_pto: isUnlimitedPto,
        holiday_days: Number(offer.holiday_days ?? 11),
        pto_holiday_days: isUnlimitedPto
          ? null
          : Number(offer.pto_days || 0) + Number(offer.holiday_days ?? 11),
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
    const currentPtoHolidayDays = current?.pto_holiday_days ?? 0;
    const currentHasUnlimitedPto = !!current?.is_unlimited_pto;
    const currentTotalComp = current?.total_comp || 0;

    return rows
      .map((row) => ({
        ...row,
        deltaVsCurrent: row.offer.is_current ? 0 : row.adjustedValue - currentValue,
        deltaTotalComp: row.offer.is_current ? 0 : row.total_comp - currentTotalComp,
        deltaBaseAfterTax: row.offer.is_current ? 0 : row.afterTaxBase - currentBaseAfterTax,
        deltaBonusAfterTax: row.offer.is_current ? 0 : row.afterTaxBonus - currentBonusAfterTax,
        deltaEquityAfterTax: row.offer.is_current ? 0 : row.afterTaxEquity - currentEquityAfterTax,
        deltaPtoHolidayDays:
          row.offer.is_current || row.is_unlimited_pto || currentHasUnlimitedPto || row.pto_holiday_days == null
            ? null
            : row.pto_holiday_days - currentPtoHolidayDays,
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

  const realAdjustedByOfferId = useMemo(() => {
    const realAdjusted: Record<number, AdjustedOfferMetrics> = {};
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
    return realAdjusted;
  }, [scenarioRows]);

  return { scenarioRows, realAdjustedByOfferId };
};
