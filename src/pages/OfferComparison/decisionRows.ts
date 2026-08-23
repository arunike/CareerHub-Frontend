import {
  type ApplicationLike as Application,
  type OfferLike as Offer,
  type SimulatedOffer,
} from './calculations';
import type { AdjustedOfferMetrics } from './types';
import type { ScenarioRow } from './offerAdjustmentsTypes';
import { getImmigrationSignalLabel } from './immigrationSignal';
import { computeIndependentFinancialScore } from './financialScore';
import {
  CATEGORY_LABELS,
  VISA_OVERLAY_WEIGHT,
  buildFinancialCalculationLines,
  formatCurrency,
  getWorkMode,
  hasImmigrationSignal,
  scoreFromManual,
  scoreLocationWithBreakdown,
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
  scenarioRows: ScenarioRow[]
) => {
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
    const growthScore = scoreFromManual(app?.growth_score);
    const brandScore = scoreFromManual(app?.brand_score);
    const teamScore = scoreFromManual(app?.team_score);

    const baseWeightScale = shouldScoreImmigration ? (100 - VISA_OVERLAY_WEIGHT) / 100 : 1;

    const categories: CategoryScore[] = (Object.entries(weights) as [CategoryKey, number][]).map(
      ([key, weight]) => {
        const category = {
          key,
          label: CATEGORY_LABELS[key],
          weight: Math.round(weight * baseWeightScale),
        };

        if (category.key === 'financial') {
          const financialScore = computeIndependentFinancialScore(financialValue);
          return {
            ...category,
            score: financialScore,
            detail: `${formatCurrency(financialValue)} adjusted value`,
            calculationLines: buildFinancialCalculationLines({
              offer,
              metrics: financialMetrics,
              financialValue,
              financialScore,
            }),
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
        if (category.key === 'growth') {
          return {
            ...category,
            score: growthScore ?? 0,
            detail:
              growthScore != null
                ? `${app?.growth_score}/5 manual`
                : 'Skipped until Growth Score is set',
            isScored: growthScore != null,
          };
        }
        if (category.key === 'location') {
          const locationScore = scoreLocationWithBreakdown(app);
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
        if (category.key === 'brand') {
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
        return {
          ...category,
          score: teamScore ?? 0,
          detail:
            teamScore != null
              ? `${app?.team_score}/5 manual`
              : 'Skipped until Manager / Team Score is set',
          isScored: teamScore != null,
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
    const growthScore = scoreFromManual(app?.growth_score);
    const brandScore = scoreFromManual(app?.brand_score);
    const teamScore = scoreFromManual(app?.team_score);

    const baseWeightScale = shouldScoreImmigration ? (100 - VISA_OVERLAY_WEIGHT) / 100 : 1;

    const categories: CategoryScore[] = (Object.entries(weights) as [CategoryKey, number][]).map(
      ([key, weight]) => {
        const category = {
          key,
          label: CATEGORY_LABELS[key],
          weight: Math.round(weight * baseWeightScale),
        };

        if (category.key === 'financial') {
          const financialScore = computeIndependentFinancialScore(financialValue);
          return {
            ...category,
            score: financialScore,
            detail: `${formatCurrency(financialValue)} adjusted value`,
            calculationLines: buildFinancialCalculationLines({
              offer,
              metrics: scenarioRow
                ? { ...scenarioRow, costOfLivingIndex: scenarioRow.colIndex }
                : undefined,
              financialValue,
              financialScore,
            }),
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
        if (category.key === 'growth') {
          return {
            ...category,
            score: growthScore ?? 0,
            detail:
              growthScore != null
                ? `${app?.growth_score}/5 manual`
                : 'Skipped until Growth Score is set',
            isScored: growthScore != null,
          };
        }
        if (category.key === 'location') {
          const locationScore = scoreLocationWithBreakdown(app);
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
        if (category.key === 'brand') {
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
        return {
          ...category,
          score: teamScore ?? 0,
          detail:
            teamScore != null
              ? `${app?.team_score}/5 manual`
              : 'Skipped until Manager / Team Score is set',
          isScored: teamScore != null,
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
