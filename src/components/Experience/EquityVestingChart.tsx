import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Button } from 'antd';
import { CloudDownloadOutlined } from '@ant-design/icons';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmtMoney } from '../../utils/Experience/compensationBreakdownFormat';
import { money } from '../../utils/Income/format';
import { formatPercentChange } from '../../utils/OfferComparison/raiseAfterValues';
import { isSharePriceStale } from '../../utils/OfferComparison/sharePriceFreshness';
import { useChartAxis, useChartSeries } from '../../theme/chartColors';
import {
  isRepriced,
  vestingCadenceLabel,
  type EquityVestingPlan,
} from '../../utils/Experience/equityVesting';
import { shade } from './PayChart';
import { VestingTracker } from './VestingTracker';
import type { VestDateOverride } from '../../utils/Income/vestEvents';
import { GrantValueChart, PRICE, VESTED, WHOLE, type ValueSeriesShown } from './GrantValueChart';
import ModeToggle from '../inputs/ModeToggle';
import {
  buildGrantValueHistory,
  seriesPeriodFor,
  type PriceGranularity,
} from '../../utils/Experience/grantValueHistory';
import type { PriceSeriesPeriod } from '../../api/career/offers';

const GRANTED = 'At grant';
const TODAY = "At today's price";

interface Row {
  label: string;
  window: string;
  shares: number | null;
  vested: boolean;
  // What has vested of this year, so a year part way through reads as part way through.
  vestedPart: number;
  [GRANTED]: number;
  [TODAY]?: number;
}

const fullyVested = (row: Row) => row.vestedPart >= row[GRANTED];

// Hatched rather than paler: a ghost mixed toward white gets brighter on a near-black plot.
const GRANTED_HATCH = 'careerhub-vest-hatch-granted';
const TODAY_HATCH = 'careerhub-vest-hatch-today';

const Hatch = ({ id, color }: { id: string; color: string }) => (
  <pattern
    id={id}
    width="6"
    height="6"
    patternUnits="userSpaceOnUse"
    patternTransform="rotate(135)"
  >
    <rect width="3" height="6" fill={color} />
  </pattern>
);

const monthLabel = (iso: string) => dayjs(iso).format('MMM YYYY');

// Only the three price granularities plot a series; the other two read the plan itself.
const isPriceView = (view: ChartView): view is PriceGranularity =>
  view !== 'year' && view !== 'tracker';

const VestTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) => {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const today = row[TODAY];
  return (
    <div className="min-w-[190px] space-y-1 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-3 text-xs shadow-md">
      <p className="font-bold text-slate-800 dark:text-ink-50">
        {row.label}
        <span className="ml-1.5 font-normal text-slate-400 dark:text-ink-500">
          {fullyVested(row) ? 'vested' : row.vestedPart > 0 ? 'part vested' : 'scheduled'}
        </span>
      </p>
      <p className="text-slate-400 dark:text-ink-500">{row.window}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500 dark:text-ink-400">{GRANTED}</span>
        <span className="font-semibold text-slate-700 dark:text-ink-100">
          {fmtMoney(row[GRANTED])}
        </span>
      </div>
      {today != null && (
        <div className="flex justify-between gap-4">
          <span className="text-slate-500 dark:text-ink-400">{TODAY}</span>
          <span className="font-semibold text-slate-700 dark:text-ink-100">{fmtMoney(today)}</span>
        </div>
      )}
      {row.vestedPart > 0 && !fullyVested(row) && (
        <div className="flex justify-between gap-4">
          <span className="text-slate-500 dark:text-ink-400">Vested so far</span>
          <span className="font-semibold text-slate-700 dark:text-ink-100">
            {fmtMoney(row.vestedPart)}
          </span>
        </div>
      )}
      {row.shares != null && (
        <div className="flex justify-between gap-4">
          <span className="text-slate-500 dark:text-ink-400">Shares</span>
          <span className="font-semibold text-slate-700 dark:text-ink-100">
            {Math.round(row.shares).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
};

const Fact = ({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: React.ReactNode;
}) => (
  <div className="min-w-0">
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
      {label}
    </div>
    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
      <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-ink-50">
        {value}
      </span>
      {accent}
    </div>
    <div className="text-xs text-slate-500 dark:text-ink-400">{hint}</div>
  </div>
);

type ChartView = 'tracker' | 'year' | PriceGranularity;

const SERIES_CHIPS: { key: keyof ValueSeriesShown; label: string }[] = [
  { key: 'grant', label: WHOLE },
  { key: 'vested', label: VESTED },
  { key: 'price', label: PRICE },
];

// A gap in the daily series is a shut market, not a price the fetch missed.
const TRADING_DAYS_ONLY =
  'Markets are shut at weekends and on market holidays, so those days carry no price.';

// Whether the note is about trading days at all: a provider that could not be reached is not.
interface FillNote {
  text: string;
  tradingDays: boolean;
}

const VIEWS: { label: string; value: ChartView }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
  { label: 'Schedule', value: 'tracker' },
];

export const EquityVestingChart = ({
  plan,
  todayIso,
  priceHistory = [],
  onFillHistory,
  onSaveVestDates,
  vestDatesLockedReason,
}: {
  plan: EquityVestingPlan;
  todayIso: string;
  priceHistory?: Array<{ as_of: string; price: string | number }>;
  onFillHistory?: (period: PriceSeriesPeriod) => Promise<number>;
  onSaveVestDates?: (overrides: VestDateOverride[]) => Promise<void>;
  vestDatesLockedReason?: string;
}) => {
  const [view, setView] = useState<ChartView>('year');
  const [filling, setFilling] = useState(false);
  const [fillNote, setFillNote] = useState<FillNote | null>(null);
  const [shown, setShown] = useState<ValueSeriesShown>({
    grant: true,
    vested: true,
    price: false,
  });
  const series = useChartSeries();
  const axis = useChartAxis();
  const CHIP_COLORS: Record<keyof ValueSeriesShown, keyof typeof series> = {
    grant: 'equity',
    vested: 'neutral',
    price: 'base',
  };
  // Only a known current price earns a second series; inventing one would restate the grant.
  const repriced = isRepriced(plan);
  const data: Row[] = plan.years.map((year) => ({
    label: year.label,
    window:
      year.from === year.to
        ? monthLabel(year.from)
        : `${monthLabel(year.from)} – ${monthLabel(year.to)}`,
    shares: year.shares,
    vested: year.vested,
    vestedPart: Math.round(year.vestedValue),
    [GRANTED]: Math.round(year.value),
    ...(repriced ? { [TODAY]: Math.round(year.value * plan.priceRatio) } : {}),
  }));
  const vestedNow = plan.vestedToDate * plan.priceRatio;
  const stillToVest = Math.max(0, plan.totalGrant - plan.vestedToDate);
  // Before the first vest the vested series is a flat $0, which pins the axis and shows nothing.
  const hasVested = plan.vestedToDate > 0;
  const nextVest = plan.vests.find((vest) => !vest.vested)?.date ?? null;
  const vestingReason = nextVest
    ? `Nothing has vested yet. The first vest is ${dayjs(nextVest).format('MMM D, YYYY')}.`
    : 'Nothing has vested yet.';
  const disabledChip = (key: keyof ValueSeriesShown) => key === 'vested' && !hasVested;
  // The last series on cannot be switched off, or the chart it filters has nothing left to draw.
  const activeSeries = SERIES_CHIPS.filter(
    (chip) => !disabledChip(chip.key) && shown[chip.key]
  ).length;
  const onlySeriesLeft = (key: keyof ValueSeriesShown) => shown[key] && activeSeries === 1;
  // A disabled chip must draw nothing, whatever it was left switched on as.
  const drawn: ValueSeriesShown = { ...shown, vested: shown.vested && hasVested };
  const points = useMemo(
    () => (isPriceView(view) ? buildGrantValueHistory(plan, priceHistory, view) : []),
    [plan, priceHistory, view]
  );
  const canFill = onFillHistory != null && plan.ticker != null;
  // Said where the gaps show: after a fill that counted trading days, and over the daily chart.
  const explainGaps = (fillNote?.tradingDays ?? false) || (view === 'day' && points.length >= 2);
  // Plain text under the button, not a toast: a toast inside a popover is gone before it is read.
  const fillHistory = useCallback(
    async (auto = false) => {
      if (!onFillHistory || !plan.ticker) return;
      setFilling(true);
      setFillNote(null);
      try {
        const added = await onFillHistory(seriesPeriodFor(plan.grantDate, todayIso));
        if (added > 0) {
          setFillNote({
            text: `Added ${added} trading day${added === 1 ? '' : 's'} of ${plan.ticker} prices.`,
            tradingDays: true,
          });
        } else if (!auto) {
          setFillNote({
            text: `Every ${plan.ticker} trading day the provider has was already recorded.`,
            tradingDays: true,
          });
        }
      } catch {
        setFillNote({
          text: `Could not reach ${plan.ticker}'s price history. Try again in a moment.`,
          tradingDays: false,
        });
      } finally {
        setFilling(false);
      }
    },
    [onFillHistory, plan.grantDate, plan.ticker, todayIso]
  );

  // Asked once per ticker per open and additive server-side, so no count decides whether to ask.
  const attempted = useRef<string | null>(null);
  useEffect(() => {
    if (!canFill || !plan.ticker) return;
    if (plan.grantDate > todayIso || attempted.current === plan.ticker) return;
    attempted.current = plan.ticker;
    void fillHistory(true);
  }, [canFill, fillHistory, plan.grantDate, plan.ticker, todayIso]);
  // A price is only "today" on the day it was taken; nothing here refetches one.
  const priceIsToday = plan.priceAsOf != null && !isSharePriceStale(plan.priceAsOf, todayIso);
  const valueLabel = priceIsToday
    ? 'Value today'
    : plan.priceAsOf
      ? `Value on ${dayjs(plan.priceAsOf).format('MMM D, YYYY')}`
      : 'Latest value';

  // No card of its own: it opens inside the Equity / RSU row, which already provides the surface.
  return (
    <div>
      <div className="text-xs text-slate-500 dark:text-ink-400">
        Granted {dayjs(plan.grantDate).format('MMM D, YYYY')} · {vestingCadenceLabel(plan)}
        {plan.derivedFromYearly ? ` · from ${fmtMoney(plan.derivedFromYearly)} a year` : ''}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Fact
          label="Grant value"
          value={fmtMoney(plan.totalGrant)}
          hint={
            [
              plan.shares ? `${plan.shares.toLocaleString()} shares` : null,
              plan.grantPrice ? `${money(plan.grantPrice)} a share` : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'No share count recorded'
          }
        />
        <Fact
          label={valueLabel}
          value={repriced ? fmtMoney(plan.totalGrant * plan.priceRatio) : '—'}
          hint={
            plan.currentPrice
              ? `${money(plan.currentPrice)} a share${priceIsToday || !plan.priceAsOf ? '' : ', the last one recorded'}`
              : 'Add a current share price to reprice it'
          }
          accent={
            repriced ? (
              <span
                className={
                  plan.priceRatio > 1
                    ? 'text-sm font-semibold text-emerald-600 dark:text-emerald-300'
                    : 'text-sm font-semibold text-rose-600 dark:text-rose-300'
                }
              >
                {formatPercentChange((plan.priceRatio - 1) * 100)}
              </span>
            ) : null
          }
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {canFill ? (
          <Button
            type="text"
            size="small"
            loading={filling}
            icon={<CloudDownloadOutlined />}
            onClick={() => void fillHistory()}
            // A plain button in a modal body is outside the global 44px floor.
            className="min-h-11 !px-2 text-xs font-semibold !text-blue-600 lg:min-h-0 dark:!text-blue-300"
          >
            Fill daily history
          </Button>
        ) : (
          <span />
        )}
        <ModeToggle options={VIEWS} value={view} onChange={setView} />
      </div>

      {fillNote && (
        <div className="mt-1 text-xs text-slate-500 dark:text-ink-400">{fillNote.text}</div>
      )}
      {explainGaps && (
        <div className="mt-1 text-xs text-slate-500 dark:text-ink-400">{TRADING_DAYS_ONLY}</div>
      )}

      {isPriceView(view) && points.length >= 2 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {SERIES_CHIPS.map((chip) => {
            const unavailable = disabledChip(chip.key);
            const active = drawn[chip.key];
            const pinned = onlySeriesLeft(chip.key);
            return (
              <button
                key={chip.key}
                type="button"
                aria-pressed={active}
                disabled={pinned || unavailable}
                title={
                  unavailable ? vestingReason : pinned ? 'The last series stays on' : undefined
                }
                onClick={() => setShown((current) => ({ ...current, [chip.key]: !active }))}
                className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed md:min-h-0 md:px-2.5 md:py-1 ${
                  unavailable ? 'opacity-50 ' : ''
                }${
                  active
                    ? 'border-gray-200 bg-white text-gray-700 shadow-sm dark:border-white/[0.08] dark:bg-ink-900 dark:text-ink-100'
                    : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-white/[0.08] dark:bg-ink-900 dark:text-ink-500'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: active ? series[CHIP_COLORS[chip.key]] : '#d1d5db' }}
                />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {isPriceView(view) && points.length >= 2 && !hasVested && (
        <div className="mt-1 text-xs text-slate-500 dark:text-ink-400">{vestingReason}</div>
      )}

      <div className={view === 'tracker' ? 'mt-2' : 'mt-2 h-[200px] sm:h-[230px]'}>
        {view === 'tracker' ? (
          <VestingTracker
            plan={plan}
            onSaveVestDates={onSaveVestDates}
            vestDatesLockedReason={vestDatesLockedReason}
          />
        ) : isPriceView(view) && points.length < 2 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-xs text-slate-400 dark:border-white/[0.08] dark:text-ink-500">
            {!plan.ticker
              ? 'A ticker is what gives this grant a price history.'
              : points.length === 0
                ? `No ${plan.ticker} prices recorded since the grant yet; fetching every trading day since.`
                : `Only one ${plan.ticker} price recorded so far, and a trend needs two.`}
          </div>
        ) : isPriceView(view) ? (
          <GrantValueChart points={points} granularity={view} show={drawn} />
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
            {/* The modal is already animating in, and the entry animation never completes headless. */}
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <Hatch id={GRANTED_HATCH} color={shade(series.equity, 0.45)} />
                <Hatch id={TODAY_HATCH} color={series.equity} />
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={axis.grid} />
              <XAxis dataKey="label" stroke={axis.axis} tick={{ fontSize: 12, fill: axis.label }} />
              <YAxis
                stroke={axis.axis}
                tick={{ fontSize: 12, fill: axis.label }}
                width={52}
                tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}
              />
              <Tooltip content={<VestTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
              {repriced && <Legend wrapperStyle={{ fontSize: 12 }} />}
              <Bar
                dataKey={GRANTED}
                fill={shade(series.equity, 0.45)}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              >
                {data.map((row) => (
                  <Cell
                    key={row.label}
                    fill={fullyVested(row) ? shade(series.equity, 0.45) : `url(#${GRANTED_HATCH})`}
                  />
                ))}
              </Bar>
              {repriced && (
                <Bar
                  dataKey={TODAY}
                  fill={series.equity}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  {data.map((row) => (
                    <Cell
                      key={row.label}
                      fill={fullyVested(row) ? series.equity : `url(#${TODAY_HATCH})`}
                    />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-ink-400">
        {isPriceView(view) && points.length >= 2 && (
          <span>
            {view === 'day'
              ? `${points.length} trading days recorded`
              : `${points.length} prices recorded`}
          </span>
        )}
        <span>
          <span className="font-semibold text-slate-700 dark:text-ink-100">
            {fmtMoney(plan.vestedToDate)}
          </span>{' '}
          vested so far at grant
          {repriced
            ? `, worth ${fmtMoney(vestedNow)} at ${priceIsToday ? "today's" : 'the latest'} price`
            : ''}
        </span>
        <span>
          <span className="font-semibold text-slate-700 dark:text-ink-100">
            {fmtMoney(stillToVest)}
          </span>{' '}
          still to vest
          {repriced ? (
            <>
              {`, worth ${fmtMoney(stillToVest * plan.priceRatio)} at ${priceIsToday ? "today's" : 'the latest'} price `}
              <span
                className={
                  plan.priceRatio > 1
                    ? 'font-semibold text-emerald-600 dark:text-emerald-300'
                    : 'font-semibold text-rose-600 dark:text-rose-300'
                }
              >
                {formatPercentChange((plan.priceRatio - 1) * 100)}
              </span>
            </>
          ) : (
            ''
          )}
        </span>
        {data.some((row) => !fullyVested(row)) && view === 'year' && (
          <span>A hatched bar has not vested yet, so no total counts it.</span>
        )}
      </div>
    </div>
  );
};
