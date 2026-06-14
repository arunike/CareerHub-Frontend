import { useEffect, useMemo, useState } from 'react';
import {
  annualizeAmount,
  type ApplicationLike as Application,
  type OfferLike as Offer,
  type VisaSponsorshipStatus,
} from './calculations';
import { Rate, Select, Popconfirm, Tooltip, InputNumber, Popover } from 'antd';
import { PlusOutlined, DownOutlined, RightOutlined, InfoCircleOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import type { AdjustedOfferMetrics } from './types';
import type { MaritalStatus, SimulatedOffer } from './calculations';
import type { ScenarioRow } from './offerAdjustmentsTypes';
import { formatPtoLabel } from '../../utils/offerTimeOff';
import { usePersistedState } from '../../hooks/usePersistedState';
import {
  getImmigrationSignalLabel,
  getImmigrationSignalPatch,
  getImmigrationSignalValue,
  immigrationSignalOptions,
  type ImmigrationSignalValue,
} from './immigrationSignal';

type Props = {
  filteredOffers: Offer[];
  offers: Offer[];
  applicationsById: Record<number, Application | undefined>;
  adjustedByOfferId: Record<number, AdjustedOfferMetrics>;
  onScoreUpdate?: (appId: number, patch: Partial<Application>) => Promise<void>;
  onEditClick: (offer: Offer) => void;
  onToggleCurrent: (offer: Offer) => void;
  onNegotiateClick: (offer: Offer) => void;
  onRaiseHistoryClick: (offer: Offer) => void;
  onSaveSnapshotClick: (offer: Offer, row: DecisionRow) => void;
  onSnapshotsClick: (offer: Offer) => void;
  onDeleteClick: (offer: Offer) => void;

  simulatedOffers: SimulatedOffer[];
  scenarioRows: ScenarioRow[];
  maritalStatus: MaritalStatus;
  setMaritalStatus: (s: MaritalStatus) => void;
  maritalStatusOptions: { code: string; label: string }[];
  saveAdjustments: () => void;
  onEditScenario: (id: string) => void;
  onDeleteScenario: (id: string) => void;
  onAddScenario: () => void;
  onDecisionOrderChange?: (orderedIds: string[]) => void;
};

type CategoryKey = 'financial' | 'workLife' | 'growth' | 'location' | 'brand' | 'team';

export type CategoryScore = {
  key: CategoryKey | 'visa';
  label: string;
  weight: number;
  score: number;
  detail: string;
  calculationLines?: string[];
  isScored: boolean;
};

export type DecisionRow = {
  id: string;
  applicationId: number;
  company: string;
  role: string;
  score: number;
  rank: number;
  categories: CategoryScore[];
  immigrationLabel: string;
  workModeLabel: string;
  financialValue: number;
  hasImmigrationSignal: boolean;
  offer: Offer | SimulatedOffer;
  isSimulated: boolean;
};

/** Default weights for the 6 user-adjustable categories. Always sum to 100%. */
const DEFAULT_WEIGHTS: Record<CategoryKey, number> = {
  financial: 44,
  workLife: 19,
  growth: 15,
  location: 10,
  brand: 6,
  team: 6,
};

const CATEGORY_KEYS: CategoryKey[] = [
  'financial',
  'workLife',
  'growth',
  'location',
  'brand',
  'team',
];

const normalizeScoreWeights = (value: unknown): Record<CategoryKey, number> => {
  if (!value || typeof value !== 'object') return DEFAULT_WEIGHTS;

  const raw = value as Record<string, unknown>;
  const next = CATEGORY_KEYS.reduce(
    (acc, key) => {
      const parsed = Number(raw[key]);
      acc[key] = Number.isFinite(parsed) ? clamp(parsed) : DEFAULT_WEIGHTS[key];
      return acc;
    },
    {} as Record<CategoryKey, number>
  );

  const ignoredWeight = Object.entries(raw)
    .filter(([key]) => !CATEGORY_KEYS.includes(key as CategoryKey))
    .reduce((sum, [, item]) => {
      const parsed = Number(item);
      return sum + (Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
    }, 0);

  if (ignoredWeight <= 0) return next;

  const validTotal = CATEGORY_KEYS.reduce((sum, key) => sum + next[key], 0);
  if (validTotal <= 0) return DEFAULT_WEIGHTS;

  let remaining = 100;
  return CATEGORY_KEYS.reduce(
    (acc, key, index) => {
      const value =
        index === CATEGORY_KEYS.length - 1 ? remaining : Math.round((next[key] / validTotal) * 100);
      acc[key] = value;
      remaining -= value;
      return acc;
    },
    {} as Record<CategoryKey, number>
  );
};

/** Immigration weight injected only when a visa/GC signal exists. Other weights are scaled down proportionally. */
const VISA_OVERLAY_WEIGHT = 20;

const CATEGORY_LABELS: Record<CategoryKey | 'visa', string> = {
  financial: 'Financial',
  visa: 'Immigration',
  workLife: 'WLB',
  growth: 'Growth',
  location: 'Location',
  brand: 'Brand',
  team: 'Team',
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeManualScore = (value: unknown) => {
  const parsed = Number(value);
  return parsed >= 1 && parsed <= 5 ? parsed : null;
};

const scoreFromManual = (value: unknown) => {
  const manual = normalizeManualScore(value);
  return manual ? manual * 20 : null;
};

const scoreTimeOff = (offer: Offer | SimulatedOffer) => {
  const isUnlimited = Boolean(offer.is_unlimited_pto);
  const ptoDays = isUnlimited ? 25 : clamp(asNumber(offer.pto_days), 0, 60);
  const holidayDays = clamp(asNumber(offer.holiday_days, 11), 0, 30);
  const totalPaidDays = ptoDays + holidayDays;
  const score = clamp((totalPaidDays / 35) * 100);

  return {
    ptoDays,
    holidayDays,
    totalPaidDays,
    score,
    label: isUnlimited
      ? `Unlimited PTO counted as ${ptoDays} planning days + ${holidayDays} holidays`
      : `${ptoDays} PTO days + ${holidayDays} holidays`,
  };
};

const scoreWorkLife = (offer: Offer | SimulatedOffer, app?: Application) => {
  const manualScore = scoreFromManual(app?.work_life_score);
  const timeOff = scoreTimeOff(offer);

  if (manualScore != null) {
    return {
      score: manualScore * 0.7 + timeOff.score * 0.3,
      detail: `${app?.work_life_score}/5 manual + ${timeOff.totalPaidDays} paid days`,
      calculationLines: [
        `Manual WLB: ${app?.work_life_score}/5 x 20 = ${Math.round(manualScore)}`,
        `Time off: ${timeOff.label} = ${timeOff.totalPaidDays} paid days`,
        `Time-off score: ${timeOff.totalPaidDays} / 35 x 100 = ${Math.round(timeOff.score)}`,
        `WLB score: ${Math.round(manualScore)} x 70% + ${Math.round(timeOff.score)} x 30% = ${Math.round(
          manualScore * 0.7 + timeOff.score * 0.3
        )}`,
      ],
    };
  }

  return {
    score: timeOff.score,
    detail: `${timeOff.totalPaidDays} paid days`,
    calculationLines: [
      `Time off: ${timeOff.label} = ${timeOff.totalPaidDays} paid days`,
      `WLB score: ${timeOff.totalPaidDays} / 35 x 100 = ${Math.round(timeOff.score)}`,
      'No manual WLB signal filled, so WLB uses time-off only.',
    ],
  };
};

const totalAnnualComp = (offer: Offer) =>
  asNumber(offer.base_salary) +
  asNumber(offer.bonus) +
  asNumber(offer.equity) +
  asNumber(offer.sign_on) +
  asNumber(offer.benefits_value);

const getWorkMode = (app?: Application) => {
  if (app?.rto_policy === 'REMOTE') return 'REMOTE';
  if (app?.rto_policy === 'ONSITE') return 'ONSITE';
  if (app?.rto_policy === 'HYBRID') return 'HYBRID';
  return 'UNKNOWN';
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(value));

const buildFinancialCalculationLines = ({
  offer,
  metrics,
  financialValue,
  maxAdjustedValue,
  financialScore,
}: {
  offer: Offer | SimulatedOffer;
  metrics?: Partial<AdjustedOfferMetrics>;
  financialValue: number;
  maxAdjustedValue: number;
  financialScore: number;
}) => {
  const base = asNumber(offer.base_salary);
  const bonus = asNumber(offer.bonus);
  const signOn = asNumber(offer.sign_on);
  const equity = asNumber(offer.equity);
  const benefits = asNumber(offer.benefits_value);
  const baseTaxRate = asNumber(metrics?.usedBaseTaxRate, 0);
  const bonusTaxRate = asNumber(metrics?.usedBonusTaxRate, 0);
  const equityTaxRate = asNumber(metrics?.usedEquityTaxRate, 0);
  const afterTaxBase = asNumber(metrics?.afterTaxBase, base * (1 - baseTaxRate / 100));
  const afterTaxBenefits = benefits * (1 - baseTaxRate / 100);
  const afterTaxBonus = asNumber(metrics?.afterTaxBonus, bonus * (1 - bonusTaxRate / 100));
  const afterTaxSignOn = asNumber(metrics?.afterTaxSignOn, signOn * (1 - bonusTaxRate / 100));
  const afterTaxEquity = asNumber(metrics?.afterTaxEquity, equity * (1 - equityTaxRate / 100));
  const afterTaxTotal =
    afterTaxBase + afterTaxBenefits + afterTaxBonus + afterTaxSignOn + afterTaxEquity;
  const colIndex = asNumber(metrics?.costOfLivingIndex, 100);
  const purchasingPowerAdjusted = afterTaxTotal * (100 / Math.max(colIndex, 1));
  const lifestyleAdjustment = asNumber(metrics?.lifestyleAdjustment, 0);
  const monthlyRent = asNumber(metrics?.monthlyRent, 0);
  const rentAnnual = monthlyRent * 12;
  const commuteAnnual = asNumber(metrics?.commuteAnnualCost, 0);
  const freeFoodAnnual = asNumber(metrics?.freeFoodAnnualValue, 0);

  return [
    `Gross inputs: base ${formatCurrency(base)}, bonus ${formatCurrency(bonus)}, sign-on ${formatCurrency(
      signOn
    )}, equity ${formatCurrency(equity)}, benefits ${formatCurrency(benefits)}`,
    `Tax rates: base/benefits ${baseTaxRate}%, bonus/sign-on ${bonusTaxRate}%, equity ${equityTaxRate}%`,
    `After tax: base ${formatCurrency(afterTaxBase)}, bonus ${formatCurrency(
      afterTaxBonus
    )}, sign-on ${formatCurrency(afterTaxSignOn)}, equity ${formatCurrency(
      afterTaxEquity
    )}, benefits ${formatCurrency(afterTaxBenefits)}`,
    `After-tax total: ${formatCurrency(afterTaxTotal)}`,
    `COL adjustment: ${formatCurrency(afterTaxTotal)} x 100 / ${colIndex} = ${formatCurrency(
      purchasingPowerAdjusted
    )}`,
    `Lifestyle adjustment: ${formatCurrency(lifestyleAdjustment)} total; includes free food ${formatCurrency(
      freeFoodAnnual
    )}, commute cost ${formatCurrency(commuteAnnual)}, remote/RTO effects`,
    `Rent subtraction: ${formatCurrency(monthlyRent)} x 12 = ${formatCurrency(rentAnnual)}`,
    `Adjusted value: ${formatCurrency(purchasingPowerAdjusted)} + ${formatCurrency(
      lifestyleAdjustment
    )} - ${formatCurrency(rentAnnual)} = ${formatCurrency(financialValue)}`,
    `Financial score: ${formatCurrency(financialValue)} / ${formatCurrency(
      maxAdjustedValue
    )} x 100 = ${Math.round(financialScore)}`,
  ];
};

const scoreVisa = (app?: Application) => {
  const sponsorship =
    app?.visa_sponsorship && app.visa_sponsorship !== 'UNKNOWN' ? app.visa_sponsorship : '';
  const dayOneGc = app?.day_one_gc && app.day_one_gc !== 'UNKNOWN' ? app.day_one_gc : '';
  const baseByStatus: Record<VisaSponsorshipStatus, number> = {
    '': 55,
    NOT_NEEDED: 100,
    AVAILABLE: 84,
    TRANSFER_ONLY: 68,
    UNKNOWN: 55,
    NOT_AVAILABLE: 20,
  };

  let score = baseByStatus[sponsorship];
  if (dayOneGc === 'YES') score = Math.max(score, 94);
  if (dayOneGc === 'NO' && (sponsorship === 'AVAILABLE' || sponsorship === 'TRANSFER_ONLY'))
    score -= 8;
  if (dayOneGc === 'NOT_APPLICABLE' && sponsorship === 'NOT_NEEDED') score = 100;

  return clamp(score);
};

const hasImmigrationSignal = (app?: Application) =>
  Boolean(
    (app?.visa_sponsorship && app.visa_sponsorship !== 'UNKNOWN') ||
    (app?.day_one_gc && app.day_one_gc !== 'UNKNOWN')
  );

const scoreLocationWithBreakdown = (app?: Application) => {
  const workMode = getWorkMode(app);
  const commuteAnnual = annualizeAmount(
    asNumber(app?.commute_cost_value),
    app?.commute_cost_frequency || 'MONTHLY'
  );
  const rtoDays = clamp(
    asNumber(app?.rto_days_per_week, workMode === 'ONSITE' ? 5 : workMode === 'REMOTE' ? 0 : 3),
    0,
    5
  );
  const base =
    workMode === 'REMOTE' ? 90 : workMode === 'HYBRID' ? 76 : workMode === 'ONSITE' ? 62 : 66;
  const commutePenalty = clamp(commuteAnnual / 1000, 0, 18);
  const rtoPenalty = workMode === 'REMOTE' ? 0 : Math.max(0, rtoDays - 2) * 2;
  const score = clamp(base - commutePenalty - rtoPenalty);

  return {
    score,
    calculationLines: [
      `Work mode base: ${workMode} = ${base}`,
      `Commute penalty: ${formatCurrency(commuteAnnual)} annual / 1000 = ${commutePenalty.toFixed(
        1
      )}, capped at 18`,
      `RTO penalty: max(0, ${rtoDays} days - 2) x 2 = ${rtoPenalty.toFixed(1)}`,
      `Location score: ${base} - ${commutePenalty.toFixed(1)} - ${rtoPenalty.toFixed(
        1
      )} = ${Math.round(score)}`,
    ],
  };
};

const buildRows = (
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

  const maxAdjustedValue = Math.max(...financialValues, ...simFinancialValues, 1);

  const rows = filteredOffers.map((offer, index) => {
    const app = applicationsById[offer.application];
    const financialValue = financialValues[index] || totalAnnualComp(offer);
    const financialMetrics = offer.id ? adjustedByOfferId[offer.id] : undefined;
    const workMode = getWorkMode(app);
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
          const financialScore = Math.min(100, (financialValue / maxAdjustedValue) * 100);
          return {
            ...category,
            score: financialScore,
            detail: `${formatCurrency(financialValue)} adjusted value`,
            calculationLines: buildFinancialCalculationLines({
              offer,
              metrics: financialMetrics,
              financialValue,
              maxAdjustedValue,
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
      workModeLabel:
        workMode === 'UNKNOWN'
          ? 'Work mode unknown'
          : workMode[0] + workMode.slice(1).toLowerCase(),
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
      office_location: offer.office_location,
      location: offer.location,
    } as unknown as Application;

    const workMode = getWorkMode(app);
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
          const financialScore = Math.min(100, (financialValue / maxAdjustedValue) * 100);
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
              maxAdjustedValue,
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
      workModeLabel:
        workMode === 'UNKNOWN'
          ? 'Work mode unknown'
          : workMode[0] + workMode.slice(1).toLowerCase(),
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

/** Renders the full score formula breakdown for a single row */
const ScoreBreakdownContent = ({ row }: { row: DecisionRow }) => {
  const scored = row.categories.filter((c) => c.isScored);
  const skipped = row.categories.filter((c) => !c.isScored);
  const activeWeightTotal = scored.reduce((s, c) => s + c.weight, 0) || 1;
  const rawSum = scored.reduce((s, c) => s + c.score * c.weight, 0);

  return (
    <div className="w-[min(360px,calc(100vw-32px))] text-xs">
      {/* Step 1 */}
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
          Step 1 — Weighted points per category
        </p>
        <div className="space-y-2">
          {scored.map((c) => {
            const rawPts = (c.score * c.weight) / 100;
            return (
              <div key={c.key}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                  <span className="font-semibold text-slate-700">{c.label}</span>
                  <span className="break-words text-right font-mono text-[11px] text-slate-500">
                    {Math.round(c.score)} × {c.weight}% ={' '}
                    <span className="font-bold text-slate-800">{rawPts.toFixed(2)} pts</span>
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">{c.detail}</div>
                {c.calculationLines && c.calculationLines.length > 0 && (
                  <div className="mt-1 space-y-0.5 rounded-lg bg-slate-50 px-2 py-1.5">
                    {c.calculationLines.map((line) => (
                      <div
                        key={line}
                        className="whitespace-normal break-words text-[10px] leading-4 text-slate-500"
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sum */}
      <div className="border-t border-slate-100 pt-2 mb-3">
        <div className="flex items-center justify-between text-slate-700 font-semibold">
          <span>Sum of weighted pts</span>
          <span className="font-mono">{(rawSum / 100).toFixed(2)} pts</span>
        </div>
      </div>

      {/* Step 2 */}
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          Step 2 — Normalise for skipped categories
        </p>
        {skipped.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            All categories filled — no normalisation needed. Active weight = 100%.
          </p>
        ) : (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-[11px] leading-5 text-amber-800">
            <p className="mb-1">
              <span className="font-semibold">{skipped.map((c) => c.label).join(', ')}</span> (
              {skipped.reduce((s, c) => s + c.weight, 0)}% weight){' '}
              {skipped.length === 1 ? 'is' : 'are'} skipped.
            </p>
            <p>
              The remaining active categories only add up to <strong>{activeWeightTotal}%</strong>.
              To keep the scale fair (0–100), the sum is divided by {activeWeightTotal}% — this
              stretches the remaining categories to fill the full range, so you're not penalised for
              leaving optional fields empty.
            </p>
          </div>
        )}
      </div>

      {/* Final */}
      <div className="border-t border-slate-200 pt-2 bg-sky-50 rounded-lg px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-800">Total Score</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {(rawSum / 100).toFixed(2)} pts ÷ {activeWeightTotal / 100} = {row.score}
            </p>
          </div>
          <span className="text-2xl font-black text-sky-600">{row.score}</span>
        </div>
      </div>
    </div>
  );
};

const OfferDecisionScorecard = ({
  filteredOffers,
  offers,
  applicationsById,
  adjustedByOfferId,
  onScoreUpdate,
  onEditClick,
  onToggleCurrent,
  onNegotiateClick,
  onRaiseHistoryClick,
  onSaveSnapshotClick,
  onSnapshotsClick,
  onDeleteClick,
  simulatedOffers,
  scenarioRows,
  maritalStatus,
  setMaritalStatus,
  maritalStatusOptions,
  saveAdjustments,
  onEditScenario,
  onDeleteScenario,
  onAddScenario,
  onDecisionOrderChange,
  extraHeaderNode,
}: Props & { extraHeaderNode?: React.ReactNode }) => {
  const [weights, setWeights] = usePersistedState<Record<CategoryKey, number>>(
    'offerScoreWeights',
    DEFAULT_WEIGHTS,
    { deserialize: (raw) => normalizeScoreWeights(JSON.parse(raw)) }
  );

  const [isWeightsExpanded, setIsWeightsExpanded] = useState(false);

  const anyImmigrationSignal = useMemo(() => {
    return Object.values(applicationsById).some((app) => hasImmigrationSignal(app));
  }, [applicationsById]);

  const rows = useMemo(
    () =>
      buildRows(
        filteredOffers,
        applicationsById,
        adjustedByOfferId,
        weights,
        simulatedOffers,
        scenarioRows
      ),
    [adjustedByOfferId, applicationsById, filteredOffers, weights, simulatedOffers, scenarioRows]
  );

  useEffect(() => {
    onDecisionOrderChange?.(
      rows.map((row) => `${row.isSimulated ? 'sim' : 'real'}-${row.offer.id}`)
    );
  }, [onDecisionOrderChange, rows]);

  if (rows.length === 0) return null;

  const currentOffer = offers.find((o) => o.is_current);
  const currentTotal = currentOffer
    ? Number(currentOffer.base_salary) +
      Number(currentOffer.bonus) +
      Number(currentOffer.equity) +
      Number(currentOffer.sign_on)
    : 0;

  const leader = rows[0];

  return (
    <section className="mb-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-white px-4 py-5 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 shadow-sm ring-1 ring-sky-100">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-500">
                Decision Scorecard
              </p>
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Best overall: <span className="text-sky-600">{leader.company}</span>
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500 max-w-2xl">
              Weighted beyond total comp. Advanced signals only count after you fill them in.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {extraHeaderNode}
            <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Top Score
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                  {leader.score}
                </p>
              </div>
              <div className="h-12 w-[1px] bg-slate-200" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Value
                </p>
                <p className="mt-1 text-xl font-bold tracking-tight text-emerald-600">
                  {formatCurrency(leader.financialValue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 p-4 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-6 xl:grid-cols-2">
          {rows.map((row) => (
            <article
              key={row.id}
              className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:border-sky-300 hover:shadow-md"
            >
              {/* Card Header */}
              <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-[11px] font-bold text-white shadow-sm">
                        {row.rank}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">{row.company}</h3>
                    </div>
                    <p className="text-sm font-medium text-slate-500">{row.role}</p>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <Popover
                      content={<ScoreBreakdownContent row={row} />}
                      title={
                        <span className="text-sm font-bold text-slate-800">
                          How {row.company}'s score is calculated
                        </span>
                      }
                      trigger="click"
                      placement="bottomRight"
                      overlayStyle={{ maxWidth: 'calc(100vw - 32px)' }}
                    >
                      <button className="group flex flex-col items-end text-right hover:opacity-80 transition-opacity cursor-pointer">
                        <p className="text-3xl font-black tracking-tight text-sky-600 group-hover:underline decoration-dotted underline-offset-4">
                          {row.score}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                          Total Score
                        </p>
                      </button>
                    </Popover>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {!row.isSimulated && (row.offer as Offer).is_current && (
                    <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                      Current
                    </span>
                  )}
                  {(row.hasImmigrationSignal
                    ? [row.immigrationLabel, row.workModeLabel]
                    : [row.workModeLabel]
                  )
                    .filter(Boolean)
                    .map((label) => (
                      <span
                        key={label}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm"
                      >
                        {label}
                      </span>
                    ))}
                </div>
              </div>

              {/* Card Body - Scores */}
              <div className="p-4 sm:p-6">
                <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  {row.categories.map((category) => {
                    const app = applicationsById[row.applicationId];

                    if (category.key === 'financial' || category.key === 'location') {
                      const tooltips: Record<string, string> = {
                        financial:
                          'Weighted score based on adjusted total comp (after tax, cost of living, commute, rent). Higher adjusted value = higher score.',
                        location:
                          'Score based on city cost-of-living index vs. your reference city. A higher-cost location reduces this score.',
                      };
                      return (
                        <div key={category.key} className="flex flex-col">
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <Tooltip title={tooltips[category.key]} placement="top">
                              <span className="font-semibold text-slate-700 cursor-help inline-flex items-center gap-1">
                                {category.label}{' '}
                                <span className="text-slate-300 text-[10px]">ⓘ</span>
                              </span>
                            </Tooltip>
                            <span className="font-bold text-slate-900">
                              {Math.round(category.score)}
                            </span>
                          </div>

                          {/* Compact Progress Bar */}
                          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                                category.key === 'financial' ? 'bg-emerald-500' : 'bg-sky-500'
                              }`}
                              style={{ width: `${Math.round(category.score)}%` }}
                            />
                          </div>
                          <p className="mt-2 text-[10px] font-medium text-slate-500 line-clamp-1">
                            {category.detail}
                          </p>
                        </div>
                      );
                    }

                    if (['workLife', 'growth', 'brand', 'team'].includes(category.key)) {
                      const dbKey =
                        category.key === 'workLife' ? 'work_life_score' : `${category.key}_score`;
                      const rawValue = app ? app[dbKey as keyof Application] : null;
                      const rateValue = normalizeManualScore(rawValue) || 0;
                      const tooltips: Record<string, string> = {
                        workLife:
                          'Your subjective rating of work-life balance — hours, flexibility, on-call expectations, and culture. Rate 1–5 stars.',
                        growth:
                          'How strong is the growth opportunity? Consider mentorship, promo velocity, scope, and learning. Rate 1–5 stars.',
                        brand:
                          'Company prestige and brand value for your resume. Consider FAANG/tier, public recognition, and industry reputation. Rate 1–5 stars.',
                        team: 'Your impression of the team, manager, and culture fit from interviews. Rate 1–5 stars.',
                      };

                      return (
                        <div key={category.key} className="flex flex-col">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <Tooltip title={tooltips[category.key]} placement="top">
                              <span className="font-semibold text-slate-700 cursor-help inline-flex items-center gap-1">
                                {category.label}{' '}
                                <span className="text-slate-300 text-[10px]">ⓘ</span>
                              </span>
                            </Tooltip>
                            <span
                              className={`font-bold ${category.isScored ? 'text-slate-900' : 'text-slate-400'}`}
                            >
                              {category.isScored ? Math.round(category.score) : '--'}
                            </span>
                          </div>
                          <Rate
                            value={rateValue}
                            onChange={(val) => onScoreUpdate?.(row.applicationId, { [dbKey]: val })}
                            className="text-sky-500 text-sm"
                          />
                        </div>
                      );
                    }

                    if (category.key === 'visa') {
                      if (!category.isScored) {
                        return null;
                      }

                      const immigrationSignalValue = getImmigrationSignalValue(
                        app?.visa_sponsorship,
                        app?.day_one_gc
                      );
                      const selectedImmigrationOption = immigrationSignalOptions.find(
                        (option) => option.value === immigrationSignalValue
                      );

                      return (
                        <div key={category.key} className="flex flex-col">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{category.label}</span>
                            <span
                              className={`font-bold ${category.isScored ? 'text-slate-900' : 'text-slate-400'}`}
                            >
                              {category.isScored ? Math.round(category.score) : '--'}
                            </span>
                          </div>
                          <Select
                            value={immigrationSignalValue || undefined}
                            placeholder="Immigration support"
                            size="small"
                            allowClear
                            bordered={false}
                            onChange={(val) =>
                              onScoreUpdate?.(
                                row.applicationId,
                                getImmigrationSignalPatch((val || '') as ImmigrationSignalValue)
                              )
                            }
                            options={immigrationSignalOptions.map((option) => ({
                              value: option.value,
                              label: option.label,
                            }))}
                            className="w-full rounded-lg border border-slate-100 bg-slate-50 text-xs transition-colors hover:bg-slate-100 [&_.ant-select-selector]:!bg-transparent"
                          />
                          <p className="mt-1.5 text-[10px] leading-4 text-slate-400">
                            {selectedImmigrationOption?.description ||
                              'Only score this when immigration support matters to the decision.'}
                          </p>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>

              {/* Compensation Breakdown */}
              <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 sm:px-6 sm:py-5">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                  Compensation & Benefits
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <Tooltip
                      title="Your fixed annual salary before tax. The main guaranteed component of your compensation."
                      placement="top"
                    >
                      <div className="text-xs font-medium text-slate-500 cursor-help inline-flex items-center gap-1">
                        Base Salary <span className="text-slate-300 text-[10px]">ⓘ</span>
                      </div>
                    </Tooltip>
                    <div className="text-sm font-bold text-slate-900">
                      ${Number(row.offer.base_salary).toLocaleString()}
                    </div>
                    <Tooltip
                      title="Estimated take-home base salary after applying your estimated tax rate."
                      placement="bottom"
                    >
                      <div className="text-[10px] text-slate-400 cursor-help">
                        After tax: $
                        {Math.round(
                          adjustedByOfferId[Number(row.offer.id)]?.afterTaxBase || 0
                        ).toLocaleString()}
                      </div>
                    </Tooltip>
                  </div>
                  <div>
                    <Tooltip
                      title="Annual performance bonus (typically % of base). Varies year to year — treated as target/expected amount."
                      placement="top"
                    >
                      <div className="text-xs font-medium text-slate-500 cursor-help inline-flex items-center gap-1">
                        Bonus <span className="text-slate-300 text-[10px]">ⓘ</span>
                      </div>
                    </Tooltip>
                    <div className="text-sm font-bold text-slate-900">
                      ${Number(row.offer.bonus).toLocaleString()}
                    </div>
                    <Tooltip
                      title="Estimated after-tax bonus. Bonuses are typically taxed at a higher supplemental rate."
                      placement="bottom"
                    >
                      <div className="text-[10px] text-slate-400 cursor-help">
                        After tax: $
                        {Math.round(
                          adjustedByOfferId[Number(row.offer.id)]?.afterTaxBonus || 0
                        ).toLocaleString()}
                      </div>
                    </Tooltip>
                  </div>
                  <div>
                    <Tooltip
                      title="Annualized value of your equity grant (RSUs or options). Calculated as total grant ÷ vesting period, before tax."
                      placement="top"
                    >
                      <div className="text-xs font-medium text-slate-500 cursor-help inline-flex items-center gap-1">
                        Equity / Yr <span className="text-slate-300 text-[10px]">ⓘ</span>
                      </div>
                    </Tooltip>
                    <div className="text-sm font-bold text-slate-900">
                      ${Number(row.offer.equity).toLocaleString()}
                    </div>
                    <Tooltip
                      title="Equity is taxed as ordinary income (RSUs) or capital gains (options) upon vesting/exercise."
                      placement="bottom"
                    >
                      <div className="text-[10px] text-slate-400 cursor-help">
                        After tax: $
                        {Math.round(
                          adjustedByOfferId[Number(row.offer.id)]?.afterTaxEquity || 0
                        ).toLocaleString()}
                      </div>
                    </Tooltip>
                  </div>
                  <div>
                    <Tooltip
                      title="One-time signing bonus paid when you join. Often subject to a clawback period (typically 1–2 years)."
                      placement="top"
                    >
                      <div className="text-xs font-medium text-slate-500 cursor-help inline-flex items-center gap-1">
                        Sign-On <span className="text-slate-300 text-[10px]">ⓘ</span>
                      </div>
                    </Tooltip>
                    <div className="text-sm font-bold text-slate-900">
                      ${Number(row.offer.sign_on).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">One-time</div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <Tooltip
                          title="PTO days are paid time off (vacation + personal). Holidays are federally observed days off. Unlimited PTO policies vary by company culture."
                          placement="top"
                        >
                          <div className="text-xs font-medium text-slate-500 cursor-help inline-flex items-center gap-1">
                            Time Off <span className="text-slate-300 text-[10px]">ⓘ</span>
                          </div>
                        </Tooltip>
                        <div className="text-sm font-medium text-slate-900">
                          {formatPtoLabel(row.offer.pto_days, !!row.offer.is_unlimited_pto)} PTO,{' '}
                          {row.offer.holiday_days ?? 11} Holidays
                        </div>
                      </div>
                      {!row.isSimulated && !(row.offer as Offer).is_current && (
                        <div className="text-right">
                          <Tooltip
                            title="Total comp difference (Base + Bonus + Equity + Sign-On) compared to your current job."
                            placement="top"
                          >
                            <div className="text-xs font-medium text-slate-500 cursor-help inline-flex items-center gap-1 justify-end">
                              Diff vs Current <span className="text-slate-300 text-[10px]">ⓘ</span>
                            </div>
                          </Tooltip>
                          {(() => {
                            const total =
                              Number(row.offer.base_salary) +
                              Number(row.offer.bonus) +
                              Number(row.offer.equity) +
                              Number(row.offer.sign_on);
                            const diff = total - currentTotal;
                            const diffPercent =
                              currentTotal > 0 ? ((diff / currentTotal) * 100).toFixed(1) : 0;
                            return (
                              <div
                                className={clsx(
                                  'text-sm font-bold',
                                  diff >= 0 ? 'text-emerald-600' : 'text-rose-500'
                                )}
                              >
                                {diff > 0 ? '+' : ''}${diff.toLocaleString()}{' '}
                                <span className="text-[10px] font-medium ml-1">
                                  ({diff > 0 ? '+' : ''}
                                  {diffPercent}%)
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      {row.isSimulated && (
                        <div className="text-right">
                          <Tooltip
                            title="Total comp difference compared to your current job (Base + Bonus + Equity + Sign-On)."
                            placement="top"
                          >
                            <div className="text-xs font-medium text-slate-500 cursor-help inline-flex items-center gap-1 justify-end">
                              Diff vs Current <span className="text-slate-300 text-[10px]">ⓘ</span>
                            </div>
                          </Tooltip>
                          {(() => {
                            const total =
                              Number(row.offer.base_salary) +
                              Number(row.offer.bonus) +
                              Number(row.offer.equity) +
                              Number(row.offer.sign_on);
                            const diff = total - currentTotal;
                            const diffPercent =
                              currentTotal > 0 ? ((diff / currentTotal) * 100).toFixed(1) : 0;
                            return (
                              <div
                                className={clsx(
                                  'text-sm font-bold',
                                  diff >= 0 ? 'text-emerald-600' : 'text-rose-500'
                                )}
                              >
                                {diff > 0 ? '+' : ''}${diff.toLocaleString()}{' '}
                                <span className="text-[10px] font-medium ml-1">
                                  ({diff > 0 ? '+' : ''}
                                  {diffPercent}%)
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-auto border-t border-slate-100 bg-white px-4 py-3">
                {row.isSimulated ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button
                        onClick={() => onEditScenario(String(row.offer.id))}
                        className="px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    <div>
                      <Popconfirm
                        title="Delete custom scenario?"
                        onConfirm={() => onDeleteScenario(String(row.offer.id))}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <button className="px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                          Delete
                        </button>
                      </Popconfirm>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      <button
                        onClick={() => onEditClick(row.offer as Offer)}
                        className="px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onToggleCurrent(row.offer as Offer)}
                        className={clsx(
                          'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                          (row.offer as Offer).is_current
                            ? 'text-slate-400 hover:bg-slate-50'
                            : 'text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        {(row.offer as Offer).is_current ? 'Unmark Current' : 'Mark Current'}
                      </button>
                      <button
                        onClick={() => onSnapshotsClick(row.offer as Offer)}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        Snapshots
                      </button>
                      <Popover
                        trigger="click"
                        placement="topRight"
                        content={
                          <div className="flex w-44 flex-col py-1">
                            <button
                              onClick={() => onSaveSnapshotClick(row.offer as Offer, row)}
                              className="rounded-md px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              Save Snapshot
                            </button>
                            {(row.offer as Offer).is_current ? (
                              <button
                                onClick={() => onRaiseHistoryClick(row.offer as Offer)}
                                className="rounded-md px-3 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50"
                              >
                                Raise History
                              </button>
                            ) : (
                              <button
                                onClick={() => onNegotiateClick(row.offer as Offer)}
                                className="rounded-md px-3 py-2 text-left text-xs font-semibold text-purple-700 hover:bg-purple-50"
                              >
                                Negotiate
                              </button>
                            )}
                            {applicationsById[row.applicationId]?.is_locked ? (
                              <Tooltip title="Unlock this application in Job Applications first.">
                                <span className="rounded-md px-3 py-2 text-xs font-semibold text-slate-300 cursor-not-allowed">
                                  Delete
                                </span>
                              </Tooltip>
                            ) : (
                              <Popconfirm
                                title="Delete linked application?"
                                description="This will delete the application and remove this offer from comparison."
                                okText="Delete"
                                cancelText="Cancel"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => onDeleteClick(row.offer as Offer)}
                              >
                                <button className="rounded-md px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50">
                                  Delete
                                </button>
                              </Popconfirm>
                            )}
                          </div>
                        }
                      >
                        <button className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
                          More
                        </button>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        <aside className="flex h-fit flex-col gap-6 lg:sticky lg:top-6">
          {/* Simulation Settings */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Offer Simulations</h3>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  "What-If" Scenarios
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Tax Marital Status
                </label>
                <Select
                  value={maritalStatus}
                  onChange={setMaritalStatus}
                  options={maritalStatusOptions.map((o) => ({ value: o.code, label: o.label }))}
                  className="w-full"
                  size="small"
                />
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={onAddScenario}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  <PlusOutlined /> Add Custom Scenario
                </button>
                <button
                  onClick={saveAdjustments}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-50"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>

          {/* Score Weights */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
            <div
              className={clsx(
                'flex items-center justify-between cursor-pointer select-none',
                isWeightsExpanded ? 'mb-6' : 'mb-0'
              )}
              onClick={() => setIsWeightsExpanded(!isWeightsExpanded)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m3 16 4 4 4-4" />
                    <path d="M7 20V4" />
                    <path d="m21 8-4-4-4 4" />
                    <path d="M17 4v16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Score Weights</span>
                    <Tooltip
                      title={
                        <div className="space-y-1.5 p-1 text-[11px] leading-relaxed text-slate-200">
                          <p className="font-semibold text-white">General Formula</p>
                          <p>
                            Each category creates a 0-100 score. Total score = sum(category score ×
                            weight) / active weight. Detailed field-level math lives in each offer's
                            Total Score popover.
                          </p>
                          <p className="border-t border-slate-700 pt-1 text-[10px] text-slate-400">
                            Includes money adjustments, location friction, PTO/holidays, manual
                            signals, and immigration when filled.
                          </p>
                        </div>
                      }
                      placement="top"
                      overlayStyle={{ maxWidth: '285px' }}
                    >
                      <span
                        className="inline-flex items-center text-slate-400 hover:text-slate-600 cursor-help"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <InfoCircleOutlined className="text-[11px]" />
                      </span>
                    </Tooltip>
                  </h3>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    Current Distribution
                  </p>
                </div>
              </div>
              <div className="text-slate-400">
                {isWeightsExpanded ? (
                  <DownOutlined className="text-xs" />
                ) : (
                  <RightOutlined className="text-xs" />
                )}
              </div>
            </div>

            {isWeightsExpanded &&
              (() => {
                const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);
                const remaining = 100 - totalWeight;
                const isOver = totalWeight > 100;
                const isNear = totalWeight >= 95 && totalWeight < 100;
                const isExact = totalWeight === 100;

                const barColor = isOver
                  ? 'bg-rose-500'
                  : isExact
                    ? 'bg-emerald-500'
                    : isNear
                      ? 'bg-amber-400'
                      : 'bg-sky-500';

                const labelColor = isOver
                  ? 'text-rose-600'
                  : isExact
                    ? 'text-emerald-600'
                    : isNear
                      ? 'text-amber-600'
                      : 'text-slate-500';

                return (
                  <div className="space-y-3">
                    {/* Total indicator */}
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Total Weight
                        </span>
                        <span className={`text-xs font-bold tabular-nums ${labelColor}`}>
                          {totalWeight}%{' '}
                          {isOver
                            ? '— over limit!'
                            : isExact
                              ? '— balanced'
                              : isNear
                                ? `(${remaining}% left) — warning`
                                : `(${remaining}% left)`}
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${Math.min(totalWeight, 100)}%` }}
                        />
                      </div>
                      {isOver && (
                        <p className="mt-1.5 text-[10px] text-rose-500 font-medium">
                          Reduce by {totalWeight - 100}% to stay within budget.
                        </p>
                      )}
                    </div>

                    {/* Weight sliders */}
                    {(Object.entries(weights) as [CategoryKey, number][])
                      .sort((a, b) => b[1] - a[1])
                      .map(([key, weight]) => {
                        const isOptional = ['workLife', 'growth', 'brand', 'team'].includes(key);
                        return (
                          <div
                            key={key}
                            className={clsx(
                              'flex items-center justify-between rounded-2xl border p-3 shadow-sm transition-colors hover:border-sky-200',
                              isOver ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 bg-white'
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">
                                {CATEGORY_LABELS[key]}
                              </span>
                              {isOptional && (
                                <span className="text-[10px] font-medium text-slate-400">
                                  Optional
                                </span>
                              )}
                            </div>
                            <InputNumber
                              min={0}
                              max={100}
                              value={weight}
                              onChange={(val) => {
                                const nextValue =
                                  typeof val === 'number' && Number.isFinite(val) ? val : 0;
                                setWeights((prev) => ({ ...prev, [key]: clamp(nextValue) }));
                              }}
                              className={clsx(
                                'w-[72px] text-xs font-bold border-none rounded-md text-right [&_.ant-input-number-input]:!font-bold',
                                isOver
                                  ? 'bg-rose-50 text-rose-600 [&_.ant-input-number-input]:!text-rose-600'
                                  : 'bg-sky-50 text-sky-700 [&_.ant-input-number-input]:!text-sky-700'
                              )}
                              controls={false}
                              formatter={(value) => `${value}%`}
                              parser={(value) => Number(value?.replace('%', ''))}
                            />
                          </div>
                        );
                      })}

                    {anyImmigrationSignal && (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2.5">
                        <span className="text-xs font-bold text-amber-700">Immigration</span>
                        <p className="text-[10px] text-amber-600 mt-0.5">
                          Fixed {VISA_OVERLAY_WEIGHT}% overlay — auto-added for offers with visa/GC
                          data. Other weights scale down proportionally.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default OfferDecisionScorecard;
