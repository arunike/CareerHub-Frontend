import dayjs from 'dayjs';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmtMoney } from '../../utils/Experience/compensationBreakdownFormat';
import { money } from '../../utils/Income/format';
import { useChartAxis, useChartSeries } from '../../theme/chartColors';
import type { GrantValuePoint, PriceGranularity } from '../../utils/Experience/grantValueHistory';

export const WHOLE = 'Whole grant';
export const VESTED = 'Vested';
export const PRICE = 'Share price';

export interface ValueSeriesShown {
  grant: boolean;
  vested: boolean;
  price: boolean;
}

const AXIS_FORMAT: Record<PriceGranularity, string> = {
  day: 'MMM D',
  week: 'MMM D',
  month: 'MMM YYYY',
};

interface Row extends GrantValuePoint {
  label: string;
  [WHOLE]: number;
  [VESTED]: number;
  [PRICE]: number;
}

const TooltipRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4">
    <span className="text-slate-500 dark:text-ink-400">{label}</span>
    <span className="font-semibold text-slate-700 dark:text-ink-100">{value}</span>
  </div>
);

// The rows follow the chips: a series that is switched off has no business being quoted here.
const ValueTooltip = ({
  active,
  payload,
  show,
  anyVested,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
  show?: ValueSeriesShown;
  anyVested?: boolean;
}) => {
  const row = payload?.[0]?.payload;
  if (!active || !row || !show) return null;
  return (
    <div className="min-w-[190px] space-y-1 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-3 text-xs shadow-md">
      <p className="font-bold text-slate-800 dark:text-ink-50">
        {dayjs(row.date).format('MMM D, YYYY')}
      </p>
      {show.price && <TooltipRow label={PRICE} value={`${money(row[PRICE])} a share`} />}
      {show.grant && <TooltipRow label={WHOLE} value={fmtMoney(row[WHOLE])} />}
      {show.vested && anyVested && (
        <>
          <TooltipRow label={VESTED} value={fmtMoney(row[VESTED])} />
          <TooltipRow
            label="Vested share"
            value={row[WHOLE] > 0 ? `${Math.round((row[VESTED] / row[WHOLE]) * 100)}%` : '0%'}
          />
        </>
      )}
    </div>
  );
};

// A sparse series must show its observations: a line alone reads as a price moving every day.
const DOTS_UP_TO = 30;

export const GrantValueChart = ({
  points,
  granularity,
  show,
}: {
  points: GrantValuePoint[];
  granularity: PriceGranularity;
  show: ValueSeriesShown;
}) => {
  const series = useChartSeries();
  const axis = useChartAxis();
  const data: Row[] = points.map((point) => ({
    ...point,
    label: dayjs(point.date).format(AXIS_FORMAT[granularity]),
    [WHOLE]: Math.round(point.grantValue),
    [VESTED]: Math.round(point.vestedValue),
    [PRICE]: point.price,
  }));
  // A flat $0 line pins the axis to zero and squashes the series that has the movement in it.
  const anyVested = points.some((point) => point.vestedValue > 0);
  const dot = data.length <= DOTS_UP_TO;
  const showsValue = show.grant || (show.vested && anyVested);

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
      {/* The popover is already animating in, and the entry animation never completes headless. */}
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={axis.grid} />
        <XAxis dataKey="label" stroke={axis.axis} tick={{ fontSize: 12, fill: axis.label }} />
        <YAxis
          yAxisId="value"
          hide={!showsValue}
          stroke={axis.axis}
          tick={{ fontSize: 12, fill: axis.label }}
          width={52}
          domain={['auto', 'auto']}
          tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}
        />
        {/* On the left when it is the only scale: a hidden axis takes the plot's left inset too. */}
        <YAxis
          yAxisId="price"
          orientation={showsValue ? 'right' : 'left'}
          hide={!show.price}
          stroke={axis.axis}
          tick={{ fontSize: 12, fill: axis.label }}
          width={56}
          domain={['auto', 'auto']}
          tickFormatter={(value) => `$${Math.round(Number(value))}`}
        />
        <Tooltip content={<ValueTooltip show={show} anyVested={anyVested} />} />
        {show.grant && (
          <Line
            yAxisId="value"
            type="monotone"
            dataKey={WHOLE}
            stroke={series.equity}
            strokeWidth={2}
            dot={dot ? { r: 3, fill: series.equity } : false}
            isAnimationActive={false}
          />
        )}
        {show.vested && anyVested && (
          <Line
            yAxisId="value"
            type="monotone"
            dataKey={VESTED}
            stroke={series.neutral}
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={dot ? { r: 3, fill: series.neutral } : false}
            isAnimationActive={false}
          />
        )}
        {show.price && (
          <Line
            yAxisId="price"
            type="monotone"
            dataKey={PRICE}
            stroke={series.base}
            strokeWidth={2}
            dot={dot ? { r: 3, fill: series.base } : false}
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};
