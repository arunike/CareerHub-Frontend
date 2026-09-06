import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PROJECTION_YEARS } from './vestingSchedule';
import type { OfferProjection, ProjectionBasis } from './yearByYear';

const SERIES_COLORS = ['#2563eb', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#64748b'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  // Highest-paying offer first, so the year's winner reads immediately.
  const sorted = [...payload].sort((a, b) => Number(b.value) - Number(a.value));
  return (
    <div className="min-w-[220px] space-y-1.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-3 text-xs shadow-md">
      <p className="font-bold text-slate-800 dark:text-ink-50">{label}</p>
      <div className="space-y-1">
        {sorted.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-ink-400">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-slate-700 dark:text-ink-100">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface Props {
  projections: OfferProjection[];
  basis: ProjectionBasis;
}

const YearByYearChart = ({ projections, basis }: Props) => {
  if (projections.length === 0) return null;

  const seenLabels = new Map<string, number>();
  const series = projections.map((projection) => {
    const count = seenLabels.get(projection.label) ?? 0;
    seenLabels.set(projection.label, count + 1);
    return {
      projection,
      dataKey: count === 0 ? projection.label : `${projection.label} (${count + 1})`,
    };
  });

  const data = Array.from({ length: PROJECTION_YEARS }, (_, index) => {
    const row: Record<string, string | number> = { year: `Year ${index + 1}` };
    series.forEach(({ projection, dataKey }) => {
      const entry = projection.years[index];
      row[dataKey] = entry ? (basis === 'gross' ? entry.gross : entry.adjusted) : 0;
    });
    return row;
  });

  return (
    <div className="h-[300px] sm:h-[340px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" />
          <YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
          <Legend />
          {series.map(({ projection, dataKey }, index) => (
            <Bar
              key={projection.key}
              dataKey={dataKey}
              fill={SERIES_COLORS[index % SERIES_COLORS.length]}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default YearByYearChart;
