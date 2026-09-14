import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useChartAxis, useChartSeries } from '../../theme/chartColors';

type ChartDatum = {
  id?: string;
  name: string;
  Base: number;
  Bonus: number;
  Equity: number;
  SignOn: number;
  Benefits: number;
};

type Props = {
  data: ChartDatum[];
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + Number(entry.value || 0), 0);
    return (
      <div className="bg-white dark:bg-ink-900 border border-gray-200 dark:border-white/[0.08] rounded-xl p-3 shadow-md text-xs space-y-1.5 min-w-[200px]">
        <p className="font-bold text-slate-800 dark:text-ink-50">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-ink-400">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-semibold text-slate-700 dark:text-ink-100">
                $
                {Number(entry.value).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 dark:border-white/[0.07] pt-1.5 mt-1.5 flex items-center justify-between font-bold text-slate-900 dark:text-ink-50">
          <span>Total:</span>
          <span>
            $
            {total.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

const OfferComparisonChart = ({ data }: Props) => {
  const series = useChartSeries();
  const axis = useChartAxis();

  return (
    <div className="space-y-3">
      <div className="h-[280px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={axis.grid} />
            <XAxis dataKey="name" stroke={axis.axis} tick={{ fill: axis.label }} />
            <YAxis
              tickFormatter={(val) => `$${val / 1000}k`}
              stroke={axis.axis}
              tick={{ fill: axis.label }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="Base" stackId="a" fill={series.base} />
            <Bar dataKey="Bonus" stackId="a" fill={series.bonus} />
            <Bar dataKey="Equity" name="Realizable equity" stackId="a" fill={series.equity} />
            <Bar dataKey="SignOn" stackId="a" fill={series.signOn} />
            <Bar dataKey="Benefits" stackId="a" fill={series.benefits} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-400 dark:text-ink-500">
        Year 1 salary, bonus, realizable equity, sign-on, and benefits. Paper equity is excluded.
      </p>
    </div>
  );
};

export default OfferComparisonChart;
