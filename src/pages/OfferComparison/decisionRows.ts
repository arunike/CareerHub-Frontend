import {
  DAYS_IN_BONUS_YEAR,
  firstBonusStint,
  stayedBonusStint,
  positionEndDate,
  positionStartDate,
} from './bonusStint';
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
  financialScoreValue,
  bonusClockDate,
  BONUS_PAYOUT_MONTH,
} from './financialScore';
import {
  CATEGORY_LABELS,
  VISA_OVERLAY_WEIGHT,
  buildFinancialCalculationLines,
  buildScoreValueLines,
  lessTax,
  formatCurrency,
  getWorkMode,
  hasImmigrationSignal,
  scoreFromManual,
  scoreLocationWithBreakdown,
  scoreTrajectory,
  scoreVisa,
  scoreWorkLife,
  totalAnnualComp,
  LINE_NOTE,
} from './decisionScoring';
import type { CategoryKey, CategoryScore, DecisionRow } from './decisionScoring';

export const buildRows = (
  filteredOffers: Offer[],
  applicationsById: Record<number, Application | undefined>,
  adjustedByOfferId: Record<number, AdjustedOfferMetrics>,
  weights: Record<CategoryKey, number>,
  simulatedOffers: SimulatedOffer[],
  scenarioRows: ScenarioRow[],
  todayIso = new Date().toISOString().slice(0, 10),
  // Scores read the repriced copies, but every row action must hand back the stored record.
  rawOffers: Offer[] = [],
  // Unfiltered, so the bonus given up does not change with what the page is showing.
  allOffers: Offer[] = []
) => {
  const rawById = new Map(rawOffers.map((offer) => [offer.id, offer]));
  const currentRole = (allOffers.length > 0 ? allOffers : filteredOffers).find(
    (candidate) => candidate.is_current
  );
  const storedOffer = (offer: Offer) => (offer.id != null && rawById.get(offer.id)) || offer;
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
    // The current role's bonus year is already running, so only a new start is pro-rated.
    const startIso = bonusClockDate(offer, todayIso);
    const afterBonusTax = 1 - (Number(financialMetrics?.usedBonusTaxRate) || 0) / 100;
    // Nothing to leave means there is no move to price, and no bonus to credit for one.
    const isMove = !offer.is_current && Boolean(currentRole);
    const leavingStint = !isMove
      ? { days: 0, share: 0 }
      : stayedBonusStint({
          joined: positionStartDate(currentRole),
          leaving: startIso,
          payoutMonth: BONUS_PAYOUT_MONTH,
        });
    const joiningStint = !isMove
      ? { days: 0, share: 0 }
      : firstBonusStint({
          start: startIso,
          end: positionEndDate(offer),
          payoutMonth: BONUS_PAYOUT_MONTH,
        });
    const forfeitedGross = (Number(currentRole?.bonus) || 0) * leavingStint.share;
    const proratedGross = (Number(offer.bonus) || 0) * joiningStint.share;
    const forfeited = forfeitedGross * afterBonusTax;
    const proratedFirst = proratedGross * afterBonusTax;
    const bonusNet = forfeited - proratedFirst;
    const oneTimeGross =
      (Number(financialMetrics?.afterTaxSignOn) || 0) +
      (Number(financialMetrics?.afterTaxRelocation) || 0);

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
            bonusNetOnMove: bonusNet,
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
              // Hidden when there is no sign-on, no relocation and no bonus effect at all.
              oneTimeGross !== 0 || bonusNet !== 0
                ? `One-time payment over ${ONE_TIME_HORIZON_YEARS} years (after tax): sign-on ${formatCurrency(Number(financialMetrics?.afterTaxSignOn) || 0)} + relocation ${formatCurrency(Number(financialMetrics?.afterTaxRelocation) || 0)}${bonusNet !== 0 ? ` ${bonusNet > 0 ? '-' : '+'} bonus ${formatCurrency(Math.abs(bonusNet))}` : ''} = ${formatCurrency(oneTimeGross - bonusNet)} · x 100 / ${colIndex} = ${formatCurrency(scoreParts.oneTimeTotal)} · ÷ ${ONE_TIME_HORIZON_YEARS} = ${formatCurrency(scoreParts.oneTimeCounted)}${LINE_NOTE}Cost of living applies because this is removed from a total that is already adjusted, so a raw figure would mix units. The result is then split evenly across ${ONE_TIME_HORIZON_YEARS} years.`
                : '',
              forfeited !== 0
                ? `Bonus given up: ${leavingStint.days >= DAYS_IN_BONUS_YEAR ? 'a full year at your current role' : `${leavingStint.days}/${DAYS_IN_BONUS_YEAR} days you would have completed`} · ${lessTax(forfeitedGross, Number(financialMetrics?.usedBonusTaxRate) || 0, forfeited)}${LINE_NOTE}Staying would have completed the bonus year and paid the whole bonus, so leaving gives up all of it. Pro-rated only if you had not been at your current role for the whole of that year by its payout.`
                : '',
              proratedFirst !== 0
                ? `First bonus, new role: ${joiningStint.days}/${DAYS_IN_BONUS_YEAR} days of its bonus year · ${lessTax(proratedGross, Number(financialMetrics?.usedBonusTaxRate) || 0, proratedFirst)}${LINE_NOTE}Starting part-way through a bonus year earns only the share of it you are there for, measured from the start date on this offer to the payout, and capped by an end date where one is known.`
                : '',
              bonusNet !== 0
                ? `Net bonus effect: ${formatCurrency(forfeited)} given up - ${formatCurrency(proratedFirst)} earned = ${formatCurrency(bonusNet)} (after tax)${LINE_NOTE}Charged once, through the same one-time bucket as a sign-on, so it is spread evenly over the four-year horizon.`
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
      storedOffer: storedOffer(offer),
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
            bonusNetOnMove:
              ((Number(currentRole?.bonus) || 0) *
                stayedBonusStint({
                  joined: positionStartDate(currentRole),
                  leaving: bonusClockDate(offer, todayIso),
                  payoutMonth: BONUS_PAYOUT_MONTH,
                }).share -
                (Number(offer.bonus) || 0) *
                  firstBonusStint({
                    start: bonusClockDate(offer, todayIso),
                    end: positionEndDate(offer),
                    payoutMonth: BONUS_PAYOUT_MONTH,
                  }).share) *
              (1 - (Number(scenarioRow?.usedBonusTaxRate) || 0) / 100),
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
      // A scenario is never repriced, so the record and the displayed figures are the same object.
      storedOffer: offer,
      isSimulated: true,
    } satisfies DecisionRow;
  });

  return [...rows, ...simRows]
    .sort((a, b) => b.score - a.score || b.financialValue - a.financialValue)
    .map((row, index) => ({ ...row, rank: index + 1 }));
};
