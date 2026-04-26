import { useMemo } from 'react';
import {
  annualizeAmount,
  type ApplicationLike as Application,
  type DayOneGcStatus,
  type OfferLike as Offer,
  type VisaSponsorshipStatus,
} from './calculations';
import type { AdjustedOfferMetrics } from './types';

type Props = {
  filteredOffers: Offer[];
  applicationsById: Record<number, Application | undefined>;
  adjustedByOfferId: Record<number, AdjustedOfferMetrics>;
};

type CategoryKey = 'financial' | 'visa' | 'workLife' | 'growth' | 'location' | 'brand' | 'team';

type CategoryScore = {
  key: CategoryKey;
  label: string;
  weight: number;
  score: number;
  detail: string;
  isScored: boolean;
};

type DecisionRow = {
  id: string;
  company: string;
  role: string;
  score: number;
  rank: number;
  categories: CategoryScore[];
  visaLabel: string;
  dayOneGcLabel: string;
  workModeLabel: string;
  financialValue: number;
  hasImmigrationSignal: boolean;
};

const CATEGORY_META: Array<{ key: CategoryKey; label: string; weight: number }> = [
  { key: 'financial', label: 'Financial', weight: 35 },
  { key: 'visa', label: 'Immigration', weight: 20 },
  { key: 'workLife', label: 'WLB', weight: 15 },
  { key: 'growth', label: 'Growth', weight: 12 },
  { key: 'location', label: 'Location', weight: 8 },
  { key: 'brand', label: 'Brand', weight: 5 },
  { key: 'team', label: 'Team', weight: 5 },
];

const VISA_LABELS: Record<VisaSponsorshipStatus, string> = {
  '': 'Visa not specified',
  UNKNOWN: 'Visa not specified',
  NOT_NEEDED: 'No sponsorship needed',
  AVAILABLE: 'Sponsorship available',
  TRANSFER_ONLY: 'Transfer only',
  NOT_AVAILABLE: 'No sponsorship',
};

const DAY_ONE_GC_LABELS: Record<DayOneGcStatus, string> = {
  '': 'Day 1 GC not specified',
  UNKNOWN: 'Day 1 GC not specified',
  YES: 'Day 1 GC',
  NO: 'No Day 1 GC',
  NOT_APPLICABLE: 'GC not applicable',
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

const scoreVisa = (app?: Application) => {
  const sponsorship = app?.visa_sponsorship && app.visa_sponsorship !== 'UNKNOWN' ? app.visa_sponsorship : '';
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
  if (dayOneGc === 'NO' && (sponsorship === 'AVAILABLE' || sponsorship === 'TRANSFER_ONLY')) score -= 8;
  if (dayOneGc === 'NOT_APPLICABLE' && sponsorship === 'NOT_NEEDED') score = 100;

  return clamp(score);
};

const hasImmigrationSignal = (app?: Application) =>
  Boolean(
    (app?.visa_sponsorship && app.visa_sponsorship !== 'UNKNOWN') ||
      (app?.day_one_gc && app.day_one_gc !== 'UNKNOWN')
  );

const scoreLocation = (app?: Application) => {
  const workMode = getWorkMode(app);
  const commuteAnnual = annualizeAmount(
    asNumber(app?.commute_cost_value),
    app?.commute_cost_frequency || 'MONTHLY'
  );
  const rtoDays = clamp(asNumber(app?.rto_days_per_week, workMode === 'ONSITE' ? 5 : workMode === 'REMOTE' ? 0 : 3), 0, 5);
  const base = workMode === 'REMOTE' ? 90 : workMode === 'HYBRID' ? 76 : workMode === 'ONSITE' ? 62 : 66;
  const commutePenalty = clamp(commuteAnnual / 1000, 0, 18);
  const rtoPenalty = workMode === 'REMOTE' ? 0 : Math.max(0, rtoDays - 2) * 2;

  return clamp(base - commutePenalty - rtoPenalty);
};

const buildRows = (
  offers: Offer[],
  applicationsById: Record<number, Application | undefined>,
  adjustedByOfferId: Record<number, AdjustedOfferMetrics>
) => {
  const financialValues = offers.map((offer) =>
    offer.id && adjustedByOfferId[offer.id]?.adjustedValue != null
      ? adjustedByOfferId[offer.id].adjustedValue
      : totalAnnualComp(offer)
  );
  const minFinancial = Math.min(...financialValues);
  const maxFinancial = Math.max(...financialValues);
  const range = Math.max(1, maxFinancial - minFinancial);

  const rows = offers.map((offer, index) => {
    const app = applicationsById[offer.application];
    const financialValue = financialValues[index] || totalAnnualComp(offer);
    const financialScore = financialValues.length <= 1 ? 78 : 45 + ((financialValue - minFinancial) / range) * 55;
    const workMode = getWorkMode(app);
    const shouldScoreImmigration = hasImmigrationSignal(app);
    const workLifeScore = scoreFromManual(app?.work_life_score);
    const growthScore = scoreFromManual(app?.growth_score);
    const brandScore = scoreFromManual(app?.brand_score);
    const teamScore = scoreFromManual(app?.team_score);
    const categories: CategoryScore[] = CATEGORY_META.map((category) => {
      if (category.key === 'financial') {
        return {
          ...category,
          score: clamp(financialScore),
          detail: `${formatCurrency(financialValue)} adjusted value`,
          isScored: true,
        };
      }
      if (category.key === 'visa') {
        return {
          ...category,
          score: shouldScoreImmigration ? scoreVisa(app) : 0,
          detail: shouldScoreImmigration
            ? `${VISA_LABELS[app?.visa_sponsorship || '']} / ${DAY_ONE_GC_LABELS[app?.day_one_gc || '']}`
            : 'Skipped until sponsorship or Day 1 GC is filled',
          isScored: shouldScoreImmigration,
        };
      }
      if (category.key === 'workLife') {
        return {
          ...category,
          score: workLifeScore ?? 0,
          detail: workLifeScore != null ? `${app?.work_life_score}/5 manual` : 'Skipped until Work-Life Score is set',
          isScored: workLifeScore != null,
        };
      }
      if (category.key === 'growth') {
        return {
          ...category,
          score: growthScore ?? 0,
          detail: growthScore != null ? `${app?.growth_score}/5 manual` : 'Skipped until Growth Score is set',
          isScored: growthScore != null,
        };
      }
      if (category.key === 'location') {
        return {
          ...category,
          score: scoreLocation(app),
          detail: app?.office_location || app?.location || 'Location unknown',
          isScored: true,
        };
      }
      if (category.key === 'brand') {
        return {
          ...category,
          score: brandScore ?? 0,
          detail: brandScore != null ? `${app?.brand_score}/5 manual` : 'Skipped until Brand Score is set',
          isScored: brandScore != null,
        };
      }
      return {
        ...category,
        score: teamScore ?? 0,
        detail: teamScore != null ? `${app?.team_score}/5 manual` : 'Skipped until Manager / Team Score is set',
        isScored: teamScore != null,
      };
    });

    const scoredCategories = categories.filter((category) => category.isScored);
    const activeWeightTotal = scoredCategories.reduce((sum, category) => sum + category.weight, 0) || 1;
    const score =
      scoredCategories.reduce((sum, category) => sum + category.score * category.weight, 0) /
      activeWeightTotal;

    return {
      id: `${offer.id ?? 'scenario'}-${offer.application}-${index}`,
      company: app?.company_name || offer.application_details?.company || 'Unknown company',
      role: app?.role_title || offer.application_details?.role_title || 'Unknown role',
      score: Math.round(score),
      rank: 0,
      categories,
      visaLabel: VISA_LABELS[app?.visa_sponsorship || ''],
      dayOneGcLabel: DAY_ONE_GC_LABELS[app?.day_one_gc || ''],
      workModeLabel: workMode === 'UNKNOWN' ? 'Work mode unknown' : workMode[0] + workMode.slice(1).toLowerCase(),
      financialValue,
      hasImmigrationSignal: shouldScoreImmigration,
    } satisfies DecisionRow;
  });

  return rows
    .sort((a, b) => b.score - a.score || b.financialValue - a.financialValue)
    .map((row, index) => ({ ...row, rank: index + 1 }));
};

const OfferDecisionScorecard = ({ filteredOffers, applicationsById, adjustedByOfferId }: Props) => {
  const rows = useMemo(
    () => buildRows(filteredOffers, applicationsById, adjustedByOfferId),
    [adjustedByOfferId, applicationsById, filteredOffers]
  );

  if (rows.length === 0) return null;

  const leader = rows[0];

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm mb-12">
      <div className="border-b border-slate-100 bg-white px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Decision Scorecard</p>
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Best overall: <span className="text-indigo-600">{leader.company}</span></h2>
            <p className="mt-2 text-sm font-medium text-slate-500 max-w-2xl">
              Weighted beyond total comp. Advanced signals only count after you fill them in.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Top Score</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{leader.score}</p>
            </div>
            <div className="h-12 w-[1px] bg-slate-200" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Value</p>
              <p className="mt-1 text-xl font-bold tracking-tight text-emerald-600">{formatCurrency(leader.financialValue)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-6 xl:grid-cols-2">
          {rows.map((row) => (
            <article key={row.id} className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:border-indigo-300 hover:shadow-md">
              {/* Card Header */}
              <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white shadow-sm">
                        {row.rank}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">{row.company}</h3>
                    </div>
                    <p className="text-sm font-medium text-slate-500">{row.role}</p>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <p className="text-3xl font-black tracking-tight text-indigo-600">{row.score}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Score</p>
                  </div>
                </div>
                
                {/* Tags */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(row.hasImmigrationSignal
                    ? [row.visaLabel, row.dayOneGcLabel, row.workModeLabel]
                    : ['Immigration not scored', row.workModeLabel]
                  ).map((label) => (
                    <span key={label} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Body - Scores */}
              <div className="flex-1 p-6">
                <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  {row.categories.map((category) => (
                    <div key={category.key} className="flex flex-col">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{category.label}</span>
                        <span className={`font-bold ${category.isScored ? 'text-slate-900' : 'text-slate-400'}`}>
                          {category.isScored ? Math.round(category.score) : '--'}
                        </span>
                      </div>
                      
                      {/* Compact Progress Bar */}
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                            category.isScored 
                              ? category.key === 'financial' ? 'bg-emerald-500' : 'bg-indigo-500'
                              : 'bg-slate-300'
                          }`}
                          style={{ width: category.isScored ? `${Math.round(category.score)}%` : '0%' }}
                        />
                      </div>
                      <p className="mt-2 text-[10px] font-medium text-slate-500 line-clamp-1">{category.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="sticky top-6 flex h-fit flex-col rounded-3xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Score Weights</h3>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Current Distribution</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {CATEGORY_META.map((category) => {
              const isOptional = ['visa', 'workLife', 'growth', 'brand', 'team'].includes(category.key);
              return (
                <div key={category.key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-indigo-200">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">{category.label}</span>
                    {isOptional && <span className="text-[10px] font-medium text-slate-400">Optional</span>}
                  </div>
                  <span className="flex h-6 items-center justify-center rounded-md bg-indigo-50 px-2 text-[11px] font-bold text-indigo-700">
                    {category.weight}%
                  </span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default OfferDecisionScorecard;
