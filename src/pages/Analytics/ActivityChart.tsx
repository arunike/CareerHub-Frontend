import { useMemo, useState } from 'react';
import { RiseOutlined, RightOutlined, CloseOutlined } from '@ant-design/icons';
import { DatePicker, Grid } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { endOfDay, startOfDay } from 'date-fns';
import { ANALYTICS_CHART_INITIAL_DIMENSION } from '../../constants/chartDimensions';
import { CONTROL_CLASS } from '../../components/formControls';
import SegmentedToggle from '../../components/SegmentedToggle';
import { parseDateOnlyLocal } from '../../utils/dateOnly';
import {
  CUSTOM_RANGE,
  CUSTOM_RANGE_LABEL,
  DEFAULT_RANGE,
  FINER_GRANULARITY,
  GRANULARITY_LABELS,
  RANGE_OPTIONS,
  buildActivitySeries,
  formatWindow,
  type ActivityBucket,
  type ActivityPoint,
  type Granularity,
} from './activitySeries';

type Props = {
  // Count per day, keyed yyyy-MM-dd. Applications by date applied, or events by date.
  dailyApplied: Record<string, number>;
  selectedYear: number | 'all';
  // What is being counted. Both analytics tabs use this chart, so the noun is a prop
  // rather than the word "application" hardcoded through the copy.
  noun?: { one: string; many: string };
  title?: string;
};

// One step of the drill path: the bar that was opened, and the granularity it opened into.
type DrillStep = {
  label: string;
  start: Date;
  end: Date;
  granularity: Granularity;
};

const CustomTooltip = ({
  active,
  payload,
  noun,
}: {
  active?: boolean;
  payload?: Array<{ payload: ActivityBucket }>;
  noun: { one: string; many: string };
}) => {
  const bucket = payload?.[0]?.payload;
  if (!active || !bucket) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white/95 p-3 shadow-[0_8px_30px_rgba(49,88,183,0.055)] backdrop-blur-md">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {bucket.fullLabel}
      </p>
      <p className="text-sm font-bold text-slate-900">
        {bucket.count} {bucket.count === 1 ? noun.one : noun.many}
      </p>
      {bucket.partial && (
        <p className="mt-1 text-[11px] text-slate-400">Only the part inside this breakdown</p>
      )}
      {bucket.drillable && <p className="mt-1 text-[11px] text-blue-600">Click to break down</p>}
    </div>
  );
};

const { RangePicker } = DatePicker;

const ActivityChart = ({
  dailyApplied,
  selectedYear,
  noun = { one: 'application', many: 'applications' },
  title = 'Activity',
}: Props) => {
  const [granularity, setGranularity] = useState<Granularity>('week');
  const [range, setRange] = useState<string>(DEFAULT_RANGE.week);
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [drill, setDrill] = useState<DrillStep[]>([]);
  // antd's range dropdown shows two month panels side by side — 576px, wider than a phone,
  // so it gets clipped. Two single-panel pickers fit and are easier to tap besides.
  const screens = Grid.useBreakpoint();
  const stackPickers = !screens.sm;

  const points = useMemo<ActivityPoint[]>(
    () =>
      Object.entries(dailyApplied)
        .map(([day, count]) => ({ date: parseDateOnlyLocal(day), count }))
        .filter((point): point is ActivityPoint => point.date !== null),
    [dailyApplied]
  );

  // A specific year anchors the window to that year rather than to today, so filtering to
  // 2024 shows the end of 2024 instead of twelve empty weeks around today.
  const bounds = useMemo(() => {
    const today = endOfDay(new Date());
    if (selectedYear === 'all') return { start: null, end: today };
    const yearEnd = endOfDay(new Date(selectedYear, 11, 31));
    return {
      start: startOfDay(new Date(selectedYear, 0, 1)),
      end: yearEnd < today ? yearEnd : today,
    };
  }, [selectedYear]);

  const active = drill.length > 0 ? drill[drill.length - 1] : null;

  // An exact range is just an explicit window, which is the same mechanism drilling uses.
  const picked = useMemo(
    () =>
      range === CUSTOM_RANGE && customRange
        ? { start: startOfDay(customRange[0].toDate()), end: endOfDay(customRange[1].toDate()) }
        : null,
    [range, customRange]
  );
  // Drilling into a picked range narrows it further, so the deepest level wins. Memoised
  // because a fresh object each render would recompute the series every render.
  const activeWindow = useMemo(
    () => (active ? { start: active.start, end: active.end } : picked),
    [active, picked]
  );
  // 'custom' only means anything next to a picked window. On its own it is not a bucket
  // count, so it would otherwise fall through and quietly render all time.
  const effectiveRange = range === CUSTOM_RANGE && !picked ? DEFAULT_RANGE[granularity] : range;

  const series = useMemo(
    () =>
      buildActivitySeries({
        points,
        granularity: active ? active.granularity : granularity,
        range: effectiveRange,
        bounds,
        window: activeWindow ?? undefined,
      }),
    [points, granularity, effectiveRange, bounds, active, activeWindow]
  );

  const changeGranularity = (next: Granularity) => {
    setGranularity(next);
    // A picked range survives a granularity change — the same dates, bucketed differently.
    if (range !== CUSTOM_RANGE) setRange(DEFAULT_RANGE[next]);
    setDrill([]);
  };

  const changeRange = (next: string) => {
    setRange(next);
    // A preset supersedes hand-picked dates; the picker then mirrors the preset's window.
    setCustomRange(null);
    setDrill([]);
  };

  // The picker is always on screen, so it doubles as a readout of the window you are
  // looking at — a preset, a drilled bar, or dates you typed. Derived rather than stored,
  // so it cannot drift from the chart.
  const shownRange: [Dayjs, Dayjs] = [dayjs(series.windowStart), dayjs(series.windowEnd)];

  const pickRange = (next: [Dayjs, Dayjs]) => {
    setCustomRange(next);
    setRange(CUSTOM_RANGE);
    // Typed dates replace the drill path rather than being read inside it.
    setDrill([]);
  };

  // Used by the stacked mobile pickers, where each end moves on its own. The other end
  // comes from what is displayed, so moving one does not discard the other.
  const setEdge = (edge: 'from' | 'to', value: Dayjs | null) => {
    if (!value) return;
    const [start, end] = shownRange;
    pickRange(
      edge === 'from'
        ? [value, end.isBefore(value, 'day') ? value : end]
        : [start.isAfter(value, 'day') ? value : start, value]
    );
  };

  // The year filter scopes the data, so offering dates outside it would only ever draw
  // zeroes. Disabling them says why instead of leaving the user to guess.
  const disabledDate = (current: Dayjs) =>
    current.isAfter(dayjs(bounds.end), 'day') ||
    (bounds.start ? current.isBefore(dayjs(bounds.start), 'day') : false);

  const openBucket = (bucket: ActivityBucket) => {
    const finer = FINER_GRANULARITY[series.granularity];
    if (!finer || !bucket.drillable) return;
    // Intersect with the level above. The week of Dec 29 shows up under both December and
    // January; opening it must keep the month you came from, or it would break down more
    // applications than the bar you clicked.
    const start =
      activeWindow && activeWindow.start > bucket.start ? activeWindow.start : bucket.start;
    const end = activeWindow && activeWindow.end < bucket.end ? activeWindow.end : bucket.end;
    setDrill((prev) => [...prev, { label: bucket.fullLabel, start, end, granularity: finer }]);
  };

  // Long ranges cannot label every bar, so thin the ticks instead of overlapping them.
  // A phone fits far fewer labels than a desktop, and 12 weekly dates at 500px ran into
  // each other, so the budget follows the breakpoint rather than being a fixed number.
  const labelBudget = stackPickers ? 6 : 14;
  const tickInterval = Math.max(0, Math.ceil(series.buckets.length / labelBudget) - 1);
  const canDrill = FINER_GRANULARITY[series.granularity] !== null;

  return (
    <div className="enterprise-card p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <RiseOutlined className="text-xl text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {GRANULARITY_LABELS[series.granularity]} {title}
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatWindow(series.windowStart, series.windowEnd)} · {series.total.toLocaleString()}{' '}
            {series.total === 1 ? noun.one : noun.many}
            {series.capped && ' · range capped'}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SegmentedToggle
            value={granularity}
            onChange={changeGranularity}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            buttonClassName="flex-1 px-3 sm:flex-none"
          />
          <select
            value={range}
            onChange={(event) => changeRange(event.target.value)}
            className={`${CONTROL_CLASS} sm:w-[168px]`}
            aria-label="Time range"
          >
            {RANGE_OPTIONS[granularity].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {/* Only offered as the current selection. With the picker always on screen
                there is nothing to switch to — editing the dates is what makes it custom. */}
            {range === CUSTOM_RANGE && <option value={CUSTOM_RANGE}>{CUSTOM_RANGE_LABEL}</option>}
          </select>
          {stackPickers ? (
            <div className="flex items-center gap-2">
              {(['from', 'to'] as const).map((edge) => (
                <DatePicker
                  key={edge}
                  value={shownRange[edge === 'from' ? 0 : 1]}
                  onChange={(value) => setEdge(edge, value)}
                  // Each end is bounded by the other, so an inverted range is unpickable.
                  disabledDate={(current) =>
                    disabledDate(current) ||
                    (edge === 'from'
                      ? current.isAfter(shownRange[1], 'day')
                      : current.isBefore(shownRange[0], 'day'))
                  }
                  allowClear={false}
                  inputReadOnly
                  format="MM/DD/YYYY"
                  placeholder={edge === 'from' ? 'From' : 'To'}
                  style={{ width: '100%' }}
                />
              ))}
            </div>
          ) : (
            <RangePicker
              value={shownRange}
              onChange={(value) => {
                if (value && value[0] && value[1]) pickRange([value[0], value[1]]);
              }}
              disabledDate={disabledDate}
              // Nothing to clear back to: the picker always shows the active window, so an
              // empty state would only ever be a moment of the chart contradicting itself.
              allowClear={false}
              format="MM/DD/YYYY"
              // Inline, not a Tailwind class: antd's own width rule is unlayered and beats
              // Tailwind utilities, so `w-[248px]` alone would not apply.
              style={{ width: 248 }}
            />
          )}
        </div>
      </div>

      {drill.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs">
          <button
            type="button"
            onClick={() => setDrill([])}
            className="font-semibold text-blue-700 transition-colors hover:text-blue-900"
          >
            {picked
              ? formatWindow(picked.start, picked.end)
              : (RANGE_OPTIONS[granularity].find((option) => option.value === range)?.label ??
                'All')}
          </button>
          {drill.map((step, index) => (
            <span key={step.start.toISOString()} className="flex items-center gap-1.5">
              <RightOutlined className="text-[8px] text-blue-400" />
              <button
                type="button"
                onClick={() => setDrill((prev) => prev.slice(0, index + 1))}
                disabled={index === drill.length - 1}
                className={
                  index === drill.length - 1
                    ? 'font-semibold text-slate-900'
                    : 'font-semibold text-blue-700 transition-colors hover:text-blue-900'
                }
              >
                {step.label}
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setDrill([])}
            aria-label="Clear breakdown"
            className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
          >
            <CloseOutlined className="text-[10px]" /> Reset
          </button>
        </div>
      )}

      <div className="h-[280px] w-full sm:h-75">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={1}
          initialDimension={ANALYTICS_CHART_INITIAL_DIMENSION}
        >
          <BarChart data={series.buckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="activityBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.92} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.34} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              stroke="#94a3b8"
              fontSize={11}
              tickMargin={8}
              interval={tickInterval}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              stroke="#94a3b8"
              fontSize={11}
              tickMargin={8}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip noun={noun} />}
              cursor={{ fill: 'rgba(37, 99, 235, 0.035)' }}
            />
            <Bar
              dataKey="count"
              name="Applications"
              fill="url(#activityBarGradient)"
              radius={[4, 4, 0, 0]}
              // A year of daily bars is not worth animating on every range change.
              isAnimationActive={series.buckets.length <= 60}
              className={canDrill ? 'cursor-pointer' : undefined}
              onClick={(entry: unknown) => {
                // Recharts hands back either the datum or a wrapper holding it.
                const record = entry as { payload?: ActivityBucket } & Partial<ActivityBucket>;
                const bucket = (record?.payload ?? record) as ActivityBucket | undefined;
                if (bucket?.key) openBucket(bucket);
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {canDrill && (
        <p className="mt-3 text-[11px] text-slate-400">
          Click a bar to break it down by {FINER_GRANULARITY[series.granularity]}.
        </p>
      )}
    </div>
  );
};

export default ActivityChart;
