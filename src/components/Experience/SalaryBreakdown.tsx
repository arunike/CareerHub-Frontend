import { SEGMENTS, fmtMoney } from '../../utils/Experience/compensationBreakdownFormat';
import { PayPie, PayStackedBar, shadesFor } from './PayChart';
import { EditNotice } from './breakdownRows';
import type { YearEarnings } from '../../utils/Income/raiseSchedule';
import type { LedgerYear } from '../../hooks/Income/useLedgerEarnings';
import { payYearsOf, payYearsTotal, type PayYear } from '../../utils/Experience/payYears';
import { splitEquityByVesting, upcomingVesting } from '../../utils/Experience/vestedEquity';
import { signedMoneyUpToCents } from '../../utils/Income/format';
import { countdownLabel } from '../../utils/eventReminders';
import { formatPercentChange } from '../../utils/OfferComparison/raiseAfterValues';
import { Button } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import ResponsiveDisclosure from '../modals/ResponsiveDisclosure';
import { EquityVestingChart } from './EquityVestingChart';
import { toIsoDate } from '../../utils/localDay';
import { useChartSeries } from '../../theme/chartColors';
import type { EquityVestingResult } from '../../utils/Experience/equityVesting';
import type { UpcomingVesting, VestedEquitySplit } from '../../utils/Experience/vestedEquity';
import type { PriceSeriesPeriod } from '../../api/career/offers';
import type { VestDateOverride } from '../../utils/Income/vestEvents';
import dayjs from 'dayjs';

const round = (value: number) => Math.round(value);

// emerald-600 is 3.52:1 on this block in light mode, so a gain climbs a step there.
const changeTone = (up: boolean) =>
  up ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300';

// A grant counts on its vest date, so what is waiting is shown as a countdown, outside every total.
const UnvestedEquityShadow = ({
  split,
  upcoming,
  color,
}: {
  split: VestedEquitySplit;
  upcoming: UpcomingVesting;
  color: string;
}) => {
  if (!upcoming.nextDate) return null;
  const gain = upcoming.atCurrentPrice - upcoming.value;
  return (
    <div className="mt-3 rounded-xl border border-dashed border-slate-300 dark:border-white/[0.14] bg-slate-50/80 dark:bg-white/[0.03] px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-xs font-medium text-slate-500 dark:text-ink-400">
          {upcoming.value > 0 ? 'Vesting in the next 12 months' : 'Nothing vests for 12 months'}
        </span>
        {upcoming.value > 0 && (
          <span className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-600 dark:text-ink-200">
              {fmtMoney(upcoming.atCurrentPrice)}
            </span>
            {split.repriced && (
              <span className={`text-xs font-semibold ${changeTone(gain >= 0)}`}>
                {signedMoneyUpToCents(gain)} · {formatPercentChange(split.growthPercent)}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-ink-800">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(upcoming.progress * 100, 4)}%`,
            backgroundImage: `repeating-linear-gradient(135deg, ${color} 0 4px, transparent 4px 8px)`,
          }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-[11px] text-slate-500 dark:text-ink-400">
        <span>
          {countdownLabel(upcoming.nextDate)} · next vest{' '}
          {dayjs(upcoming.nextDate).format('MMM D, YYYY')}
        </span>
        <span>Outside every total above</span>
      </div>
    </div>
  );
};

export const SalaryBreakdown = ({
  total,
  base,
  bonus,
  equity,
  earningsYears,
  ledgerYears,
  totalLabel,
  totalHint,
  onEdit,
  editLabel,
  equityVesting,
  grantPriceHistory,
  onFillGrantPriceHistory,
  onSaveVestDates,
  vestDatesLockedReason,
}: {
  total: number;
  base: number;
  bonus: number;
  equity: number;
  earningsYears?: YearEarnings[];
  ledgerYears?: LedgerYear[];
  totalLabel?: string;
  totalHint?: string;
  onEdit?: () => void;
  editLabel?: string;
  equityVesting?: EquityVestingResult | null;
  grantPriceHistory?: Array<{ as_of: string; price: string | number }>;
  onFillGrantPriceHistory?: (period: PriceSeriesPeriod) => Promise<number>;
  onSaveVestDates?: (overrides: VestDateOverride[]) => Promise<void>;
  vestDatesLockedReason?: string;
}) => {
  const series = useChartSeries();
  const todayIso = toIsoDate(new Date());
  const years = payYearsOf(ledgerYears, earningsYears);
  // Each year is rounded before it is added, so the rows on screen sum to the totals on screen.
  const earned = years.reduce(
    (sum, year) => ({
      base: sum.base + year.byComponent.base,
      bonus: sum.bonus + year.byComponent.bonus,
      equity: sum.equity + year.byComponent.equity,
    }),
    { base: 0, bonus: 0, equity: 0 }
  );
  // Equity accrues by the day but is earned on its vest date, so the unvested part is held back.
  const vesting = splitEquityByVesting(years, equityVesting?.plan);
  const upcoming = upcomingVesting(equityVesting?.plan, todayIso);
  const partOf = (year: PayYear, key: (typeof SEGMENTS)[number]['key']) =>
    key === 'equity' ? (vesting.vestedByYear[year.year] ?? 0) : year.byComponent[key];
  const totalOf = (year: PayYear) => year.total - year.byComponent.equity + partOf(year, 'equity');
  // With dated years the card reports money earned, not the rate it is earned at.
  const breakdown = years.length ? { ...earned, equity: vesting.vested } : { base, bonus, equity };
  // The same helper the role card chip uses, so the headline and the chip cannot drift apart.
  const headline = years.length ? payYearsTotal(years) - vesting.unvested : total;
  const rows = SEGMENTS.map((segment) => ({
    key: segment.key,
    label: segment.label,
    sublabel: undefined as string | undefined,
    value: breakdown[segment.key],
    color: series[segment.key],
    empty:
      segment.key === 'equity' && (vesting.unvested > 0 || vesting.outstanding > 0)
        ? 'Nothing vested yet'
        : 'Not included',
  }));
  // Each part of pay splits into the years that made it up.
  const yearShades = Object.fromEntries(
    SEGMENTS.map((segment) => [segment.key, shadesFor(series[segment.key], years.length)])
  ) as Record<string, string[]>;
  const chartGroups = SEGMENTS.map((segment) => ({
    key: segment.key,
    label: segment.label,
    color: series[segment.key],
    total: breakdown[segment.key],
    children: years.map((year, index) => ({
      key: `${segment.key}-${year.year}`,
      label: String(year.year),
      value: partOf(year, segment.key),
      color: yearShades[segment.key][index],
    })),
  }));
  // The rate is the package as it stands now, whichever source the yearly figures came from.
  const currentRate = total;
  const fromLedger = years.some((year) => year.fromLedger);

  return (
    <div className="mt-2 space-y-4">
      {onEdit && (
        <EditNotice
          title="These pay inputs are editable"
          hint="Update base, bonus, or equity on this role anytime. The breakdown will refresh from your saved values."
          actionLabel={editLabel ?? 'Edit role'}
          onEdit={onEdit}
        />
      )}

      <div className="grid gap-5 md:grid-cols-[320px,1fr]">
        <div className="rounded-2xl border border-emerald-100 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50 dark:from-emerald-500/10 via-white dark:via-ink-900 to-blue-50 dark:to-blue-500/10 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-ink-400">
            {totalLabel ??
              (years.length
                ? years.length === 1
                  ? `Earned in ${years[0].year}`
                  : `Earned ${years.at(-1)!.year}–${years[0].year}`
                : 'Total Annual Earnings')}
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-ink-50">
            {fmtMoney(headline)}
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-ink-400">
            {totalHint ??
              (years.length
                ? `${years.at(-1)!.year}–${years[0].year} · ${fromLedger ? 'from your paycheck ledger' : 'estimated from your pay and dates'}`
                : 'Base salary + bonus + equity, at your current rate')}
          </div>
          {vesting.unvested > 0 && (
            <div className="mt-2 rounded-lg bg-white/70 dark:bg-ink-900/70 px-2.5 py-1.5 text-[11px] text-slate-500 dark:text-ink-400">
              Excludes {fmtMoney(vesting.unvested)} of equity that has not vested yet.
            </div>
          )}

          {years.length > 0 && (
            <>
              <div className="mt-4 flex items-baseline justify-between gap-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-ink-900/80 px-3 py-2">
                <span className="text-xs font-medium text-slate-500 dark:text-ink-400">
                  Current rate
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-ink-50">
                  {fmtMoney(round(currentRate))}
                  <span className="ml-1 text-xs font-normal text-slate-500 dark:text-ink-400">
                    a year
                  </span>
                </span>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-ink-900/80 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
                  How this adds up
                </div>
                {years.map((year) => (
                  <div key={year.year} className="mt-2">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-ink-100">
                        {year.year}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-ink-50">
                        {fmtMoney(totalOf(year))}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 dark:text-ink-500">
                      {year.detail} · base {fmtMoney(year.byComponent.base)}
                      {year.byComponent.bonus > 0 && ` · bonus ${fmtMoney(year.byComponent.bonus)}`}
                      {partOf(year, 'equity') > 0 &&
                        ` · equity ${fmtMoney(partOf(year, 'equity'))}`}
                      {/* The Income tab reports the whole year, so name it here to reconcile. */}
                      {year.projected > totalOf(year) &&
                        ` · ${fmtMoney(year.projected)} for the full year`}
                    </div>
                  </div>
                ))}
                {years.length > 1 && (
                  <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-slate-200 dark:border-white/[0.08] pt-2 text-xs">
                    <span className="font-medium text-slate-600 dark:text-ink-200">
                      {years.length} years in this role
                    </span>
                    <span className="font-bold text-slate-900 dark:text-ink-50">
                      {fmtMoney(headline)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-5 h-64">
            <PayPie groups={chartGroups} empty="No compensation data yet" />
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((row) => {
            const value = row.value;
            const pct = headline > 0 ? (value / headline) * 100 : 0;

            return (
              <div
                key={row.key}
                className="rounded-2xl border border-gray-100 dark:border-white/[0.07] bg-white dark:bg-ink-900 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="truncate text-sm font-semibold text-gray-800 dark:text-ink-50">
                        {row.label}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400 dark:text-ink-500">
                      {value > 0
                        ? `${pct.toFixed(1)}%${row.sublabel ? ` · ${row.sublabel}` : ''}`
                        : row.empty}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-ink-50">
                      {fmtMoney(value)}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  {years.length > 1 ? (
                    <PayStackedBar
                      total={value}
                      parts={years.map((year, index) => ({
                        key: `${row.key}-${year.year}`,
                        label: String(year.year),
                        value: round(partOf(year, row.key)),
                        color: yearShades[row.key][index],
                      }))}
                    />
                  ) : (
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-ink-800">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: value > 0 ? `${Math.max(pct, 4)}%` : '0%',
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                  )}
                </div>

                {years.length > 1 && value > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-gray-100 dark:border-white/[0.07] pt-3">
                    {years.map((year, index) => {
                      const part = round(partOf(year, row.key));
                      if (part <= 0) return null;
                      return (
                        <div
                          key={year.year}
                          className="flex items-baseline justify-between gap-3 text-sm"
                        >
                          <span className="flex items-center gap-2 text-gray-700 dark:text-ink-100">
                            <span
                              className="inline-block h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: yearShades[row.key][index] }}
                            />
                            {year.year}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-ink-50">
                            {fmtMoney(part)}
                            <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-ink-500">
                              {Math.round((part / value) * 100)}%
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {row.key === 'equity' && (vesting.unvested > 0 || vesting.outstanding > 0) ? (
                  <UnvestedEquityShadow split={vesting} upcoming={upcoming} color={row.color} />
                ) : null}

                {row.key === 'equity' && equityVesting?.plan ? (
                  <div className="mt-3 border-t border-gray-100 dark:border-white/[0.07] pt-2">
                    <ResponsiveDisclosure
                      placement="bottomLeft"
                      title={
                        <span className="flex items-center gap-2">
                          <LineChartOutlined className="text-pink-500 dark:text-pink-300" />
                          Grant details
                        </span>
                      }
                      content={
                        <div className="w-full md:w-[520px]">
                          <EquityVestingChart
                            plan={equityVesting.plan}
                            todayIso={todayIso}
                            priceHistory={grantPriceHistory}
                            onFillHistory={onFillGrantPriceHistory}
                            onSaveVestDates={onSaveVestDates}
                            vestDatesLockedReason={vestDatesLockedReason}
                          />
                        </div>
                      }
                      trigger={(onClick) => (
                        <Button
                          type="text"
                          size="small"
                          icon={<LineChartOutlined />}
                          onClick={onClick}
                          // A plain button in a modal body is outside the global 44px floor.
                          className="min-h-11 !px-2 text-xs font-semibold !text-blue-600 lg:min-h-0 dark:!text-blue-300"
                        >
                          Grant details
                        </Button>
                      )}
                    />
                  </div>
                ) : null}
                {/* The row is the context, so an absent grant says which record is missing. */}
                {row.key === 'equity' && equityVesting?.reason ? (
                  <div className="mt-3 border-t border-gray-100 dark:border-white/[0.07] pt-2 text-xs text-slate-400 dark:text-ink-500">
                    {equityVesting.reason}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
