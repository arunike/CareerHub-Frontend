import { type ApplicationLike as Application } from './calculations';
import { Select } from 'antd';
import {
  getImmigrationSignalPatch,
  getImmigrationSignalValue,
  immigrationSignalOptions,
  type ImmigrationSignalValue,
} from './immigrationSignal';
import AccessibleStarRating from './AccessibleStarRating';
import HelpTooltipTrigger from '../../components/HelpTooltipTrigger';
import { clamp, normalizeManualScore } from './decisionScoring';

import type { DecisionRow } from './decisionScoring';

type Props = {
  applicationsById: Record<number, Application | undefined>;
  onScoreUpdate: ((appId: number, patch: Partial<Application>) => Promise<void>) | undefined;
  row: DecisionRow;
  financialBarMax: number;
};

const ScorecardCategoryList = ({
  financialBarMax,
  applicationsById,
  onScoreUpdate,
  row,
}: Props) => (
  <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
    {row.categories.map((category) => {
      const app = applicationsById[row.applicationId];

      if (category.key === 'financial' || category.key === 'location') {
        const barWidth =
          category.key === 'financial'
            ? clamp((category.score / financialBarMax) * 100)
            : clamp(category.score);
        const tooltips: Record<string, string> = {
          financial: `Adjusted annual value after tax, cost of living, commute, and rent, mapped to an uncapped logarithmic score where $300k = 100. The bar is scaled against the highest visible Financial score (${Math.round(financialBarMax)}); the numeric score stays fixed.`,
          location:
            'Starts from the work mode, then subtracts the annual commute cost and the time the commute takes. Both are counted over the office days implied by the RTO policy and time off, so a hybrid role is not charged for a five-day commute. Where travel time is recorded it replaces the days-per-week estimate rather than stacking on top of it.',
        };
        return (
          <div key={category.key} className="flex flex-col">
            <div className="mb-2 flex items-center justify-between text-xs">
              <HelpTooltipTrigger
                title={tooltips[category.key]}
                ariaLabel={`Explain ${category.label} score`}
                className="font-semibold text-slate-700 dark:text-ink-100"
              >
                {category.label}
              </HelpTooltipTrigger>
              <span className="font-bold text-slate-900 dark:text-ink-50">
                {Math.round(category.score)}
              </span>
            </div>

            {/* Compact Progress Bar */}
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                  category.key === 'financial' ? 'bg-emerald-500' : 'bg-sky-500'
                }`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] font-medium text-slate-500 dark:text-ink-400 line-clamp-1">
              {category.detail}
            </p>
          </div>
        );
      }

      if (['workLife', 'growth', 'brand', 'team'].includes(category.key)) {
        const dbKey = category.key === 'workLife' ? 'work_life_score' : `${category.key}_score`;
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
              <HelpTooltipTrigger
                title={tooltips[category.key]}
                ariaLabel={`Explain ${category.label} score`}
                className="font-semibold text-slate-700 dark:text-ink-100"
              >
                {category.label}
              </HelpTooltipTrigger>
              <span
                className={`font-bold ${category.isScored ? 'text-slate-900 dark:text-ink-50' : 'text-slate-400 dark:text-ink-500'}`}
              >
                {category.isScored ? Math.round(category.score) : '--'}
              </span>
            </div>
            <AccessibleStarRating
              label={`${category.label} rating for ${row.company}`}
              value={rateValue}
              onChange={(val) => onScoreUpdate?.(row.applicationId, { [dbKey]: val })}
              disabled={row.isSimulated}
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
              <span className="font-semibold text-slate-700 dark:text-ink-100">
                {category.label}
              </span>
              <span
                className={`font-bold ${category.isScored ? 'text-slate-900 dark:text-ink-50' : 'text-slate-400 dark:text-ink-500'}`}
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
              className="w-full rounded-lg border border-slate-100 dark:border-white/[0.07] bg-slate-50 dark:bg-ink-900 text-xs transition-colors hover:bg-slate-100 [&_.ant-select-selector]:!bg-transparent"
            />
            <p className="mt-1.5 text-[10px] leading-4 text-slate-400 dark:text-ink-500">
              {selectedImmigrationOption?.description ||
                'Only score this when immigration support matters to the decision.'}
            </p>
          </div>
        );
      }

      return null;
    })}
  </div>
);

export default ScorecardCategoryList;
