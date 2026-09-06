import clsx from 'clsx';
import type { ScenarioRow } from './offerAdjustmentsTypes';
import { isPastRole } from './calculations';

export type CompensationSimulatorDisplayRow = {
  key: string;
  row: ScenarioRow;
  monthlyTakeHome: number;
  yearOneMonthly: number;
  leftoverMonthly: number;
  monthlyRent: number;
  monthlyCommute: number;
  monthlyFoodNet: number;
  monthlyFoodPerk: number;
  ptoValue: number | null;
  vestingYears: number[];
  grossVestingYears: number[];
  monthlyFixedCosts: number;
};

type Props = {
  rows: CompensationSimulatorDisplayRow[];
  equityGrowthPct: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const CompensationSimulatorMobile = ({ rows, equityGrowthPct }: Props) => (
  <div className="divide-y divide-slate-200 dark:divide-white/[0.08] md:hidden">
    {rows.map((item) => (
      <article key={`${item.key}-mobile`} className="px-4 py-5 sm:px-6">
        <header className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="min-w-0 text-base font-bold text-slate-950 dark:text-ink-50">
                {item.row.appName}
              </h3>
              {item.row.offer.is_current ? (
                <span
                  className={clsx(
                    'rounded-full px-2 py-1 text-xs font-semibold',
                    isPastRole(item.row.offer)
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                  )}
                >
                  {isPastRole(item.row.offer) ? 'Baseline' : 'Current'}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-ink-400">
              {item.row.homeLocationLabel}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium text-slate-500 dark:text-ink-400">Left after costs</p>
            <p
              className={`mt-0.5 text-lg font-bold tabular-nums ${
                item.leftoverMonthly >= 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {formatCurrency(item.leftoverMonthly)}
            </p>
            <p className="text-xs text-slate-500 dark:text-ink-400">per month</p>
          </div>
        </header>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-slate-50 dark:bg-ink-900 p-4">
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-ink-400">Take-home</dt>
            <dd className="mt-1 text-base font-bold tabular-nums text-slate-950 dark:text-ink-50">
              {formatCurrency(item.monthlyTakeHome)}/mo
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-ink-400">First year</dt>
            <dd className="mt-1 text-base font-bold tabular-nums text-slate-950 dark:text-ink-50">
              {formatCurrency(item.yearOneMonthly)}/mo
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-ink-400">Fixed costs</dt>
            <dd className="mt-1 font-semibold tabular-nums text-slate-800 dark:text-ink-50">
              {formatCurrency(item.monthlyFixedCosts)}/mo
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-ink-400">PTO value</dt>
            <dd className="mt-1 font-semibold tabular-nums text-slate-800 dark:text-ink-50">
              {item.ptoValue == null ? 'Unlimited' : formatCurrency(item.ptoValue)}
            </dd>
          </div>
        </dl>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-xs text-slate-500 dark:text-ink-400">Rent</dt>
            <dd className="mt-1 font-semibold tabular-nums text-slate-800 dark:text-ink-50">
              {formatCurrency(item.monthlyRent)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-ink-400">Commute</dt>
            <dd className="mt-1 font-semibold tabular-nums text-slate-800 dark:text-ink-50">
              {formatCurrency(item.monthlyCommute)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-ink-400">Food</dt>
            <dd className="mt-1 font-semibold tabular-nums text-slate-800 dark:text-ink-50">
              {formatCurrency(item.monthlyFoodNet)}
            </dd>
            {item.monthlyFoodPerk > 0 ? (
              <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                {formatCurrency(item.monthlyFoodPerk)} provided
              </p>
            ) : null}
          </div>
        </dl>

        <div className="mt-5 border-t border-slate-200 dark:border-white/[0.08] pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-ink-50">
              After-tax equity vesting
            </p>
            <p className="text-xs text-slate-500 dark:text-ink-400">
              Market {equityGrowthPct > 0 ? '+' : ''}
              {equityGrowthPct}%
            </p>
          </div>
          <dl className="mt-3 grid grid-cols-4 gap-2">
            {item.vestingYears.map((value, index) => (
              <div key={index} className="min-w-0">
                <dt className="text-xs text-slate-500 dark:text-ink-400">Year {index + 1}</dt>
                <dd className="mt-1 truncate text-sm font-bold tabular-nums text-slate-900 dark:text-ink-50">
                  {value > 0 ? formatCurrency(value) : '-'}
                </dd>
                {value > 0 ? (
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-ink-400">
                    {formatCurrency(item.grossVestingYears[index] || 0)} gross
                  </p>
                ) : null}
              </div>
            ))}
          </dl>
        </div>
      </article>
    ))}
  </div>
);

export default CompensationSimulatorMobile;
