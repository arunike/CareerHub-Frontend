import { useMemo, useState } from 'react';
import { Segmented } from 'antd';
import { AimOutlined, SwapRightOutlined } from '@ant-design/icons';
import YearByYearChart from './YearByYearChart';
import ProjectionAssumptions from './ProjectionAssumptions';
import type { ScenarioRow } from './offerAdjustmentsTypes';
import { PROJECTION_YEARS } from './vestingSchedule';
import {
  buildYearByYearProjections,
  DEFAULT_BASE_GROWTH_PCT,
  DEFAULT_EQUITY_GROWTH_PCT,
  findCrossover,
  findMatchGap,
  type OfferProjection,
  type ProjectionBasis,
} from './yearByYear';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const YEARS = Array.from({ length: PROJECTION_YEARS }, (_, index) => index + 1);

const valueFor = (projection: OfferProjection, year: number, basis: ProjectionBasis) => {
  const entry = projection.years[year - 1];
  if (!entry) return 0;
  return basis === 'gross' ? entry.gross : entry.adjusted;
};

const totalFor = (projection: OfferProjection, basis: ProjectionBasis) =>
  basis === 'gross' ? projection.grossTotal : projection.adjustedTotal;

const YearByYearSection = ({
  scenarioRows,
  display = 'list',
}: {
  scenarioRows: ScenarioRow[];
  display?: 'list' | 'chart';
}) => {
  const [basis, setBasis] = useState<ProjectionBasis>('gross');
  const [equityGrowthPct, setEquityGrowthPct] = useState(DEFAULT_EQUITY_GROWTH_PCT);
  const [baseGrowthPct, setBaseGrowthPct] = useState(DEFAULT_BASE_GROWTH_PCT);

  const projections = useMemo(
    () => buildYearByYearProjections(scenarioRows, equityGrowthPct, baseGrowthPct),
    [scenarioRows, equityGrowthPct, baseGrowthPct]
  );

  const crossover = useMemo(() => findCrossover(projections, basis), [projections, basis]);
  const matchGap = useMemo(
    () => findMatchGap(projections, baseGrowthPct),
    [projections, baseGrowthPct]
  );

  // Highest four-year total sets the bar scale, so every row is read against the best.
  const maxTotal = useMemo(
    () => Math.max(...projections.map((projection) => totalFor(projection, basis)), 0),
    [projections, basis]
  );

  const bestPerYear = useMemo(
    () =>
      YEARS.map((year) => {
        const contenders = projections.filter((projection) => !projection.isCurrent);
        if (contenders.length < 2) return null;
        return contenders.reduce((best, projection) =>
          valueFor(projection, year, basis) > valueFor(best, year, basis) ? projection : best
        ).key;
      }),
    [projections, basis]
  );

  if (projections.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500 dark:text-ink-400">
          Sign-on and relocation count in year 1 only. Equity follows each grant&apos;s vesting
          schedule. Base and bonus grow {baseGrowthPct}% a year — adjust both rates under{' '}
          <span className="font-medium text-slate-600 dark:text-ink-200">Equity / Base</span>.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectionAssumptions
            equityGrowthPct={equityGrowthPct}
            baseGrowthPct={baseGrowthPct}
            onEquityGrowthChange={setEquityGrowthPct}
            onBaseGrowthChange={setBaseGrowthPct}
          />
          <Segmented
            size="small"
            value={basis}
            onChange={(value) => setBasis(value as ProjectionBasis)}
            options={[
              { label: 'Gross', value: 'gross' },
              { label: 'Adjusted', value: 'adjusted' },
            ]}
          />
        </div>
      </div>

      {crossover && (
        <div className="flex items-start gap-2 rounded-xl border border-indigo-200 dark:border-indigo-500/25 bg-indigo-50/70 dark:bg-indigo-500/10 px-4 py-3">
          <SwapRightOutlined className="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
          <p className="text-[13px] leading-relaxed text-indigo-900 dark:text-indigo-200">
            <span className="font-semibold">{crossover.lateLeader}</span> overtakes{' '}
            <span className="font-semibold">{crossover.earlyLeader}</span> in year {crossover.year},
            and is ahead by {formatCurrency(crossover.gapAtFlip)} cumulatively by then.
          </p>
        </div>
      )}

      {matchGap && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/70 dark:bg-emerald-500/10 px-4 py-3">
          <AimOutlined className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
          <p className="text-[13px] leading-relaxed text-emerald-900 dark:text-emerald-200">
            To match <span className="font-semibold">{matchGap.leader}</span> over four years,{' '}
            <span className="font-semibold">{matchGap.candidate}</span> needs{' '}
            <span className="font-semibold">+{formatCurrency(matchGap.perYearBase)}/yr base</span>{' '}
            or <span className="font-semibold">+{formatCurrency(matchGap.extraGrant)} equity</span>{' '}
            — a {formatCurrency(matchGap.totalGap)} gap.
            <span className="mt-1 block text-[11px] text-emerald-700/80 dark:text-emerald-300">
              Gross figures, so they are ready to use as a counter-ask. The base ask is a year-1
              raise that then compounds at {baseGrowthPct}% like the rest.
            </span>
          </p>
        </div>
      )}

      {display === 'chart' ? (
        <YearByYearChart projections={projections} basis={basis} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-ink-400">
              <tr>
                <th className="py-2 pr-4 text-left font-bold">Offer</th>
                {YEARS.map((year) => (
                  <th key={year} className="px-3 py-2 text-right font-bold">
                    Year {year}
                  </th>
                ))}
                <th className="py-2 pl-3 text-right font-bold">4-yr total</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((projection) => {
                const total = totalFor(projection, basis);
                const share = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                return (
                  <tr
                    key={projection.key}
                    className="border-t border-slate-100 dark:border-white/[0.07]"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900 dark:text-ink-50">
                        {projection.label}
                      </div>
                      {projection.isCurrent && (
                        <div className="text-[11px] text-slate-400 dark:text-ink-500">
                          Current role
                        </div>
                      )}
                      <div className="mt-1.5 h-1 w-full max-w-[160px] overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
                        <div
                          className={`h-full rounded-full ${
                            projection.isCurrent ? 'bg-slate-300 dark:bg-ink-700' : 'bg-indigo-400'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, share))}%` }}
                        />
                      </div>
                    </td>
                    {YEARS.map((year) => {
                      const entry = projection.years[year - 1];
                      const isBest = bestPerYear[year - 1] === projection.key;
                      return (
                        <td key={year} className="px-3 py-3 text-right">
                          <div
                            className={
                              isBest
                                ? 'font-semibold text-emerald-600 dark:text-emerald-300'
                                : 'text-slate-900 dark:text-ink-50'
                            }
                          >
                            {formatCurrency(valueFor(projection, year, basis))}
                          </div>
                          {entry && entry.oneTime > 0 && (
                            <div className="text-[10px] text-slate-400 dark:text-ink-500">
                              incl. {formatCurrency(entry.oneTime)} one-time
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 pl-3 text-right font-bold text-slate-950 dark:text-ink-50">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-slate-400 dark:text-ink-500">
        {basis === 'gross'
          ? 'Gross figures are before tax and cost of living, so year 1 lines up with your offer letter.'
          : 'Adjusted figures are after tax, indexed to cost of living, and net of rent — the same basis as Adjusted Value.'}{' '}
        Illiquid equity counts as $0 until a liquidity event.
      </p>
    </div>
  );
};

export default YearByYearSection;
