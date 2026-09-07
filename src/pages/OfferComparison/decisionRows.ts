import {
  type ApplicationLike as Application,
  type OfferLike as Offer,
  type SimulatedOffer,
} from './calculations';
import type { AdjustedOfferMetrics } from './types';
import type { ScenarioRow } from './offerAdjustmentsTypes';
import { getImmigrationSignalLabel } from './immigrationSignal';
import { computeIndependentFinancialScore } from './financialScore';
import { benefitsBreakdown, scoreBenefitsWithBreakdown } from './benefitsScore';
import {
  ONE_TIME_HORIZON_YEARS,
  bonusYearElapsed,
  financialScoreValue,
  forfeitedBonus,
} from './financialScore';
import {
  CATEGORY_LABELS,
  VISA_OVERLAY_WEIGHT,
  buildFinancialCalculationLines,
  buildScoreValueLines,
  formatCurrency,
  getWorkMode,
  hasImmigrationSignal,
  scoreFromManual,
  scoreLocationWithBreakdown,
  scoreTrajectory,
  scoreVisa,
  scoreWorkLife,
  totalAnnualComp,
} from './decisionScoring';
import type { CategoryKey, CategoryScore, DecisionRow } from './decisionScoring';

export const buildRows = (
  filteredOffers: Offer[],
  applicationsById: Record<number, Application | undefined>,
  adjustedByOfferId: Record<number, AdjustedOfferMetrics>,
  weights: Record<CategoryKey, number>,
  simulatedOffers: SimulatedOffer[],
  scenarioRows: ScenarioRow[],
  todayIso = new Date().toISOString().slice(0, 10)
) => {
  // Resigning before the bonus lands forfeits what has accrued since it was last paid.
  const currentRole = filteredOffers.find((offer) => offer.is_current);
  const bonusYearShare = bonusYearElapsed(todayIso);
  const grossForfeitedBonus = currentRole
    ? forfeitedBonus(Number(currentRole.bonus) || 0, todayIso)
    : 0;
  const financialValues = filteredOffers.map((offer) =>
    offer.id && adjustedByOfferId[offer.id]?.adjustedValue != null
      ? adjustedByOfferId[offer.id].adjustedValue
      : totalAnnualComp(offer)
  );

  const simFinancialValues = simulatedOffers.map((offer) => {
    const sr = scenarioRows.find((r) => String(r.offer.id) === String(offer.id));
    return sr ? sr.adjustedValue : 0;
  });

  const rows = filteredOffers.map((offer, index) => {
    const app = applicationsById[offer.application];
    const financialValue = financialValues[index] || totalAnnualComp(offer);
    const financialMetrics = offer.id ? adjustedByOfferId[offer.id] : undefined;
    const workMode = getWorkMode(app, offer);
    const shouldScoreImmigration = hasImmigrationSignal(app);
    const workLifeScore = scoreWorkLife(offer, app);
    const brandScore = scoreFromManual(app?.brand_score);
    const trajectory = scoreTrajectory(app);
    const baseTaxRate = Number(financialMetrics?.usedBaseTaxRate) || 0;
    const benefits = scoreBenefitsWithBreakdown(offer, baseTaxRate);
    // Cost of living scales the whole adjusted value, so the slice being removed is scaled too.
    const colIndex = Number(financialMetrics?.costOfLivingIndex) || 100;
    const parts = benefitsBreakdown(offer, baseTaxRate);
    const benefitsPortion =
      (parts.retirementMatch + parts.hsa + parts.perks) * (100 / Math.max(colIndex, 1));
    // Staying put forfeits nothing, so the current role is never charged for leaving itself.
    const lostBonus = offer.is_current
      ? 0
      : grossForfeitedBonus * (1 - (Number(financialMetrics?.usedBonusTaxRate) || 0) / 100);

    const baseWeightScale = shouldScoreImmigration ? (100 - VISA_OVERLAY_WEIGHT) / 100 : 1;

    const categories: CategoryScore[] = (Object.entries(weights) as [CategoryKey, number][]).map(
      ([key, weight]) => {
        const category = {
          key,
          label: CATEGORY_LABELS[key],
          weight: Math.round(weight * baseWeightScale),
        };

        if (category.key === 'benefits') {
          return {
            ...category,
            score: benefits.score,
            detail: benefits.detail,
            calculationLines: benefits.calculationLines,
            isScored: true,
          };
        }
        if (category.key === 'financial') {
          // Benefits are scored on their own now, so cash is not judged with them counted twice.
          const scoreParts = financialScoreValue({
            adjustedValue: financialValue,
            benefitsPortion,
            afterTaxSignOn: Number(financialMetrics?.afterTaxSignOn) || 0,
            afterTaxRelocation: Number(financialMetrics?.afterTaxRelocation) || 0,
            forfeitedBonus: lostBonus,
            colIndex,
          });
          const cashOnlyValue = scoreParts.value;
          const financialScore = computeIndependentFinancialScore(cashOnlyValue);
          return {
            ...category,
            score: financialScore,
            detail: `${formatCurrency(cashOnlyValue)} recurring, after tax and cost of living`,
            calculationLines: [
              ...buildFinancialCalculationLines({
                offer,
                metrics: financialMetrics,
                financialValue,
              }),
              `Benefits taken out: ${formatCurrency(benefitsPortion)} of that adjusted value is 401(k) match, HSA and perks, scored under Benefits instead`,
              `One-time money over ${ONE_TIME_HORIZON_YEARS} years: sign-on ${formatCurrency(Number(financialMetrics?.afterTaxSignOn) || 0)} + relocation ${formatCurrency(Number(financialMetrics?.afterTaxRelocation) || 0)}${lostBonus > 0 ? ` - bonus you would forfeit ${formatCurrency(lostBonus)}` : ''} = ${formatCurrency((Number(financialMetrics?.afterTaxSignOn) || 0) + (Number(financialMetrics?.afterTaxRelocation) || 0) - lostBonus)}, x 100 / ${colIndex} for cost of living = ${formatCurrency(scoreParts.oneTimeTotal)}, of which ${formatCurrency(scoreParts.oneTimeCounted)} counts this year`,
              lostBonus > 0
                ? `Bonus left behind: you are ${Math.round(bonusYearShare * 100)}% through the bonus year, so resigning now gives up ${formatCurrency(lostBonus)} after tax. Leave once it has been paid and this drops to nothing`
                : '',
              ...buildScoreValueLines({
                financialValue,
                benefitsPortion,
                oneTimeRemoved: scoreParts.oneTimeRemoved,
                oneTimeCounted: scoreParts.oneTimeCounted,
                scoreValue: cashOnlyValue,
                financialScore,
              }),
            ].filter(Boolean),
            isScored: true,
          };
        }
        if (category.key === 'workLife') {
          return {
            ...category,
            score: workLifeScore.score,
            detail: workLifeScore.detail,
            calculationLines: workLifeScore.calculationLines,
            isScored: true,
          };
        }
        if (category.key === 'trajectory') {
          return {
            ...category,
            score: trajectory.score,
            detail: trajectory.detail,
            calculationLines: trajectory.calculationLines,
            isScored: trajectory.isScored,
          };
        }
        if (category.key === 'location') {
          const locationScore = scoreLocationWithBreakdown(app, Number(offer.base_salary) || 0);
          return {
            ...category,
            score: locationScore.score,
            detail:
              workMode === 'REMOTE'
                ? 'Remote — works from anywhere'
                : app?.office_location || app?.location || 'Location unknown',
            calculationLines: locationScore.calculationLines,
            isScored: true,
          };
        }
        return {
          ...category,
          score: brandScore ?? 0,
          detail:
            brandScore != null
              ? `${app?.brand_score}/5 manual`
              : 'Skipped until Brand Score is set',
          isScored: brandScore != null,
        };
      }
    );

    if (shouldScoreImmigration) {
      const immigrationScore = scoreVisa(app);
      const immigrationLabel = getImmigrationSignalLabel(app?.visa_sponsorship, app?.day_one_gc);
      categories.push({
        key: 'visa' as const,
        label: CATEGORY_LABELS.visa,
        weight: VISA_OVERLAY_WEIGHT,
        score: immigrationScore,
        detail: immigrationLabel,
        calculationLines: [
          `Immigration support: ${immigrationLabel}`,
          `Immigration score: ${Math.round(immigrationScore)}`,
        ],
        isScored: true,
      });
    }

    const scoredCategories = categories.filter((category) => category.isScored);
    const activeWeightTotal =
      scoredCategories.reduce((sum, category) => sum + category.weight, 0) || 1;
    const score =
      scoredCategories.reduce((sum, category) => sum + category.score * category.weight, 0) /
      activeWeightTotal;

    return {
      id: `${offer.id ?? 'scenario'}-${offer.application}-${index}`,
      applicationId: offer.application,
      company: app?.company_name || offer.application_details?.company || 'Unknown company',
      role: app?.role_title || offer.application_details?.role_title || 'Unknown role',
      score: Math.round(score),
      rank: 0,
      categories,
      immigrationLabel: getImmigrationSignalLabel(app?.visa_sponsorship, app?.day_one_gc),
      workModeLabel: workMode[0] + workMode.slice(1).toLowerCase(),
      financialValue,
      hasImmigrationSignal: shouldScoreImmigration,
      offer,
      isSimulated: false,
    } satisfies DecisionRow;
  });

  const simRows = simulatedOffers.map((offer, index) => {
    const financialValue = simFinancialValues[index];
    const scenarioRow = scenarioRows.find((row) => String(row.offer.id) === String(offer.id));
    const baseApp = offer.application ? applicationsById[offer.application] : undefined;
    const company = baseApp
      ? baseApp.company_name
      : offer.custom_company_name || 'Simulated Company';
    const role = baseApp ? baseApp.role_title : offer.custom_role_title || 'Simulated Role';

    const app = {
      ...baseApp,
      company_name: company,
      role_title: role,
      rto_policy: offer.work_mode,
      rto_days_per_week: offer.rto_days_per_week,
      commute_cost_value: offer.commute_cost_value,
      commute_cost_frequency: offer.commute_cost_frequency,
      commute_options: offer.commute_options,
      pto_days: offer.pto_days,
      holiday_days: offer.holiday_days,
      office_location: offer.office_location,
      location: offer.location,
    } as unknown as Application;

    const workMode = getWorkMode(app, offer);
    const shouldScoreImmigration = hasImmigrationSignal(app);
    const workLifeScore = scoreWorkLife(offer, app);
    const brandScore = scoreFromManual(app?.brand_score);
    const trajectory = scoreTrajectory(app);
    const simBaseTaxRate = Number(scenarioRow?.usedBaseTaxRate) || 0;
    const benefits = scoreBenefitsWithBreakdown(offer, simBaseTaxRate);
    const simColIndex = Number(scenarioRow?.colIndex) || 100;
    const simParts = benefitsBreakdown(offer, simBaseTaxRate);
    const benefitsPortion =
      (simParts.retirementMatch + simParts.hsa + simParts.perks) * (100 / Math.max(simColIndex, 1));

    const baseWeightScale = shouldScoreImmigration ? (100 - VISA_OVERLAY_WEIGHT) / 100 : 1;

    const categories: CategoryScore[] = (Object.entries(weights) as [CategoryKey, number][]).map(
      ([key, weight]) => {
        const category = {
          key,
          label: CATEGORY_LABELS[key],
          weight: Math.round(weight * baseWeightScale),
        };

        if (category.key === 'benefits') {
          return {
            ...category,
            score: benefits.score,
            detail: benefits.detail,
            calculationLines: benefits.calculationLines,
            isScored: true,
          };
        }
        if (category.key === 'financial') {
          // Benefits are scored on their own now, so cash is not judged with them counted twice.
          const scoreParts = financialScoreValue({
            adjustedValue: financialValue,
            benefitsPortion,
            afterTaxSignOn: Number(scenarioRow?.afterTaxSignOn) || 0,
            afterTaxRelocation: Number(scenarioRow?.afterTaxRelocation) || 0,
            forfeitedBonus: 0,
            colIndex: simColIndex,
          });
          const cashOnlyValue = scoreParts.value;
          const financialScore = computeIndependentFinancialScore(cashOnlyValue);
          return {
            ...category,
            score: financialScore,
            detail: `${formatCurrency(cashOnlyValue)} recurring, after tax and cost of living`,
            calculationLines: [
              ...buildFinancialCalculationLines({
                offer,
                metrics: scenarioRow
                  ? { ...scenarioRow, costOfLivingIndex: scenarioRow.colIndex }
                  : undefined,
                financialValue,
              }),
              `Benefits taken out: ${formatCurrency(benefitsPortion)} of that adjusted value is 401(k) match, HSA and perks, scored under Benefits instead`,
              `One-time money over ${ONE_TIME_HORIZON_YEARS} years: ${formatCurrency(scoreParts.oneTimeTotal)} in total, of which ${formatCurrency(scoreParts.oneTimeCounted)} counts this year`,
              ...buildScoreValueLines({
                financialValue,
                benefitsPortion,
                oneTimeRemoved: scoreParts.oneTimeRemoved,
                oneTimeCounted: scoreParts.oneTimeCounted,
                scoreValue: cashOnlyValue,
                financialScore,
              }),
            ],
            isScored: true,
          };
        }
        if (category.key === 'workLife') {
          return {
            ...category,
            score: workLifeScore.score,
            detail: workLifeScore.detail,
            calculationLines: workLifeScore.calculationLines,
            isScored: true,
          };
        }
        if (category.key === 'trajectory') {
          return {
            ...category,
            score: trajectory.score,
            detail: trajectory.detail,
            calculationLines: trajectory.calculationLines,
            isScored: trajectory.isScored,
          };
        }
        if (category.key === 'location') {
          const locationScore = scoreLocationWithBreakdown(app, Number(offer.base_salary) || 0);
          return {
            ...category,
            score: locationScore.score,
            detail:
              workMode === 'REMOTE'
                ? 'Remote — works from anywhere'
                : app?.office_location || app?.location || 'Location unknown',
            calculationLines: locationScore.calculationLines,
            isScored: true,
          };
        }
        return {
          ...category,
          score: brandScore ?? 0,
          detail:
            brandScore != null
              ? `${app?.brand_score}/5 manual`
              : 'Skipped until Brand Score is set',
          isScored: brandScore != null,
        };
      }
    );

    if (shouldScoreImmigration) {
      const immigrationScore = scoreVisa(app);
      const immigrationLabel = getImmigrationSignalLabel(app?.visa_sponsorship, app?.day_one_gc);
      categories.push({
        key: 'visa' as const,
        label: CATEGORY_LABELS.visa,
        weight: VISA_OVERLAY_WEIGHT,
        score: immigrationScore,
        detail: immigrationLabel,
        calculationLines: [
          `Immigration support: ${immigrationLabel}`,
          `Immigration score: ${Math.round(immigrationScore)}`,
        ],
        isScored: true,
      });
    }

    const scoredCategories = categories.filter((category) => category.isScored);
    const activeWeightTotal =
      scoredCategories.reduce((sum, category) => sum + category.weight, 0) || 1;
    const score =
      scoredCategories.reduce((sum, category) => sum + category.score * category.weight, 0) /
      activeWeightTotal;

    return {
      id: String(offer.id),
      applicationId: offer.application || 0,
      company,
      role,
      score: Math.round(score),
      rank: 0,
      categories,
      immigrationLabel: getImmigrationSignalLabel(app?.visa_sponsorship, app?.day_one_gc),
      workModeLabel: workMode[0] + workMode.slice(1).toLowerCase(),
      financialValue,
      hasImmigrationSignal: shouldScoreImmigration,
      offer,
      isSimulated: true,
    } satisfies DecisionRow;
  });

  return [...rows, ...simRows]
    .sort((a, b) => b.score - a.score || b.financialValue - a.financialValue)
    .map((row, index) => ({ ...row, rank: index + 1 }));
};
